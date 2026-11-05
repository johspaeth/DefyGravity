import KaplaWeb.DiagnosticsModel

open Lean

namespace KaplaWeb.Diagnostics

theorem event_schema (event : Event) : event.json = Lean.Json.mkObj [
    ("operation", toJson event.operation.label),
    ("status", toJson event.status), ("elapsedMs", toJson event.elapsedMs)] := rfl

theorem retain_bounded (capacity : Nat) (events : List Event) :
    (retain capacity events).length ≤ capacity := by
  simp [retain, List.length_drop]
  omega

theorem retain_latest (capacity : Nat) (events : List Event) (event : Event)
    (positive : 0 < capacity) :
    (retain capacity (events ++ [event])).getLast? = some event := by
  simp [retain, List.getLast?_drop, List.length_append]
  omega

theorem operation_allowlist (operation : Operation) :
    operation.label ∈ ["status", "planners", "chat", "plan", "gallery", "entry",
      "save", "share", "unknown"] := by
  cases operation <;> decide

end KaplaWeb.Diagnostics
