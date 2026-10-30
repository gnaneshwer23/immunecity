export const NAV_GROUPS = [
  { label: "Foundations", items: [
    { n: "00", path: "/", title: "Home", desc: "Mission, pathways and how to begin." },
    { n: "01", path: "/overview", title: "Platform", desc: "Causal spine, twelve layers and featured pathways." },
    { n: "02", path: "/learn", title: "Cell atlas", desc: "Immune cell types, roles and teaching limits." },
    { n: "03", path: "/mechanism", title: "Mechanism", desc: "Cascades, perturbations and Academy lessons." },
  ] },
  { label: "Explore", items: [
    { n: "04", path: "/graph", title: "Knowledge graph", desc: "Typed concepts and directional causal links." },
    { n: "05", path: "/simulator", title: "System simulator", desc: "Infection, host state and treatment over time." },
    { n: "06", path: "/dynamics", title: "Dynamics", desc: "Tissues, metabolism and genetics." },
  ] },
  { label: "Clinical knowledge", items: [
    { n: "07", path: "/disease", title: "Disease", desc: "Hypersensitivity and the cancer immunity cycle." },
    { n: "08", path: "/therapy", title: "Therapy", desc: "Interventions, targets and linked trials." },
    { n: "09", path: "/evidence", title: "Evidence", desc: "Landmark trials and live claim coverage." },
    { n: "10", path: "/patient", title: "Patient", desc: "Rule-based teaching — not personalised advice." },
  ] },
  { label: "Frontier", items: [
    { n: "11", path: "/reasoning", title: "Reasoning", desc: "Exemplars, cases and path tracer — chat on Ask Immune." },
    { n: "12", path: "/research", title: "Research", desc: "Literature candidates, workbench and model registry." },
  ] },
] as const;

type NavItem = (typeof NAV_GROUPS)[number]["items"][number];
export const ALL_NAV: readonly NavItem[] = NAV_GROUPS.flatMap((g) => g.items as readonly NavItem[]);
