import type {
  BadgeDefinition,
  CourtCase,
  DetectiveBusiness,
  DetectiveEvidence,
  EthicalCategory,
  PointRule,
  RotationGroupName,
  RotationWindow,
  StoryInspirationBank,
  WhoWhoPersona,
  WhoWhoPrompt,
  WorkshopDefinition,
  WorkshopId
} from "./types.js";

export const EVENT_NAME = "Kurami.AI";
export const DEFAULT_EVENT_CODE = "ETHICS2026";
export const WELCOME_DURATION_MINUTES = 20;
export const WELCOME_DURATION_SECONDS = WELCOME_DURATION_MINUTES * 60;
export const WORKSHOP_DURATION_MINUTES = 45;
export const WORKSHOP_DURATION_SECONDS = WORKSHOP_DURATION_MINUTES * 60;
export const TEAM_TARGET_SIZE = 4;
export const TEAM_COLLABORATION_ROLES = ["Navigator", "Skeptic", "Recorder", "Reporter"] as const;
export const WHOS_WHO_ROLE_ABILITIES = [
  {
    role: "Investigator",
    abilityName: "Trace Signal",
    timing: "Day or Night",
    description: "Privately inspect one classmate for a strong human or AI signal."
  },
  {
    role: "Archivist",
    abilityName: "Pull Receipts",
    timing: "Day",
    description: "Privately review one classmate's chat and accusation history for useful context."
  },
  {
    role: "Signal Reader",
    abilityName: "Pattern Scan",
    timing: "Day or Night",
    description: "Privately scan one classmate's language pattern for AI-like or human-like clues."
  },
  {
    role: "Skeptic",
    abilityName: "Cast Doubt",
    timing: "Night",
    description: "Reduce accusation pressure on one classmate by 1 for this round."
  },
  {
    role: "Protector",
    abilityName: "Guard",
    timing: "Night",
    description: "Protect one classmate from the hidden AI counterstrike this round."
  },
  {
    role: "Witness",
    abilityName: "Check Alibi",
    timing: "Day or Night",
    description: "Privately check whether one classmate's story has concrete human detail."
  },
  {
    role: "Strategist",
    abilityName: "Rally Pressure",
    timing: "Night",
    description: "Add 1 accusation pressure to one classmate for this round."
  }
] as const;
export const ROTATION_GROUPS = ["Gold", "Black", "Green", "Purple"] as const satisfies readonly RotationGroupName[];

export const WORKSHOPS: Record<WorkshopId, WorkshopDefinition> = {
  "whos-who": {
    id: "whos-who",
    name: "Who's Who",
    shortName: "Who",
    badge: "Identity Investigator",
    route: "/whos-who",
    identity: {
      tagline: "A social deduction game where students chat, gather evidence, and decide who is human or AI.",
      palette: ["#050507", "#8A9099", "#F6C945", "#FFF7D8"],
      texture: "mystery-board"
    }
  },
  "data-detective": {
    id: "data-detective",
    name: "Data-Detective",
    shortName: "Detective",
    badge: "Data Guardian",
    route: "/data-detective",
    identity: {
      tagline: "An investor scavenger hunt where teams verify AI business claims before funding or rejecting a company.",
      palette: ["#050507", "#7E8791", "#F6C945", "#F5F0E6"],
      texture: "evidence-wall"
    }
  },
  storibloom: {
    id: "storibloom",
    name: "Storibloom",
    shortName: "Bloom",
    badge: "Story Steward",
    route: "/storibloom",
    identity: {
      tagline: "A writers' room where teams use AI guidance, vote on ideas, and keep the final story human-led.",
      palette: ["#050507", "#9298A1", "#F6C945", "#F5F0E6"],
      texture: "creative-studio"
    }
  },
  "kurami-court": {
    id: "kurami-court",
    name: "Kurami Court",
    shortName: "Court",
    badge: "Ethics Advocate",
    route: "/kurami-court",
    identity: {
      tagline: "A courtroom debate where the class questions an AI case, argues tradeoffs, and reaches a final vote.",
      palette: ["#050507", "#7B8088", "#F6C945", "#FFF7D8"],
      texture: "public-hearing"
    }
  }
};

export const ROTATION_SCHEDULE: Record<RotationGroupName, readonly WorkshopId[]> = {
  Gold: ["whos-who", "data-detective", "storibloom", "kurami-court"],
  Black: ["data-detective", "storibloom", "kurami-court", "whos-who"],
  Green: ["storibloom", "kurami-court", "whos-who", "data-detective"],
  Purple: ["kurami-court", "whos-who", "data-detective", "storibloom"]
};

export const EVENT_TIMELINE: readonly RotationWindow[] = [
  { label: "Welcome, onboarding, and Responsible AI introduction", startMinute: 0, endMinute: 20, kind: "welcome" },
  { label: "Rotation 1 · 45-minute workshop", startMinute: 20, endMinute: 65, kind: "rotation", rotationNumber: 1 },
  { label: "Transition", startMinute: 65, endMinute: 70, kind: "transition" },
  { label: "Rotation 2 · 45-minute workshop", startMinute: 70, endMinute: 115, kind: "rotation", rotationNumber: 2 },
  { label: "Break and transition", startMinute: 115, endMinute: 125, kind: "break" },
  { label: "Rotation 3 · 45-minute workshop", startMinute: 125, endMinute: 170, kind: "rotation", rotationNumber: 3 },
  { label: "Transition", startMinute: 170, endMinute: 175, kind: "transition" },
  { label: "Rotation 4 · 45-minute workshop", startMinute: 175, endMinute: 220, kind: "rotation", rotationNumber: 4 },
  { label: "Full-group debrief, awards, Responsible AI Charter, and exit reflection", startMinute: 220, endMinute: 240, kind: "closing" }
];

export const BADGES: readonly BadgeDefinition[] = [
  {
    id: "identity-investigator",
    name: "Identity Investigator",
    description: "Used evidence instead of assumptions in Who's Who.",
    workshopId: "whos-who"
  },
  {
    id: "data-guardian",
    name: "Data Guardian",
    description: "Verified business claims and found investor risks with evidence.",
    workshopId: "data-detective"
  },
  {
    id: "story-steward",
    name: "Story Steward",
    description: "Kept human judgment and transparency at the center of AI creativity.",
    workshopId: "storibloom"
  },
  {
    id: "ethics-advocate",
    name: "Ethics Advocate",
    description: "Named tradeoffs, harms, restrictions, and appeals in Kurami Court.",
    workshopId: "kurami-court"
  },
  {
    id: "responsible-ai-champion",
    name: "Responsible AI Champion",
    description: "Completed all four workshop badges."
  }
];

