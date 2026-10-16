/* Immunology Academy — curriculum manifest (playbook Phase 5).
   Uses existing mechanism lessons; does not invent core-graph content.
   Progress is local/browser only — never claim server-backed completion. */

export type AcademyLevel = "foundation" | "intermediate" | "advanced";

export interface AcademyQuizItem {
  id: string;
  prompt: string;
  choices: string[];
  /** 0-based index into choices */
  correctIndex: number;
  rationale: string;
}

export interface AcademyModule {
  id: string;
  title: string;
  objectives: string[];
  /** Existing CONTENT.lessons id */
  lessonId: string;
  prerequisiteLessonIds: string[];
  /** Canonical KG concept IDs used in the lesson */
  graphIds: string[];
  /** Honest evidence posture for teaching — not Gate C coverage */
  evidenceNote: string;
  teachingSimplifications: string[];
  quiz: AcademyQuizItem[];
}

export interface AcademyTrack {
  id: string;
  title: string;
  level: AcademyLevel;
  summary: string;
  status: "scaffold" | "navigable";
  modules: AcademyModule[];
}

/** First shippable track: innate sensing → cytokines → inflammation. */
export const FOUNDATION_TRACK: AcademyTrack = {
  id: "foundation-innate-inflammation",
  title: "Foundation: innate sensing → cytokines → inflammation",
  level: "foundation",
  summary:
    "One navigable beginner path through existing Mechanism lessons. Teaching simplifications are labelled; claim-level Gate C coverage is separate and may still be sparse.",
  status: "navigable",
  modules: [
    {
      id: "mod-innate-sensing",
      title: "Innate sensing (TLR4 → NF-κB)",
      objectives: [
        "Trace LPS recognition to NF-κB-driven inflammatory transcription.",
        "Distinguish MyD88 vs TRIF branches as a teaching scaffold.",
        "Name one clinical timing lesson from failed TLR4 blockade in sepsis.",
      ],
      lessonId: "tlr4",
      prerequisiteLessonIds: [],
      graphIds: ["R001", "P001", "M001", "M003", "M002"],
      evidenceNote:
        "Lesson content is curated teaching material. Relationship-level approved cites on linked edges are independent of Academy progress.",
      teachingSimplifications: [
        "Cascades are linearised; real cells run parallel and feedback pathways.",
        "LPS→TLR4 is the archetype, not every innate sensor.",
      ],
      quiz: [
        {
          id: "q-tlr4-myd88",
          prompt: "Which adaptor initiates the early Myddosome after TLR4 ligation at the plasma membrane?",
          choices: ["TRIF", "MyD88", "STING", "MAVS"],
          correctIndex: 1,
          rationale: "MyD88 recruits IRAK kinases at the plasma membrane; TRIF is the later endosomal branch.",
        },
        {
          id: "q-tlr4-output",
          prompt: "Which outputs are driven quickly by NF-κB after TLR4 signalling?",
          choices: [
            "Only type I interferon",
            "TNF, IL-6, pro-IL-1β and chemokines",
            "Only antibody class switch",
            "Only MHC class I peptide loading",
          ],
          correctIndex: 1,
          rationale: "NF-κB drives a rapid inflammatory cytokine/chemokine programme; IFN-β is more TRIF/IRF3-biased.",
        },
      ],
    },
    {
      id: "mod-cytokine-il6",
      title: "Cytokine networks (IL-6 chain)",
      objectives: [
        "Explain classical vs trans IL-6 signalling at a teaching level.",
        "Connect IL-6–STAT3 to acute-phase and Th17/Treg context.",
        "State why CRP can be misleading under IL-6R blockade.",
      ],
      lessonId: "il6",
      prerequisiteLessonIds: ["tlr4"],
      graphIds: ["M003", "R007", "P002", "I003"],
      evidenceNote:
        "IL-6 biology here is educational. Approved claim cites for specific edges may be missing — do not treat quiz completion as evidence review.",
      teachingSimplifications: [
        "One cytokine chain is highlighted; disease context changes outcomes.",
        "JAK inhibitors hit more than IL-6 alone.",
      ],
      quiz: [
        {
          id: "q-il6-trans",
          prompt: "What mainly enables IL-6 pro-inflammatory signalling on cells that lack membrane IL-6R?",
          choices: ["Soluble IL-6R (trans-signalling)", "IFNAR1", "PD-1", "C5a alone"],
          correctIndex: 0,
          rationale: "Trans-signalling via sIL-6R lets IL-6 act on gp130+ cells that lack membrane IL-6R.",
        },
        {
          id: "q-il6-crp",
          prompt: "Why can CRP stay low during infection in a patient on tocilizumab?",
          choices: [
            "Tocilizumab sterilises all bacteria",
            "Hepatocyte CRP synthesis depends on IL-6–STAT3, which is blocked",
            "CRP is only made by T cells",
            "The assay always fails on biologics",
          ],
          correctIndex: 1,
          rationale: "Blocking IL-6R on hepatocytes removes a major driver of CRP, so infection alarms are blunted.",
        },
      ],
    },
    {
      id: "mod-inflammasome",
      title: "Inflammation effector (NLRP3 → IL-1β)",
      objectives: [
        "State the two-signal requirement for IL-1β release.",
        "Link caspase-1 / gasdermin D to pyroptotic release.",
        "Give one example of crystal-driven NLRP3 activation.",
      ],
      lessonId: "nlrp3",
      prerequisiteLessonIds: ["tlr4", "il6"],
      graphIds: ["R004", "P003", "M002", "M036", "M037"],
      evidenceNote:
        "NLRP3/IL-1 teaching path is scaffolded from existing lessons; Gate C approved support is not implied by finishing the track.",
      teachingSimplifications: [
        "Diverse NLRP3 triggers are collapsed to K⁺ efflux / damage motifs.",
        "CANTOS secondary signals are hypothesis-generating, not Academy proof.",
      ],
      quiz: [
        {
          id: "q-nlrp3-two-signal",
          prompt: "Why does productive IL-1β release usually need two signals?",
          choices: [
            "To keep accidental inflammasome firing rare (priming + activation)",
            "Because TLR4 cannot induce any cytokines alone",
            "Because IL-1β is only made in the nucleus",
            "Because antibodies must coat NLRP3 first",
          ],
          correctIndex: 0,
          rationale: "Signal 1 primes NLRP3/pro-IL-1β; signal 2 assembles the inflammasome — a safety lock.",
        },
        {
          id: "q-nlrp3-gout",
          prompt: "Which stimulus class is a classic NLRP3 activator in gout?",
          choices: ["Urate crystals", "CD28 superagonism", "C5b-9 alone", "CTLA-4-Ig"],
          correctIndex: 0,
          rationale: "Urate crystals are a canonical crystal activator of NLRP3.",
        },
      ],
    },
  ],
};

