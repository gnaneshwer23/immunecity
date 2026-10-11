export const NAV_GROUPS = [
  { label: "Foundations", items: [
    { n: "00", path: "/", title: "Home", desc: "Product landing — brand, purpose, and entry to the atlas." },
    { n: "01", path: "/overview", title: "Overview", desc: "Causal spine, layers, and where you are in the atlas." },
    { n: "02", path: "/learn", title: "Cell atlas", desc: "The residents, their metaphors and their limits." },
    { n: "03", path: "/mechanism", title: "Mechanism", desc: "Cascades, perturbations, and the Academy foundation track." },
  ] },
  { label: "Explore", items: [
    { n: "04", path: "/graph", title: "Knowledge graph", desc: "Every concept and typed causal link." },
    { n: "05", path: "/simulator", title: "System simulator", desc: "Run infections, host states and treatments over time." },
    { n: "06", path: "/dynamics", title: "Dynamics", desc: "Tissues, metabolism and genetics." },
  ] },
  { label: "Clinical", items: [
    { n: "07", path: "/disease", title: "Disease", desc: "Hypersensitivity and the cancer immunity cycle." },
    { n: "08", path: "/therapy", title: "Therapy", desc: "Every intervention, its targets and its trials." },
    { n: "09", path: "/evidence", title: "Evidence", desc: "Trials as experiments and live claim coverage." },
    { n: "10", path: "/patient", title: "Patient", desc: "Teaching scores from graph rules — educational, not personal advice." },
  ] },
  { label: "Frontier", items: [
    { n: "11", path: "/reasoning", title: "Reasoning", desc: "Ask, exemplars, cases and path tracer." },
    { n: "12", path: "/research", title: "Research", desc: "Workbench, lit candidates and model registry (partial)." },
  ] },
] as const;

type NavItem = (typeof NAV_GROUPS)[number]["items"][number];
export const ALL_NAV: readonly NavItem[] = NAV_GROUPS.flatMap((g) => g.items as readonly NavItem[]);