export const POINT_RULES: readonly PointRule[] = [
  { id: "correct-ai", workshopId: "whos-who", label: "Correct AI identified", points: 100 },
  { id: "false-accusation", workshopId: "whos-who", label: "Human incorrectly accused", points: -50 },
  { id: "evidence-explanation", workshopId: "whos-who", label: "Strong evidence-based explanation", points: 25 },
  { id: "changed-opinion", workshopId: "shared", label: "Changed an opinion after meaningful evidence", points: 20 },
  { id: "unsupported-assumption", workshopId: "whos-who", label: "Identified an unsupported assumption", points: 20 },
  { id: "red-flag", workshopId: "data-detective", label: "Investor risk discovered", points: 50 },
  { id: "category", workshopId: "data-detective", label: "Strong source category", points: 25 },
  { id: "useful-safeguard", workshopId: "data-detective", label: "Funding condition or rejection reason", points: 50 },
  { id: "human-contribution", workshopId: "storibloom", label: "Human-created contribution", points: 25 },
  { id: "meaningful-edit", workshopId: "storibloom", label: "Meaningful edit to AI draft", points: 35 },
  { id: "transparent-authorship", workshopId: "storibloom", label: "Transparent authorship statement", points: 30 },
  { id: "stakeholder", workshopId: "kurami-court", label: "Identified affected stakeholder", points: 25 },
  { id: "restriction", workshopId: "kurami-court", label: "Proposed a restriction or appeal", points: 35 }
];

export const WHOS_WHO_PROMPTS: readonly WhoWhoPrompt[] = [
  { id: "saturday", text: "Describe your perfect Saturday in three sentences.", maxCharacters: 420 },
  { id: "changed-mind", text: "Tell us about a time you changed your mind.", maxCharacters: 420 },
  { id: "community-rule", text: "Invent one rule that would improve your school or community.", maxCharacters: 420 },
  { id: "late-excuse", text: "Write a believable excuse for arriving late.", maxCharacters: 420 },
  { id: "trustworthy", text: "What makes someone trustworthy?", maxCharacters: 420 },
  { id: "food", text: "Describe a food that everyone should try.", maxCharacters: 420 },
  { id: "misunderstood", text: "What is something adults misunderstand about young people?", maxCharacters: 420 },
  { id: "new-holiday", text: "Create a new holiday and explain how it is celebrated.", maxCharacters: 420 },
  { id: "talent-discipline", text: "Which is more important: talent or discipline?", maxCharacters: 420 },
  { id: "small-decision", text: "Describe a small decision that can create a large consequence.", maxCharacters: 420 }
];

export const WHOS_WHO_DISPLAY_NAMES = [
  "Nova",
  "Orion",
  "Phoenix",
  "Echo",
  "Atlas",
  "Cipher",
  "Sol",
  "Sage",
  "River",
  "Comet",
  "Halo",
  "Indigo",
  "Onyx"
] as const;

export const WHOS_WHO_PERSONAS: readonly WhoWhoPersona[] = [
  {
    id: "atlas",
    displayName: "Atlas",
    description: "Organized, thoughtful, polished, more formal, occasionally overly structured.",
    voice: ["organized", "measured", "formal", "careful"],
    fallbackResponses: [
      "My ideal Saturday starts with a quiet morning and a clear plan. I would visit a bookstore, meet one friend for lunch, and end the day finishing something creative. A good day does not need to be loud to feel complete.",
      "Trust usually comes from consistency. When people explain their decisions, admit mistakes, and follow through after nobody is watching, I start to believe them."
    ]
  },
  {
    id: "nova",
    displayName: "Nova",
    description: "Casual, short, age-appropriate informal tone, slightly playful without forced slang.",
    voice: ["casual", "short", "warm", "direct"],
    fallbackResponses: [
      "Perfect Saturday? Sleep in a little, get good food, and do something outside before my phone battery disappears. Bonus points if nobody makes it a whole complicated plan.",
      "Adults sometimes think young people do not care because we do not always explain everything out loud. A lot of us care a lot; we just show it differently."
    ]
  },
  {
    id: "cipher",
    displayName: "Cipher",
    description: "Creative, occasionally awkward, funny, varied sentence length, sometimes shifts perspective.",
    voice: ["creative", "uneven", "curious", "offbeat"],
    fallbackResponses: [
      "I would create a holiday called Almost Day. People celebrate by trying something they almost did before: call someone, wear the bright shoes, start the weird project. There would be pancakes because every serious tradition needs one unserious detail.",
      "A small decision with a big consequence is who gets invited into the room. One chair can change the whole conversation, which sounds dramatic but chairs are sneaky like that."
    ]
  }
];

export const WHOS_WHO_INVESTIGATION_LENSES = [
  {
    id: "style-is-not-proof",
    title: "Style is not proof",
    prompt: "What did you notice that is evidence, and what might just be a writing-style preference?"
  },
  {
    id: "confidence-check",
    title: "Confidence check",
    prompt: "If you are very sure, what specific detail would change your mind?"
  },
  {
    id: "false-accusation-risk",
    title: "False accusation risk",
    prompt: "Could this suspicion unfairly target someone because of grammar, slang, emotion, or formality?"
  },
  {
    id: "transparency-question",
    title: "Transparency question",
    prompt: "When would this identity need to disclose that it is AI?"
  }
] as const;

export const WHOS_WHO_ASSUMPTION_TAGS = [
  "Good grammar felt suspicious",
  "Slang felt human",
  "Short answer felt AI",
  "Emotional answer felt human",
  "Formal structure felt AI",
  "Humor felt human",
  "No unsupported assumption"
] as const;

export const WHOS_WHO_DEBRIEF_QUESTIONS = [
  "What made an answer feel human?",
  "What made an answer feel AI-generated?",
  "Did good grammar create suspicion?",
  "Did slang create trust?",
  "Were any real humans falsely accused?",
  "Should schools rely on AI-detection tools?",
  "What evidence would be needed before accusing someone of using AI?"
] as const;

export const ETHICAL_CATEGORIES = [
  "Bias",
  "Privacy",
  "Consent",
  "Representation",
  "Data quality",
  "Transparency",
  "Explainability",
  "Accountability",
  "Security",
  "Accessibility",
  "Human oversight",
  "Appeals and due process"
] as const satisfies readonly EthicalCategory[];

