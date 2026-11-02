import KaplaPlanner.Strategy
import KaplaPlanner.AiStrategy

/-! # All strategies, by name -/

namespace KaplaPlanner

/-- Every strategy that can be chosen by name. -/
def strategies : List Strategy := [empty, ai, aiUnchecked]

/-- The strategies that ask Claude, and so have an effort. -/
def usesClaude (name : String) : Bool := name == "ai" || name == "ai-unchecked"

/-- The strategy with this name, if there is one. -/
def strategyByName? (name : String) : Option Strategy := strategies.find? (·.name == name)

/-- The strategy with this name, asking Claude with this effort and reporting its progress to `log`
(stderr by default). Strategies that do not ask Claude are the same at every effort. -/
def strategyWithEffort? (name : String) (effort : Claude.Effort) (log : Progress := IO.eprintln) :
    Option Strategy :=
  match name with
  | "ai" => some (ai effort log)
  | "ai-unchecked" => some (aiUnchecked effort log)
  | _ => strategyByName? name

#guard (strategyByName? "empty").isSome
#guard (strategyByName? "ai").isSome
#guard (strategyByName? "ai-unchecked").isSome
#guard (strategyByName? "nope").isNone
#guard (strategyWithEffort? "ai" .low).isSome && (strategyWithEffort? "empty" .low).isSome
#guard (strategyWithEffort? "nope" .low).isNone
#guard usesClaude "ai" && !usesClaude "empty"

end KaplaPlanner