/**
 * Intermediate scaffold — reuses existing Mechanism lessons only.
 * Status stays `scaffold` / capability `in_development` until a fuller curriculum ships.
 * Do not market as a finished intermediate course.
 */
export const INTERMEDIATE_TRACK: AcademyTrack = {
  id: "intermediate-adaptive-checkpoints",
  title: "Intermediate: adaptive brakes, IFN sensing, type-2 effectors",
  level: "intermediate",
  summary:
    "Honest scaffold over three existing Mechanism lessons (checkpoint, cGAS–STING, type-2). Not a finished intermediate curriculum — labelled in development; local quizzes only.",
  status: "scaffold",
  modules: [
    {
      id: "mod-checkpoint",
      title: "Checkpoints at the synapse (CTLA-4 / PD-1)",
      objectives: [
        "Contrast CTLA-4 (priming) vs PD-1 (peripheral brake) as a teaching scaffold.",
        "Name one toxicity-pattern difference that follows from where each acts.",
        "State why MHC-I loss can blunt anti-PD-1 response without inventing patient advice.",
      ],
      lessonId: "checkpoint",
      prerequisiteLessonIds: ["tlr4", "il6"],
      graphIds: ["R019", "R011", "R012", "I008", "I009"],
      evidenceNote:
        "Checkpoint teaching path is educational. Live Gate C on PD-1 exemplar edges may still be partial — finishing this module is not claim review.",
      teachingSimplifications: [
        "Synapse timing is simplified; real tumours and autoimmunity diverge.",
        "Trial response rates are context, not Academy proof of Gate C.",
      ],
      quiz: [
        {
          id: "q-chk-ctla4-vs-pd1",
          prompt: "Where does CTLA-4 mainly act relative to PD-1 in the teaching model?",
          choices: [
            "Early at priming (lymph node / B7 competition) vs later peripheral brake",
            "Only inside the tumour nucleus",
            "Only on neutrophils",
            "Only after MHC class II loss",
          ],
          correctIndex: 0,
          rationale: "CTLA-4 competes with CD28 early; PD-1 restrains effectors in inflamed tissue.",
        },
        {
          id: "q-chk-mhci",
          prompt: "If a tumour loses MHC class I, what happens to CD8-dependent anti-PD-1 logic?",
          choices: [
            "Reinvigorated CD8 cells may have nothing to recognise on the tumour",
            "Anti-PD-1 always cures the tumour",
            "CTLA-4 becomes irrelevant forever",
            "Complement replaces all T-cell killing",
          ],
          correctIndex: 0,
          rationale: "Without peptide–MHC-I, CD8 effectors cannot see the tumour even if PD-1 is blocked.",
        },
      ],
    },
    {
      id: "mod-sting-ifn",
      title: "Cytosolic DNA → type I IFN (cGAS–STING)",
      objectives: [
        "Trace cytosolic DNA to IFNAR-driven ISG programmes at teaching depth.",
        "Link type I IFN amplification to BAFF / B-cell survival as a scaffold (not disease-complete).",
        "Name one IFNAR-targeted educational example without claiming CDS.",
      ],
      lessonId: "sting",
      prerequisiteLessonIds: ["checkpoint"],
      graphIds: ["P011", "M018", "R018", "P004", "I015", "D007"],
      evidenceNote:
        "IFN teaching reuses the STING lesson. Exemplar IFN→SLE Gate C may still be scaffold — do not treat quiz completion as evidence approval.",
      teachingSimplifications: [
        "pDC and non-pDC IFN sources are collapsed for teaching.",
        "SLE biology is broader than the cGAS–STING spine shown here.",
      ],
      quiz: [
        {
          id: "q-sting-second-messenger",
          prompt: "What second messenger does cGAS produce after binding cytosolic dsDNA?",
          choices: ["2′3′-cGAMP", "cAMP only", "IP3 only", "Retinoic acid"],
          correctIndex: 0,
          rationale: "cGAS synthesises 2′3′-cGAMP, which activates STING.",
        },
        {
          id: "q-sting-ifnar",
          prompt: "Which receptor complex does type I IFN use to drive the ISG programme in this lesson?",
          choices: ["IFNAR1/2", "IL-6R alone", "PD-1/PD-L1", "C5aR only"],
          correctIndex: 0,
          rationale: "IFN-α/β signal through IFNAR1/2 → JAK/STAT → ISGF3 / ISGs.",
        },
      ],
    },
    {
      id: "mod-type2",
      title: "Type-2 effectors (alarmins → asthma teaching path)",
      objectives: [
        "Place TSLP/IL-33 alarmins upstream of ILC2/Th2 teaching cascades.",
        "Explain why an upstream alarmin block can differ from eosinophil-only blockade.",
        "Keep the path educational — not a prescribing algorithm.",
      ],
      lessonId: "type2",
      prerequisiteLessonIds: ["sting"],
      graphIds: ["M022", "M021", "C009", "M007", "I006", "I028"],
      evidenceNote:
        "Type-2 lesson is curated teaching content. Biologic names are educational examples; Academy progress ≠ clinical recommendation.",
      teachingSimplifications: [
        "Asthma endotypes are reduced to a single teaching spine.",
        "Real dosing, eligibility and safety decisions are out of scope.",
      ],
      quiz: [
        {
          id: "q-type2-tslp",
          prompt: "Why can an anti-TSLP approach act upstream of eosinophil-only blockade in the teaching model?",
          choices: [
            "TSLP is an epithelial alarmin that licences multiple type-2 arms, not only eosinophils",
            "TSLP is only made by eosinophils",
            "Anti-TSLP replaces all vaccines",
            "TSLP is a complement protein",
          ],
          correctIndex: 0,
          rationale: "Alarmins sit above ILC2/Th2 programmes; eosinophil-targeted drugs act further downstream.",
        },
      ],
    },
  ],
};

