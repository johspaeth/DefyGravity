import KaplaWeb.DiagnosticsModel

open Lean

namespace KaplaWeb.Diagnostics

theorem event_schema (event : Event) : event.json = Lean.Json.mkObj [
    ("operation", toJson event.operation.label),
    ("status", toJson event.status), ("elapsedMs", toJson event.elapsedMs)] := by
  sorry

theorem retain_bounded (capacity : Nat) (events : List Event) :
    (retain capacity events).length ≤ capacity := by
  sorry

theorem retain_latest (capacity : Nat) (events : List Event) (event : Event)
    (positive : 0 < capacity) :
    (retain capacity (events ++ [event])).getLast? = some event := by
  sorry

/-- Exported text values belong to this fixed vocabulary. -/
theorem operation_allowlist (operation : Operation) :
    operation.label ∈ ["status", "planners", "chat", "plan", "gallery", "entry",
      "save", "share", "unknown"] := by
  sorry

end KaplaWeb.Diagnostics
