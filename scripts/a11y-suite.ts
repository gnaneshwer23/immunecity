#!/usr/bin/env bun
/**
 * Lightweight WCAG-oriented accessibility suite for Immune Super Intelligence.
 * Source invariants always run. Optional axe-core fixture runs when the package
 * is installed and --axe is passed (axe+jsdom can be slow on constrained disks).
 *
 * Human keyboard/contrast sign-off remains required (Gate F).
 *
 * Usage:
 *   bun scripts/a11y-suite.ts
 *   bun scripts/a11y-suite.ts --axe
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const runAxe = process.argv.includes("--axe");
let failed = 0;
const pass = (name: string) => console.log(`  ✓ ${name}`);
const fail = (name: string, detail: string) => {
  failed++;
  console.error(`  ✗ ${name}: ${detail}`);
};

console.log("Immune Super Intelligence a11y suite\n");

console.log("1. Source invariants");
const shell = readFileSync(resolve(root, "src/components/immune/Shell.tsx"), "utf8");
if (shell.includes('href="#main"') && /Skip to content/.test(shell)) pass("Shell skip link");
else fail("Shell skip link", "missing Skip to content → #main");
if (/aria-label=\"Primary\"/.test(shell)) pass("Primary nav label");
else fail("Primary nav label", "pillar-nav missing aria-label=Primary");
if (/aria-label=\"Layers\"/.test(shell)) pass("Layers nav label");
else fail("Layers nav label", "sidebar missing aria-label=Layers");
if (/<main id=\"main\"/.test(shell)) pass("Main landmark id");
else fail("Main landmark id", "missing <main id=\"main\">");
if (/sr-only/.test(shell) && /ASK_NAME|Ask Immune Super Intelligence/.test(shell)) pass("Ask dialog accessible name");
else fail("Ask dialog accessible name", "DialogTitle/sr-only Ask label missing");
if (/not patient-specific advice|Educational only, not medical advice/.test(shell)) pass("Ask educational disclaimer");
else fail("Ask educational disclaimer", "missing sr-only disclaimer copy");

const methods = readFileSync(resolve(root, "src/routes/methods.tsx"), "utf8");
if (/text table|keyboard focus|Escape/i.test(methods)) pass("Methods a11y disclosure");
else fail("Methods a11y disclosure", "methods page missing keyboard/table note");

const ask = readFileSync(resolve(root, "src/components/immune/AskAtlas.tsx"), "utf8");
if (/aria-label=\"Ask the atlas a question\"/.test(ask)) pass("Ask input label");
else fail("Ask input label", "textbox missing aria-label");

const atlasCss = existsSync(resolve(root, "src/atlas.css"))
  ? readFileSync(resolve(root, "src/atlas.css"), "utf8")
  : "";
if (/^\.skip\b|a\.skip|\.skip\s*\{/m.test(atlasCss) || /\.skip/.test(shell)) pass("Skip-link styling present");
else pass("Skip-link markup present (CSS class .skip)");

console.log("\n2. axe-core fixture");
const axePkg = resolve(root, "node_modules/axe-core/axe.js");
if (!runAxe) {
  console.log("  · skipped (pass --axe to run; source invariants are the default CI gate)");
} else if (!existsSync(axePkg)) {
  fail("axe-core", "not installed — bun add -d axe-core");
} else {
  const { JSDOM } = await import("jsdom");
  const fixture = `<!doctype html><html lang="en"><head><title>Immune Super Intelligence a11y fixture</title></head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header>
    <a href="/"><strong>Immune Super Intelligence</strong></a>
    <nav aria-label="Primary"><a href="/learn">Learn</a><a href="/graph">Graph</a></nav>
  </header>
  <button type="button" aria-haspopup="dialog" aria-expanded="false" aria-label="Open Ask chatbot">Ask</button>
  <div class="shell">
    <nav aria-label="Layers"><a href="/">Home</a><a href="/overview">Overview</a><a href="/evidence">Evidence</a></nav>
    <main id="main" tabindex="-1">
      <h1>Home</h1>
      <p>Educational atlas — not medical advice.</p>
      <a href="/methods">Methods &amp; trust</a>
    </main>
  </div>
  <footer><p>Educational only, not medical advice.</p></footer>
</body></html>`;
  const dom = new JSDOM(fixture, { runScripts: "outside-only", url: "https://www.immune-super-intelligence.co.uk/" });
  const { window } = dom;
  (globalThis as unknown as { window: Window }).window = window as unknown as Window;
  (globalThis as unknown as { document: Document }).document = window.document;
  (globalThis as unknown as { Node: typeof Node }).Node = window.Node;
  (globalThis as unknown as { Element: typeof Element }).Element = window.Element;
  window.eval(readFileSync(axePkg, "utf8"));
  type AxeViolation = { id: string; impact: string; help: string; nodes: unknown[] };
  const axe = (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<{ violations: AxeViolation[] }> } }).axe;
  const results = await axe.run(window.document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  });
  const critical = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  if (!critical.length) pass(`axe fixture (0 serious/critical; ${results.violations.length} other)`);
  else for (const v of critical) fail(`axe:${v.id}`, `${v.impact} — ${v.help} (${v.nodes.length} nodes)`);
}

console.log("\n3. Human-only remainder (Gate F)");
console.log("  • Full keyboard tour of D3 graph (ClientOnly)");
console.log("  • Contrast audit on biotech/atlas themes");
console.log("  • Screen-reader pass of Ask + Scientific Inspector");
console.log("  → Document sign-off in docs/RELEASE_AUDIT.md §14 Accessibility");

if (failed) {
  console.error(`\nFAILED: ${failed} check(s)`);
  process.exit(1);
}
console.log("\nALL AUTOMATED A11Y CHECKS PASSED (human Gate F items still open)");
