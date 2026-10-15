---
name: relations
description: Port ANA's item relations — a NodeRel (SQLite) graph over the ANA's own items with explicit links (SPAWNED, SCHEDULED_AS, REFERS_TO) and derived day links (DUE_ON, ON), relation chips on each item, the Relations tab (flow graph, "where the flow breaks", vocabulary) and /api/graph + /api/link for the agent. Use when the user says "관계", "NodeRel", "메모에서 할일로", "연결 관계", "흐름이 끊긴 곳", "Relations 탭", or when ana-update reports relations missing.
---

# relations — how one thing led to another

state.json stays the **source of truth**, including a `links[]` array. `graph.sqlite` is a **derived index**, built by NodeRel from a snapshot of the state and rebuilt whenever the snapshot signature changes. So any write path (UI, agent diff, hand edit) is covered, and the index can be deleted at any time.

## Vocabulary (base ANA)

| Relation | From → To | Meaning | Kind |
|---|---|---|---|
| `SPAWNED` | Note → Task · Event | where a task/event came from | explicit |
| `SCHEDULED_AS` | Task → Event | time blocked to do the task | explicit |
| `REFERS_TO` | any → any | manual reference | explicit |
| `DUE_ON` | Task → Day | from `task.due` | derived |
| `ON` | Event → Day | from `event.date` | derived |

**A per-user ANA has different items.** Define its own vocabulary in `graph.js`: `RULES` (explicit types with allowed from/to kinds), `MEANINGS`, `kindOf()`, and `snapshot()` (which arrays become which kinds, and which fields derive which links). Keep the shape: explicit links live in `state.links[]`, derived ones are computed in `snapshot()`.

## Pieces

| Piece | Upstream |
|---|---|
| Graph module | `graph.js` (copy, then adapt `RULES / MEANINGS / TITLES / kindOf / snapshot` to the domain). Exports `createGraph, snapshot, checkLink, addLink, removeLink, pruneLinks`. Silences only Node's "SQLite is experimental" warning while loading NodeRel. |
| Dependency | `"@tykimos/noderel": "github:tykimos/NodeRel#<sha>"`, resolved over **https** in `package-lock.json` (ssh breaks installs without GitHub keys). Needs **Node ≥ 24** (`node:sqlite`). |
| API | `/api/state` returns `links`. `GET /api/graph`, `/api/graph/neighbors?id=`, `/api/graph/trace?id=&depth=&types=`, `/api/graph/schema` (AI-readable vocabulary). `POST /api/link {action:add\|remove, from, to, type}` is validated by `checkLink`. Create routes accept `from` and auto-link (`linkFrom`). `pruneLinks` runs before every save. `graph.close(ws)` runs on workspace delete. |
| UI | Relation chips on items (`function relChips`, "From note · Scheduled · Refers to" with ✕). Clicking a chip calls `gotoNode(id)` (switches tab, `flash()`es the target). `openLinkModal` / `renderLinkList` handle manual links. Relations tab: `#relationsView`, `renderRelations`, `drawRelGraph` (4 columns, bezier edges colored by type, hover dims unrelated nodes, click navigates), `renderRelStats` (gaps), `#relVocab`. |
| Seed | `seed.js`: two example flows so the graph isn't empty on first run (`ANA_SEED=0` disables). |

## Analysis: ontology and knowledge graph

**Analyze** (top right of the Relations tab) asks the agent to read the user's own items and extract structure that isn't written down yet.

