# Organizer files (not included here)

The hackathon organizers' `CLAUDE.md` and `RULES.md` were in the original
`kapla-studio/` folder. They are not copied into this release because they are
not ours to republish. Links to the organizers' published copies, verified
byte-identical, are in [`../proof/ORGANIZER-FILES.md`](../proof/ORGANIZER-FILES.md).

`scripts/build.mjs` copies these two files into `dist/proof/` only if they are
present, so building without them works. `make install`, `make test` and
`make verify` were rerun from this folder without them.