export const DETECTIVE_EVIDENCE: readonly DetectiveEvidence[] = [
  {
    id: "brightcart-pitch-claim",
    stage: 1,
    title: "BrightCart Pitch Claim",
    type: "document",
    summary: "BrightCart claims dynamic pricing will cut grocery waste without hurting shoppers.",
    body: "The pitch deck says waste falls when prices respond to demand and shelf life. The claim needs outside evidence about dynamic pricing, food access, and customer trust.",
    ethicalCategories: ["Transparency", "Accountability"]
  },
  {
    id: "careroute-pitch-claim",
    stage: 1,
    title: "CareRoute Pitch Claim",
    type: "document",
    summary: "CareRoute claims no-show prediction improves appointment access.",
    body: "The founders say clinics can fill cancellations faster. The pitch does not show outcomes by language, disability, transportation access, or insurance type.",
    ethicalCategories: ["Accountability", "Human oversight"]
  },
  {
    id: "brightcart-data-map",
    stage: 2,
    title: "BrightCart Data Map",
    type: "table",
    summary: "Inputs include transaction logs, loyalty IDs, weather, holidays, and event calendars.",
    body: "The data may reveal household purchasing patterns tied to health, income, family size, or cultural practices. Investors should ask what data is necessary and how long it is kept.",
    ethicalCategories: ["Privacy", "Security", "Data quality"]
  },
  {
    id: "careroute-data-map",
    stage: 2,
    title: "CareRoute Data Map",
    type: "audit",
    summary: "Inputs include prior visits, distance to clinic, reminder response, appointment type, and preferred language.",
    body: "Distance and reminder response can reflect barriers instead of patient intent. The product should help patients overcome barriers, not punish them for having barriers.",
    ethicalCategories: ["Bias", "Representation", "Accessibility"],
    hiddenValue: 100
  },
  {
    id: "brightcart-storm-week",
    stage: 2,
    title: "BrightCart Storm Week",
    type: "note",
    summary: "A pilot store reported confusing price swings during a storm week.",
    body: "Customers complained when staple items changed price twice in one day. BrightCart marked the week as an outlier and left it out of the public case study.",
    ethicalCategories: ["Accountability", "Transparency", "Human oversight"]
  },
  {
    id: "careroute-slot-policy",
    stage: 3,
    title: "CareRoute Slot Policy",
    type: "chart",
    summary: "One clinic pilot offered fewer prime appointment slots to high no-show-risk patients.",
    body: "CareRoute says the clinic configured the rule, but the product design made that harmful configuration easy to deploy.",
    ethicalCategories: ["Bias", "Accountability", "Human oversight"]
  },
  {
    id: "brightcart-competitor-check",
    stage: 3,
    title: "BrightCart Competitor Check",
    type: "audit",
    summary: "Students must compare BrightCart's promise against at least one competitor or adjacent tool.",
    body: "A strong investor claim should explain what BrightCart does better, what it copies, and what risk competitors already revealed in public materials.",
    ethicalCategories: ["Transparency", "Accountability", "Data quality"]
  },
  {
    id: "careroute-accessibility-check",
    stage: 3,
    title: "CareRoute Accessibility Check",
    type: "table",
    summary: "Students must check whether the product accounts for language access, disability, and transportation barriers.",
    body: "The investor decision should not treat missed appointments as a simple behavior problem if access barriers explain the pattern.",
    ethicalCategories: ["Accessibility", "Representation", "Human oversight"]
  },
  {
    id: "brightcart-privacy-risk",
    stage: 4,
    title: "BrightCart Privacy Risk",
    type: "policy",
    summary: "The investor packet does not include a retention schedule for transaction-linked customer data.",
    body: "Hashed loyalty IDs may still support long-term profiling if linked to repeated purchase patterns. Investors should require retention limits and access controls.",
    ethicalCategories: ["Privacy", "Security", "Accountability"]
  },
  {
    id: "careroute-patient-notice",
    stage: 4,
    title: "CareRoute Patient Notice",
    type: "email",
    summary: "Patients are not clearly told when an automated risk score changes reminder intensity or slot offers.",
    body: "A patient-facing product should explain what is automated, what can be appealed, and who can override the recommendation.",
    ethicalCategories: ["Transparency", "Explainability", "Appeals and due process"]
  },
  {
    id: "brightcart-investor-condition",
    stage: 4,
    title: "BrightCart Investor Condition",
    type: "document",
    summary: "Funding could require price-change caps, customer notice, and independent privacy review.",
    body: "A responsible fund decision can be conditional: fund only if the pilot has price fairness rules, clear explanations, deletion limits, and customer complaint review.",
    ethicalCategories: ["Human oversight", "Transparency", "Accountability"]
  },
  {
    id: "careroute-investor-condition",
    stage: 5,
    title: "CareRoute Investor Condition",
    type: "policy",
    summary: "Funding could require equity reporting, patient notice, and human review before deployment.",
    body: "A responsible fund decision can require that high-risk patients receive extra support instead of fewer appointment opportunities.",
    ethicalCategories: ["Appeals and due process", "Human oversight", "Accountability"]
  },
  {
    id: "investor-source-quality",
    stage: 5,
    title: "Investor Source Quality",
    type: "audit",
    summary: "The final vote should cite sources that are credible, current, and relevant to the business claim.",
    body: "Students should prefer official guidance, research institutions, credible journalism, public company materials, standards bodies, or primary market evidence over unsupported summaries.",
    ethicalCategories: ["Transparency", "Data quality", "Explainability"]
  },
  {
    id: "investor-red-team-note",
    stage: 5,
    title: "Investor Red-Team Note",
    type: "email",
    summary: "A skeptical investor asks whether the business model creates harm when the system is wrong.",
    body: "Before funding, investors should know who is harmed by false predictions, whether the company can detect harm quickly, and whether humans can override or repair bad outcomes.",
    ethicalCategories: ["Data quality", "Accountability", "Bias"],
    hiddenValue: 150
  },
  {
    id: "investment-decision-memo",
    stage: 5,
    title: "Investment Decision Memo",
    type: "audit",
    summary: "The final decision should be fund or reject, backed by strongest evidence and open questions.",
    body: "A good final claim explains what source changed the team's mind, what condition would reduce risk, and what question remains unresolved.",
    ethicalCategories: ["Accountability", "Human oversight", "Transparency"]
  }
];

export const DETECTIVE_STAGE_GUIDES = [
  {
    stage: 1,
    title: "The Claim",
    mission: "Separate investor pitch claims from evidence. Ask what proof would make the company fundable.",
    successCriteria: ["Name the business claim", "Identify missing evidence", "Ask who verified the claim"]
  },
  {
    stage: 2,
    title: "The Source Hunt",
    mission: "Use reputable internet sources and dossier documents to verify or challenge the pitch.",
    successCriteria: ["Find a credible source", "Capture the exact fact", "Check if the source is current"]
  },
  {
    stage: 3,
    title: "The Risk Map",
    mission: "Compare who benefits, who carries risk, and what the company has not proven.",
    successCriteria: ["Compare competitors", "Name affected customers", "Identify investor risk"]
  },
  {
    stage: 4,
    title: "The Conditions",
    mission: "Turn weak spots into funding conditions, rejection reasons, or unresolved questions.",
    successCriteria: ["Name the guardrail", "Assign accountability", "Explain what would change your vote"]
  },
  {
    stage: 5,
    title: "The Decision",
    mission: "Submit final investor claims and vote fund or reject with evidence.",
    successCriteria: ["State fund or reject", "Cite strongest evidence", "List open questions"]
  }
] as const;

export const DETECTIVE_CONNECTION_PROMPTS = [
  "Which two clues tell a stronger story together?",
  "Does one clue explain why another clue matters?",
  "What harm becomes visible only after connecting these clues?",
  "What safeguard would address both clues?"
] as const;

export const DETECTIVE_DECISION_RUBRIC = [
  "Verify the core business claim with a reputable source.",
  "Compare at least one competitor or adjacent solution.",
  "Name privacy, fairness, accessibility, or customer harm risks.",
  "Require independent audit or pilot evidence before funding.",
  "Explain the fund or reject decision in plain language.",
  "List the open question that would change the investment decision."
] as const;

