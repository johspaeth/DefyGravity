import Lean

open Lean

namespace KaplaWeb.Diagnostics

/-- Only these operation labels can enter the troubleshooting history. -/
inductive Operation where
  | status | planners | chat | plan | gallery | entry | save | share | unknown
  deriving Repr, DecidableEq

def Operation.label : Operation → String
  | .status => "status" | .planners => "planners" | .chat => "chat"
  | .plan => "plan" | .gallery => "gallery" | .entry => "entry"
  | .save => "save" | .share => "share" | .unknown => "unknown"

/-- No field accepts request content, paths, credentials or exception text. -/
structure Event where
  operation : Operation
  status : Nat
  elapsedMs : Nat
  deriving Repr

def Event.json (event : Event) : Lean.Json := Lean.Json.mkObj [
  ("operation", toJson event.operation.label),
  ("status", toJson event.status), ("elapsedMs", toJson event.elapsedMs)]

/-- Keep the most recent records, in chronological order. -/
def retain (capacity : Nat) (events : List Event) : List Event :=
  events.drop (events.length - capacity)


def exportJson (events : List Event) : Lean.Json := Lean.Json.mkObj [
  ("schemaVersion", toJson (1 : Nat)),
  ("events", Lean.Json.arr (events.map Event.json).toArray)]

end KaplaWeb.Diagnostics
