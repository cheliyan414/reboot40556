# Third-Party Licenses

This file is the user-facing license index for Reboot. The full notices,
copyright statements, upstream paths, source-transcription records, and bundled
license text are maintained in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
That file is the authoritative record and is copied into `public/` for shipped
builds.

## Included runtime dependencies

| Component | License | Purpose |
| --- | --- | --- |
| Babylon.js | Apache-2.0 | Zero Hub renderer |
| Three.js / React Three Fiber / Drei | MIT | Existing 11 city renderers |
| Rapier | Apache-2.0 | Character collision and physics |
| Yuka | MIT | Renderer-agnostic agent behaviour |
| meshoptimizer | MIT | Model-optimization pipeline |
| glTF-Transform | MIT | GLB validation/optimization tooling |
| postprocessing | Zlib | Existing visual postprocessing |

## Source integrations

MIT-licensed code from City Tour, Procedural-Cities, Repo-City, Yuka and
Babylon-focused references has been inspected and selectively adapted into
Reboot's deterministic TypeScript systems. Exact upstream file anchors,
modifications, license requirements, test coverage and exclusions are recorded
in [docs/SOURCE-INTEGRATION-PLAN.md](./docs/SOURCE-INTEGRATION-PLAN.md).

## Deliberate exclusions

No GPL code, unclear-provenance models, proprietary game art, OpenStreetMap
exports, non-commercial GLBs, or remote third-party assets are bundled. See
the exclusion tables in `THIRD_PARTY_NOTICES.md` and the integration plan.