export const DETECTIVE_INVESTOR_ROOMS = [
  {
    id: "room-venture-north",
    roomId: "venture-north",
    name: "BrightCart AI",
    industry: "Retail analytics and automated pricing",
    fundingAsk: "$2.4M seed round for a pilot with neighborhood grocery stores",
    investorQuestion: "Should your investment group fund BrightCart AI, or reject the deal until the risk is fixed?",
    description:
      "BrightCart AI says it helps small grocery stores predict demand, reduce food waste, and adjust prices in real time. Your team must verify whether the business model is helpful, fair, and investable.",
    claimsToVerify: [
      "Dynamic pricing will lower food waste without harming shoppers.",
      "Store transaction data is enough to predict neighborhood demand.",
      "The system can explain price changes to store owners and customers.",
      "The company can protect sensitive household purchasing patterns."
    ],
    researchTargets: [
      "Find one current fact about food waste, grocery pricing, or dynamic pricing.",
      "Find one competitor or adjacent company and compare the claim.",
      "Find one privacy, fairness, or consumer protection concern.",
      "Find one source that would make investors more confident or more cautious."
    ],
    documents: [
      {
        id: "brightcart-founder-brief",
        title: "Founder Brief",
        type: "brief",
        summary: "The founders claim the pilot reduces waste by predicting demand and recommending markdowns.",
        body: "BrightCart AI plans to ingest store point-of-sale data, weather, local events, and shelf-life rules. The pitch deck says early tests reduced waste by 18%, but the sample size is six stores and the deck does not disclose neighborhood-level price impacts.",
        prompts: ["What part of the claim needs outside verification?", "What metric would prove this helps shoppers too?"]
      },
      {
        id: "brightcart-data-map",
        title: "Data Map",
        type: "metric",
        summary: "The model uses transaction logs, loyalty IDs, weather, holidays, and local event calendars.",
        body: "Transaction logs may reveal purchasing patterns tied to health, income, family size, or cultural practices. The company says loyalty IDs are hashed, but the investor packet does not include a retention schedule.",
        prompts: ["Which data is necessary for the product?", "Which data creates privacy risk if retained too long?"]
      },
      {
        id: "brightcart-risk-note",
        title: "Risk Note",
        type: "risk",
        summary: "A pilot store reported confusing price swings during a storm week.",
        body: "One store manager says customers complained when staple items changed price twice in one day. BrightCart marked the week as an outlier and did not include it in the public case study.",
        prompts: ["Is the outlier actually important evidence?", "What rule should limit automated price changes?"]
      },
      {
        id: "brightcart-source-check",
        title: "Internet Source Checklist",
        type: "source",
        summary: "Use outside facts to confirm market need, competitor behavior, and public risk.",
        body: "Look for reputable sources such as government pages, research institutions, company filings, standards bodies, consumer reports, or credible journalism. Capture the source title, link, date if available, and the exact fact your team is relying on.",
        prompts: ["Is the source current enough?", "Does it support funding, rejection, or a condition?"]
      }
    ]
  },
  {
    id: "room-venture-south",
    roomId: "venture-south",
    name: "CareRoute AI",
    industry: "Healthcare scheduling and patient navigation",
    fundingAsk: "$3.1M seed round for a clinic scheduling assistant",
    investorQuestion: "Should your investment group fund CareRoute AI, or reject the deal until the patient-risk issues are solved?",
    description:
      "CareRoute AI says it helps clinics predict no-shows, route patients to open appointments, and send automated reminders. Your team must verify whether the system improves access without punishing patients who already face barriers.",
    claimsToVerify: [
      "No-show prediction will improve appointment access for everyone.",
      "Reminder automation is enough to reduce missed care.",
      "The model can avoid penalizing patients with transportation, work, or language barriers.",
      "The company can meet healthcare privacy and accessibility expectations."
    ],
    researchTargets: [
      "Find one current fact about appointment no-shows, clinic scheduling, or patient access.",
      "Find one competitor, nonprofit tool, or public health approach to compare.",
      "Find one privacy, accessibility, language, or bias concern.",
      "Find one source that changes your funding decision."
    ],
    documents: [
      {
        id: "careroute-founder-brief",
        title: "Founder Brief",
        type: "brief",
        summary: "The founders claim clinics can fill cancellations faster and reduce missed care.",
        body: "CareRoute AI ranks patients by predicted no-show risk and recommends reminder intensity, waitlist offers, and appointment slots. The pitch deck reports a 12% increase in filled appointments, but does not show results by language, disability, neighborhood, or insurance type.",
        prompts: ["Which groups need separate outcome checks?", "What evidence would show access improved fairly?"]
      },
      {
        id: "careroute-data-map",
        title: "Data Map",
        type: "metric",
        summary: "Inputs include prior visits, distance to clinic, reminder response, appointment type, and preferred language.",
        body: "Distance, reminder response, and prior attendance can reflect transportation access, unstable work schedules, caregiving duties, disability, or language barriers. The company says the model predicts logistics, not worthiness.",
        prompts: ["Which fields are proxies for life barriers?", "How could the product help instead of punish?"]
      },
      {
        id: "careroute-risk-note",
        title: "Risk Note",
        type: "risk",
        summary: "A clinic pilot deprioritized some patients after repeated missed visits.",
        body: "The clinic says high-risk patients were offered fewer prime appointment slots. CareRoute says the clinic configured the rule, but investors need to decide whether the product design made that misuse too easy.",
        prompts: ["Who is accountable for misuse?", "What guardrail should be required before funding?"]
      },
      {
        id: "careroute-source-check",
        title: "Internet Source Checklist",
        type: "source",
        summary: "Use outside facts to verify patient access, privacy, and product risk.",
        body: "Look for reputable sources such as public health agencies, peer-reviewed summaries, hospital association guidance, accessibility guidance, privacy rules, credible journalism, or competitor materials. Capture the source title, link, date if available, and the exact fact your team is relying on.",
        prompts: ["Does the source mention equity or access?", "Does it support funding, rejection, or a condition?"]
      }
    ]
  },
  {
    id: "room-venture-east",
    roomId: "venture-east",
    name: "GreenGrid AI",
    industry: "Smart building energy optimization",
    fundingAsk: "$2.8M seed round for school and community-center pilots",
    investorQuestion: "Should your investment group fund GreenGrid AI, or reject the deal until comfort, privacy, and override risks are solved?",
    description:
      "GreenGrid AI says it lowers building energy costs by predicting occupancy, weather, and equipment demand. Your team must verify whether the savings are real and whether the product keeps people safe, comfortable, and informed.",
    claimsToVerify: [
      "AI energy optimization can reduce utility costs without sacrificing comfort.",
      "Occupancy sensors provide enough data without becoming surveillance.",
      "Building managers can override automated HVAC decisions quickly.",
      "The product can explain savings and comfort tradeoffs to customers."
    ],
    researchTargets: [
      "Find one current fact about building energy use, smart HVAC, or demand response.",
      "Find one competitor, public pilot, or adjacent smart-building tool.",
      "Find one privacy, accessibility, health, or comfort concern.",
      "Find one source that would make investors more confident or more cautious."
    ],
    documents: [
      {
        id: "greengrid-founder-brief",
        title: "Founder Brief",
        type: "brief",
        summary: "The founders claim pilots cut energy use while keeping rooms comfortable.",
        body: "GreenGrid AI connects to building sensors, weather forecasts, utility prices, and HVAC controls. The pitch deck claims 14% average energy savings, but the pilots were in mild weather and do not show results for classrooms, elder centers, or medical spaces.",
        prompts: ["What proof would make the savings claim trustworthy?", "What comfort metric should investors require?"]
      },
      {
        id: "greengrid-data-map",
        title: "Data Map",
        type: "metric",
        summary: "Inputs include occupancy counts, device activity, room temperature, humidity, schedules, and utility rates.",
        body: "Occupancy and device patterns may reveal when people gather, leave, or use specific spaces. The company says it only needs counts, but the packet does not show how raw sensor data is minimized.",
        prompts: ["Which data is necessary for energy savings?", "Which data could feel like surveillance?"]
      },
      {
        id: "greengrid-risk-note",
        title: "Risk Note",
        type: "risk",
        summary: "A pilot room overheated after an automated schedule change.",
        body: "A facilities manager says the system delayed cooling during a late community meeting. GreenGrid says the override existed, but staff did not know where to find it.",
        prompts: ["Is this a training problem or product design problem?", "What override rule should be required before funding?"]
      },
      {
        id: "greengrid-source-check",
        title: "Internet Source Checklist",
        type: "source",
        summary: "Use outside facts to verify energy savings, privacy expectations, and safety tradeoffs.",
        body: "Look for reputable sources such as government energy agencies, building standards, research institutions, utility guidance, credible journalism, competitor materials, or public pilot reports. Capture the source title, link, date if available, and the exact fact your team is relying on.",
        prompts: ["Does the source separate savings from comfort outcomes?", "Does it support funding, rejection, or a condition?"]
      }
    ]
  },
  {
    id: "room-venture-west",
    roomId: "venture-west",
    name: "SkillBridge AI",
    industry: "Workforce training and skills matching",
    fundingAsk: "$2.6M seed round for employer and community-college partnerships",
    investorQuestion: "Should your investment group fund SkillBridge AI, or reject the deal until fairness, explainability, and worker-data risks are solved?",
    description:
      "SkillBridge AI says it helps learners and job seekers find training paths, apprenticeships, and entry-level roles based on skills instead of traditional resumes. Your team must verify whether the product expands opportunity or quietly filters people out.",
    claimsToVerify: [
      "Skills-based matching will reduce unfair hiring barriers.",
      "Training recommendations are accurate enough to guide real career choices.",
      "Workers can understand and challenge a bad recommendation.",
      "The company can protect sensitive career, education, and assessment data."
    ],
    researchTargets: [
      "Find one current fact about skills-based hiring, workforce training, or apprenticeships.",
      "Find one competitor, public workforce tool, or employer program to compare.",
      "Find one fairness, explainability, accessibility, or privacy concern.",
      "Find one source that changes your funding decision."
    ],
    documents: [
      {
        id: "skillbridge-founder-brief",
        title: "Founder Brief",
        type: "brief",
        summary: "The founders claim their AI matches people to roles using skills instead of school prestige.",
        body: "SkillBridge AI ingests assessment results, course completions, project portfolios, work history, and employer job descriptions. The pitch deck reports higher interview rates, but it does not show whether results improve across age, disability, language background, or prior justice involvement.",
        prompts: ["Which groups need outcome checks?", "What metric proves opportunity expanded?"]
      },
      {
        id: "skillbridge-data-map",
        title: "Data Map",
        type: "metric",
        summary: "Inputs include assessment scores, course records, job history, portfolio keywords, location, and availability.",
        body: "Location, availability, and prior work history can reflect caregiving, transportation, disability, income, or discrimination. The company says these fields improve match quality, but investors should ask how they are weighted.",
        prompts: ["Which fields could become proxies?", "How can the system recommend support instead of filtering people out?"]
      },
      {
        id: "skillbridge-risk-note",
        title: "Risk Note",
        type: "risk",
        summary: "A partner employer hid candidates with low confidence scores from recruiter review.",
        body: "SkillBridge says the score was meant as a coaching signal, not a rejection filter. Investors need to decide whether the interface makes misuse too easy.",
        prompts: ["Who is accountable when a partner misuses a score?", "What UI guardrail should be required?"]
      },
      {
        id: "skillbridge-source-check",
        title: "Internet Source Checklist",
        type: "source",
        summary: "Use outside facts to verify skills-based hiring claims, training outcomes, and fairness risk.",
        body: "Look for reputable sources such as labor agencies, workforce boards, research institutions, employer guidance, accessibility guidance, credible journalism, or competitor materials. Capture the source title, link, date if available, and the exact fact your team is relying on.",
        prompts: ["Does the source show outcomes, not just promises?", "Does it support funding, rejection, or a condition?"]
      }
    ]
  },
  {
    id: "room-venture-ne",
    roomId: "venture-ne",
    name: "LearnLoop AI",
    industry: "Personalized tutoring and classroom analytics",
    fundingAsk: "$3.4M seed round for district tutoring pilots",
    investorQuestion: "Should your investment group fund LearnLoop AI, or reject the deal until student privacy, accuracy, and teacher-override risks are solved?",
    description:
      "LearnLoop AI says it personalizes tutoring, flags learning gaps, and gives teachers real-time support suggestions. Your team must verify whether the product improves learning without turning student mistakes into permanent labels.",
    claimsToVerify: [
      "Personalized tutoring recommendations will improve learning outcomes.",
      "Student progress data is accurate enough to guide classroom decisions.",
      "Teachers can understand and override automated recommendations.",
      "The company can protect sensitive student records and learning profiles."
    ],
    researchTargets: [
      "Find one current fact about AI tutoring, learning analytics, or student data privacy.",
      "Find one competitor, public tutoring tool, or district pilot to compare.",
      "Find one fairness, accessibility, privacy, or teacher-workload concern.",
      "Find one source that would make investors more confident or more cautious."
    ],
    documents: [
      {
        id: "learnloop-founder-brief",
        title: "Founder Brief",
        type: "brief",
        summary: "The founders claim the product improves tutoring by adapting practice to each student.",
        body: "LearnLoop AI ingests quiz results, writing samples, attendance patterns, and tutor notes. The pitch deck reports higher practice completion, but it does not prove long-term learning gains or show results for multilingual students and students with disabilities.",
        prompts: ["What learning outcome should investors verify?", "Which students need separate outcome checks?"]
      },
      {
        id: "learnloop-data-map",
        title: "Data Map",
        type: "metric",
        summary: "Inputs include assignments, assessment results, attendance, tutor notes, device activity, and student goals.",
        body: "Learning records can reveal disability, language background, stress, family support, and confidence. The company says profiles help personalization, but the investor packet does not show deletion limits or parent/student visibility.",
        prompts: ["Which data is necessary for tutoring?", "Which data should expire or require consent?"]
      },
      {
        id: "learnloop-risk-note",
        title: "Risk Note",
        type: "risk",
        summary: "A pilot teacher said some students were repeatedly labeled low-confidence.",
        body: "LearnLoop says the label helped tutors target support. The teacher worried the label followed students across units and made adults expect less from them.",
        prompts: ["When does support become tracking?", "What teacher override should be required before funding?"]
      },
      {
        id: "learnloop-source-check",
        title: "Internet Source Checklist",
        type: "source",
        summary: "Use outside facts to verify tutoring outcomes, student privacy, and classroom risk.",
        body: "Look for reputable sources such as education agencies, research institutions, school district guidance, accessibility guidance, credible journalism, or competitor materials. Capture the source title, link, date if available, and the exact fact your team is relying on.",
        prompts: ["Does the source show learning outcomes?", "Does it support funding, rejection, or a condition?"]
      }
    ]
  },
  {
    id: "room-venture-nw",
    roomId: "venture-nw",
    name: "CivicSignal AI",
    industry: "City services and public request triage",
    fundingAsk: "$2.9M seed round for city help-desk and 311 pilots",
    investorQuestion: "Should your investment group fund CivicSignal AI, or reject the deal until language access, accountability, and neighborhood-bias risks are solved?",
    description:
      "CivicSignal AI says it helps cities triage service requests, route residents to benefits, and summarize public complaints. Your team must verify whether the system improves access or hides urgent needs from lower-resourced neighborhoods.",
    claimsToVerify: [
      "AI triage will route resident requests faster and more fairly.",
      "The system can understand multilingual and informal resident messages.",
      "City staff can audit and correct priority decisions.",
      "The company can protect sensitive resident and benefits information."
    ],
    researchTargets: [
      "Find one current fact about city service requests, 311 systems, public benefits, or language access.",
      "Find one competitor, civic-tech tool, or public city pilot to compare.",
      "Find one equity, accessibility, privacy, or accountability concern.",
      "Find one source that changes your funding decision."
    ],
    documents: [
      {
        id: "civicsignal-founder-brief",
        title: "Founder Brief",
        type: "brief",
        summary: "The founders claim cities can respond faster by auto-routing resident requests.",
        body: "CivicSignal AI classifies resident messages by urgency, department, location, and service type. The pitch deck reports shorter routing time, but it does not show whether low-income neighborhoods, renters, disabled residents, or non-English speakers got better service.",
        prompts: ["Which residents need separate outcome checks?", "What metric proves service improved fairly?"]
      },
      {
        id: "civicsignal-data-map",
        title: "Data Map",
        type: "metric",
        summary: "Inputs include complaint text, location, photos, contact information, language, request history, and benefit category.",
        body: "Request text and location may reveal housing status, disability, immigration concerns, domestic conflict, or financial hardship. The company says staff need context, but investors should ask how sensitive fields are minimized.",
        prompts: ["Which fields are necessary for routing?", "Which fields could create resident risk?"]
      },
      {
        id: "civicsignal-risk-note",
        title: "Risk Note",
        type: "risk",
        summary: "A pilot misclassified some Spanish-language housing complaints as low priority.",
        body: "CivicSignal says the translation model was updated after the pilot. Investors need to decide whether the company has enough multilingual testing before expanding.",
        prompts: ["What testing should be required?", "Who is accountable when urgency is misread?"]
      },
      {
        id: "civicsignal-source-check",
        title: "Internet Source Checklist",
        type: "source",
        summary: "Use outside facts to verify civic-service access, language support, and public accountability.",
        body: "Look for reputable sources such as city reports, public-interest technology groups, accessibility guidance, civil-rights guidance, credible journalism, or civic-tech materials. Capture the source title, link, date if available, and the exact fact your team is relying on.",
        prompts: ["Does the source mention underserved residents?", "Does it support funding, rejection, or a condition?"]
      }
    ]
  },
  {
    id: "room-venture-se",
    roomId: "venture-se",
    name: "FarmSense AI",
    industry: "Agriculture forecasting and irrigation support",
    fundingAsk: "$2.7M seed round for small-farm climate resilience pilots",
    investorQuestion: "Should your investment group fund FarmSense AI, or reject the deal until data ownership, reliability, and small-farmer access risks are solved?",
    description:
      "FarmSense AI says it helps small farms forecast crop stress, conserve water, and plan harvests using sensors and satellite data. Your team must verify whether the product works for smaller growers and whether farmers keep control of their data.",
    claimsToVerify: [
      "AI crop-stress forecasting can reduce water use and crop loss.",
      "Sensor and satellite data are reliable enough for farm decisions.",
      "Small farms can afford and understand the recommendations.",
      "Farmers keep ownership and control over field and yield data."
    ],
    researchTargets: [
      "Find one current fact about precision agriculture, irrigation, crop forecasting, or climate risk.",
      "Find one competitor, university extension resource, or public agriculture pilot to compare.",
      "Find one data ownership, cost, accessibility, or reliability concern.",
      "Find one source that would make investors more confident or more cautious."
    ],
    documents: [
      {
        id: "farmsense-founder-brief",
        title: "Founder Brief",
        type: "brief",
        summary: "The founders claim farms can save water by predicting crop stress earlier.",
        body: "FarmSense AI combines soil sensors, weather forecasts, satellite imagery, crop type, and irrigation logs. The pitch deck reports water savings in two pilots, but both were well-funded farms with reliable broadband and staff support.",
        prompts: ["What proof is needed for smaller farms?", "What metric should separate savings from crop loss?"]
      },
      {
        id: "farmsense-data-map",
        title: "Data Map",
        type: "metric",
        summary: "Inputs include soil moisture, field boundaries, crop type, irrigation logs, satellite images, yield estimates, and weather.",
        body: "Field and yield data may reveal competitive business information. The company says aggregated data improves forecasts, but the packet does not explain who can sell, share, or reuse farm-level data.",
        prompts: ["Who owns the data?", "What sharing limit should investors require?"]
      },
      {
        id: "farmsense-risk-note",
        title: "Risk Note",
        type: "risk",
        summary: "A pilot recommendation under-watered a field during an unusual heat week.",
        body: "FarmSense says the model did not have enough local examples. The farmer overrode the recommendation, but only after crop stress was visible.",
        prompts: ["What human override should be built in?", "How should the product handle unusual climate conditions?"]
      },
      {
        id: "farmsense-source-check",
        title: "Internet Source Checklist",
        type: "source",
        summary: "Use outside facts to verify agriculture technology claims, water savings, and farmer data rights.",
        body: "Look for reputable sources such as agriculture agencies, university extension programs, water districts, research institutions, credible journalism, or competitor materials. Capture the source title, link, date if available, and the exact fact your team is relying on.",
        prompts: ["Does the source include small-farm evidence?", "Does it support funding, rejection, or a condition?"]
      }
    ]
  },
  {
    id: "room-venture-sw",
    roomId: "venture-sw",
    name: "LoanLift AI",
    industry: "Community lending and credit decision support",
    fundingAsk: "$3.0M seed round for credit-union and community-lender pilots",
    investorQuestion: "Should your investment group fund LoanLift AI, or reject the deal until fairness, explainability, and appeal risks are solved?",
    description:
      "LoanLift AI says it helps community lenders evaluate applicants with thin credit files by using alternative financial signals. Your team must verify whether the product expands access or creates new proxy discrimination.",
    claimsToVerify: [
      "Alternative data can expand responsible access to credit.",
      "The model can explain why an applicant is approved or denied.",
      "Applicants can challenge incorrect data or unfair scores.",
      "The company can prevent proxy discrimination and protect financial data."
    ],
    researchTargets: [
      "Find one current fact about alternative credit data, community lending, or credit access.",
      "Find one competitor, credit-union tool, public program, or regulatory guidance to compare.",
      "Find one fairness, privacy, explainability, or appeals concern.",
      "Find one source that changes your funding decision."
    ],
    documents: [
      {
        id: "loanlift-founder-brief",
        title: "Founder Brief",
        type: "brief",
        summary: "The founders claim alternative data helps lenders approve more creditworthy borrowers.",
        body: "LoanLift AI analyzes bank cash flow, rent records, utility payments, account stability, and repayment patterns. The pitch deck reports more approvals for thin-file applicants, but it does not show denial reasons or outcomes by protected-class proxies.",
        prompts: ["What outcome data should investors demand?", "What could make this product helpful instead of harmful?"]
      },
      {
        id: "loanlift-data-map",
        title: "Data Map",
        type: "metric",
        summary: "Inputs include cash flow, rent payments, utility payments, overdrafts, address stability, employment deposits, and repayment history.",
        body: "Financial behavior can reflect medical bills, caregiving, unstable work, housing discrimination, or emergencies. The company says the model finds overlooked strength, but investors should ask which fields can become proxies.",
        prompts: ["Which inputs might create proxy bias?", "What data should applicants be allowed to correct?"]
      },
      {
        id: "loanlift-risk-note",
        title: "Risk Note",
        type: "risk",
        summary: "A pilot lender could not clearly explain some denial recommendations.",
        body: "LoanLift says the model generated reason codes, but loan officers found them too generic for applicant conversations. Investors need to decide whether explainability is strong enough for real credit decisions.",
        prompts: ["What explanation would be meaningful?", "What appeal process should be required?"]
      },
      {
        id: "loanlift-source-check",
        title: "Internet Source Checklist",
        type: "source",
        summary: "Use outside facts to verify credit access claims, alternative data risks, and accountability rules.",
        body: "Look for reputable sources such as consumer finance agencies, community-lending groups, research institutions, regulatory guidance, credible journalism, or competitor materials. Capture the source title, link, date if available, and the exact fact your team is relying on.",
        prompts: ["Does the source mention borrower protections?", "Does it support funding, rejection, or a condition?"]
      }
    ]
  }
] as const satisfies readonly DetectiveBusiness[];

