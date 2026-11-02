import Kapla.Solver
import Kapla.Presets

namespace Kapla.Protocol
open Lean

/-- The canonical editable scene. Rendering and simulation never mutate this record. -/
structure Snapshot where
  blocks : List Block := []
  nextId : Nat := 0
  budget : Nat := 200
  title : String := "Sky tower"

/-- Undo keeps canonical Lean states rather than reverse-engineering rendered poses. -/
structure Session where
  current : Snapshot := {}
  history : List Snapshot := []
  revision : Nat := 0

/-- Compact JSON for an exact pose, with dimensions derived from its orientation. -/
def blockJson (b : Block) : Json := Json.mkObj [
  ("id", toJson b.id), ("x", toJson b.x), ("y", toJson b.y), ("z", toJson b.z),
  ("orientation", toJson b.orientation.val),
  ("size", toJson [b.width, b.height, b.depth])]

/-- Force integers are strings so JavaScript cannot round them on export. -/
def contactJson (c : Contact) : Json := Json.mkObj [
  ("upper", toJson c.upper), ("lower", toJson c.lower),
  ("x2", toJson c.x2), ("z2", toJson c.z2), ("force", toJson (toString c.force))]

/-- The exact certificate used by the compiled checker. -/
def certificateJson (c : Certificate) : Json := Json.mkObj [
  ("scale", toJson (toString c.scale)),
  ("contacts", Json.arr (c.contacts.map contactJson).toArray)]

/-- Parse a bounded exact pose; never silently wrap an invalid orientation. -/
def parseBlock (j : Json) : Except String Block := do
  let id ← j.getObjValAs? Nat "id"
  let x ← j.getObjValAs? Int "x"
  let y ← j.getObjValAs? Nat "y"
  let z ← j.getObjValAs? Int "z"
  let o ← j.getObjValAs? Nat "orientation"
  if ho : o < 6 then
    if x.natAbs ≤ 300 ∧ z.natAbs ≤ 300 ∧ y ≤ 600 ∧ id ≤ 1000000 then
      return ⟨id, x, y, z, ⟨o, ho⟩⟩
    else throw "A plank is outside the supported workshop bounds."
  else throw "Orientation must be an integer from 0 through 5."

/-- Parse the string form used for unbounded force integers. -/
def exactInt (j : Json) : Except String Int := do
  match j.getStr? with
  | .ok s =>
    if s.length > 4096 then throw "Integer is too large."
    match s.toInt? with
    | some n => return n
    | none => throw "Expected an exact integer string."
  | .error _ => j.getInt?

/-- Parse contact data without trusting a saved status. -/
def parseContact (j : Json) : Except String Contact := do
  return ⟨← j.getObjValAs? Nat "upper", ← j.getObjValAs? (Option Nat) "lower",
    ← j.getObjValAs? Int "x2", ← j.getObjValAs? Int "z2",
    ← exactInt (← j.getObjVal? "force")⟩

/-- Parse a certificate supplied for an independent recheck. -/
def parseCertificate (j : Json) : Except String Certificate := do
  let scale ← exactInt (← j.getObjVal? "scale")
  if scale ≤ 0 then throw "The weight scale must be positive."
  let values ← (← j.getObjVal? "contacts").getArr?
  if values.size > 8000 then throw "Too many contacts."
  return ⟨scale.toNat, ← values.toList.mapM parseContact⟩

/-- Test the actual geometry of the stated insertion order. -/
def sequenceGeometry (s : Snapshot) : Bool :=
  match replay s.budget [] s.blocks.reverse with
  | some out => out == s.blocks
  | none => false

/-- Certify every released prefix. Search failure is returned separately from geometry. -/
def certifyPrefixes (s : Snapshot) : Bool × Nat := Id.run do
  let mut built : List Block := []
  let mut index := 0
  for b in s.blocks.reverse do
    built := b :: built
    index := index + 1
    match Solver.certify s.budget built with
    | .error _ => return (false, index)
    | .ok _ => pure ()
  return (true, index)

