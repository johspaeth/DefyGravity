import Lean.Data.Json
import KaplaCore
import KaplaPlanner.AiStrategy

/-! # Rules as JSON, and rules from words

`BuildRules` travel as JSON between the page, the server and gallery files:

```json
{"tolerance": "1/2", "hands": 1, "clearance": true, "turned": true,
 "extra": [{"rule": "maxHeight", "height": "50"},
           {"rule": "noUpright", "up": "upright"},
           {"rule": "maxUpright", "up": "edge", "count": 3},
           {"rule": "fitsIn", "x": "60", "y": "40"}]}
```

Lengths are exact numbers in block units (1 unit = 7.8 mm). Every field may be left out; it
then has its default (`BuildRules`).

`suggestRules` asks Claude to turn a person's words ("keep it under 30 cm, no standing blocks")
into rules. Claude is not trusted here either: the person sees each rule in words made by Lean
(`UserRule.describe`) before it is used, and the physics engine checks the rules with a proof
(`KaplaPhysics.checkRule_iff`). What Claude cannot express as a rule is listed as not
checked. -/

namespace KaplaPlanner

open Lean KaplaCore

/-- The JSON name of a face-down choice, as in blueprint files. -/
def uprightName : Upright → String
  | .flat => "flat"
  | .onEdge => "edge"
  | .standing => "upright"

/-- The face-down choice with this JSON name. -/
def uprightOfName? (s : String) : Option Upright :=
  [Upright.flat, .onEdge, .standing].find? (uprightName · == s)

/-- An extra rule as JSON. -/
def ruleToJson : UserRule → Json
  | .maxHeight h => Json.mkObj [("rule", "maxHeight"), ("height", showQ h)]
  | .noUpright u => Json.mkObj [("rule", "noUpright"), ("up", uprightName u)]
  | .maxUpright u n => Json.mkObj [("rule", "maxUpright"), ("up", uprightName u), ("count", n)]
  | .fitsIn w d => Json.mkObj [("rule", "fitsIn"), ("x", showQ w), ("y", showQ d)]

/-- Read an extra rule. -/
def readRule (j : Json) : Except String UserRule := do
  let up : Except String Upright := do
    let s ← j.getObjValAs? String "up"
    match uprightOfName? s with
    | some u => pure u
    | none => throw s!"\"up\" must be flat, edge or upright, not \"{s}\""
  match ← j.getObjValAs? String "rule" with
  | "maxHeight" => return .maxHeight (← readQ (← j.getObjVal? "height"))
  | "noUpright" => return .noUpright (← up)
  | "maxUpright" => return .maxUpright (← up) (← j.getObjValAs? Nat "count")
  | "fitsIn" => return .fitsIn (← readQ (← j.getObjVal? "x")) (← readQ (← j.getObjVal? "y"))
  | other => throw s!"unknown rule \"{other}\""

/-- The rules as JSON. -/
def rulesToJson (r : BuildRules) : Json :=
  Json.mkObj
    [ ("tolerance", showQ r.human.epsRel), ("hands", r.human.hands)
    , ("clearance", r.clearance), ("turned", r.allowTurned)
    , ("extra", Json.arr (r.extra.map ruleToJson).toArray) ]

/-- Read rules. A missing field keeps its default. The rules must be `BuildRules.valid`. -/
def readRules (j : Json) : Except String BuildRules := do
  let d : BuildRules := {}
  let field {α} (name : String) (read : Json → Except String α) (dflt : α) : Except String α :=
    match j.getObjVal? name with
    | .ok .null | .error _ => pure dflt
    | .ok v => (read v).mapError (s!"\"{name}\": " ++ ·)
  let epsRel ← field "tolerance" readQ d.human.epsRel
  let hands ← field "hands" (fun v => fromJson? v) d.human.hands
  let clearance ← field "clearance" (fun v => fromJson? v) d.clearance
  let allowTurned ← field "turned" (fun v => fromJson? v) d.allowTurned
  let extra ← field "extra" (fun v => do
    let arr ← v.getArr?
    arr.toList.zipIdx.mapM fun (x, i) => (readRule x).mapError (s!"rule {i + 1}: " ++ ·)) []
  let r : BuildRules :=
    { human := { d.human with epsRel, hands }, clearance, allowTurned, extra }
  unless r.valid do
    throw ("the rules are out of range: placement error from 0 to " ++ showQ BuildRules.maxEpsRel ++
      s!", 1 to {BuildRules.maxHands} blocks per step, sizes above 0")
  return r

#guard (readRules (Json.mkObj [])).toOption == some {}
/-- Example rules that differ from the defaults everywhere. -/
def exampleRules : BuildRules :=
  { human := { epsRel := 1 / 4, eAbs := 50 / 39, hands := 2, clear := 25 / 39, muSafe := 3 / 10 },
    clearance := false, allowTurned := false,
    extra := [.maxHeight 50, .noUpright .standing, .maxUpright .onEdge 3, .fitsIn 60 (81 / 2)] }