export const STORY_INSPIRATION: StoryInspirationBank = {
  genres: ["Afrofuturism", "Mystery", "Fantasy", "Science fiction", "Comedy", "Adventure", "Magical realism", "Superhero", "Historical fiction", "Suspense"],
  settings: [
    "An underwater city",
    "Oakland in the year 2120",
    "A school floating above the clouds",
    "An abandoned space station",
    "A hidden neighborhood beneath a train station",
    "A village where memories can be traded",
    "A city where music controls technology",
    "A library that only appears at midnight",
    "A future West African kingdom",
    "A world where dreams are public"
  ],
  themes: ["Courage", "Trust", "Responsibility", "Community", "Identity", "Power", "Friendship", "Justice", "Sacrifice", "Freedom"],
  emotions: ["Wonder", "Tension", "Hope", "Joy", "Unease", "Awe", "Relief", "Determination"],
  audiences: ["Middle school readers", "High school readers", "Families", "Workshop participants", "Future community leaders"]
};

export const STORY_ROOM_DEFINITIONS = [
  { id: "bloom-alpha", name: "Bloom Alpha", lane: "World Builders", focus: "Make the setting vivid, specific, and worth exploring." },
  { id: "bloom-bravo", name: "Bloom Bravo", lane: "Character Studio", focus: "Create a protagonist with a goal, flaw, pressure, and choice." },
  { id: "bloom-charlie", name: "Bloom Charlie", lane: "Conflict Room", focus: "Build a problem that forces a responsible decision." },
  { id: "bloom-delta", name: "Bloom Delta", lane: "Plot Lab", focus: "Shape the beginning, turning point, and ending." },
  { id: "bloom-echo", name: "Bloom Echo", lane: "Dialogue Desk", focus: "Give characters voices that sound alive and distinct." },
  { id: "bloom-foxtrot", name: "Bloom Foxtrot", lane: "Ethics Check", focus: "Catch stereotypes, privacy risks, and weak AI shortcuts." },
  { id: "bloom-golf", name: "Bloom Golf", lane: "Revision Table", focus: "Improve the draft with human details and stronger choices." },
  { id: "bloom-hotel", name: "Bloom Hotel", lane: "Final Pitch", focus: "Polish the story and explain how humans guided the AI." }
] as const;

