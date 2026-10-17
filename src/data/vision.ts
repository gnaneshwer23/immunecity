/** ISI vision copy — sourced from "Immune Super Intelligence (ISI): The Vision". */

export const VISION_HEADLINE = "Making the immune system understandable, connected and investigable.";
export const VISION_STATEMENT =
  "We are building an evidence-aware scientific intelligence platform that connects immunology's mechanisms, diseases, therapies, data and research into one explorable system.";
export const VISION_CORE = "Move immunology from fragmented information to connected understanding — and from connected understanding to scientific discovery.";
export const VISION_MOTTO = ["Learn", "Explore", "Investigate", "Discover"] as const;

export const ISI_LAYER = {
  title: "Immune Super Intelligence",
  role: "The intelligence engine",
  points: ["Scientific reasoning", "Evidence intelligence", "GraphRAG", "AI orchestration", "Evaluation", "Research workflows"],
};
export const CITY_LAYER = {
  title: "Immune City",
  role: "The scientific knowledge environment",
  copy: "A connected immunology atlas where users explore cells, molecules, receptors, pathways, mechanisms, diseases, biomarkers, therapies, trials and research.",
  modes: [
    { label: "Learn", copy: "Understand biology" },
    { label: "Explore", copy: "Trace mechanisms" },
    { label: "Investigate", copy: "Develop hypotheses" },
  ],
};

export const DIFFERENTIATORS = [
  { k: "A", title: "A connected biological model", copy: "Not another collection of articles — a multi-layer model connecting entities, mechanisms, contexts and consequences." },
  { k: "B", title: "Evidence-aware scientific intelligence", copy: "Answers trace back to real sources, distinguishing association from causation and hypothesis from validated finding." },
  { k: "C", title: "An investigation workbench", copy: "Map mechanisms, compare explanations, identify evidence gaps and prepare experiments for human review." },
  { k: "D", title: "Learning through exploration", copy: "Build causal understanding by navigating biology and testing reasoning, not memorising isolated facts." },
];

export const STAGES = [
  { n: 1, title: "Build the scientific foundation", copy: "Ontology, knowledge graph, typed relationships, provenance, evidence labels and curated content.", now: "In progress — curated graph and evidence lifecycle live; citation coverage still sparse." },
  { n: 2, title: "Make the knowledge explorable", copy: "Cell atlas, mechanism explorer, disease and therapy connections, causal pathways, learning journeys.", now: "Early — graph, mechanisms and Academy foundation track available." },
  { n: 3, title: "Add evidence-grounded intelligence", copy: "Reliable retrieval, GraphRAG, cited Q&A, evidence comparison, uncertainty-aware synthesis.", now: "Prototype — Ask retrieves from the graph with guardrails; not yet fully evidence-grounded." },
  { n: 4, title: "Support scientific investigation", copy: "Hypothesis generation, multi-source synthesis, dataset analysis, experiment planning — with human review.", now: "Ambition — research workbench is an early scaffold." },
];

export const AUDIENCES = [
  { who: "Students and educators", what: "Learn immunology as a connected system." },
  { who: "Immunologists and biomedical researchers", what: "Explore mechanisms, literature and unresolved questions." },
  { who: "Translational scientists and drug-discovery teams", what: "Connect mechanisms with biomarkers, targets, therapies and trials." },
  { who: "Computational biologists and AI researchers", what: "Combine structured knowledge, datasets and AI methods." },
  { who: "Scientific institutions and collaborators", what: "Contribute reviewed knowledge, evidence and workflows." },
];

export const NOT_LIST = [
  "An AI chatbot with an immunology theme.",
  "A conventional course website with videos and quizzes.",
  "A graph visualisation with no meaningful scientific provenance.",
  "A literature search engine that returns papers without connecting their mechanisms.",
  "A clinical diagnosis or treatment tool without validation, governance and regulatory assessment.",
];

export const NORTH_STAR = [
  { step: "Explore the relevant cells, receptors, signalling pathways and context.", path: "/learn" },
  { step: "Trace the proposed causal mechanism through Immune City.", path: "/graph" },
  { step: "Inspect the evidence supporting and challenging each relationship.", path: "/evidence" },
  { step: "Connect the mechanism to disease, biomarkers, therapies and trials.", path: "/therapy" },
  { step: "Identify missing evidence and competing explanations.", path: "/reasoning" },
  { step: "Formulate a research hypothesis and a possible experiment.", path: "/research-workbench" },
  { step: "Return new findings to the research workflow for review.", path: "/research" },
] as const;