-- Rules survive writing and reading.
#guard (readRules (rulesToJson exampleRules)).toOption == some exampleRules
#guard (readRules (Json.mkObj [("tolerance", "2")])) matches .error _
#guard (readRules (Json.mkObj [("extra", Json.arr #[Json.mkObj [("rule", "fly")]])])) matches .error _

/-! ## From words to rules (Claude, untrusted) -/

/-- What Claude answers: one list per kind of rule (no tagged union, so every field has one
meaning), lengths in centimetres, and what it could not express. Every list may be empty. -/
def suggestSchema : Json :=
  let str : Json := Json.mkObj [("type", "string")]
  let up : Json := Json.mkObj [("type", "string"), ("enum", Json.arr #["flat", "edge", "upright"])]
  let arr (items : Json) : Json := Json.mkObj [("type", "array"), ("items", items)]
  let obj (fields : List (String × Json)) : Json := Json.mkObj
    [ ("type", "object"), ("properties", Json.mkObj fields)
    , ("required", Json.arr ((fields.map (·.1)).map Json.str).toArray)
    , ("additionalProperties", false) ]
  obj
    [ ("maxHeightCm", arr str)
    , ("noUpright", arr up)
    , ("maxUpright", arr (obj [("up", up), ("count", Json.mkObj [("type", "integer")])]))
    , ("fitsInCm", arr (obj [("xCm", str), ("yCm", str)]))
    , ("notCheckable", arr str) ]

/-- The instructions for turning words into rules. -/
def suggestSystem : String :=
"A person plans a structure of Kapla blocks (each 11.7 cm long, 2.3 cm wide, 0.78 cm thick)
and states rules for it in their own words. Sort each rule into exactly one of these lists:
- maxHeightCm: a height limit in centimetres (\"under 30 cm\", \"no taller than a foot\").
- noUpright: a kind of block that must not be used at all: \"flat\" (lying), \"edge\"
  (on its long edge), \"upright\" (standing on its end).
- maxUpright: at most count blocks of that kind.
- fitsInCm: the whole structure must fit in an area of xCm by yCm centimetres (a table, a
  tray, a shelf).
- notCheckable: anything else, word for word.
Each rule the person states goes in one list, once. Leave a list empty when the person says
nothing of that kind; do not invent rules. Write centimetres as decimal strings such as
\"30\" or \"12.5\", and convert other units to centimetres. Answer with JSON only."

/-- Centimetres to block units: 1 cm = 50/39 units. -/
def unitsOfCm (cm : Q) : Q := cm * 50 / 39

/-- Read Claude's answer: the rules (each once), and what it could not express. -/
def readSuggestion (text : String) : Except String (List UserRule × List String) := do
  let j ← Json.parse text
  let cm (v : Json) : Except String Q := do
    let q ← readQ v
    unless 0 < q do throw "a length must be above 0"
    return unitsOfCm q
  let list (name : String) : Except String (List Json) :=
    return (← j.getObjValAs? (Array Json) name).toList
  let upOf (v : Json) : Except String Upright := do
    let s ← v.getStr?
    match uprightOfName? s with
    | some u => pure u
    | none => throw s!"unknown kind of block \"{s}\""
  let heights ← (← list "maxHeightCm").mapM fun v => return UserRule.maxHeight (← cm v)
  let nos ← (← list "noUpright").mapM fun v => return UserRule.noUpright (← upOf v)
  let maxes ← (← list "maxUpright").mapM fun v => do
    return UserRule.maxUpright (← upOf (← v.getObjVal? "up")) (← v.getObjValAs? Nat "count")
  let areas ← (← list "fitsInCm").mapM fun v => do
    return UserRule.fitsIn (← cm (← v.getObjVal? "xCm")) (← cm (← v.getObjVal? "yCm"))
  let notCheckable ← j.getObjValAs? (Array String) "notCheckable"
  return ((heights ++ nos ++ maxes ++ areas).eraseDups, notCheckable.toList)

#guard (readSuggestion "{\"maxHeightCm\":[\"39\"],\"noUpright\":[\"upright\",\"upright\"],\"maxUpright\":[],\"fitsInCm\":[],\"notCheckable\":[\"make it pretty\"]}").toOption
  == some ([.maxHeight 50, .noUpright .standing], ["make it pretty"])
#guard readSuggestion "{\"maxHeightCm\":[\"-1\"],\"noUpright\":[],\"maxUpright\":[],\"fitsInCm\":[],\"notCheckable\":[]}" matches .error _

/-- Ask Claude to turn the person's words into rules. -/
def suggestRules (text : String) : IO (Except String (List UserRule × List String)) := do
  match ← Claude.ask .low suggestSystem text suggestSchema with
  | .error e => return .error e
  | .ok answer => return (readSuggestion answer).mapError (s!"the answer could not be read: " ++ ·)

end KaplaPlanner
