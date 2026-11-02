import Kapla.Proofs

open Lean Elab Command

namespace AuditUtility

/-- Audit-only traversal of declaration dependencies, never part of the game or its proof statements. -/
partial def surface (env : Environment) (thm : Name) : NameSet :=
  let rec go (todo : List Name) (seen : NameSet) : NameSet :=
    match todo with
    | [] => seen
    | c :: rest =>
      if seen.contains c then go rest seen else
      let next := match env.find? c with
        | some (.defnInfo d) => d.type.getUsedConstants.toList ++ d.value.getUsedConstants.toList
        | some ci => ci.type.getUsedConstants.toList
        | none => []
      go (next ++ rest) (seen.insert c)
  match env.find? thm with
  | some ci => go ci.type.getUsedConstants.toList {}
  | none => {}

/-- Print the transitive project definitions in a theorem's statement, not its proof. -/
elab "#spec_surface " id:ident : command => do
  let env ← getEnv
  let thm ← liftCoreM <| realizeGlobalConstNoOverloadWithInfo id
  let own := (surface env thm).toList.filter fun c =>
    c.toString.startsWith "Kapla." && !c.isInternal && !Meta.isMatcherCore env c
  logInfo m!"{thm}: {own}"

end AuditUtility

#spec_surface Kapla.landingHeight_clears
#spec_surface Kapla.landingHeight_minimal
#spec_surface Kapla.vertical_path_clear
#spec_surface Kapla.place_preserves_validity
#spec_surface Kapla.replay_preserves_validity
#spec_surface Kapla.accumulate_eq_reference
#spec_surface Kapla.certificate_sound
#spec_surface Kapla.certificate_complete
