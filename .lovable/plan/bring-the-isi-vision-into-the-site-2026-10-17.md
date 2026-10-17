# Bring the ISI Vision into the site

## 1. Save the vision as guidance
- Store the vision as the product's north star: ISI is the intelligence engine and Immune City is the knowledge world. AI sits on top of evidence. It is not a chatbot, a course site, or a clinical tool. The motto is "Learn. Explore. Investigate. Discover."
- Future work gets checked against it.

## 2. New Vision page (/vision)
Sections, using wording from the document:
- Hero: "Making the immune system understandable, connected and investigable" and the vision statement.
- ISI vs Immune City: two panels showing the engine and the world (Learn, Explore, Investigate).
- The 15-step chain: the interactive chain from step 4.
- What makes ISI different: four cards (A–D).
- Four-stage roadmap: each stage is clearly marked as an ambition, with honest "where we are now" notes.
- Who it's for: five audiences.
- What ISI is not: five items.
- North-star journey: seven steps, each linked to the matching existing page (graph, evidence, therapy, research workbench).
- Add a "Vision" link to the main menu and footer.

## 3. Homepage rework
- Add a short "ISI + Immune City" band right after the hero.
- Add a compact version of the interactive chain.
- Add a "Learn. Explore. Investigate. Discover." band linking to the Learn, Graph, Research workbench and Vision pages.
- Keep the existing hero, how-it-works, exemplar pathways and trust sections. Tighten the wording to match the vision.

## 4. Interactive causal spine
- One reusable chain of the 15 steps, built from the steps already in the knowledge graph. It shows the "AI" label and the loop from Discovery back to Trigger.
- Clicking a step shows the document's question for that step, the number of graph items at that stage, and a few examples. It also offers a "Trace in graph" link that opens the graph filtered to that stage.
- Works with keyboard and screen readers. On phones the chain wraps instead of scrolling sideways.

## Technical details
- New `src/components/immune/CausalSpine.tsx` (`compact` prop). It uses `KG.core_spine`, `spineLabel`, and a new `SPINE_QUESTION` map in `engine.ts`. Stage counts come from nodes grouped by spine stage. If the node field turns out not to exist, it falls back to showing only the questions.
- New `src/routes/vision.tsx` with `seoHead`. Vision copy goes in `src/data/vision.ts`. Nav entries go in `Shell.tsx`.
- `src/routes/index.tsx` gets the new sections. Existing ones stay as they are.
- Check `graph.tsx` for an existing stage filter search param. Add an optional `?stage=` param if it is missing.
- Memory: `mem://product/vision` plus an index entry.
- Add a small test that the spine renders exactly 15 steps and that MODEL is shown as "AI".
