# Diagnostic logs for troubleshooting

User intent: “Diagnostic logs for troubleshooting.” This specification translates that request into a reviewable baseline; it is agent-authored and does not claim a separate human review has occurred.

A person troubleshooting Defy Gravity can open **Diagnostic logs** in the gallery sidebar, inspect recent completed API operations, refresh, download JSON, and clear the current server's history. This is diagnostic metadata, separate from the chat transcript. Restarting the server clears it. Tabs sharing the server share the history.

| Requirement | Acceptance condition | Evidence |
| --- | --- | --- |
| D1 Minimal data | Each event exports exactly operation, numeric HTTP status, elapsed milliseconds. Operation text is one of nine fixed labels. No arbitrary strings, URLs, filenames, prompts, bodies, headers, credentials or raw exceptions. | `event_schema`, `operation_allowlist`; sentinel HTTP test; call-site review |
| D2 Bounded history | Keep at most 200 completed operations; discard oldest records. For positive capacity the newest survives. | `retain_bounded`, `retain_latest`; overflow HTTP test |
| D3 Useful failures | Record JSON API successes and failures, including malformed bodies and caught handler errors. | HTTP test; browser inspection |
| D4 Local control | Diagnostics GET and DELETE use the existing host/origin guard; responses use no-store. Viewing/clearing logs does not log itself. | HTTP origin, repeat-read and clear tests |
| D5 User control | Disclosure panel explains scope, shows chronological records, refreshes, downloads a versioned JSON document, and clears. Failures show an actionable message. | Browser check and HTTP test |

Scope: completed requests handled by this process. Static page loads, origin rejections, in-flight operations, browser-only network failures, provider internals, and process crashes are not captured. No persistent logging, telemetry upload, automatic issue creation, filesystem paths, or raw stack traces. This intentionally limits diagnosis to operation/status/timing; future richer categories must extend the reviewed closed vocabulary.

The formal contract covers pure metadata serialization, fixed operation vocabulary and list retention. It does not establish the security of the HTTP framework, compiler, JavaScript, browser, host, concurrency runtime, or the whole application. Numeric metadata must come from the HTTP response and monotonic clock, as the production call sites do. Changing the definition module changes the trusted statement surface and requires review, not merely a green proof.