1. **Pick targets:** in the modal (`#anaModal`), choose notes / tasks / events (with counts), optionally only open ones, and an optional focus such as "people, organizations, places". `POST /api/analysis/start` creates a job with the item ids; one job runs at a time. The page then sends the agent an `[Analyze]` chat instruction with the exact curls, including `?ws=` so the reports reach the same workspace.
2. **Agent work:** the agent reads `GET /api/analysis/input?id=` and reports `POST /api/analysis/progress {id, progress 0–99, step}`. The card shows a progress bar (indeterminate until the first report), the step, elapsed time, a "no update for 3 min" warning, Open chat, and Cancel.
3. **Result:** `POST /api/analysis/result {id, summary, ontology:{classes[{id,label,desc,parent}], relations[{id,label,domain,range,desc}]}, graph:{entities[{id,label,class,sources[]}], facts[{from,rel,to,sources[]}]}}`. `cleanAnalysis` caps sizes, drops facts whose ends don't exist, drops sources that aren't items of the job, and clears unknown parents. `POST /api/analysis/fail {id, reason}` and `/cancel` end a job. Jobs live in `analysis.json` next to the workspace state (last 10).
4. **Display:** two views behind a switch.
   - **Ontology:** the class tree with a color per class, plus a relation-type table (From → To, uses).
   - **Knowledge graph:** an SVG force layout (Fruchterman–Reingold on unique pairs, fit to the frame, then a spacing pass so labels don't collide; edge labels are hidden above 30 facts until an entity is selected). Tapping an entity shows its facts and source chips that jump to the item (`gotoNode`).
5. **Fit to the ontology:** `cleanAnalysis(body, itemIds, base)` also checks that each `entity.class` and `fact.rel` exists (in the result or the workspace ontology) and that each fact respects its relation's `domain → range`, sub-classes included (`isA` walks `parent`). Misfit facts are dropped, unknown entity classes are cleared, and every case is returned as `issues` (shown under "N items didn't fit the ontology").
6. **Ontology carries over:** `mergeOntology` folds each result into `analysis.json`'s `ontology` (by id; latest description wins). `/api/analysis/start {useBase}` (default on when one exists) hands it to the agent in `/api/analysis/input` as `ontology`. Reused classes/relations are copied into the job marked `inherited` ("(earlier)"). `POST /api/analysis/ontology/reset` starts fresh.
7. **Into NodeRel:** `createGraph({ …, loadKg })` adds the latest done job to the workspace snapshot: entities as `kg:<id>` with kind = class (`kgKind` renames Note/Task/Event/Day), facts typed by relation id (`kgType` avoids base names), and `MENTIONED_IN` entity → source item. `view()` and `stats()` keep only the base vocabulary so the Links chart is unchanged; `neighbors`, `trace` and `describe` (`vocabulary`, `knowledgeGraph`) include the KG.
8. **Export / OntoAir:** `analysisTurtle` writes OWL Turtle — classes (`rdfs:subClassOf`), object properties (`rdfs:domain/range`), individuals typed by class with `rdfs:label`, and facts. Local names are sanitized (Unicode letters kept), and `#` in literals becomes `＃` because line-based parsers (OntoAir's included) strip from `#`. `GET /api/analysis/ttl?id=` downloads it. `POST /api/analysis/share {id}` returns a 24-hour token path `/api/analysis/shared/<40 hex>/ana-analysis-<id>.ttl`, served without sign-in with `Access-Control-Allow-Origin: *`; `HEAD /api/analysis/share-access?t=` answers 204/404 so a sign-in gateway can let only valid tokens through. `openInOntoAir` fetches the TTL itself (signed in) and opens `https://poc.aifactory.space/ontoair/#` + `encodeURIComponent('data:text/turtle;charset=utf-8,' + encodeURIComponent(ttl + '\n# ') + '/ana-analysis-<id>.ttl')`. OntoAir fetches whatever URL is in its hash, so the data URL works behind any sign-in gateway and needs no OntoAir change: the `?_t=…` it appends lands in the trailing comment line, and the final `/name.ttl` gives it the format and the file name. Only when the link would exceed `ONTOAIR_MAX_URL` (1.5 MB) does it fall back to the token link (probed without cookies), then to downloading the file for 📄 File.

## Porting

1. Add the dependency (https URL). Check `node -v` ≥ 24. Copy `graph.js` and adapt the vocabulary to the domain. Write the vocabulary table for the user first and confirm it.
2. Add `links: []` to the target's state schema. Call `pruneLinks` in its save path.
3. Add the routes to the extraApi module; add `graph.view(ws, s)` output to its state endpoint.
4. UI: relation chips on the domain's item cards, `gotoNode` for the domain's tabs, and the Relations view. If the target has app-shell areas, it goes under **System**.
5. Tests: port G1–G4 and C14 from upstream `test.cjs`. They cover snapshot/day nodes, link rules, prune, rebuild-on-change, and route integration.

## Verify

- Create an item from another item → the chip appears on both ends → click it to jump.
- Delete one end → the link is gone after save.
- Edit state.json by hand → the next `/api/graph` reflects it (rebuild).
- Relations tab: hovering highlights the chain; "Where the flow breaks" lists items with no follow-up.