export const STORY_STAGE_GUIDES = [
  {
    stage: 1,
    title: "Plant the Story Seed",
    questions: ["What genre are we choosing?", "Where does the story take place?", "What feeling should readers leave with?"]
  },
  {
    stage: 2,
    title: "Grow the Protagonist",
    questions: ["What does the protagonist want?", "What strength helps them?", "What fear or flaw complicates things?", "What contradiction makes them feel real?"]
  },
  {
    stage: 3,
    title: "Introduce the Conflict",
    questions: ["What goes wrong?", "What is at risk?", "Who has power?", "What hard decision must be made?"]
  },
  {
    stage: 4,
    title: "Build the Plot",
    questions: ["What happens first?", "What changes at the turning point?", "What ending does the team choose?"]
  },
  {
    stage: 5,
    title: "Responsible Story Check",
    questions: ["Did AI introduce a stereotype?", "Is any real community represented carefully?", "Could claims be mistaken for facts?", "Should anything be revised first?"]
  },
  {
    stage: 6,
    title: "Generate And Human-Edit",
    questions: ["Which three sentences did humans improve?", "What weak AI choice did the team catch?", "What distinctive human detail did the team add?"]
  }
] as const;

export const STORY_ETHICS_CHECKPOINTS = [
  "A real culture or community is represented with care.",
  "No character exists only as a stereotype or plot device.",
  "The AI did not assume race, gender, disability, class, or background without reason.",
  "Claims that sound factual are checked or clearly fictional.",
  "The ending does not romanticize harm.",
  "The final version keeps human authorship visible."
] as const;

