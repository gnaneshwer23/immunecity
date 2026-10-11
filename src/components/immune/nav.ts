export const NAV_GROUPS = [
  { label: "Foundations", items: [
    { n: "01", path: "/", title: "Overview", desc: "The spine, the layers and curated routes." },
    { n: "02", path: "/learn", title: "Cell atlas", desc: "The residents, their metaphors and their limits." },
    { n: "03", path: "/mechanism", title: "Mechanism", desc: "Step-by-step cascades and perturbations." },
  ] },
  { label: "Explore", items: [
    { n: "04", path: "/graph", title: "Knowledge graph", desc: "Every concept and typed causal link." },
    { n: "05", path: "/simulator", title: "System simulator", desc: "Run infections, host states and treatments over time." },
    { n: "06", path: "/dynamics", title: "Dynamics", desc: "Tissues, metabolism and genetics." },
  ] },
  { label: "Clinical", items: [
    { n: "07", path: "/disease", title: "Disease", desc: "Hypersensitivity and the cancer immunity cycle." },
    { n: "08", path: "/therapy", title: "Therapy", desc: "Every intervention, its targets and its trials." },
    { n: "09", path: "/evidence", title: "Evidence", desc: "Trials as experiments." },
    { n: "10", path: "/patient", title: "Patient", desc: "Rank therapies against patient features." },
  ] },
  { label: "Frontier", items: [
    { n: "11", path: "/reasoning", title: "Reasoning", desc: "Cases and the path tracer." },
    { n: "12", path: "/research", title: "Research", desc: "Open questions and the curation roadmap." },
  ] },
] as const;

type NavItem = (typeof NAV_GROUPS)[number]["items"][number];
export const ALL_NAV: readonly NavItem[] = NAV_GROUPS.flatMap((g) => g.items as readonly NavItem[]);