/-- A checked record, all renderable data, and an explicitly bounded claim. -/
def recordJson (s : Snapshot) (withPlan : Bool := false) : Json := Id.run do
  let result := Solver.certify s.budget s.blocks
  let (cert, certified, reason) := match result with
    | .ok c => (certificateJson c, true, "Exact vertical force and moment balance.")
    | .error e => (Json.null, false, e)
  let top := s.blocks.foldl (fun h b => max h b.top) 0
  let geometry := checkScene s.budget s.blocks
  let path := sequenceGeometry s
  let (prefixes, prefixIndex) := if withPlan then certifyPrefixes s else (false, 0)
  return Json.mkObj [
    ("format", toJson "kapla-atelier/1"),
    ("engine", toJson "Lean 4.35.0"),
    ("model", toJson "axis-aligned-vertical-equilibrium/1"),
    ("title", toJson s.title), ("budget", toJson s.budget),
    ("gridMm", toJson (4 : Nat)), ("count", toJson s.blocks.length),
    ("heightMm", toJson (top * 4)),
    ("blocks", Json.arr (s.blocks.reverse.map blockJson).toArray),
    ("certificate", cert), ("certified", toJson certified),
    ("reason", toJson reason), ("geometryValid", toJson geometry),
    ("insertionPathChecked", toJson path),
    ("prefixBalanceChecked", toJson withPlan),
    ("allPrefixesCertified", toJson prefixes), ("prefixCheckedTo", toJson prefixIndex),
    ("scope", toJson "Static equilibrium in an ideal vertical-force model. Not a proof of real-world stability or the physics animation.")]

/-- Normal response identifies the exact scene revision and undo availability. -/
def stateJson (s : Session) (message : String := "") : Json :=
  Json.mkObj [("ok", toJson true), ("revision", toJson s.revision),
    ("canUndo", toJson (!s.history.isEmpty)), ("message", toJson message),
    ("record", recordJson s.current)]

/-- A rejected command returns no replacement state. -/
def errorJson (message : String) : Json :=
  Json.mkObj [("ok", toJson false), ("error", toJson message)]

/-- Commit only complete canonical edits. Undo history is bounded. -/
def commit (s : Session) (next : Snapshot) : Session :=
  { current := next, history := (s.current :: s.history).take 40,
    revision := s.revision + 1 }

/-- Import exact poses, then recheck geometry and any claimed path or force witness. -/
def importRecord (j : Json) : Except String Snapshot := do
  let format ← j.getObjValAs? String "format"
  if format != "kapla-atelier/1" then throw "Unsupported construction format."
  let model ← j.getObjValAs? String "model"
  if model != "axis-aligned-vertical-equilibrium/1" then throw "Unsupported physical model."
  let grid ← j.getObjValAs? Nat "gridMm"
  if grid != 4 then throw "This workshop uses an exact 4 mm grid."
  let budget ← j.getObjValAs? Nat "budget"
  if budget = 0 ∨ budget > 1000 then throw "Inventory must be between 1 and 1000."
  let values ← (← j.getObjVal? "blocks").getArr?
  if values.size > budget then throw "The construction exceeds its inventory."
  let blocks := (← values.toList.mapM parseBlock).reverse
  let title := (j.getObjValAs? String "title").toOption.getD "Imported build"
  let snap : Snapshot := {
    blocks, budget, title := title.take 80 |>.toString,
    nextId := blocks.foldl (fun n b => max n (b.id + 1)) 0 }
  if !checkScene budget blocks then throw "Overlapping planks or duplicate identifiers."
  let claimsPath := (j.getObjValAs? Bool "insertionPathChecked").toOption.getD false
  if claimsPath && !sequenceGeometry snap then
    throw "The claimed insertion sequence does not reproduce these poses."
  match j.getObjVal? "certificate" with
  | .ok Json.null => pure ()
  | .ok cj =>
    let c ← parseCertificate cj
    if !checkCertificate budget blocks c then throw "The supplied certificate was tampered with or is invalid."
  | .error _ => pure ()
  return snap

