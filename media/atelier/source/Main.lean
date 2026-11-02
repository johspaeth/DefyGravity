import Kapla.Protocol

open Lean Kapla.Protocol

/-- A single process serves isolated in-memory sessions over newline-delimited JSON. -/
def main : IO Unit := do
  let stdin ← IO.getStdin
  let stdout ← IO.getStdout
  let mut sessions : Std.HashMap String Session := {}
  repeat
    let line ← stdin.getLine
    if line.isEmpty then break
    let reply := do
      let j ← Json.parse line
      let sid ← j.getObjValAs? String "session"
      let s := (sessions.get? sid).getD {}
      let cmd ← j.getObjValAs? String "cmd"
      if cmd = "close" then
        pure (sid, none, Json.mkObj [("ok", toJson true)])
      else
        let (next, response) ← dispatch s j
        pure (sid, some next, response)
    let output ← match reply with
      | .error e => pure (errorJson e)
      | .ok (sid, next, response) => do
        match next with
        | none => sessions := sessions.erase sid
        | some value => sessions := sessions.insert sid value
        pure response
    stdout.putStrLn output.compress
    stdout.flush
