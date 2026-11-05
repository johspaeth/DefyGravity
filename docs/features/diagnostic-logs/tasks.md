# Tasks and review gates

- [x] D1–D5 spec and implementation plan committed with the feature.
- [x] Shared pure definitions, four independent spec statements, four completed proofs and comparator config.
- [x] Production reply wrapper calls the proven retention implementation.
- [x] Metadata-only inspect/refresh/export/clear interface.
- [x] Full `make check`, dependency audit and deliberately broken retention control.
- [x] HTTP test covering schema, failures, privacy sentinel, cap, clearing and origin denial; included in Linux CI.
- [x] Edge browser inspection: panel shows real records and export creates the JSON download.
- [ ] Linux kernel replay and all comparator results reviewed on the PR.
- [ ] Human review of intent translation, shared definitions and integration boundary.

The last two gates are deliberately left open. A local proof check or a parent “proved” ledger status must not be presented as whole-feature assurance.