/-- Every editing command is interpreted in Lean. The adapter only carries JSON lines. -/
def dispatch (s : Session) (j : Json) : Except String (Session × Json) := do
  let cmd ← j.getObjValAs? String "cmd"
  if cmd = "init" then
    let blocks := makePreset "tower" 200
    let next : Session := { current := { blocks, nextId := blocks.length } }
    return (next, stateJson next)
  else if cmd = "state" then return (s, stateJson s)
  else if cmd = "preview" ∨ cmd = "place" then
    let x ← j.getObjValAs? Int "x"
    let z ← j.getObjValAs? Int "z"
    let o ← j.getObjValAs? Nat "orientation"
    if o ≥ 6 then throw "Unknown plank orientation."
    if x.natAbs > 300 ∨ z.natAbs > 300 then throw "Stay on the workshop table."
    if s.current.nextId > 1000000 then throw "Start a fresh scene to allocate more plank identifiers."
    let p := requestBlock s.current.nextId x z o
    let landing := dropped p s.current.blocks
    if landing.top > 600 then throw "This tower has reached the workshop height limit."
    if cmd = "preview" then
      return (s, Json.mkObj [("ok", toJson true), ("preview", blockJson landing),
        ("revision", toJson s.revision)])
    match place s.current.budget s.current.blocks p with
    | none => throw "Your plank box is empty. Undo a step or start a fresh build."
    | some blocks =>
      let next := commit s { s.current with blocks, nextId := s.current.nextId + 1 }
      return (next, stateJson next "Plank placed by Lean.")
  else if cmd = "remove" then
    let id ← j.getObjValAs? Nat "id"
    if !s.current.blocks.any (fun b => b.id == id) then throw "That plank is not in this scene."
    let blocks := s.current.blocks.filter (fun b => b.id != id)
    let next := commit s { s.current with blocks }
    return (next, stateJson next "Plank removed. Equilibrium has been checked again.")
  else if cmd = "undo" then
    match s.history with
    | [] => throw "There is nothing to undo yet."
    | previous :: rest =>
      let next : Session := ⟨previous, rest, s.revision + 1⟩
      return (next, stateJson next "Back one step.")
  else if cmd = "preset" then
    let name ← j.getObjValAs? String "name"
    if !["tower", "bridge", "domino", "overhang", "empty"].contains name then
      throw "Unknown blueprint."
    if (presetRequests name).length > s.current.budget then
      throw "This blueprint needs more planks than the imported inventory allows."
    let title := match name with
      | "tower" => "Sky tower"
      | "bridge" => "Little bridge"
      | "domino" => "Domino garden"
      | "overhang" => "The tipping point"
      | _ => "Your next great idea"
    let blocks := makePreset name s.current.budget
    let next := commit s { s.current with blocks, title, nextId := blocks.length }
    return (next, stateJson next)
  else if cmd = "prefix" then
    let count ← j.getObjValAs? Nat "count"
    let blocks := (s.current.blocks.reverse.take count).reverse
    return (s, Json.mkObj [("ok", toJson true), ("prefix", toJson true),
      ("record", recordJson { s.current with blocks })])
  else if cmd = "checkPlan" then
    return (s, Json.mkObj [("ok", toJson true), ("record", recordJson s.current true)])
  else if cmd = "verify" then
    let cj ← j.getObjVal? "certificate"
    let c ← parseCertificate cj
    return (s, Json.mkObj [("ok", toJson true),
      ("accepted", toJson (checkCertificate s.current.budget s.current.blocks c))])
  else if cmd = "export" then
    return (s, Json.mkObj [("ok", toJson true), ("record", recordJson s.current true)])
  else if cmd = "import" then
    let imported ← importRecord (← j.getObjVal? "record")
    let next := commit s imported
    return (next, stateJson next "Imported and independently rechecked in Lean.")
  else if cmd = "budget" then
    let budget ← j.getObjValAs? Nat "budget"
    if budget < s.current.blocks.length ∨ budget = 0 ∨ budget > 1000 then
      throw "Inventory must fit the current build and stay between 1 and 1000."
    let next := commit s { s.current with budget }
    return (next, stateJson next)
  else throw "Unknown command. No changes were made."

end Kapla.Protocol