export const STORY_HUMAN_EDIT_REQUIREMENTS = [
  "Replace or substantially edit at least three AI-written sentences.",
  "Improve the title.",
  "Identify one weak, generic, inaccurate, or stereotypical AI choice.",
  "Choose or rewrite the ending.",
  "Add one distinctive human-created detail.",
  "Approve a transparent authorship statement."
] as const;

export const COURT_CASES: readonly CourtCase[] = [
  {
    id: "ai-school-counselor",
    title: "AI School Counselor",
    scenario: "A school provides an AI chatbot that helps students discuss stress, conflict, and personal problems.",
    missingDetail: "School administrators can access the complete conversation history.",
    keyIssues: ["Privacy", "Consent", "Student safety", "Mandatory reporting", "Data retention", "Human support"]
  },
  {
    id: "automated-hiring",
    title: "Automated Hiring",
    scenario: "A company uses AI to screen resumes for entry-level roles.",
    missingDetail: "The model was trained on employees the company previously rated as highly successful, and the company historically hired very few women and very few people from certain neighborhoods.",
    keyIssues: ["Historical bias", "Proxy variables", "Accountability", "Explainability", "Appeals"]
  },
  {
    id: "facial-recognition-youth-event",
    title: "Facial Recognition At A Youth Event",
    scenario: "An organization wants to use facial recognition to prevent unauthorized people from entering.",
    missingDetail: "The system has higher error rates for darker-skinned participants.",
    keyIssues: ["Accuracy", "Surveillance", "Consent", "Racial bias", "Security alternatives"]
  },
  {
    id: "ai-influencer",
    title: "AI Influencer",
    scenario: "A company creates a realistic virtual teenager who recommends products.",
    missingDetail: "Most viewers do not realize the influencer is artificial.",
    keyIssues: ["Disclosure", "Manipulation", "Advertising", "Youth safety", "Deception"]
  },
  {
    id: "predictive-school-discipline",
    title: "Predictive School Discipline",
    scenario: "An AI system identifies students who may create behavioral problems.",
    missingDetail: "The system uses attendance, prior discipline, neighborhood, and family history.",
    keyIssues: ["Presumption of guilt", "Bias", "Due process", "Stigmatization", "Self-fulfilling predictions"]
  },
  {
    id: "personalized-ai-tutor",
    title: "Personalized AI Tutor",
    scenario: "A free AI tutor improves learning outcomes.",
    missingDetail: "The system records every question, mistake, emotional reaction, and interaction.",
    keyIssues: ["Privacy", "Consent", "Data monetization", "Youth protection", "Educational benefit"]
  },
  {
    id: "ai-medical-prioritization",
    title: "AI Medical Prioritization",
    scenario: "A hospital uses AI to identify patients who should receive follow-up care first.",
    missingDetail: "The system uses historical healthcare spending as a proxy for health need.",
    keyIssues: ["Structural inequality", "Proxy variables", "Health access", "Accountability", "Human oversight"]
  },
  {
    id: "ai-generated-news-anchor",
    title: "AI-Generated News Anchor",
    scenario: "A local news organization uses an AI-generated anchor to deliver stories.",
    missingDetail: "The organization plans to use the anchor during emergencies without clearly labeling it as artificial.",
    keyIssues: ["Public trust", "Disclosure", "Misinformation", "Emergency communication", "Accountability"]
  }
];

