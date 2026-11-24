# Third-Party Notices — Reboot

Reboot (project-pearl-sparrow) bundles open-source software and was designed with
reference to open-source worlds. This file preserves the copyright notices and
license terms that must travel with the work, records what was actually used
versus merely studied, and flags third-party assets whose licenses differ from
their repository's license.

Verified 2026-11-10 by inspecting installed `node_modules` license files and the
actual `LICENSE` files of each reference repository (not repository badges).
A copy of this file ships in `public/` so every deployed build carries it.

Updated 2026-11-11 for Directive E (source-code integration): twelve further
repositories were cloned at their exact upstream URLs into
`.reference-sources/reboot-mit/` and inspected at file/line level. Their acquisition
record, license census and asset/data exclusions are in §7. Transcription records
(repo → file → destination → modifications) are added to §7 as each integration
lands; the full reuse matrix lives in `docs/SOURCE-INTEGRATION-PLAN.md`.

---

## 1. Runtime dependencies (bundled into the application)

| Package | Version | License | Copyright notice (verbatim) |
|---|---|---|---|
| `@babylonjs/core`, `@babylonjs/loaders`, `@babylonjs/materials` | 9.35.0 | Apache-2.0 | Babylon.js contributors. Full text: `node_modules/@babylonjs/core/license.md` and Appendix B. |
| `three` | 0.169.0 | MIT | `Copyright © 2010-2024 three.js authors` |
| `react`, `react-dom` | 18.3.1 | MIT | `Copyright (c) Facebook, Inc. and its affiliates.` |
| `@react-three/fiber` | 8.18.0 | MIT | Upstream `pmndrs/react-three-fiber`: `Copyright (c) 2019 Paul Henschel`. The npm tarball omits a LICENSE file; the upstream repository license applies. |
| `@react-three/drei` | 9.122.0 | MIT | `Copyright (c) 2020 react-spring` (as shipped in the package LICENSE) |
| `@react-three/postprocessing` | 2.19.1 | MIT | pmndrs contributors |
| `postprocessing` | 6.39.5 | Zlib | `Copyright © 2015 Raoul van Rüschen` — full Zlib text in §5. |
| `@react-three/rapier` | 1.5.0 | MIT | Upstream `pmndrs/react-three-rapier`: `Copyright (c) 2022 Poimandres`. The npm tarball omits a LICENSE file; the upstream repository license applies. |
| `@dimforge/rapier3d-compat` | 0.14.0 | Apache-2.0 | Dimforge contributors. Full text: `node_modules/@dimforge/rapier3d-compat/LICENSE` and Appendix B. Shipped at runtime through `@react-three/rapier`. |
| `zustand` | 5.0.16 | MIT | `Copyright (c) 2019 Paul Henschel` |
| `framer-motion` | 11.18.2 | MIT | `Copyright (c) 2018 Framer B.V.` |
| `lucide-react` | 0.344.0 | ISC | `Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.` — full ISC text in §5. |
| `@supabase/supabase-js` | 2.57.4 | MIT | `Copyright (c) 2020 Supabase` |

Development-only (not shipped in the browser bundle): `vite` 5.4.8 (MIT,
`Copyright (c) 2019-present, Yuxi (Evan) You and Vite contributors`),
`@electric-sql/pglite` 0.5.11 (Apache-2.0, Electric DB Limited), TypeScript and
test tooling (MIT/Apache-2.0 as shipped in their packages).

The MIT permission notice for all MIT components above is Appendix A. Apache-2.0
components require the license text (Appendix B) and preservation of any NOTICE
files; neither Babylon.js nor Rapier ships a separate NOTICE file in the
installed packages. Reboot modifies none of these dependencies; they are
consumed unaltered through npm.

## 2. Adapted techniques — reimplemented, not transcribed

> **Update (2026-11-13):** the ground-plan generators are no longer merely
> reimplemented ideas. City Tour and Procedural-Cities have since been
> **transcribed** into `kit/zoned.ts` and `kit/procgen.ts`, and repo-city's
> footprint DNA into `kit/projectMapping.ts` — see §7.1 Integration 3 for the
> authoritative per-file records. The rows below remain accurate for the retained
> legacy `ground.ts` helpers (radial-decay acceptance, network-derived plots) and
> the other technique-only references; where a repo now also has a transcription,
> §7.1 supersedes the "not transcribed" status for that code.

