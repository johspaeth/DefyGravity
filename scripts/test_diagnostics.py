#!/usr/bin/env python3
"""HTTP integration checks against an isolated local server; never calls an AI provider."""
import json
from pathlib import Path
import socket
import subprocess
import time
import urllib.error
import urllib.request

root = Path(__file__).resolve().parents[1]
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'
server = subprocess.Popen([str(root / '.lake/build/bin/kapla'), 'serve', '--port', str(port)],
                          cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def request(path, method='GET', body=None, origin=None):
    headers = {'Origin': origin} if origin else {}
    req = urllib.request.Request(base + path, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as reply:
            return reply.status, reply.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()

def history():
    status, body = request('/diagnostics')
    assert status == 200
    data = json.loads(body)
    assert set(data) == {'schemaVersion', 'events'} and data['schemaVersion'] == 1
    return data['events']

try:
    for _ in range(100):
        try:
            history()
            break
        except OSError:
            if server.poll() is not None:
                raise RuntimeError('test server exited')
            time.sleep(.1)
    else:
        raise RuntimeError('test server did not start')
    assert history() == []  # reading logs does not create logs
    assert b'Diagnostic logs' in request('/')[1]
    assert request('/status')[0] == 200
    sentinel = 'PRIVATE_PROMPT_TOKEN_FILENAME'
    assert request('/plan', 'POST', sentinel.encode())[0] == 400
    assert request('/gallery/' + sentinel)[0] != 200
    events = history()
    assert [e['operation'] for e in events] == ['status', 'plan', 'entry']
    assert events[1]['status'] == 400
    assert sentinel not in json.dumps(events)
    for event in events:
        assert set(event) == {'operation', 'status', 'elapsedMs'}
        assert isinstance(event['elapsedMs'], int) and event['elapsedMs'] >= 0
    for method in ['GET', 'DELETE']:
        assert request('/diagnostics', method, origin='https://untrusted.example')[0] == 403
    assert history() == events
    for _ in range(205):
        assert request('/status')[0] == 200
    assert len(history()) == 200
    assert all(e['operation'] == 'status' for e in history())
    assert request('/diagnostics', 'DELETE')[0] == 200
    assert history() == []
    print('diagnostics HTTP: schema, failures, sentinel exclusion, origin, retention and clear OK')
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait()
