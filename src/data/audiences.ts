/** Homepage audience starts. Every path is an existing page. Choices do not set a role. */

export const AUDIENCES = [
  {
    id: "student",
    label: "Student",
    to: "/academy",
    note: "Foundation track in the Academy. Intermediate and advanced tracks are not finished courses.",
  },
  {
    id: "educator",
    label: "Educator",
    to: "/learn",
    note: "Cell atlas for teaching. Educational pages, not a certificate.",
  },
  {
    id: "researcher",
    label: "Researcher",
    to: "/research",
    note: "Journal metadata and candidate claims. A person reviews them before anything enters the graph.",
  },
  {
    id: "clinician",
    label: "Clinician",
    to: "/disclaimer",
    note: "Read the educational limits. Not clinical decision support.",
  },
  {
    id: "industry",
    label: "Industry",
    to: "/collaborate",
    note: "Partnership enquiries. Not a regulatory or product-clearance claim.",
  },
  {
    id: "enthusiast",
    label: "Enthusiast",
    to: "/atlas",
    note: "Browse concept pages in the knowledge atlas.",
  },
] as const;

export type AudienceId = (typeof AUDIENCES)[number]["id"];