/**
 * Advanced scaffold — labelled only; no modules shipped yet.
 * Do not market as an available advanced curriculum.
 */
export const ADVANCED_TRACK: AcademyTrack = {
  id: "advanced-systems-integration",
  title: "Advanced: systems integration (scaffold)",
  level: "advanced",
  summary:
    "Placeholder for multi-pathway integration lessons. No modules are navigable yet — labelled scaffold only, not a finished advanced course or certification.",
  status: "scaffold",
  modules: [],
};

export const ACADEMY_TRACKS: AcademyTrack[] = [FOUNDATION_TRACK, INTERMEDIATE_TRACK, ADVANCED_TRACK];

export function trackById(id: string): AcademyTrack | undefined {
  return ACADEMY_TRACKS.find((t) => t.id === id);
}

export function moduleForLesson(lessonId: string): { track: AcademyTrack; module: AcademyModule } | undefined {
  for (const track of ACADEMY_TRACKS) {
    const module = track.modules.find((m) => m.lessonId === lessonId);
    if (module) return { track, module };
  }
  return undefined;
}

/** Prefer foundation when a lesson sits in multiple tracks (none today). */
export function primaryTrackForLesson(lessonId: string): AcademyTrack | undefined {
  return moduleForLesson(lessonId)?.track;
}