The world kit reimplements ideas from the repositories audited in
`docs/REBOOT-VISUAL-AUDIT.md`. No source text was copied; attribution is carried
in the derived files' headers as a matter of record and to satisfy any
derivation claim. The licenses and notices below are preserved accordingly.

| Reference | License | Copyright notice (preserve) | Where attributed in Reboot |
|---|---|---|---|
| `jstrait/city-tour` | MIT | `Copyright (c) 2012-23 Joel Strait` | `src/planet/worlds/kit/ground.ts` (radial-decay street acceptance) |
| `magnificus/Procedural-Cities` | MIT | `Copyright 2017 Tobias Elinder` | `src/planet/worlds/kit/ground.ts` (network-derived plots) |
| `tideline` (Rino Lovreglio) | MIT | `Copyright (c) 2026 Rino Lovreglio` | `src/planet/worlds/kit/surface.tsx` (wave field, foam, shore wash, Beer–Lambert tint, shared atmosphere colour) |
| `infinite-terrain` (Misha Kiiatkin) | MIT | `Copyright (c) 2025 Misha Kiiatkin`; its hash derives from Inigo Quilez (MIT) | `src/planet/worlds/kit/surface.tsx`, `src/planet/worlds/kit/noise.ts` (crossed-blade grass, per-cell hashing) |
| `AskAlice/threejs-worldgen` | **Apache-2.0** | Upstream `AskAlice/threejs-worldgen` | `src/planet/worlds/kit/noise.ts`. **Changes stated per §4(b):** reimplementation in Reboot's own style with a changed hashing scheme; no upstream source text copied. |
| `night-street` (StarKnightt) | MIT | `Copyright (c) 2026 Prasenjit (StarKnightt)` | Audited façade/lighting techniques (dealt per-row styles, punched-window bands) informing the kit |
| `3d.city-gh-pages` | **GPL-3.0 with EA/SimCity §7 additional terms — license conflict; treated as GPL-3.0** | `micropolisJS Copyright (C) Graeme McCutcheon, 2013` | **No code transcribed.** Only the shape of rules (tile integer as style selector, flat-pad-before-place, road-route gating) was re-authored from scratch in Reboot's own TypeScript. No `src/micro/**` content is present in Reboot. |

## 3. Additional technique references

| Reference | Verified license | Notice | Use in Reboot |
|---|---|---|---|
| `dgreenheck/threejs-procedural-planets` | MIT | `Copyright (c) 2023 Daniel Greenheck` | Shell/atmosphere craft techniques in `src/planet/modules/city/MiniatureWorlds.tsx`; reimplemented. |
| `jeromeetienne/threex.proceduralcity` | MIT (`MIT-LICENSE.txt`) | `Copyright (c) 2011 Jerome Etienne, http://jetienne.com` | Procedural texture-baking technique referenced by `src/planet/modules/city/CityGlow.tsx`; reimplemented. |
| `xiaoninemao/japanese-miniature-scenes` | **No LICENSE file found** (README, package.json and scenes only; default copyright applies) | — | `MiniatureWorlds.tsx` credits craft techniques (sprite particles, steam, toon props). Techniques only; no code, models or textures copied. All Reboot textures are drawn in code. |
| `scena` (highrise generator), `futuristic-city` (boid traffic) | Named in `CityGlow.tsx` comments from an earlier study round; upstream owners not re-identified in this audit | — | Technique references only; no source text copied. If either is ever transcribed, its license must be verified first. |

## 4. The twelve directive reference repositories (2026-11-10 audit; three since transcribed)

Part 2 of the transformation directive named twelve repositories for study.
All twelve were inspected at their actual LICENSE files on 2026-11-10. At that
audit **no source code, models, textures, animation or audio from these
repositories was included in Reboot.** They are listed so future extraction
decisions start from verified facts, including assets that are *not* covered by
the repository's MIT license.