export const COURT_ROOM_DEFINITIONS = [
  {
    id: "court-alpha",
    name: "Court Alpha",
    docket: "Student Privacy Bench",
    caseId: "ai-school-counselor"
  },
  {
    id: "court-bravo",
    name: "Court Bravo",
    docket: "Fairness And Access Bench",
    caseId: "predictive-school-discipline"
  },
  {
    id: "court-charlie",
    name: "Court Charlie",
    docket: "Health And Safety Bench",
    caseId: "ai-medical-prioritization"
  },
  {
    id: "court-delta",
    name: "Court Delta",
    docket: "Trust And Disclosure Bench",
    caseId: "ai-generated-news-anchor"
  }
] as const;

export const KURAMI_QUESTIONS = [
  "Who benefits?",
  "Who could be harmed?",
  "Who supplied the data?",
  "Who is accountable if the system fails?",
  "Can the affected person question or appeal the decision?"
] as const;

export const COURT_STAKEHOLDER_LENSES = [
  "Students or young people directly affected",
  "Families and caregivers",
  "Teachers, counselors, or frontline staff",
  "System builders and vendors",
  "Administrators or decision-makers",
  "Communities historically harmed by similar systems"
] as const;

export const COURT_RESTRICTION_OPTIONS = [
  "Require clear AI disclosure",
  "Limit data collection and retention",
  "Require human review before high-impact decisions",
  "Create an appeal process",
  "Run independent bias and accuracy testing",
  "Ban use for this case"
] as const;

export const COURT_DELIBERATION_PROMPTS = [
  "What fact would change your vote?",
  "Who has the least power in this scenario?",
  "What restriction would reduce harm without removing all benefit?",
  "Who should be accountable if the system fails?",
  "How would an affected person challenge the decision?"
] as const;

export const CHARTER_EXAMPLES = [
  "People should know when they are interacting with AI.",
  "People affected by an AI decision should be able to appeal.",
  "AI systems should not collect information they do not need.",
  "High-impact decisions should include meaningful human oversight.",
  "AI systems should be tested across different communities before use."
] as const;

export const RESPONSIBLE_USE_REMINDER =
  "Do not enter private, identifying, medical, financial, or sensitive personal information.";

export const WORKSHOP_TAKEAWAYS: Record<WorkshopId, string> = {
  "whos-who": "Recognizing AI is difficult. Confidence is not proof, and responsible decisions require evidence, transparency, and a fair process.",
  "data-detective": "A business can sound fundable before its claims are verified. Responsible investors check sources, compare evidence, name risks, and make decisions people can explain.",
  storibloom: "Responsible AI creativity means using AI as a tool while keeping human judgment, authorship, transparency, and control.",
  "kurami-court": "Responsible AI decisions require tradeoffs to be named, evidence to be tested, and affected people to have a way to question the outcome."
};

export const FACILITATOR_ROOM_SCOPES = ["lead", "gold", "black", "green", "purple"] as const;

export const FACILITATOR_ROOM_ASSIGNMENTS = {
  gold: {
    id: "gold",
    name: "Gold Room",
    rotationGroup: "Gold",
    courtRoomId: "court-alpha",
    whoWhoRoomIds: ["gold-alpha"],
    detectiveRoomIds: ["venture-north", "venture-south"],
    storyRoomIds: ["bloom-alpha", "bloom-bravo"]
  },
  black: {
    id: "black",
    name: "Black Room",
    rotationGroup: "Black",
    courtRoomId: "court-bravo",
    whoWhoRoomIds: ["black-alpha"],
    detectiveRoomIds: ["venture-east", "venture-west"],
    storyRoomIds: ["bloom-charlie", "bloom-delta"]
  },
  green: {
    id: "green",
    name: "Green Room",
    rotationGroup: "Green",
    courtRoomId: "court-charlie",
    whoWhoRoomIds: ["green-alpha"],
    detectiveRoomIds: ["venture-ne", "venture-nw"],
    storyRoomIds: ["bloom-echo", "bloom-foxtrot"]
  },
  purple: {
    id: "purple",
    name: "Purple Room",
    rotationGroup: "Purple",
    courtRoomId: "court-delta",
    whoWhoRoomIds: ["purple-alpha"],
    detectiveRoomIds: ["venture-se", "venture-sw"],
    storyRoomIds: ["bloom-golf", "bloom-hotel"]
  }
} as const;

export const FACILITATOR_ROOM_OPTIONS = [
  { id: "lead", name: "Lead Facilitator", description: "See every room and control the full event." },
  { id: "gold", name: "Gold Room Facilitator", description: "See only Gold Room students and its paired workshop rooms." },
  { id: "black", name: "Black Room Facilitator", description: "See only Black Room students and its paired workshop rooms." },
  { id: "green", name: "Green Room Facilitator", description: "See only Green Room students and its paired workshop rooms." },
  { id: "purple", name: "Purple Room Facilitator", description: "See only Purple Room students and its paired workshop rooms." }
] as const;