> **Update (2026-11-13):** three of these repos have since had **code only**
> transcribed (no models, textures, animation or audio): `jstrait/city-tour` (#3)
> → `kit/zoned.ts`, `magnificus/Procedural-Cities` (#7, via the `lanmower` fork
> #11) → `kit/procgen.ts`, and `Robertg761/Repo-City` (#6) → `kit/projectMapping.ts`.
> The "nothing copied" finding below is the original audit state and is superseded
> for those three by §7.1 Integration 3. The asset caveats in this table still
> apply: none of the bundled art/data referenced here was copied.

| # | Repository | Actual license | Copyright line (verbatim) | Asset caveats |
|---|---|---|---|---|
| 1 | `herozhong0125/city-builder` | MIT | `Copyright (c) 2026 herozhong0125` | None — audio/models procedurally generated per README. |
| 2 | `webgl-games/arcade-3d` | MIT | `Copyright (c) 2026 Charan Raj Kandula` | None — no downloaded models/textures/audio per README. |
| 3 | `jstrait/city-tour` | MIT | `Copyright (c) 2012-23 Joel Strait` | `textures/` contains only a generated grid; also listed in §2. |
| 4 | `mirrorfishmedia/ImaginaryCities` | MIT | `Copyright (c) 2019 Matt Schell` | Bundles the Kenney "Modular Buildings" pack (CC0). Kenney credit must be retained if those assets are ever used. |
| 5 | `derek-wangpch/OpenCityMaker` | MIT | `Copyright (c) 2026 Derek Wang` | None — public/ holds app icons only. |
| 6 | `Robertg761/Repo-City` | MIT | `Copyright (c) 2026 Robert Gordon` | None — sounds synthesized in-browser, textures procedural. |
| 7 | `magnificus/Procedural-Cities` | MIT (file is `LICENCE.txt`) | `Copyright 2017 Tobias Elinder` | Unity project; no asset credits found. Also listed in §2. |
| 8 | `AlexKorotkin-creator/CityGenerator` | MIT (code only) | `Copyright (c) 2026 Alexander Korotkin` | **Major:** Epic City Sample meshes/Houdini assets under Epic's license; SideFX terms; OSM data ODbL (credit "© OpenStreetMap contributors"); AWS/Mapzen terrain tiles; Esri imagery (do not ship); Leaflet BSD-2-Clause. See the repo's NOTICE.md. |
| 9 | `Rototu/procedural-skyscraper-city-generator-and-shader` | MIT | `Copyright (c) 2019 Emanuel Farauanu` | Bundles three.js r157 + OrbitControls in `lib/` (MIT, `Copyright 2010-2023 Three.js Authors`); attribute if copied. |
| 10 | `Grzybojad/ProceduralCityGeneration` | MIT | `Copyright (c) 2023 Adam Brol` | **Unreal project:** Content/ includes Epic StarterContent/ThirdPerson/LevelPrototyping/Characters under the Unreal Engine EULA, not MIT; also ships a third-party PDF paper. |
| 11 | `lanmower/Procedural-Cities` | MIT (file is `LICENCE.txt`; fork of #7) | `Copyright 2017 Tobias Elinder` (upstream author retained) | Same as #7. |
| 12 | `MHillier98/IntroToComputerGraphics-CityGenerator` | MIT | `Copyright (c) 2019 Matthew Hillier` | `assets/` holds 21 .ply building models, 10 skyboxes and road/lightpole textures with no source credits — provenance unverified; do not reuse without clearance. |

### BabylonJS-CharacterController (optional reference)

`ssatguru/BabylonJS-CharacterController` is **Apache-2.0**, author satguru
(`ssatguru@gmail.com`); its LICENSE is the unmodified Apache template.
**It is not used by Reboot.** The playable character is Reboot's own controller
built on `@react-three/rapier` (§1). If it is ever adopted, Appendix B and the
author attribution must travel with it.

## 5. Short license texts

### Zlib (`postprocessing`)

```
Copyright © 2015 Raoul van Rüschen

This software is provided 'as-is', without any express or implied warranty. In
no event will the authors be held liable for any damages arising from the use of
this software.

Permission is granted to anyone to use this software for any purpose, including
commercial applications, and to alter it and redistribute it freely, subject to
the following restrictions:

1. The origin of this software must not be misrepresented; you must not claim
   that you wrote the original software. If you use this software in a product,
   an acknowledgment in the product documentation would be appreciated but is
   not required.

2. Altered source versions must be plainly marked as such, and must not be
   misrepresented as being the original software.

3. This notice may not be removed or altered from any source distribution.
```

### ISC (`lucide-react`)

```
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of
Feather (MIT). All other copyright (c) for Lucide are held by Lucide
Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## 6. Reboot-original assets and bundled fonts

The Zero Hub architectural GLB library (`public/models/…` authored through the
modeling-glb runtime), all district geometry, procedural canvas textures and
shader code in `src/planet/` are original Reboot work. No third-party models,
textures or audio are bundled. Three third-party font files are locally hosted
in `public/fonts/`; each was verified against its own embedded metadata (TTF
`name` table / typeface `original_font_information`) and ships with its license:

| File | Font | License | Copyright (verbatim from the font's metadata) |
| --- | --- | --- | --- |
| `Inter-Medium.ttf` | Inter Medium 4.001 — UI and world labels | SIL OFL 1.1: `Inter-OFL.txt` beside the font, full text in Appendix C | `Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)` |
| `Orbitron-Bold.ttf` | Orbitron Bold 2.001 — display type and world titles | SIL OFL 1.1: `Orbitron-OFL.txt` beside the font, full text in Appendix C; Reserved Font Name "Orbitron" | `Copyright 2018 The Orbitron Project Authors (https://github.com/theleagueof/orbitron), with Reserved Font Name: "Orbitron"` |
| `helvetiker_bold.typeface.json` | Helvetiker Bold (MgOpen family) — 3D typeface for city mega-titles | MgOpen permissive license: `LICENSE` in the same folder | `Copyright (c) Magenta ltd, 2004.` |

The MgOpen text in `public/fonts/LICENSE` applies to the Helvetiker typeface
only — not to Inter or Orbitron. All three font files are unmodified upstream
releases; the OFL 1.1 body is reproduced in Appendix C and the MgOpen notice is
also preserved inside the typeface JSON itself.

## 7. Directive E — cloned reference sources (2026-11-11)

Twelve repositories were cloned with `git clone --depth 1` at their exact upstream
URLs into `.reference-sources/reboot-mit/` (outside production source; never
typechecked or bundled). Each license was read from the clone's actual LICENSE
file. The full reuse matrix (source file:line → destination → modifications →
tests) is in `docs/SOURCE-INTEGRATION-PLAN.md`.

**Transcription policy:** as each integration lands, the derived file carries the
upstream copyright header and a prominent "modified from" notice, and a row is
appended to §7.1 below recording repo / file / destination / modifications. Until a
row exists, no code from that repo has been transcribed. Runtime libraries (yuka,
meshoptimizer, @gltf-transform) are consumed unaltered from npm under their own
package licenses; the clones are the inspection source.

| # | Repository | License | Copyright (verbatim) | Assets/data copied |
|---|---|---|---|---|
| 1 | `EricEisaman/babylon-game-starter` | MIT | `Copyright (c) 2025-2026 Eric Eisaman` | **None** (remote model URLs are unlicensed third-party IP) |
| 2 | `scaleto/Thalvorn-FPS-Shooter` | MIT | `Copyright (c) 2026 Julio` | **None** (`soldier.glb`/env unattributed) |
| 3 | `eldinor/yuka-babylonjs-examples` | MIT | `Copyright (c) 2022 eldinor` | **None** (CC-BY-NC rifle, CC-BY models, unattributed audio/textures/navmeshes; package.json ISC vs root MIT mismatch — code under root MIT only) |
| 4 | `lanmower/Procedural-Cities` | MIT (`LICENCE.txt`) | `Copyright 2017 Tobias Elinder` | **No assets/data** (Font Awesome fonts SIL OFL/CC BY excluded). **Code transcribed → §7.1 Integration 3 (`kit/procgen.ts`). Clone is tampered — see §7.2; never executed.** |
| 5 | `jstrait/city-tour` | MIT | `Copyright (c) 2012-23 Joel Strait` | No assets/data (generated grid texture only). **Code transcribed → §7.1 Integration 3 (`kit/zoned.ts`).** |
| 6 | `cartesiancs/map3d` | MIT | `Copyright (c) 2025 cartesiancs` | **No OSM data** (ODbL, not MIT) |
| 7 | `yz4git/next-gen` (WorldSeed) | MIT | `Copyright (c) 2026 WorldSeed contributors` | **No OSM/Overture/Mapzen/PLATEAU data** (separate obligations) |
| 8 | `Robertg761/Repo-City` | MIT | `Copyright (c) 2026 Robert Gordon` | No assets/data (sounds synthesized, textures procedural). **Code transcribed → §7.1 Integration 3 (`kit/projectMapping.ts`).** |
| 9 | `CptNope/Survival-Game` | MIT | `Copyright (c) 2025 Survival Game` | None |
| 10 | `Mugen87/yuka` | MIT | `Copyright © 2023 Yuka authors` | None (npm `yuka@0.7.8` consumed unaltered) |
| 11 | `zeux/meshoptimizer` | MIT | `Copyright (c) 2016-2026 Arseny Kapoulkine` | None (npm `meshoptimizer@1.3.0`, devDependency, wasm) |
| 12 | `donmccurdy/glTF-Transform` | MIT | `Copyright (c) 2024 Don McCurdy` | None (npm `@gltf-transform/*@4.5.1`, devDependencies) |

### 7.1 Transcription records (appended per integration)

Each row records: original repo · author · license · source file(s) · local
destination · modifications · dependencies · tests.

**Integration 1 — living-world simulation core (2026-11-11, verified)**

| Item | Detail |
|---|---|
| Original repo / author | `Mugen87/yuka` — Mugen87 — MIT — `Copyright © 2023 Yuka authors` |
| Source consumed | npm `yuka@0.7.8` (unaltered): `EntityManager`, `GameEntity`, `MovingEntity`, `Vehicle`, `CellSpacePartitioning`, `SteeringManager`, `SeekBehavior`/`ArriveBehavior`/`SeparationBehavior`/`CohesionBehavior`/`AlignmentBehavior`/`WanderBehavior`, `Vector3`/`Quaternion`/`Matrix4`. API verified against clone `src/core/*`, `src/steering/*`, `src/partitioning/*`, `src/math/*`. |
| Local destination | `src/simulation/agents/{spatialIndex,simulationWorld,vehicleAgent}.ts` (typed wrappers); `src/simulation/agents/yuka.d.ts` (ambient types — yuka ships no `.d.ts`). |
| Modifications | Reboot-original wrappers: mandatory `CellSpacePartitioning` (avoids yuka's O(n²) fallback), `SimulationWorld` container, vehicle/steering factories. No upstream source text altered; library consumed from npm. |
| Tests | `src/simulation/agents/agents.test.ts` — spatial-index correctness vs brute force, determinism, seek/arrive convergence, neighbor queries. |

| Item | Detail |
|---|---|
| Original repo / author | `eldinor/yuka-babylonjs-examples` — eldinor — MIT — `Copyright (c) 2022 eldinor` |
| Source file | `examples/js/steering/flocking/index.js:132-138` (`sync` function) |
| Local destination | `src/simulation/agents/syncBabylon.ts` |
| Modifications | **Transcribed and modified:** typed (`BabylonMatrixLike`/`BabylonMeshLike`), reusable `BABYLON.Matrix` injected by caller, no `@babylonjs/core` import in the core (node-testable). Header carries the upstream notice and "modified from" statement. Requires `scene.useRightHandedSystem = true`. **No CC-BY/CC-BY-NC assets copied.** |
| Tests | `agents.test.ts` — Three/Babylon sync matrix parity vs `entity.worldMatrix`. |

| Item | Detail |
|---|---|
| Original repo / author | Reboot-original adapter using yuka's `setRenderComponent` pattern (Mugen87/yuka, MIT) + `three` (MIT, §1). |
| Local destination | `src/simulation/agents/syncThree.ts` |
| Modifications | Composes entity transform into `InstancedMesh.setMatrixAt` — Reboot's existing `CityTraffic` batch path; shared scratch objects (no per-frame GC). |
| Tests | `agents.test.ts` — bind/sync fires on `world.update`, flush bumps `instanceMatrix.version`. |

Verification: `npm run typecheck` clean; full suite 240 passed / 2 skipped (all
pre-existing tests preserved, +8 new). No engine replaced; no new rendering engine.

**Integration 2 — lane-following district traffic on the yuka core (2026-11-11, verified)**

| Item | Detail |
|---|---|
| Original repo / author | `Mugen87/yuka` — Mugen87 — MIT — `Copyright © 2023 Yuka authors` |
| Source consumed | npm `yuka@0.7.8` (unaltered): `Vehicle`, `EntityManager`, `CellSpacePartitioning`, `SteeringManager`, `SeekBehavior`/`ArriveBehavior`/`SeparationBehavior`, `Vector3`/`Quaternion`. The traffic core subclasses `Vehicle` and drives it through the same `SimulationWorld`/`SpatialIndex` wrappers recorded in Integration 1. |
| Local destination | `src/simulation/traffic/{roadNetwork,trafficSimulation,index}.ts` (renderer-agnostic core); `src/planet/modules/cityworld/environment/CityTraffic.tsx` (Three adapter, rewritten in place); `src/planet/worlds/kit/heightfield.ts` (behavior-preserving `groundSampler` extraction). |
| Modifications | Reboot-original lane graph built from each district's ACTUAL `groundPlan` streets (snap-merged nodes, right-hand lane offset, per-kind speed factors, bridge decking). Reboot-original IDM car-following + junction right-of-way + deterministic seeded routing + fixed-step accumulator with render interpolation + distance-based LOD. No upstream source text altered; yuka consumed from npm. `CityTraffic` keeps its three existing `InstancedMesh` batches (body/headlights/taillights), `setMatrixAt`/`setColorAt`, materials, draw-call count, density and `useFrame`; body transforms now written through the Integration-1 `syncThree` adapter. The old circular-orbit traffic was removed, not duplicated. |
| Technique references (no source text copied) | IDM car-following is Treiber et al.'s published model (2000), re-derived in Reboot's own TypeScript. Lane-path and road-graph shapes were cross-checked against the planned references `scaleto/Thalvorn-FPS-Shooter` (§3.7) and `yz4git/next-gen` (§3.3); neither contributed copied code or data. |
| Tests | `src/simulation/traffic/roadNetwork.test.ts` (9) — every one of the 11 districts yields a non-empty drivable graph, lane geometry, determinism. `src/simulation/traffic/trafficSimulation.test.ts` (16) — spawning, lane following, route continuation, separation, collision avoidance, intersection yielding, determinism, disposal, Three instance sync, 200-vehicle/120-step performance budget, all 11 districts run finite on-road traffic. |

Verification: `npm run typecheck` clean; full suite **265 passed / 2 skipped** (22
files; all 240 pre-existing tests preserved, +25 new traffic tests). Production
build `vite build` succeeded (6m 7s, no errors). No engine replaced; the 11
districts remain R3F/Three and Zero Hub remains Babylon; no new rendering engine
and no duplicate traffic system.

**Integration 3 — repo-driven district ground generators (2026-11-13, verified)**

The eleven districts previously shared three Reboot-original plan generators, so
they read as one city in eleven colour schemes. The ground plan now dispatches the
reference repositories' OWN generators, transcribed into the kit and parameterised
per district. Each derived file carries the upstream copyright header and a
"transcribed from … not a reimplementation" notice. Health keeps its own canal-ring
generator; the original Reboot generators are retained, exported, as a fallback
library (no longer dispatched). Per-city roof language, palette, terrain,
atmosphere, landmarks and the metropolis backdrop are unchanged.

| Item | Detail |
|---|---|
| Original repo / author | `lanmower/Procedural-Cities` (fork of `magnificus/Procedural-Cities`) — Tobias Elinder — MIT (`LICENCE.txt`) — `Copyright 2017 Tobias Elinder` |
| Source files | `docs/js/{noise,utils,roadGen,plotGen,buildingGen,main}.js` — **read only**; the clone is tampered (§7.2) and was **never executed**. |
| Local destination | `src/planet/worlds/kit/procgen.ts` (`proceduralPlan`); dispatched in `ground.ts` for six organic districts: AI, Graveyard, Legend, Creator, IdeaHub, Space. |
| Modifications | **Transcribed and modified:** SimplexNoise + mulberry32 (noise.js) and the polygon toolkit (utils.js) verbatim; `generateRoads` priority-queue heatmap growth (roadGen.js / upstream Spawner.cpp); `extractPlots` edge-offset block extraction (plotGen.js); `recursiveSplit` longest-edge subdivision + log-distribution `getHeight` (buildingGen.js). Adaptations: internal units U=300/world-unit auto-fitted to district `reach`; area constants normalised (S=900/cell²) so the demo's block grain holds at any step; degenerate road stubs <0.6 units filtered to meet the ground contract; per-plot footprint via repo-city DNA; optional processional spine (Legend). No `Math.random`/`Date.now`. |
| Dependencies | `kit/projectMapping.ts` (repo-city `footprintDNA`); Reboot `ground.ts` contract types (type-only). |
| Tests | `src/planet/worlds/kit/procgen.test.ts` (6 organic probes: determinism, dense mesh, contract shape) + `ground.test.ts` (dispatched contract + draw budget). |

| Item | Detail |
|---|---|
| Original repo / author | `jstrait/city-tour` — Joel Strait — MIT — `Copyright (c) 2012-23 Joel Strait` |
| Source files | `src/generators/{circle_growth_road_generator,zoned_block_generator,buildings_generator}.js`, `src/math.js`, `src/app/city_config_service.js` (defaults). |
| Local destination | `src/planet/worlds/kit/zoned.ts` (`zonedPlan`); dispatched in `ground.ts` for four zoned districts: Gaming, Education, Community, Robotics. |
| Modifications | **Transcribed and modified:** `CircleGrowthRoadGenerator` recursive grid flood-fill (axes guaranteed, `probabilityOfBranching` decay beyond `safeFromDecayBlocks`); `ZonedBlockGenerator` nine authored `BLOCK_LAYOUTS` (1/2/2/3/4/5/14/12/18 lots), building-probability and max-storey pow·9 falloff, lot caps 4/10/∞; `BuildingsGenerator.generateBuildingOnLot` (probability + adjacent-road gate + `randomInteger` storeys + tall-building antenna draw). Adaptations: one seeded mulberry32 stream replaces `Math.random`; flat-land growth (Reboot seats massing on its carved ground at render time); integer grid scaled to `reach`; storey height via Reboot's shared `plotHeight` envelope; a `maxPlots` draw-budget governor curates the near street wall (the 600-800 background structures remain the metropolis backdrop's). |
| Dependencies | `kit/projectMapping.ts` (repo-city `mulberry32`, `footprintDNA`, `Prng`); Reboot `ground.ts` contract types (type-only). |
| Tests | `src/planet/worlds/kit/zoned.test.ts` (4 zoned probes) + `ground.test.ts`. |

| Item | Detail |
|---|---|
| Original repo / author | `Robertg761/Repo-City` — Robert Gordon — MIT — `Copyright (c) 2026 Robert Gordon` |
| Source files | `lib/city/prng.ts` (cyrb53 + mulberry32), `lib/city/generator.ts` (`TIER_HEIGHT`, `MIN_FOOTPRINT`, `MAX_FOOTPRINT`, `desiredFootprint`, `makeBuilding` footprint wobble). |
| Local destination | `src/planet/worlds/kit/projectMapping.ts` (`hashString`, `mulberry32`, `prngFromString`, `desiredFootprint`, `footprintDNA`). |
| Modifications | **Transcribed and modified:** cyrb53 string hash (bryc, public domain) and mulberry32 PRNG verbatim from prng.ts; the tier height band, 4..8.5 footprint band, `desiredFootprint` share-of-band expression and `makeBuilding`'s ±8% footprint wobble / cell fit reproduced as `footprintDNA`. Decoupled from upstream's `RepoAnalysis`/`BuildingPlan`/`SettlementParams` (the React/Next.js settlement model is **not** imported); only the renderer-agnostic numeric core is lifted. No `Math.random`/`Date.now`/global state: same key → same footprint. |
| Dependencies | None (pure numeric core). Consumed by `procgen.ts` and `zoned.ts`. |
| Tests | Determinism exercised through `procgen.test.ts`, `zoned.test.ts`, `ground.test.ts` (same key → same footprint; plans byte-identical across calls). |

Verification: `tsc --noEmit -p tsconfig.app.json` clean; full suite **275 passed /
2 skipped** (24 files; all 265 prior tests preserved, +10 generator probes; the two
skips are pre-existing sibling-checkout guards). `vite.config.ts` `testTimeout`
raised 5s→20s because the generation-heavy correctness tests (double-build
determinism + pairwise separation over 600-800 lots, now plus organic/zoned mesh
growth) contend under vitest's parallel forks — no assertion weakened. Production
build `vite build` succeeded (6m 16s, no errors). Draw budget per district
≤6000 parts / ≤45 batches (measured 4215-5968; metropolis backdrop unchanged). No
engine replaced: the 11 districts remain R3F/Three, Zero Hub remains Babylon.

### 7.2 Safety exclusions (hard rules)

- **procedural-cities clone is tampered.** Single shallow commit
  `7656689 "security: remove the HiddenSpawn dropper and its launcher"`. Its
  `.claude/hooks/stop-hook-git.js` runs `execSync` from `child_process`;
  `.claude/hooks/pre-tool-use-hook.js` intercepts/blocks agent tools;
  `.claude/skills/code-search` forces `bun x codebasesearch`. **Never execute any
  file from this clone.** Only `docs/js/*.js` city-generation algorithms are read
  and transcribed; `.claude/` and Font Awesome fonts are excluded.
- **Geospatial data is not MIT.** map3d (OSM/ODbL) and next-gen
  (OSM/Overture/Mapzen/PLATEAU) algorithms are reused; **no such data is bundled**.
  Any future import carries its own attribution and license.
- **Root license ≠ bundled art.** CC-BY / CC-BY-NC / unattributed models, audio and
  textures in repos 1–4 are never copied. Only renderer-independent code is reused.
- **No relicensing.** Apache/GPL/CC-BY/ODbL content is never relabeled MIT. The
  GPL-conflicted `3d.city` reference (§2) remains no-code-transcribed.

---

## Appendix A — MIT License (applies to every MIT component listed above)

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The copyright lines in §1–§4 are the "above copyright notice" for each
respective component.

## Appendix B — Apache License 2.0

Applies to: `@babylonjs/core`, `@babylonjs/loaders`, `@babylonjs/materials`,
`@dimforge/rapier3d-compat`, `AskAlice/threejs-worldgen` (adapted techniques,
changes stated in §2), `@electric-sql/pglite` (dev), and
`ssatguru/BabylonJS-CharacterController` if ever adopted.

```
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

## Appendix C — SIL Open Font License 1.1 (bundled fonts)

Applies to `public/fonts/Inter-Medium.ttf` and `public/fonts/Orbitron-Bold.ttf`.
Per-font copyright notices, verbatim from each font's embedded `name` table and
upstream license file:

```
Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)

Copyright 2018 The Orbitron Project Authors (https://github.com/theleagueof/orbitron), with Reserved Font Name: "Orbitron"
```

The license body below is reproduced verbatim from Inter's upstream
`LICENSE.txt`. Orbitron is licensed under the identical OFL 1.1 terms; its
exact upstream text (which differs only in line-wrap whitespace) ships beside
the font as `Orbitron-OFL.txt`, and Inter's as `Inter-OFL.txt`. The copyright
lines above are the "above copyright notice" required by condition 2.

```
-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION AND CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```