import {
  BADGES,
  CHARTER_EXAMPLES,
  COURT_CASES,
  COURT_DELIBERATION_PROMPTS,
  COURT_ROOM_DEFINITIONS,
  COURT_RESTRICTION_OPTIONS,
  COURT_STAKEHOLDER_LENSES,
  DEFAULT_EVENT_CODE,
  DETECTIVE_CONNECTION_PROMPTS,
  DETECTIVE_DECISION_RUBRIC,
  DETECTIVE_EVIDENCE,
  DETECTIVE_INVESTOR_ROOMS,
  DETECTIVE_STAGE_GUIDES,
  EVENT_TIMELINE,
  EVENT_NAME,
  ETHICAL_CATEGORIES,
  FACILITATOR_ROOM_ASSIGNMENTS,
  FACILITATOR_ROOM_SCOPES,
  KURAMI_QUESTIONS,
  POINT_RULES,
  RESPONSIBLE_USE_REMINDER,
  ROTATION_GROUPS,
  STORY_INSPIRATION,
  STORY_ROOM_DEFINITIONS,
  STORY_ETHICS_CHECKPOINTS,
  STORY_HUMAN_EDIT_REQUIREMENTS,
  STORY_STAGE_GUIDES,
  TEAM_TARGET_SIZE,
  WELCOME_DURATION_SECONDS,
  WHOS_WHO_ROLE_ABILITIES,
  WHOS_WHO_ASSUMPTION_TAGS,
  WHOS_WHO_DEBRIEF_QUESTIONS,
  WHOS_WHO_INVESTIGATION_LENSES,
  WHOS_WHO_PERSONAS,
  WHOS_WHO_PROMPTS,
  WORKSHOP_DURATION_MINUTES,
  WORKSHOP_DURATION_SECONDS,
  WORKSHOP_TAKEAWAYS,
  WORKSHOPS,
  assignTeam,
  awardBadges,
  calculateVoteBreakdown,
  completedWorkshopsForGroup,
  createDeterministicStoryDraft,
  currentWorkshopForGroup,
  generateFallbackPersonaResponse,
  moderateText,
  normalizeDetectiveRoomId,
  normalizeCourtRoomId,
  normalizeNickname,
  normalizeStoryRoomId,
  normalizeWhoWhoRoomId,
  timerSnapshot
} from "@responsible-ai-lab/shared";
import type {
  CourtCase,
  DetectiveBusiness,
  DetectiveEvidence,
  EventState,
  JoinResult,
  ModerationResult,
  ParticipantSummary,
  RotationGroupName,
  TeamSummary,
  WorkshopId
} from "@responsible-ai-lab/shared";
import type {
  CourtVoteInput,
  CourtRoomArgumentInput,
  CourtRoomControlInput,
  CourtRoomJoinInput,
  CourtRoomVoteInput,
  DetectiveChatInput,
  DetectiveDiscoveryInput,
  DetectiveFundingVoteInput,
  DetectiveJoinRoomInput,
  DetectiveRecommendationInput,
  EventControlInput,
  StoryPublishInput,
  StoryRoomChatInput,
  StoryRoomControlInput,
  StoryRoomGuideInput,
  StoryRoomJoinInput,
  StoryRoomProposalInput,
  StoryRoomProposalVoteInput,
  StoryRoomSaveInput,
  WhoWhoAccuseInput,
  WhoWhoChatInput,
  WhoWhoGameControlInput,
  WhoWhoJoinRoomInput,
  WhoWhoRoleAbilityInput,
  WhoWhoResponseInput,
  WhoWhoVoteInput
} from "@responsible-ai-lab/shared";
import { ApiError } from "./http.js";
import { createSessionId } from "./security.js";

type CourtVoteValue = "approve" | "approve-with-restrictions" | "reject" | "need-more-information";
type FacilitatorScope = (typeof FACILITATOR_ROOM_SCOPES)[number];
type DetectiveDiscoverySubmission = Omit<DetectiveDiscoveryInput, "severity" | "confidence" | "evidenceType" | "stance"> & {
  severity?: DetectiveDiscoveryInput["severity"];
  confidence?: DetectiveDiscoveryInput["confidence"];
  evidenceType?: DetectiveDiscoveryInput["evidenceType"];
  stance?: DetectiveDiscoveryInput["stance"];
};

const DEMO_AI_COMPANIONS = ["AI Atlas", "AI Nova", "AI Cipher", "AI Sage", "AI River", "AI Sol"] as const;
const WHOS_WHO_SEAT_COUNT = 21;
const WHOS_WHO_GAME_NAMES = [
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
  "Onyx",
  "Lyric",
  "Quest",
  "Vega",
  "Prism",
  "Ember",
  "Slate",
  "Tempo",
  "Zenith"
] as const;
const WHOS_WHO_ROLES = WHOS_WHO_ROLE_ABILITIES.map((ability) => ability.role);
type WhoWhoRoleName = (typeof WHOS_WHO_ROLE_ABILITIES)[number]["role"];
const WHOS_WHO_AI_PERSONA_NOTES = [
  "sounds polished, but sometimes dodges concrete personal details",
  "asks careful questions and repeats room language",
  "uses crisp summaries and confident pattern guesses",
  "plays friendly, specific, and a little too balanced"
] as const;
const WHOS_WHO_AI_LINES = [
  "I am noticing a few people using really clean summaries. That could be confidence, or it could be camouflage.",
  "Before we pile onto one person, what detail did they give that only a real student would probably mention?",
  "I would watch for people who answer every question perfectly but never react to the messy parts of the chat.",
  "My read is that the AI might try to be helpful instead of suspicious. Helpful can still be a mask.",
  "Somebody changed tone after the first accusation. That feels worth tracking.",
  "I am not ready to vote yet. I want one more example from the quiet seats."
] as const;
const WHOS_WHO_DAY_SECONDS = 5 * 60;
const WHOS_WHO_NIGHT_SECONDS = 2 * 60;
const STORY_ROOM_STAGE_SECONDS = Math.floor(WORKSHOP_DURATION_SECONDS / 6);
const STORY_ROOM_STAGE_GUIDES = [
  {
    stage: 1,
    title: "Seed Sprint",
    goal: "Agree on genre, setting, audience, theme, and the feeling the story should leave behind."
  },
  {
    stage: 2,
    title: "Character Board",
    goal: "Build the protagonist, their goal, pressure, flaw, and the choice they must make."
  },
  {
    stage: 3,
    title: "Plot Table",
    goal: "Shape the beginning, turning point, ending, and the responsible-AI moment."
  },
  {
    stage: 4,
    title: "Draft And Challenge",
    goal: "Use approved ideas and AI guidance to create a draft, then challenge generic or unsafe choices."
  },
  {
    stage: 5,
    title: "Human Polish",
    goal: "Rewrite generic AI choices, add room-specific details, and complete the authorship note."
  },
  {
    stage: 6,
    title: "Final Story Table",
    goal: "Add human details, complete the authorship note, and save the final story."
  }
] as const;
const COURT_WORKSHOP_SECONDS = 30 * 60;
const COURT_DEBATE_SECONDS = 25 * 60;
const COURT_ROUND_SECONDS = 5 * 60;
const COURT_FINAL_VOTE_SECONDS = 5 * 60;
const COURT_ROOM_ROUNDS = [
  {
    round: 1,
    title: "Opening Statement",
    goal: "Read the case, choose a first position, and name the strongest benefit or concern.",
    judgePrompt: "Court is in session. Give an opening statement: should this AI system be approved, restricted, rejected, or paused for more information?"
  },
  {
    round: 2,
    title: "Stakeholder Harm",
    goal: "Name who benefits, who could be harmed, and who has the least power.",
    judgePrompt: "The bench wants stakeholder analysis. Who gains power here, who carries risk, and whose voice is missing from the case file?"
  },
  {
    round: 3,
    title: "Evidence Challenge",
    goal: "Use the sealed detail, case facts, and outside reasoning to challenge weak claims.",
    judgePrompt: "New evidence is admitted. Which fact changes your position, and what evidence is still too weak to trust?"
  },
  {
    round: 4,
    title: "Restrictions And Appeals",
    goal: "Design safeguards, accountability, and a way for affected people to appeal.",
    judgePrompt: "Assume the court could approve with limits. What exact restriction, oversight, or appeal process would make this fairer?"
  },
  {
    round: 5,
    title: "Closing Argument",
    goal: "Make the clearest final argument before the class votes.",
    judgePrompt: "Make your closing argument. What should the class vote, and what tradeoff must everyone acknowledge?"
  }
] as const;

type WhoWhoGamePhase = "lobby" | "chat" | "vote" | "resolve" | "ended";
type CourtRoomStatus = "lobby" | "debate" | "final-vote" | "ended";

interface InternalParticipant extends ParticipantSummary {
  roomId: string;
  identityId: string;
  detectiveRoomId?: string;
  storyRoomId?: string;
  courtRoomId?: string;
  status: "active" | "absent" | "removed";
  isAi?: boolean;
  joinedAt: string;
}

interface InternalTeam extends TeamSummary {
  storyId: string;
}

interface WhoWhoIdentityState {
  id: string;
  displayName: string;
  isAi: boolean;
  personaId?: "atlas" | "nova" | "cipher";
  participantId?: string;
  role?: WhoWhoRoleName;
  alive: boolean;
  eliminatedAt?: string;
  eliminatedReason?: string;
  joinedAt?: string;
  aiPersonaNote?: string;
}

interface WhoWhoResponseState {
  id: string;
  roundId: string;
  identityId: string;
  displayName: string;
  text: string;
  flagged: boolean;
  moderation: ModerationResult;
  submittedAt: string;
}

interface WhoWhoVoteState {
  id: string;
  roundId: string;
  participantId: string;
  identityId: string;
  confidence: number;
  evidence: string;
  evidenceType?: string;
  assumptionTag?: string;
  counterEvidence?: string;
  finalVoteIdentityIds: string[];
  createdAt: string;
}

interface WhoWhoChatMessageState {
  id: string;
  roundId: string;
  identityId: string;
  displayName: string;
  text: string;
  isAi: boolean;
  createdAt: string;
}

interface WhoWhoGameEventState {
  id: string;
  at: string;
  tone: "system" | "success" | "warning";
  message: string;
}

interface WhoWhoAbilityUseState {
  id: string;
  roundId: string;
  participantId: string;
  actorIdentityId: string;
  actorDisplayName: string;
  targetIdentityId: string;
  targetDisplayName: string;
  role: WhoWhoRoleName;
  abilityName: string;
  phase: WhoWhoGamePhase;
  result: string;
  isPublic: boolean;
  voteModifier?: number;
  protects?: boolean;
  createdAt: string;
}

interface WhoWhoRoomState {
  id: string;
  name: string;
  group: RotationGroupName;
  stage: "lobby" | "instructions" | "warm-up" | "round" | "review" | "discussion" | "voting" | "reveal" | "debrief";
  gamePhase: WhoWhoGamePhase;
  seatCount: number;
  roundId: string;
  roundNumber: number;
  promptId: string;
  promptText: string;
  identities: WhoWhoIdentityState[];
  chat: WhoWhoChatMessageState[];
  gameEvents: WhoWhoGameEventState[];
  responses: WhoWhoResponseState[];
  votes: WhoWhoVoteState[];
  abilityUses: WhoWhoAbilityUseState[];
  revealed: boolean;
  startedAt?: string;
  endedAt?: string;
  workshopEndsAt?: string;
  phaseStartedAt?: string;
  phaseEndsAt?: string;
  winner?: "humans" | "ai";
}

interface DetectiveDiscoveryState {
  id: string;
  participantId: string;
  roomId: string;
  teamId: string;
  authorName: string;
  evidenceId?: string;
  relatedEvidenceId?: string;
  documentId?: string;
  claim: string;
  finding: string;
  sourceTitle: string;
  sourceUrl?: string;
  evidenceType: string;
  stance: string;
  category: string;
  severity: string;
  confidence: number;
  explanation: string;
  affectedGroups?: string;
  safeguard?: string;
  dueProcessImpact?: string;
  nextStep?: string;
  pointsAwarded: number;
  createdAt: string;
}

interface DetectiveRecommendationState {
  id: string;
  roomId: string;
  teamId: string;
  participantId: string;
  authorName: string;
  finalClaim: string;
  strongestEvidence: string;
  openQuestions?: string;
  conditions?: string;
  decision: DetectiveRecommendationInput["decision"];
  accountableParty?: string;
  minimumConditions?: string;
  independentAuditPlan?: string;
  createdAt: string;
}

interface DetectiveChatMessageState {
  id: string;
  roomId: string;
  participantId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

interface DetectiveFundingVoteState {
  id: string;
  roomId: string;
  participantId: string;
  voterName: string;
  vote: DetectiveFundingVoteInput["vote"];
  reason: string;
  createdAt: string;
}

interface DetectiveRoomState {
  id: string;
  name: string;
  businessId: string;
  memberIds: string[];
  status: "lobby" | "research" | "decision" | "closed";
  createdAt: string;
}

interface StoryState {
  id: string;
  teamId: string;
  title: string;
  stage: number;
  seed: Record<string, string>;
  protagonist: Record<string, string>;
  conflict: Record<string, string>;
  plot: Record<string, string>;
  ethicsChecklist: Record<string, boolean>;
  draft: string;
  finalText: string;
  revisions: Array<{ beforeText: string; afterText: string; reason: string; createdAt: string }>;
  published: StoryPublishInput | null;
  status: "draft" | "flagged" | "approved" | "published" | "removed";
}

interface StoryRoomChatMessageState {
  id: string;
  roomId: string;
  participantId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

interface StoryRoomProposalVoteState {
  participantId: string;
  voterName: string;
  vote: StoryRoomProposalVoteInput["vote"];
  createdAt: string;
}

interface StoryRoomProposalState {
  id: string;
  roomId: string;
  participantId: string;
  authorName: string;
  kind: StoryRoomProposalInput["kind"];
  text: string;
  createdAt: string;
  votes: StoryRoomProposalVoteState[];
}

interface StoryRoomGuideMessageState {
  id: string;
  roomId: string;
  participantId?: string;
  requesterName: string;
  prompt: string;
  response: string;
  scope: StoryRoomGuideInput["scope"];
  createdAt: string;
}

interface StoryRoomState {
  id: string;
  name: string;
  lane: string;
  focus: string;
  storyId: string;
  memberIds: string[];
  status: "lobby" | "running" | "ended";
  activeStage: number;
  title: string;
  finalText: string;
  authorshipNote: string;
  startedAt?: string;
  endedAt?: string;
  stageEndsAt?: string;
  workshopEndsAt?: string;
  chat: StoryRoomChatMessageState[];
  proposals: StoryRoomProposalState[];
  guideMessages: StoryRoomGuideMessageState[];
}

interface CourtVoteState {
  id: string;
  participantId: string;
  teamId: string;
  caseId: string;
  phase: "initial" | "final";
  vote: CourtVoteValue;
  reason: string;
  stakeholder?: string;
  restriction?: string;
  appealNeeded?: boolean;
  createdAt: string;
}

interface CourtReasoningState {
  id: string;
  teamId: string;
  participantId?: string;
  caseId: string;
  reasoning: string;
  stakeholders: string;
  accountability: string;
  appeal: string;
  highlighted: boolean;
  createdAt: string;
}

interface CourtRoomArgumentState {
  id: string;
  roomId: string;
  participantId: string;
  authorName: string;
  round: number;
  stance: CourtVoteValue;
  stakeholder: string;
  evidence?: string;
  text: string;
  flagged: boolean;
  createdAt: string;
}

interface CourtJudgeMessageState {
  id: string;
  roomId: string;
  round: number;
  tone: "opening" | "question" | "ruling" | "timer";
  text: string;
  basedOnParticipantId?: string;
  createdAt: string;
}

interface CourtRoomVoteState {
  id: string;
  roomId: string;
  participantId: string;
  voterName: string;
  vote: CourtVoteValue;
  reason: string;
  createdAt: string;
}

interface CourtRoomState {
  id: string;
  name: string;
  docket: string;
  caseId: string;
  memberIds: string[];
  status: CourtRoomStatus;
  activeRound: number;
  startedAt?: string;
  roundEndsAt?: string;
  debateEndsAt?: string;
  finalVoteEndsAt?: string;
  endedAt?: string;
  judgeMessages: CourtJudgeMessageState[];
  arguments: CourtRoomArgumentState[];
  votes: CourtRoomVoteState[];
}

interface CharterProposalState {
  id: string;
  teamId?: string;
  text: string;
  status: "flagged" | "approved" | "published" | "removed";
  votes: string[];
  createdAt: string;
}

interface ModerationFlagState {
  id: string;
  participantId?: string;
  workshopId?: WorkshopId;
  contentType: string;
  contentId: string;
  reason: string;
  severity: string;
  redactedText: string;
  resolved: boolean;
  createdAt: string;
}

type ProgressStatus = "joined" | "waiting" | "active" | "submitted" | "voted";
type ActivityTone = "join" | "submit" | "vote" | "control" | "system";

interface ActivityFeedItem {
  id: string;
  at: string;
  tone: ActivityTone;
  workshopId?: WorkshopId;
  teamId?: string;
  teamName?: string;
  participantName?: string;
  message: string;
}

interface ParticipantProgressState {
  participantId: string;
  nickname: string;
  group: RotationGroupName;
  teamId: string;
  teamName: string;
  currentWorkshop: WorkshopId;
  isAi: boolean;
  status: ProgressStatus;
  points: number;
  badges: string[];
}

interface TeamProgressState {
  teamId: string;
  teamName: string;
  group: RotationGroupName;
  currentWorkshop: WorkshopId;
  readiness: string;
  ready: boolean;
  joined: number;
  waiting: number;
  active: number;
  submitted: number;
  voted: number;
  lastActivityAt?: string;
}

interface DemoSummaryState {
  humanParticipants: number;
  aiClassmates: number;
  activeTeams: number;
  readyTeams: number;
  totalSubmissions: number;
  totalVotes: number;
  publishedStories: number;
  finalCharterRules: number;
  topCharterRules: Array<{ id: string; text: string; votes: number; status: string }>;
  featuredStories: Array<{ id: string; teamId: string; teamName: string; title: string; excerpt: string; status: string }>;
}

interface DemoExportState {
  exportedAt: string;
  event: EventState;
  participants: ParticipantSummary[];
  progress: {
    participants: ParticipantProgressState[];
    teams: TeamProgressState[];
  };
  activityFeed: ActivityFeedItem[];
  summary: DemoSummaryState;
  submissions: {
    whosWho: Array<{ roomId: string; roomName: string; chat: WhoWhoChatMessageState[]; responses: WhoWhoResponseState[]; votes: WhoWhoVoteState[]; gameEvents: WhoWhoGameEventState[] }>;
    dataDetective: {
      rooms: DetectiveRoomState[];
      discoveries: DetectiveDiscoveryState[];
      chat: DetectiveChatMessageState[];
      recommendations: DetectiveRecommendationState[];
      votes: DetectiveFundingVoteState[];
    };
    storibloom: StoryState[];
    kuramiCourt: {
      rooms: CourtRoomState[];
      votes: CourtVoteState[];
      reasoning: CourtReasoningState[];
    };
    charter: CharterProposalState[];
  };
  aiUsage: {
    aiRequests: number;
    failedAiRequests: number;
    estimatedTokens: number;
  };
}

function createSeedCharterProposals(): CharterProposalState[] {
  return CHARTER_EXAMPLES.map((text, index) => ({
    id: `charter-seed-${index + 1}`,
    text,
    status: index < 3 ? "approved" : "flagged",
    votes: [],
    createdAt: new Date().toISOString()
  }));
}

export interface DashboardState {
  facilitator: {
    scope: FacilitatorScope;
    roomName: string;
    isLead: boolean;
  };
  event: EventState;
  schedule: typeof import("@responsible-ai-lab/shared").EVENT_TIMELINE;
  participants: ParticipantSummary[];
  system: {
    api: "ok";
    database: "configured" | "memory-fallback";
    redis: "configured" | "memory-fallback";
    openai: "enabled" | "disabled" | "missing-key";
  };
  moderationQueue: ModerationFlagState[];
  apiUsage: {
    aiRequests: number;
    failedAiRequests: number;
    estimatedTokens: number;
  };
  progress: {
    participants: ParticipantProgressState[];
    teams: TeamProgressState[];
  };
  activityFeed: ActivityFeedItem[];
  summary: DemoSummaryState;
}

interface EventStoreOptions {
  eventCode?: string;
  lowBandwidthDefault?: boolean;
  hasDatabaseUrl?: boolean;
  hasRedisUrl?: boolean;
  hasOpenAiKey?: boolean;
  demoMode?: boolean;
}

export class EventStore {
  private event: EventState;
  private participants = new Map<string, InternalParticipant>();
  private sessions = new Map<string, string>();
  private teams = new Map<string, InternalTeam>();
  private rooms = new Map<string, WhoWhoRoomState>();
  private detectiveRooms = new Map<string, DetectiveRoomState>();
  private discoveries: DetectiveDiscoveryState[] = [];
  private recommendations: DetectiveRecommendationState[] = [];
  private detectiveChat: DetectiveChatMessageState[] = [];
  private detectiveVotes: DetectiveFundingVoteState[] = [];
  private evidence: DetectiveEvidence[] = DETECTIVE_EVIDENCE.map((item) => ({ ...item }));
  private activeDetectiveStage = 1;
  private stories = new Map<string, StoryState>();
  private storyRooms = new Map<string, StoryRoomState>();
  private courtCases: CourtCase[] = COURT_CASES.map((item, index) => ({ ...item, id: item.id || `case-${index + 1}` }));
  private activeCourtCaseId = COURT_CASES[0]?.id ?? "ai-school-counselor";
  private courtRooms = new Map<string, CourtRoomState>();
  private courtVotes: CourtVoteState[] = [];
  private courtReasoning: CourtReasoningState[] = [];
  private charterProposals: CharterProposalState[] = createSeedCharterProposals();
  private moderationFlags: ModerationFlagState[] = [];
  private aiRequests = { total: 0, failed: 0, estimatedTokens: 0 };
  private activityFeed: ActivityFeedItem[] = [];

  constructor(private readonly options: EventStoreOptions) {
    const now = new Date().toISOString();
    const teams = this.createTeams();
    for (const team of teams) {
      this.teams.set(team.id, team);
      this.stories.set(team.storyId, this.createStory(team.id, team.storyId));
    }

    const rooms = this.createRooms();
    for (const room of rooms) {
      this.rooms.set(room.id, room);
    }

    const detectiveRooms = this.createDetectiveRooms();
    for (const room of detectiveRooms) {
      this.detectiveRooms.set(room.id, room);
    }

    const storyRooms = this.createStoryRooms();
    for (const room of storyRooms) {
      this.storyRooms.set(room.id, room);
      this.stories.set(room.storyId, this.createStory(room.id, room.storyId));
    }

    for (const room of this.createCourtRooms()) {
      this.courtRooms.set(room.id, room);
    }

    this.event = {
      eventId: "demo-event",
      eventCode: options.eventCode ?? DEFAULT_EVENT_CODE,
      eventName: EVENT_NAME,
      status: "onboarding",
      currentRotation: 0,
      rotationStartedAt: null,
      rotationEndsAt: null,
      timerSecondsRemaining: WELCOME_DURATION_SECONDS,
      announcement: "Welcome to Kurami.AI. Join your rotation group and get ready to move with your team.",
      settings: {
        leaderboardEnabled: true,
        leaderboardMode: "team",
        aiEnabled: true,
        lowBandwidthMode: options.lowBandwidthDefault ?? false,
        fallbackMode: false,
        manuallyUnlockedWorkshops: [],
        lockedWorkshops: []
      },
      participantsOnline: 0,
      participantsDisconnected: 0,
      groupCounts: { Gold: 0, Black: 0, Green: 0, Purple: 0 },
      teams: [...this.teams.values()].map((team) => ({
        id: team.id,
        name: team.name,
        group: team.group,
        memberCount: team.memberCount,
        targetSize: TEAM_TARGET_SIZE,
        seatsFilled: Math.min(team.memberCount, TEAM_TARGET_SIZE),
        seatsRemaining: Math.max(0, TEAM_TARGET_SIZE - team.memberCount),
        ready: team.memberCount >= TEAM_TARGET_SIZE,
        points: team.points,
        currentWorkshop: team.currentWorkshop
      })),
      serverTime: now
    };
  }

  getState(): EventState {
    const snapshot = timerSnapshot(this.event);
    const participants = [...this.participants.values()].filter((participant) => participant.status !== "removed");
    const humanParticipants = participants.filter((participant) => !participant.isAi);
    const groupCounts = ROTATION_GROUPS.reduce<Record<RotationGroupName, number>>(
      (counts, group) => {
        counts[group] = humanParticipants.filter((participant) => participant.group === group).length;
        return counts;
      },
      { Gold: 0, Black: 0, Green: 0, Purple: 0 }
    );

    this.event = {
      ...this.event,
      timerSecondsRemaining: snapshot.secondsRemaining,
      groupCounts,
      participantsOnline: humanParticipants.filter((participant) => participant.connectionState === "online").length,
      participantsDisconnected: humanParticipants.filter((participant) => participant.connectionState !== "online").length,
      teams: this.teamSummaries(),
      serverTime: new Date().toISOString()
    };
    return this.event;
  }

  createEvent() {
    return this.getState();
  }

  join(input: { eventCode: string; nickname: string; acceptedResponsibleUse: true; restoreSessionId?: string }): JoinResult {
    if (input.restoreSessionId) {
      const restored = this.restore(input.restoreSessionId);
      if (restored) return restored;
    }

    if (input.eventCode.toUpperCase() !== this.event.eventCode.toUpperCase()) {
      throw new Error("Event code not found.");
    }

    const activeParticipants = [...this.participants.values()].filter((participant) => participant.status !== "removed");
    const existingNicknames = activeParticipants.map((participant) => participant.nickname);
    const anonymousNumber = activeParticipants.filter((participant) => !participant.isAi).length + 1;
    const requestedNickname = input.nickname.trim() || `Student ${anonymousNumber}`;
    const nickname = normalizeNickname(requestedNickname, existingNicknames);
    const group = this.chooseBalancedWorkshopGroup();
    const teamId = assignTeam(group, [...this.teams.values()]);
    const team = this.teams.get(teamId);
    if (!team) throw new Error("No team available.");
    const participantId = `participant-${createSessionId()}`;
    const sessionId = createSessionId();
    const roomId = this.chooseRoom(group, teamId);
    const identityId = this.assignHumanIdentity(roomId, participantId);
    const completedWorkshops = completedWorkshopsForGroup(group, this.event.currentRotation);
    const badges = awardBadges(completedWorkshops).map((badge) => badge.name);
    const joinedAt = new Date().toISOString();
    const participant: InternalParticipant = {
      id: participantId,
      sessionId,
      nickname,
      group,
      teamId,
      teamName: team.name,
      points: 0,
      badges,
      connectionState: "online",
      currentWorkshop: currentWorkshopForGroup(group, this.event.currentRotation),
      completedWorkshops,
      roomId,
      identityId,
      status: "active",
      joinedAt
    };

    this.participants.set(participant.id, participant);
    this.sessions.set(sessionId, participant.id);
    team.memberCount += 1;
    this.teams.set(team.id, team);
    if (this.options.demoMode) this.ensureDemoCompanions(participant);
    this.recordActivity({
      tone: "join",
      teamId: team.id,
      teamName: team.name,
      participantName: participant.nickname,
      message: `${participant.nickname} joined ${team.name}.`
    });
    return this.joinResult(participant);
  }

  restore(sessionId: string): JoinResult | null {
    const participantId = this.sessions.get(sessionId);
    if (!participantId) return null;
    const participant = this.participants.get(participantId);
    if (!participant) return null;
    participant.connectionState = "online";
    participant.currentWorkshop = currentWorkshopForGroup(participant.group, this.event.currentRotation);
    participant.completedWorkshops = completedWorkshopsForGroup(participant.group, this.event.currentRotation);
    participant.badges = awardBadges(participant.completedWorkshops).map((badge) => badge.name);
    this.participants.set(participant.id, participant);
    return this.joinResult(participant);
  }

  setDisconnected(sessionId: string) {
    const participantId = this.sessions.get(sessionId);
    if (!participantId) return;
    const participant = this.participants.get(participantId);
    if (!participant) return;
    participant.connectionState = "offline";
    this.participants.set(participant.id, participant);
  }

  listParticipants() {
    return [...this.participants.values()].map((participant) => this.publicParticipant(participant));
  }

  patchParticipant(participantId: string, patch: { nickname?: string; group?: RotationGroupName; teamId?: string; pointsDelta?: number; status?: "active" | "absent" | "removed" }) {
    const participant = this.requireParticipant(participantId);
    if (patch.nickname) participant.nickname = normalizeNickname(patch.nickname, this.listParticipants().filter((item) => item.id !== participant.id).map((item) => item.nickname));
    if (patch.group) participant.group = patch.group;
    if (patch.teamId) {
      const team = this.teams.get(patch.teamId);
      if (team) {
        participant.teamId = team.id;
        participant.teamName = team.name;
      }
    }
    if (patch.pointsDelta) participant.points += patch.pointsDelta;
    if (patch.status) participant.status = patch.status;
    participant.currentWorkshop = currentWorkshopForGroup(participant.group, this.event.currentRotation);
    participant.completedWorkshops = completedWorkshopsForGroup(participant.group, this.event.currentRotation);
    participant.badges = awardBadges(participant.completedWorkshops).map((badge) => badge.name);
    this.participants.set(participant.id, participant);
    return this.publicParticipant(participant);
  }

  resetParticipant(participantId: string) {
    const participant = this.requireParticipant(participantId);
    participant.points = 0;
    participant.badges = [];
    participant.completedWorkshops = [];
    participant.connectionState = "online";
    this.participants.set(participant.id, participant);
    return this.publicParticipant(participant);
  }

  control(input: EventControlInput) {
    const now = new Date();
    if (input.action === "start") {
      this.event.status = "running";
      this.event.currentRotation = this.event.currentRotation === 0 ? 1 : this.event.currentRotation;
      this.event.rotationStartedAt = now.toISOString();
      this.event.rotationEndsAt = new Date(now.getTime() + WORKSHOP_DURATION_MINUTES * 60_000).toISOString();
    }
    if (input.action === "pause") this.event.status = "paused";
    if (input.action === "resume") this.event.status = "running";
    if (input.action === "end") this.event.status = "ended";
    if (input.action === "force-start") {
      this.forceStart(now);
    }
    if (input.action === "advance-rotation") {
      this.event.currentRotation = Math.min(4, this.event.currentRotation + 1) as EventState["currentRotation"];
      this.event.status = "running";
      this.event.rotationStartedAt = now.toISOString();
      this.event.rotationEndsAt = new Date(now.getTime() + WORKSHOP_DURATION_MINUTES * 60_000).toISOString();
    }
    if (input.action === "previous-rotation") {
      this.event.currentRotation = Math.max(1, this.event.currentRotation - 1) as EventState["currentRotation"];
      this.event.status = "running";
      this.event.rotationStartedAt = now.toISOString();
      this.event.rotationEndsAt = new Date(now.getTime() + WORKSHOP_DURATION_MINUTES * 60_000).toISOString();
    }
    if ((input.action === "extend" || input.action === "shorten") && this.event.rotationEndsAt) {
      const direction = input.action === "extend" ? 1 : -1;
      const minutes = input.minutes ?? 5;
      this.event.rotationEndsAt = new Date(new Date(this.event.rotationEndsAt).getTime() + direction * minutes * 60_000).toISOString();
    }
    if (input.action === "lock-all") {
      this.event.settings.lockedWorkshops = Object.keys(WORKSHOPS) as WorkshopId[];
      this.event.settings.manuallyUnlockedWorkshops = [];
    }
    if (input.action === "reset-event") {
      this.resetEventForDemo();
    }
    if (input.action === "fallback-on") this.event.settings.fallbackMode = true;
    if (input.action === "fallback-off") this.event.settings.fallbackMode = false;
    if (input.action === "leaderboard-on") this.event.settings.leaderboardEnabled = true;
    if (input.action === "leaderboard-off") this.event.settings.leaderboardEnabled = false;
    if (input.action === "ai-on") this.event.settings.aiEnabled = true;
    if (input.action === "ai-off") this.event.settings.aiEnabled = false;
    if (input.action === "low-bandwidth-on") this.event.settings.lowBandwidthMode = true;
    if (input.action === "low-bandwidth-off") this.event.settings.lowBandwidthMode = false;
    const controlMessages: Partial<Record<EventControlInput["action"], string>> = {
      start: "Facilitator started the workshop timer.",
      pause: "Facilitator paused the room.",
      resume: "Facilitator resumed the room.",
      end: "Facilitator ended the event.",
      "advance-rotation": "Facilitator advanced to the next rotation.",
      "previous-rotation": "Facilitator moved back one rotation.",
      extend: "Facilitator added time to the timer.",
      shorten: "Facilitator shortened the timer.",
      "fallback-on": "Fallback mode turned on.",
      "fallback-off": "Fallback mode turned off.",
      "leaderboard-on": "Leaderboard turned on.",
      "leaderboard-off": "Leaderboard turned off."
    };
    const message = controlMessages[input.action];
    if (message) this.recordActivity({ tone: "control", message });
    this.refreshParticipants();
    return this.getState();
  }

  unlockWorkshop(workshopId: WorkshopId, unlocked: boolean) {
    const unlockedSet = new Set(this.event.settings.manuallyUnlockedWorkshops);
    const lockedSet = new Set(this.event.settings.lockedWorkshops);
    if (unlocked) {
      unlockedSet.add(workshopId);
      lockedSet.delete(workshopId);
    } else {
      unlockedSet.delete(workshopId);
      lockedSet.add(workshopId);
    }
    this.event.settings.manuallyUnlockedWorkshops = [...unlockedSet];
    this.event.settings.lockedWorkshops = [...lockedSet];
    return this.getState();
  }

  announce(message: string) {
    this.event.announcement = message;
    return { message, createdAt: new Date().toISOString() };
  }

  getDashboard(scope: FacilitatorScope = "lead"): DashboardState {
    const dashboard: DashboardState = {
      facilitator: this.facilitatorDescriptor(scope),
      event: this.getState(),
      schedule: EVENT_TIMELINE,
      participants: this.listParticipants(),
      system: {
        api: "ok",
        database: this.options.hasDatabaseUrl ? "configured" : "memory-fallback",
        redis: this.options.hasRedisUrl ? "configured" : "memory-fallback",
        openai: this.options.hasOpenAiKey && this.event.settings.aiEnabled ? "enabled" : this.event.settings.aiEnabled ? "missing-key" : "disabled"
      },
      moderationQueue: this.moderationFlags.filter((flag) => !flag.resolved),
      apiUsage: {
        aiRequests: this.aiRequests.total,
        failedAiRequests: this.aiRequests.failed,
        estimatedTokens: this.aiRequests.estimatedTokens
      },
      progress: this.buildProgress(),
      activityFeed: this.buildActivityFeed(),
      summary: this.buildSummary()
    };
    return scope === "lead" ? dashboard : this.scopeDashboard(dashboard, scope);
  }

  exportResults(): DemoExportState {
    return {
      exportedAt: new Date().toISOString(),
      event: this.getState(),
      participants: this.listParticipants(),
      progress: this.buildProgress(),
      activityFeed: this.buildActivityFeed(),
      summary: this.buildSummary(),
      submissions: {
        whosWho: [...this.rooms.values()].map((room) => ({
          roomId: room.id,
          roomName: room.name,
          chat: room.chat,
          responses: room.responses,
          votes: room.votes,
          gameEvents: room.gameEvents
        })),
        dataDetective: {
          rooms: [...this.detectiveRooms.values()],
          discoveries: this.discoveries,
          chat: this.detectiveChat,
          recommendations: this.recommendations,
          votes: this.detectiveVotes
        },
        storibloom: [...this.stories.values()],
        kuramiCourt: {
          rooms: [...this.courtRooms.values()],
          votes: this.courtVotes,
          reasoning: this.courtReasoning
        },
        charter: this.charterProposals
      },
      aiUsage: {
        aiRequests: this.aiRequests.total,
        failedAiRequests: this.aiRequests.failed,
        estimatedTokens: this.aiRequests.estimatedTokens
      }
    };
  }

  getWorkshopState(workshopId: WorkshopId, participantId?: string) {
    if (workshopId === "whos-who") return this.getWhoWhoState(participantId);
    if (workshopId === "data-detective") return this.getDetectiveState(participantId);
    if (workshopId === "storibloom") return this.getStoribloomState(participantId);
    return this.getCourtState(participantId);
  }

  getFacilitatorWorkshopState(workshopId: WorkshopId, scope: FacilitatorScope = "lead") {
    const state = this.getWorkshopState(workshopId) as Record<string, unknown>;
    if (scope === "lead") return state;
    const roomIds = this.roomIdsForFacilitatorScope(scope, workshopId);
    if (workshopId === "whos-who") {
      return {
        ...state,
        room: roomIds[0] ? this.getWhoWhoRoom(roomIds[0], { reveal: true }) : state.room,
        rooms: ((state.rooms as Array<{ id: string }>) ?? []).filter((room) => roomIds.includes(room.id))
      };
    }
    if (workshopId === "data-detective") {
      return {
        ...state,
        roomIds,
        businesses: ((state.businesses as Array<{ roomId: string }>) ?? []).filter((business) => roomIds.includes(business.roomId)),
        rooms: ((state.rooms as Array<{ id: string }>) ?? []).filter((room) => roomIds.includes(room.id)),
        activeRoom: null,
        discoveries: ((state.discoveries as Array<{ roomId: string }>) ?? []).filter((item) => roomIds.includes(item.roomId)),
        chat: ((state.chat as Array<{ roomId: string }>) ?? []).filter((item) => roomIds.includes(item.roomId)),
        recommendations: ((state.recommendations as Array<{ roomId: string }>) ?? []).filter((item) => roomIds.includes(item.roomId)),
        votes: ((state.votes as Array<{ roomId: string }>) ?? []).filter((item) => roomIds.includes(item.roomId))
      };
    }
    if (workshopId === "storibloom") {
      return {
        ...state,
        roomIds,
        rooms: ((state.rooms as Array<{ id: string }>) ?? []).filter((room) => roomIds.includes(room.id)),
        activeRoom: null,
        stories: ((state.stories as Array<{ teamId: string }>) ?? []).filter((story) => roomIds.includes(story.teamId))
      };
    }
    return {
      ...state,
      roomIds,
      rooms: ((state.rooms as Array<{ id: string }>) ?? []).filter((room) => roomIds.includes(room.id)),
      activeRoom: null,
      cases: ((state.cases as Array<{ id: string }>) ?? []).filter((caseFile) =>
        ((state.rooms as Array<{ id: string; caseId: string }>) ?? []).some((room) => roomIds.includes(room.id) && room.caseId === caseFile.id)
      )
    };
  }

  getCourtRoom(roomId: string) {
    return this.publicCourtRoom(this.requireCourtRoom(roomId));
  }

  getWhoWhoRoom(roomId: string, options: { reveal?: boolean; participantId?: string } = {}) {
    const room = this.requireRoom(roomId);
    return this.publicRoom(room, options.reveal ?? room.revealed, options.participantId);
  }

  joinWhoWhoRoom(input: WhoWhoJoinRoomInput) {
    const participant = this.requireParticipant(input.participantId);
    if (participant.isAi) throw new ApiError(403, "ai_cannot_join_room", "AI classmates cannot join rooms manually.");
    const room = this.requireRoom(input.roomId);
    const previousRoom = this.rooms.get(participant.roomId);
    if (previousRoom && previousRoom.id !== room.id) {
      const previousIdentity = previousRoom.identities.find((identity) => identity.participantId === participant.id);
      if (previousIdentity) this.releaseIdentity(previousIdentity);
      this.rooms.set(previousRoom.id, previousRoom);
    }
    const identity = room.identities.find((item) => item.participantId === participant.id) ?? this.assignIdentitySlot(room, participant.id, false, participant.id);
    participant.roomId = room.id;
    participant.identityId = identity.id;
    this.participants.set(participant.id, participant);
    this.addGameEvent(room, "system", `${identity.displayName} entered ${room.id}.`);
    this.rooms.set(room.id, room);
    this.recordActivity({
      tone: "join",
      workshopId: "whos-who",
      teamId: participant.teamId,
      teamName: participant.teamName,
      participantName: participant.nickname,
      message: `${participant.nickname} joined Who's Who room ${room.id} as ${identity.displayName}.`
    });
    return this.publicRoom(room, false, participant.id);
  }

  submitWhoWhoChat(input: WhoWhoChatInput) {
    const participant = this.requireParticipant(input.participantId);
    const room = this.requireRoom(input.roomId);
    this.syncWhoWhoTimers(room);
    const identity = this.requireParticipantIdentity(room, participant.id);
    if (!identity.alive) throw new ApiError(409, "player_eliminated", "You were taken out, so you can watch but cannot chat.");
    if (room.gamePhase === "lobby") throw new ApiError(409, "game_not_started", "Waiting for the facilitator to start the game.");
    if (room.gamePhase === "ended") throw new ApiError(409, "game_ended", "This game has ended.");
    if (room.gamePhase !== "chat") throw new ApiError(409, "day_closed", "Day discussion is closed. Wait for the next Day to chat.");
    const moderation = this.flagIfNeeded(input.text, participant.id, "whos-who", "who-who-chat", room.roundId);
    room.chat.push({
      id: `chat-${createSessionId()}`,
      roundId: room.roundId,
      identityId: identity.id,
      displayName: identity.displayName,
      text: moderation.redactedText,
      isAi: false,
      createdAt: new Date().toISOString()
    });
    room.stage = "discussion";
    room.gamePhase = "chat";
    this.addAiChatBurst(room, 1);
    this.rooms.set(room.id, room);
    participant.points += 5;
    this.participants.set(participant.id, participant);
    this.recordActivity({
      tone: "submit",
      workshopId: "whos-who",
      teamId: participant.teamId,
      teamName: participant.teamName,
      participantName: participant.nickname,
      message: `${participant.nickname} added a clue in Who's Who.`
    });
    return this.publicRoom(room, false, participant.id);
  }

  submitWhoWhoAccusation(input: WhoWhoAccuseInput) {
    const participant = this.requireParticipant(input.participantId);
    const room = this.requireRoom(input.roomId);
    this.syncWhoWhoTimers(room);
    const identity = this.requireParticipantIdentity(room, participant.id);
    if (!identity.alive) throw new ApiError(409, "player_eliminated", "You were taken out, so you can watch but cannot vote.");
    if (room.gamePhase === "lobby") throw new ApiError(409, "game_not_started", "Waiting for the facilitator to start the game.");
    if (room.gamePhase === "ended") throw new ApiError(409, "game_ended", "This game has ended.");
    if (room.gamePhase !== "vote") throw new ApiError(409, "night_closed", "Accusations open during Night. Use Day discussion to gather evidence.");
    const target = room.identities.find((item) => item.id === input.identityId);
    if (!target) throw new Error("Identity not found.");
    if (!target.alive) throw new ApiError(409, "target_eliminated", "That player is already out.");
    const moderation = this.flagIfNeeded(input.reason, participant.id, "whos-who", "who-who-accusation", room.roundId);
    room.votes = room.votes.filter((vote) => !(vote.participantId === participant.id && vote.roundId === room.roundId));
    room.votes.push({
      id: `vote-${createSessionId()}`,
      roundId: room.roundId,
      participantId: participant.id,
      identityId: target.id,
      confidence: 3,
      evidence: moderation.redactedText,
      evidenceType: "assumption-check",
      assumptionTag: "Chat clue",
      finalVoteIdentityIds: [target.id],
      createdAt: new Date().toISOString()
    });
    room.stage = "voting";
    room.gamePhase = "vote";
    this.addGameEvent(room, "system", `${identity.displayName} accused ${target.displayName}.`);
    this.rooms.set(room.id, room);
    participant.points += target.isAi ? 15 : 5;
    this.participants.set(participant.id, participant);
    this.recordActivity({
      tone: "vote",
      workshopId: "whos-who",
      teamId: participant.teamId,
      teamName: participant.teamName,
      participantName: participant.nickname,
      message: `${participant.nickname} made a Who's Who accusation.`
    });
    return this.publicRoom(room, false, participant.id);
  }

  useWhoWhoRoleAbility(input: WhoWhoRoleAbilityInput) {
    const participant = this.requireParticipant(input.participantId);
    const room = this.requireRoom(input.roomId);
    this.syncWhoWhoTimers(room);
    const identity = this.requireParticipantIdentity(room, participant.id);
    if (!identity.alive) throw new ApiError(409, "player_eliminated", "You were taken out, so you can watch but cannot use a role.");
    if (room.gamePhase === "lobby") throw new ApiError(409, "game_not_started", "Waiting for the facilitator to start the game.");
    if (room.gamePhase === "resolve" || room.gamePhase === "ended") throw new ApiError(409, "role_locked", "Role powers are locked until the next Day or Night.");
    const role = identity.role;
    const ability = this.whoWhoAbilityForRole(role);
    if (!role || !ability) throw new ApiError(409, "role_missing", "Your role is still being assigned.");
    const alreadyUsed = room.abilityUses.some((use) => use.roundId === room.roundId && use.participantId === participant.id);
    if (alreadyUsed) throw new ApiError(409, "role_used", "You already used your role power this round.");
    if (role === "Archivist" && room.gamePhase !== "chat") throw new ApiError(409, "day_power", "Archivist can pull receipts during Day discussion.");
    if ((role === "Skeptic" || role === "Protector" || role === "Strategist") && room.gamePhase !== "vote") {
      throw new ApiError(409, "night_power", `${role} can use this power during Night accusations.`);
    }

    const target = room.identities.find((item) => item.id === input.targetIdentityId);
    if (!target) throw new ApiError(404, "target_not_found", "That classmate is not in this room.");
    if (!target.alive) throw new ApiError(409, "target_eliminated", "That classmate is already out.");
    if (!target.participantId && !target.isAi) throw new ApiError(409, "target_empty", "Choose a filled seat.");

    const targetMessages = room.chat.filter((message) => message.identityId === target.id);
    const targetVotes = room.votes.filter((vote) => vote.roundId === room.roundId && vote.identityId === target.id).length;
    const latestMessage = targetMessages.at(-1)?.text;
    let result = "";
    let isPublic = false;
    let voteModifier: number | undefined;
    let protects = false;
    let eventMessage = `${identity.displayName} used ${ability.abilityName}.`;

    switch (role) {
      case "Investigator":
        result = target.isAi
          ? `${target.displayName} shows a strong AI signal: polished phrasing, low personal risk, and careful balance.`
          : `${target.displayName} shows a strong human signal: concrete detail, messier phrasing, and reactive context.`;
        break;
      case "Archivist":
        result = `${target.displayName} has ${targetMessages.length} Day message${targetMessages.length === 1 ? "" : "s"} and ${targetVotes} current accusation${targetVotes === 1 ? "" : "s"}. ${
          latestMessage ? `Latest receipt: "${latestMessage.slice(0, 120)}"` : "No chat receipt yet."
        } ${target.isAi ? "Pattern note: their record reads unusually polished." : "Pattern note: their record has more human mess and context."}`;
        break;
      case "Signal Reader":
        result = target.isAi
          ? `${target.displayName}'s signal leans AI: balanced helper tone, repeated room language, and few grounded specifics.`
          : `${target.displayName}'s signal leans human: specific context, uneven wording, and live reactions to the room.`;
        break;
      case "Skeptic":
        voteModifier = -1;
        isPublic = true;
        result = `${identity.displayName} cast doubt on the case against ${target.displayName}. Their accusation pressure is reduced by 1 this round.`;
        eventMessage = result;
        break;
      case "Protector":
        protects = true;
        result = `${target.displayName} is guarded from the hidden AI counterstrike this round.`;
        eventMessage = `${identity.displayName} set a Night guard.`;
        break;
      case "Witness":
        result = target.isAi
          ? `${target.displayName}'s alibi feels thin: it sounds fluent, but it avoids lived specifics a real classmate might volunteer.`
          : `${target.displayName}'s alibi has concrete human detail. Be careful before turning suspicion into a certainty.`;
        break;
      case "Strategist":
        voteModifier = 1;
        isPublic = true;
        result = `${identity.displayName} rallied the room to pressure ${target.displayName}. Their accusation pressure increases by 1 this round.`;
        eventMessage = result;
        break;
    }

    room.abilityUses.push({
      id: `ability-${createSessionId()}`,
      roundId: room.roundId,
      participantId: participant.id,
      actorIdentityId: identity.id,
      actorDisplayName: identity.displayName,
      targetIdentityId: target.id,
      targetDisplayName: target.displayName,
      role,
      abilityName: ability.abilityName,
      phase: room.gamePhase,
      result,
      isPublic,
      voteModifier,
      protects,
      createdAt: new Date().toISOString()
    });
    this.addGameEvent(room, isPublic ? "warning" : "system", eventMessage);
    this.rooms.set(room.id, room);
    participant.points += 10;
    this.participants.set(participant.id, participant);
    this.recordActivity({
      tone: "submit",
      workshopId: "whos-who",
      teamId: participant.teamId,
      teamName: participant.teamName,
      participantName: participant.nickname,
      message: `${participant.nickname} used the ${role} role power.`
    });
    return this.publicRoom(room, false, participant.id);
  }

  controlWhoWhoGame(input: WhoWhoGameControlInput) {
    const room = this.requireRoom(input.roomId);
    switch (input.action) {
      case "start":
        this.startWhoWhoGame(room);
        break;
      case "open-vote":
        this.openWhoWhoVote(room);
        break;
      case "force-vote":
        this.openWhoWhoVote(room, true);
        break;
      case "resolve":
        this.resolveWhoWhoRound(room);
        break;
      case "next-round":
        this.advanceWhoWhoRoundManually(room);
        break;
      case "reset":
        this.resetWhoWhoRoom(room);
        break;
      case "reveal":
        room.revealed = true;
        room.stage = "reveal";
        this.addGameEvent(room, "success", "The facilitator revealed the hidden AI classmates.");
        break;
    }
    this.rooms.set(room.id, room);
    this.recordActivity({
      tone: "control",
      workshopId: "whos-who",
      message: `Game master used ${input.action.replace("-", " ")} for ${room.id}.`
    });
    return this.publicRoom(room, true);
  }

  submitWhoWhoResponse(input: WhoWhoResponseInput) {
    const participant = this.requireParticipant(input.participantId);
    this.requireParticipantTeamReady(participant);
    const room = this.requireRoom(input.roomId);
    const moderation = this.flagIfNeeded(input.text, participant.id, "whos-who", "who-who-response", input.roundId);
    const identity = room.identities.find((item) => item.id === participant.identityId) ?? room.identities.find((item) => item.participantId === participant.id);
    if (!identity) throw new Error("Participant identity not assigned.");
    room.responses = room.responses.filter((response) => !(response.roundId === input.roundId && response.identityId === identity.id));
    room.responses.push({
      id: `response-${createSessionId()}`,
      roundId: input.roundId,
      identityId: identity.id,
      displayName: identity.displayName,
      text: moderation.redactedText,
      flagged: !moderation.ok,
      moderation,
      submittedAt: new Date().toISOString()
    });
    this.ensureAiResponses(room);
    room.stage = "review";
    this.rooms.set(room.id, room);
    participant.points += 10;
    this.recordActivity({
      tone: "submit",
      workshopId: "whos-who",
      teamId: participant.teamId,
      teamName: participant.teamName,
      participantName: participant.nickname,
      message: `${participant.nickname} submitted a Who's Who response.`
    });
    return this.publicRoom(room);
  }

  submitWhoWhoVote(input: WhoWhoVoteInput) {
    const participant = this.requireParticipant(input.participantId);
    this.requireParticipantTeamReady(participant);
    const room = this.requireRoom(input.roomId);
    this.syncWhoWhoTimers(room);
    if (room.gamePhase !== "vote") throw new ApiError(409, "night_closed", "Evidence votes open during Night.");
    const moderation = this.flagIfNeeded(input.evidence, participant.id, "whos-who", "who-who-vote", input.roundId);
    const previous = room.votes.find((vote) => vote.participantId === participant.id && vote.roundId === input.roundId);
    room.votes = room.votes.filter((vote) => !(vote.participantId === participant.id && vote.roundId === input.roundId));
    room.votes.push({
      id: `vote-${createSessionId()}`,
      roundId: input.roundId,
      participantId: participant.id,
      identityId: input.identityId,
      confidence: input.confidence,
      evidence: moderation.redactedText,
      evidenceType: input.evidenceType,
      assumptionTag: input.assumptionTag,
      counterEvidence: input.counterEvidence,
      finalVoteIdentityIds: input.finalVoteIdentityIds ?? [],
      createdAt: new Date().toISOString()
    });
    const selected = room.identities.find((identity) => identity.id === input.identityId);
    if (selected?.isAi) participant.points += 100;
    if (selected && !selected.isAi) participant.points -= 50;
    if (previous && previous.identityId !== input.identityId) participant.points += 20;
    if (input.evidence.length > 30) participant.points += 25;
    if (input.assumptionTag === "No unsupported assumption") participant.points += 20;
    if ((input.counterEvidence ?? "").length > 20) participant.points += 20;
    participant.badges = awardBadges(["whos-who"]).map((badge) => badge.name);
    room.stage = "voting";
    this.rooms.set(room.id, room);
    this.participants.set(participant.id, participant);
    this.recordActivity({
      tone: "vote",
      workshopId: "whos-who",
      teamId: participant.teamId,
      teamName: participant.teamName,
      participantName: participant.nickname,
      message: `${participant.nickname} cast an evidence vote in Who's Who.`
    });
    return this.publicRoom(room);
  }

  advanceWhoWhoRound(roomId: string, promptId?: string, stage?: WhoWhoRoomState["stage"]) {
    const room = this.requireRoom(roomId);
    const nextRoundNumber = room.roundNumber + 1;
    const promptIndex = WHOS_WHO_PROMPTS.findIndex((prompt) => prompt.id === room.promptId);
    const nextPrompt = WHOS_WHO_PROMPTS.find((prompt) => prompt.id === promptId) ?? WHOS_WHO_PROMPTS[(promptIndex + 1) % WHOS_WHO_PROMPTS.length] ?? WHOS_WHO_PROMPTS[0];
    if (!nextPrompt) throw new Error("No Who's Who prompts configured.");
    room.roundNumber = nextRoundNumber;
    room.roundId = `${room.id}-round-${nextRoundNumber}`;
    room.promptId = nextPrompt.id;
    room.promptText = nextPrompt.text;
    this.setWhoWhoTimedPhase(room, "chat", stage ?? "discussion", WHOS_WHO_DAY_SECONDS);
    room.revealed = false;
    this.addGameEvent(room, "system", `Day ${room.roundNumber} started from facilitator round controls.`);
    this.rooms.set(room.id, room);
    return this.publicRoom(room);
  }

  revealWhoWho(roomId: string) {
    const room = this.requireRoom(roomId);
    room.stage = "reveal";
    room.revealed = true;
    this.rooms.set(room.id, room);
    return this.publicRoom(room, true);
  }

  joinDetectiveRoom(input: DetectiveJoinRoomInput) {
    const participant = this.requireParticipant(input.participantId);
    if (participant.isAi) throw new ApiError(403, "ai_cannot_join_room", "AI classmates cannot join rooms manually.");
    const room = this.requireDetectiveRoom(input.roomId);
    if (participant.detectiveRoomId && participant.detectiveRoomId !== room.id) {
      const previousRoom = this.detectiveRooms.get(participant.detectiveRoomId);
      if (previousRoom) {
        previousRoom.memberIds = previousRoom.memberIds.filter((memberId) => memberId !== participant.id);
        this.detectiveRooms.set(previousRoom.id, previousRoom);
      }
    }
    if (!room.memberIds.includes(participant.id)) room.memberIds.push(participant.id);
    room.status = room.status === "lobby" ? "research" : room.status;
    participant.detectiveRoomId = room.id;
    this.participants.set(participant.id, participant);
    this.detectiveRooms.set(room.id, room);
    if (this.options.demoMode) this.ensureDemoDetectiveRoomActivity(room.id, participant);
    this.recordActivity({
      tone: "join",
      workshopId: "data-detective",
      teamId: participant.teamId,
      teamName: participant.teamName,
      participantName: participant.nickname,
      message: `${participant.nickname} joined Data-Detective room ${room.id}.`
    });
    return this.getDetectiveState(participant.id);
  }

  submitDiscovery(input: DetectiveDiscoverySubmission) {
    const participant = this.requireParticipant(input.participantId);
    const roomId = input.roomId ?? participant.detectiveRoomId ?? input.teamId;
    if (!roomId) throw new ApiError(400, "detective_room_required", "Join a detective room before adding a claim.");
    const room = this.requireDetectiveRoom(roomId);
    this.ensureDetectiveRoomMember(room, participant);
    const evidence = input.evidenceId ? this.evidence.find((item) => item.id === input.evidenceId || item.id.endsWith(input.evidenceId ?? "")) : undefined;
    const relatedEvidence = input.relatedEvidenceId ? this.evidence.find((item) => item.id === input.relatedEvidenceId || item.id.endsWith(input.relatedEvidenceId ?? "")) : undefined;
    const business = this.requireDetectiveBusiness(room.businessId);
    const document = input.documentId ? business.documents.find((item) => item.id === input.documentId) : undefined;
    const moderation = this.flagIfNeeded(`${input.claim}\n${input.finding}\n${input.sourceTitle}\n${input.nextStep ?? ""}`, participant.id, "data-detective", "detective-claim", room.id);
    const correctCategory = evidence ? evidence.ethicalCategories.includes(input.category) : true;
    const connectedClue = Boolean(relatedEvidence && relatedEvidence.id !== evidence?.id);
    const severity = input.severity ?? "medium";
    const confidence = input.confidence ?? 3;
    const explanation = input.explanation?.trim() || input.finding;
    const safeguard = input.safeguard?.trim() || input.nextStep?.trim();
    const pointsAwarded =
      40 +
      (correctCategory ? 25 : 0) +
      (input.finding.length > 90 ? 25 : 0) +
      (input.sourceUrl ? 30 : 0) +
      (input.nextStep && input.nextStep.length > 20 ? 30 : 0) +
      (connectedClue ? 25 : 0) +
      (input.dueProcessImpact && input.dueProcessImpact.length > 20 ? 25 : 0) +
      (document ? 15 : 0) +
      (severity === "urgent" ? 15 : 0) +
      confidence * 5 +
      (evidence?.hiddenValue ?? 0);
    participant.points += pointsAwarded;
    participant.badges = awardBadges(["data-detective"]).map((badge) => badge.name);
    const discovery: DetectiveDiscoveryState = {
      id: `discovery-${createSessionId()}`,
      participantId: participant.id,
      roomId: room.id,
      teamId: room.id,
      authorName: participant.nickname,
      evidenceId: evidence?.id,
      relatedEvidenceId: relatedEvidence?.id,
      documentId: document?.id,
      claim: input.claim,
      finding: moderation.redactedText,
      sourceTitle: input.sourceTitle,
      sourceUrl: input.sourceUrl || undefined,
      evidenceType: input.evidenceType ?? "outside-source",
      stance: input.stance ?? "needs-more-research",
      category: input.category,
      severity,
      confidence,
      explanation,
      affectedGroups: input.affectedGroups,
      safeguard,
      dueProcessImpact: input.dueProcessImpact,
      nextStep: input.nextStep,
      pointsAwarded,
      createdAt: new Date().toISOString()
    };
    this.discoveries.push(discovery);
    room.status = "research";
    this.detectiveRooms.set(room.id, room);
    this.participants.set(participant.id, participant);
    this.recordActivity({
      tone: "submit",
      workshopId: "data-detective",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} added an investor claim in ${room.id}.`
    });
    return discovery;
  }

  submitDetectiveChat(input: DetectiveChatInput) {
    const participant = this.requireParticipant(input.participantId);
    const room = this.requireDetectiveRoom(input.roomId);
    this.ensureDetectiveRoomMember(room, participant);
    const moderation = this.flagIfNeeded(input.text, participant.id, "data-detective", "detective-chat", room.id);
    const message: DetectiveChatMessageState = {
      id: `detective-chat-${createSessionId()}`,
      roomId: room.id,
      participantId: participant.id,
      authorName: participant.nickname,
      text: moderation.redactedText,
      createdAt: new Date().toISOString()
    };
    this.detectiveChat.push(message);
    this.recordActivity({
      tone: "submit",
      workshopId: "data-detective",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} posted a detective room note.`
    });
    return message;
  }

  submitRecommendation(input: DetectiveRecommendationInput) {
    const participant = this.requireParticipant(input.participantId);
    const roomId = input.roomId ?? participant.detectiveRoomId ?? input.teamId;
    if (!roomId) throw new ApiError(400, "detective_room_required", "Join a detective room before submitting a final claim.");
    const room = this.requireDetectiveRoom(roomId);
    this.ensureDetectiveRoomMember(room, participant);
    const moderation = this.flagIfNeeded(`${input.finalClaim}\n${input.strongestEvidence}\n${input.conditions ?? ""}`, participant.id, "data-detective", "detective-final-claim", room.id);
    const recommendation: DetectiveRecommendationState = {
      id: `recommendation-${createSessionId()}`,
      roomId: room.id,
      teamId: room.id,
      participantId: participant.id,
      authorName: participant.nickname,
      finalClaim: moderation.redactedText,
      strongestEvidence: input.strongestEvidence,
      openQuestions: input.openQuestions,
      conditions: input.conditions,
      decision: input.decision,
      accountableParty: input.accountableParty,
      minimumConditions: input.minimumConditions,
      independentAuditPlan: input.independentAuditPlan,
      createdAt: new Date().toISOString()
    };
    this.recommendations.push(recommendation);
    this.detectiveVotes = this.detectiveVotes.filter((vote) => !(vote.roomId === room.id && vote.participantId === participant.id));
    this.detectiveVotes.push({
      id: `detective-vote-${createSessionId()}`,
      roomId: room.id,
      participantId: participant.id,
      voterName: participant.nickname,
      vote: input.decision,
      reason: input.strongestEvidence,
      createdAt: new Date().toISOString()
    });
    room.status = "decision";
    this.detectiveRooms.set(room.id, room);
    const team = this.teams.get(participant.teamId);
    if (team) {
      team.points += input.decision === "fund" ? 75 : 100;
      this.teams.set(team.id, team);
    }
    participant.points += input.decision === "fund" ? 75 : 100;
    participant.badges = awardBadges(["data-detective"]).map((badge) => badge.name);
    this.participants.set(participant.id, participant);
    this.recordActivity({
      tone: "submit",
      workshopId: "data-detective",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} submitted a ${input.decision === "fund" ? "fund" : "reject"} final claim for ${room.name}.`
    });
    return recommendation;
  }

  submitDetectiveVote(input: DetectiveFundingVoteInput) {
    const participant = this.requireParticipant(input.participantId);
    const room = this.requireDetectiveRoom(input.roomId);
    this.ensureDetectiveRoomMember(room, participant);
    const moderation = this.flagIfNeeded(input.reason, participant.id, "data-detective", "detective-funding-vote", room.id);
    const vote: DetectiveFundingVoteState = {
      id: `detective-vote-${createSessionId()}`,
      roomId: room.id,
      participantId: participant.id,
      voterName: participant.nickname,
      vote: input.vote,
      reason: moderation.redactedText,
      createdAt: new Date().toISOString()
    };
    this.detectiveVotes = this.detectiveVotes.filter((item) => !(item.roomId === room.id && item.participantId === participant.id));
    this.detectiveVotes.push(vote);
    this.recordActivity({
      tone: "vote",
      workshopId: "data-detective",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} voted to ${input.vote} ${room.name}.`
    });
    return vote;
  }

  unlockDetectiveStage(stage: number) {
    this.activeDetectiveStage = Math.min(Math.max(stage, 1), 5);
    return this.getDetectiveState();
  }

  updateStory(storyId: string, patch: Partial<StoryState>) {
    const story = this.requireStory(storyId);
    const participantId = typeof (patch as { participantId?: unknown }).participantId === "string" ? (patch as { participantId: string }).participantId : undefined;
    if (participantId) this.requireParticipantTeamReady(this.requireParticipant(participantId));
    const before = story.finalText || story.draft;
    const { participantId: _participantId, ...cleanPatch } = patch as Partial<StoryState> & { participantId?: string };
    const updated: StoryState = { ...story, ...cleanPatch };
    if (patch.finalText && patch.finalText !== before) {
      updated.revisions = [
        ...updated.revisions,
        { beforeText: before, afterText: patch.finalText, reason: "Team edit", createdAt: new Date().toISOString() }
      ];
    }
    this.stories.set(storyId, updated);
    const team = this.teams.get(story.teamId);
    this.recordActivity({
      tone: "submit",
      workshopId: "storibloom",
      teamId: story.teamId,
      teamName: team?.name,
      message: `${team?.name ?? "A team"} updated a Storibloom story.`
    });
    return updated;
  }

  generateStory(storyId: string, participantId?: string) {
    const story = this.requireStory(storyId);
    if (participantId) this.requireParticipantTeamReady(this.requireParticipant(participantId));
    else this.requireTeamReady(story.teamId);
    this.aiRequests.total += 1;
    this.aiRequests.estimatedTokens += 900;
    const team = this.teams.get(story.teamId);
    const draft = createDeterministicStoryDraft({
      teamName: team?.name ?? "The team",
      genre: story.seed.genre ?? "speculative",
      setting: story.seed.setting ?? "a future city",
      theme: story.seed.theme ?? "responsibility",
      protagonist: story.protagonist.name ?? "the protagonist",
      conflict: story.conflict.pressure ?? "a risky shortcut"
    });
    story.draft = draft;
    story.finalText = draft;
    story.stage = 6;
    this.stories.set(story.id, story);
    this.recordActivity({
      tone: "submit",
      workshopId: "storibloom",
      teamId: story.teamId,
      teamName: team?.name,
      message: `${team?.name ?? "A team"} generated a Storibloom draft.`
    });
    return story;
  }

  publishStory(input: StoryPublishInput) {
    const story = this.requireStory(input.storyId);
    if (input.participantId) this.requireParticipantTeamReady(this.requireParticipant(input.participantId));
    else this.requireTeamReady(story.teamId);
    const moderation = this.flagIfNeeded(`${input.title}\n${input.finalText}`, undefined, "storibloom", "published-story", story.id);
    story.title = input.title;
    story.finalText = moderation.redactedText;
    story.published = { ...input, finalText: moderation.redactedText };
    story.status = moderation.ok ? "published" : "flagged";
    const team = this.teams.get(story.teamId);
    if (team) {
      team.points += 160;
      this.teams.set(team.id, team);
    }
    this.stories.set(story.id, story);
    this.recordActivity({
      tone: "submit",
      workshopId: "storibloom",
      teamId: story.teamId,
      teamName: team?.name,
      message: `${team?.name ?? "A team"} published "${story.title}".`
    });
    return story;
  }

  joinStoryRoom(input: StoryRoomJoinInput) {
    const participant = this.requireParticipant(input.participantId);
    if (participant.isAi) throw new ApiError(403, "ai_cannot_join_story_room", "AI classmates cannot join Storibloom rooms manually.");
    const room = this.requireStoryRoom(input.roomId);
    const previousRoom = participant.storyRoomId ? this.storyRooms.get(participant.storyRoomId) : undefined;
    if (previousRoom && previousRoom.id !== room.id) {
      previousRoom.memberIds = previousRoom.memberIds.filter((id) => id !== participant.id);
      this.storyRooms.set(previousRoom.id, previousRoom);
    }
    if (!room.memberIds.includes(participant.id)) room.memberIds.push(participant.id);
    participant.storyRoomId = room.id;
    this.participants.set(participant.id, participant);
    this.storyRooms.set(room.id, room);
    this.recordActivity({
      tone: "join",
      workshopId: "storibloom",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} joined Storibloom room ${room.id}.`
    });
    return this.publicStoryRoom(room, participant.id);
  }

  controlStoryRoom(input: StoryRoomControlInput) {
    const room = this.requireStoryRoom(input.roomId);
    if (input.action === "start") {
      const now = new Date();
      room.status = "running";
      room.activeStage = 1;
      room.startedAt = now.toISOString();
      room.stageEndsAt = new Date(now.getTime() + STORY_ROOM_STAGE_SECONDS * 1000).toISOString();
      room.workshopEndsAt = new Date(now.getTime() + WORKSHOP_DURATION_SECONDS * 1000).toISOString();
      delete room.endedAt;
      room.guideMessages.push({
        id: `story-guide-${createSessionId()}`,
        roomId: room.id,
        requesterName: "Kurami Guide",
        prompt: "Start the room",
        response: "The 45-minute story room is live. Start by pitching seeds in chat, then turn the strongest ideas into proposals so the room can vote.",
        scope: "room",
        createdAt: new Date().toISOString()
      });
    }
    if (input.action === "reset") {
      const fresh = this.createStoryRooms().find((item) => item.id === room.id);
      if (!fresh) throw new ApiError(404, "story_room_not_found", "Story room not found.");
      for (const participant of this.participants.values()) {
        if (participant.storyRoomId === room.id) {
          delete participant.storyRoomId;
          this.participants.set(participant.id, participant);
        }
      }
      this.storyRooms.set(fresh.id, fresh);
      this.stories.set(fresh.storyId, this.createStory(fresh.id, fresh.storyId));
      this.recordActivity({ tone: "control", workshopId: "storibloom", teamId: fresh.id, teamName: fresh.name, message: `${fresh.name} reset to lobby.` });
      return this.publicStoryRoom(fresh);
    }
    if (input.action === "end") {
      this.syncStoryRoomTimers(room);
      room.status = "ended";
      room.activeStage = 6;
      room.endedAt = new Date().toISOString();
      delete room.stageEndsAt;
      if (!room.finalText) this.generateStoryRoomDraft(room.id);
    }
    this.storyRooms.set(room.id, room);
    this.recordActivity({
      tone: "control",
      workshopId: "storibloom",
      teamId: room.id,
      teamName: room.name,
      message: `${room.name} ${input.action === "start" ? "started" : input.action === "end" ? "ended" : "updated"}.`
    });
    return this.publicStoryRoom(room);
  }

  submitStoryRoomChat(input: StoryRoomChatInput) {
    const participant = this.requireParticipant(input.participantId);
    const room = this.requireStoryRoom(input.roomId);
    this.requireStoryRoomMember(room, participant.id);
    this.syncStoryRoomTimers(room);
    if (room.status === "ended") throw new ApiError(409, "story_room_ended", "This room has ended. You can still read the final story.");
    const moderation = this.flagIfNeeded(input.text, participant.id, "storibloom", "story-room-chat", room.id);
    const message: StoryRoomChatMessageState = {
      id: `story-chat-${createSessionId()}`,
      roomId: room.id,
      participantId: participant.id,
      authorName: participant.nickname,
      text: moderation.redactedText,
      createdAt: new Date().toISOString()
    };
    room.chat.push(message);
    this.storyRooms.set(room.id, room);
    this.recordActivity({
      tone: "submit",
      workshopId: "storibloom",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} added to ${room.name}'s story chat.`
    });
    return message;
  }

  submitStoryRoomProposal(input: StoryRoomProposalInput) {
    const participant = this.requireParticipant(input.participantId);
    const room = this.requireStoryRoom(input.roomId);
    this.requireStoryRoomMember(room, participant.id);
    this.syncStoryRoomTimers(room);
    if (room.status === "ended") throw new ApiError(409, "story_room_ended", "This room has ended. Start a new room to suggest more ideas.");
    const moderation = this.flagIfNeeded(input.text, participant.id, "storibloom", "story-room-proposal", room.id);
    const proposal: StoryRoomProposalState = {
      id: `story-proposal-${createSessionId()}`,
      roomId: room.id,
      participantId: participant.id,
      authorName: participant.nickname,
      kind: input.kind,
      text: moderation.redactedText,
      createdAt: new Date().toISOString(),
      votes: [
        {
          participantId: participant.id,
          voterName: participant.nickname,
          vote: "approve",
          createdAt: new Date().toISOString()
        }
      ]
    };
    room.proposals.push(proposal);
    this.storyRooms.set(room.id, room);
    this.recordActivity({
      tone: "submit",
      workshopId: "storibloom",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} proposed a ${input.kind} idea in ${room.name}.`
    });
    return proposal;
  }

  voteStoryRoomProposal(input: StoryRoomProposalVoteInput) {
    const participant = this.requireParticipant(input.participantId);
    const room = this.requireStoryRoom(input.roomId);
    this.requireStoryRoomMember(room, participant.id);
    const proposal = room.proposals.find((item) => item.id === input.proposalId);
    if (!proposal) throw new ApiError(404, "story_proposal_not_found", "That story proposal was not found.");
    proposal.votes = proposal.votes.filter((vote) => vote.participantId !== participant.id);
    proposal.votes.push({
      participantId: participant.id,
      voterName: participant.nickname,
      vote: input.vote,
      createdAt: new Date().toISOString()
    });
    this.storyRooms.set(room.id, room);
    this.recordActivity({
      tone: "vote",
      workshopId: "storibloom",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} voted ${input.vote} on a Storibloom idea.`
    });
    return this.publicStoryRoom(room, participant.id);
  }

  askStoryRoomGuide(input: StoryRoomGuideInput) {
    const participant = this.requireParticipant(input.participantId);
    const room = this.requireStoryRoom(input.roomId);
    this.requireStoryRoomMember(room, participant.id);
    this.syncStoryRoomTimers(room);
    this.aiRequests.total += 1;
    this.aiRequests.estimatedTokens += 260;
    const guide = room.status === "lobby" ? undefined : STORY_ROOM_STAGE_GUIDES.find((item) => item.stage === room.activeStage) ?? STORY_ROOM_STAGE_GUIDES[0];
    const approvedIdeas = this.storyRoomApprovedIdeas(room).slice(-6);
    const response = this.createStoryGuideResponse(room, guide?.title ?? "Story room", input.prompt, approvedIdeas);
    const message: StoryRoomGuideMessageState = {
      id: `story-guide-${createSessionId()}`,
      roomId: room.id,
      participantId: input.scope === "personal" ? participant.id : undefined,
      requesterName: participant.nickname,
      prompt: input.prompt,
      response,
      scope: input.scope,
      createdAt: new Date().toISOString()
    };
    room.guideMessages.push(message);
    this.storyRooms.set(room.id, room);
    this.recordActivity({
      tone: "submit",
      workshopId: "storibloom",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} asked Kurami Guide for story help.`
    });
    return message;
  }

  generateStoryRoomDraft(roomId: string, participantId?: string) {
    const room = this.requireStoryRoom(roomId);
    if (participantId) this.requireStoryRoomMember(room, participantId);
    this.syncStoryRoomTimers(room);
    this.aiRequests.total += 1;
    this.aiRequests.estimatedTokens += 900;
    const approvedIdeas = this.storyRoomApprovedIdeas(room);
    const seed = approvedIdeas.find((idea) => idea.kind === "seed")?.text ?? room.focus;
    const protagonist = approvedIdeas.find((idea) => idea.kind === "character")?.text ?? "a young creator who wants the community to be heard";
    const conflict = approvedIdeas.find((idea) => idea.kind === "conflict")?.text ?? "an AI shortcut that solves one problem while creating another";
    const plot = approvedIdeas.find((idea) => idea.kind === "plot")?.text ?? "the team tests the shortcut, catches the harm, and redesigns the plan with the people affected";
    const draft = createDeterministicStoryDraft({
      teamName: room.name,
      genre: seed,
      setting: room.lane,
      theme: "human responsibility",
      protagonist,
      conflict
    });
    room.finalText = `${draft}\n\nTeam plot note: ${plot}`;
    room.authorshipNote = room.authorshipNote || `${room.name} chose and voted on the core ideas. Kurami Guide helped organize options, but humans made the story decisions and final edits.`;
    this.storyRooms.set(room.id, room);
    this.updateStoryFromRoom(room, participantId);
    this.recordActivity({
      tone: "submit",
      workshopId: "storibloom",
      teamId: room.id,
      teamName: room.name,
      message: `${room.name} generated a collaborative story draft.`
    });
    return this.publicStoryRoom(room, participantId);
  }

  saveStoryRoom(input: StoryRoomSaveInput) {
    const participant = this.requireParticipant(input.participantId);
    const room = this.requireStoryRoom(input.roomId);
    this.requireStoryRoomMember(room, participant.id);
    if (input.title) room.title = input.title;
    if (input.finalText) room.finalText = this.flagIfNeeded(input.finalText, participant.id, "storibloom", "story-room-final", room.id).redactedText;
    if (typeof input.authorshipNote === "string") room.authorshipNote = input.authorshipNote;
    this.storyRooms.set(room.id, room);
    this.updateStoryFromRoom(room, participant.id);
    this.recordActivity({
      tone: "submit",
      workshopId: "storibloom",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} saved ${room.name}'s final story.`
    });
    return this.publicStoryRoom(room, participant.id);
  }

  submitCourtVote(input: CourtVoteInput) {
    const participant = this.requireParticipant(input.participantId);
    this.requireParticipantTeamReady(participant);
    const previousInitial = this.courtVotes.find((vote) => vote.caseId === input.caseId && vote.participantId === participant.id && vote.phase === "initial");
    this.flagIfNeeded(input.reason, participant.id, "kurami-court", "court-vote", input.caseId);
    this.courtVotes = this.courtVotes.filter((vote) => !(vote.caseId === input.caseId && vote.participantId === participant.id && vote.phase === input.phase));
    const vote: CourtVoteState = {
      id: `court-vote-${createSessionId()}`,
      participantId: participant.id,
      teamId: input.teamId,
      caseId: input.caseId,
      phase: input.phase,
      vote: input.vote,
      reason: input.reason,
      stakeholder: input.stakeholder,
      restriction: input.restriction,
      appealNeeded: input.appealNeeded,
      createdAt: new Date().toISOString()
    };
    this.courtVotes.push(vote);
    participant.points += input.vote === "need-more-information" ? 35 : 20;
    if (input.restriction && input.restriction.length > 10) participant.points += 35;
    if (input.stakeholder && input.stakeholder.length > 5) participant.points += 25;
    if (input.appealNeeded) participant.points += 20;
    if (input.phase === "final" && previousInitial && previousInitial.vote !== input.vote) participant.points += 20;
    participant.badges = awardBadges(["kurami-court"]).map((badge) => badge.name);
    this.participants.set(participant.id, participant);
    this.recordActivity({
      tone: "vote",
      workshopId: "kurami-court",
      teamId: input.teamId,
      teamName: participant.teamName,
      participantName: participant.nickname,
      message: `${participant.nickname} submitted a Kurami Court ${input.phase} vote.`
    });
    return this.getCourtResults(input.caseId);
  }

  submitCourtReasoning(input: CourtReasoningState) {
    if (input.participantId) this.requireParticipantTeamReady(this.requireParticipant(input.participantId));
    else this.requireTeamReady(input.teamId);
    this.courtReasoning = this.courtReasoning.filter((item) => !(item.caseId === input.caseId && item.teamId === input.teamId));
    this.courtReasoning.push(input);
    const team = this.teams.get(input.teamId);
    if (team) team.points += 75;
    this.recordActivity({
      tone: "submit",
      workshopId: "kurami-court",
      teamId: input.teamId,
      teamName: team?.name,
      message: `${team?.name ?? "A team"} submitted court reasoning.`
    });
    return input;
  }

  revealCourtEvidence(caseId: string) {
    this.activeCourtCaseId = caseId;
    return this.getCourtState();
  }

  joinCourtRoom(input: CourtRoomJoinInput) {
    const participant = this.requireParticipant(input.participantId);
    if (participant.isAi) throw new ApiError(403, "ai_cannot_join_court_room", "AI classmates cannot join courtrooms manually.");
    const room = this.requireCourtRoom(input.roomId);
    const previousRoom = participant.courtRoomId ? this.courtRooms.get(participant.courtRoomId) : undefined;
    if (previousRoom && previousRoom.id !== room.id) {
      previousRoom.memberIds = previousRoom.memberIds.filter((id) => id !== participant.id);
      this.courtRooms.set(previousRoom.id, previousRoom);
    }
    if (!room.memberIds.includes(participant.id)) room.memberIds.push(participant.id);
    participant.courtRoomId = room.id;
    this.participants.set(participant.id, participant);
    this.courtRooms.set(room.id, room);
    this.recordActivity({
      tone: "join",
      workshopId: "kurami-court",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} joined ${room.name}.`
    });
    return this.publicCourtRoom(room, participant.id);
  }

  controlCourtRoom(input: CourtRoomControlInput) {
    const room = this.requireCourtRoom(input.roomId);
    const now = new Date();
    if (input.action === "reset") {
      const fresh = this.createCourtRooms().find((item) => item.id === room.id);
      if (!fresh) throw new ApiError(404, "court_room_not_found", "Courtroom not found.");
      for (const participant of this.participants.values()) {
        if (participant.courtRoomId === room.id) {
          delete participant.courtRoomId;
          this.participants.set(participant.id, participant);
        }
      }
      this.courtVotes = this.courtVotes.filter((vote) => vote.teamId !== room.id);
      this.courtReasoning = this.courtReasoning.filter((reasoning) => reasoning.teamId !== room.id);
      this.courtRooms.set(fresh.id, fresh);
      this.recordActivity({ tone: "control", workshopId: "kurami-court", teamId: fresh.id, teamName: fresh.name, message: `${fresh.name} reset to lobby.` });
      return this.publicCourtRoom(fresh);
    }

    if (input.action === "start") {
      room.status = "debate";
      room.activeRound = 1;
      room.startedAt = now.toISOString();
      room.roundEndsAt = new Date(now.getTime() + COURT_ROUND_SECONDS * 1000).toISOString();
      room.debateEndsAt = new Date(now.getTime() + COURT_DEBATE_SECONDS * 1000).toISOString();
      room.finalVoteEndsAt = new Date(now.getTime() + COURT_WORKSHOP_SECONDS * 1000).toISOString();
      delete room.endedAt;
      this.ensureCourtRoundPrompt(room, 1);
    }

    if (input.action === "next-round") {
      if (room.status === "lobby") {
        room.status = "debate";
        room.startedAt = now.toISOString();
        room.debateEndsAt = new Date(now.getTime() + COURT_DEBATE_SECONDS * 1000).toISOString();
        room.finalVoteEndsAt = new Date(now.getTime() + COURT_WORKSHOP_SECONDS * 1000).toISOString();
      }
      if (room.status === "debate" && room.activeRound < COURT_ROOM_ROUNDS.length) {
        room.activeRound += 1;
        const adjustedStartedAt = new Date(now.getTime() - (room.activeRound - 1) * COURT_ROUND_SECONDS * 1000);
        room.startedAt = adjustedStartedAt.toISOString();
        room.roundEndsAt = new Date(adjustedStartedAt.getTime() + room.activeRound * COURT_ROUND_SECONDS * 1000).toISOString();
        room.debateEndsAt = new Date(adjustedStartedAt.getTime() + COURT_DEBATE_SECONDS * 1000).toISOString();
        room.finalVoteEndsAt = new Date(adjustedStartedAt.getTime() + COURT_WORKSHOP_SECONDS * 1000).toISOString();
        this.ensureCourtRoundPrompt(room, room.activeRound);
      } else if (room.status === "debate") {
        room.status = "final-vote";
        room.finalVoteEndsAt = new Date(now.getTime() + COURT_FINAL_VOTE_SECONDS * 1000).toISOString();
        delete room.roundEndsAt;
        this.addCourtJudgeMessage(room, {
          round: room.activeRound,
          tone: "ruling",
          text: "The debate record is closed. Cast the final class vote with one reason the court can read back."
        });
      }
    }

    if (input.action === "final-vote") {
      this.syncCourtRoomTimers(room, { skipAutoAdvance: true });
      room.status = "final-vote";
      room.activeRound = COURT_ROOM_ROUNDS.length;
      room.finalVoteEndsAt = new Date(now.getTime() + COURT_FINAL_VOTE_SECONDS * 1000).toISOString();
      delete room.roundEndsAt;
      this.addCourtJudgeMessage(room, {
        round: room.activeRound,
        tone: "ruling",
        text: "The facilitator has moved the room to final vote. Choose approve, approve with restrictions, reject, or need more information."
      });
    }

    if (input.action === "end") {
      this.syncCourtRoomTimers(room, { skipAutoAdvance: true });
      room.status = "ended";
      room.activeRound = COURT_ROOM_ROUNDS.length;
      room.endedAt = now.toISOString();
      delete room.roundEndsAt;
      delete room.debateEndsAt;
      delete room.finalVoteEndsAt;
      this.addCourtJudgeMessage(room, {
        round: room.activeRound,
        tone: "ruling",
        text: "Court is adjourned. Review the final vote and strongest arguments before the class debrief."
      });
    }

    this.courtRooms.set(room.id, room);
    this.recordActivity({
      tone: "control",
      workshopId: "kurami-court",
      teamId: room.id,
      teamName: room.name,
      message: `${room.name} ${input.action.replace("-", " ")} complete.`
    });
    return this.publicCourtRoom(room);
  }

  submitCourtRoomArgument(input: CourtRoomArgumentInput) {
    const participant = this.requireParticipant(input.participantId);
    const room = this.requireCourtRoom(input.roomId);
    this.requireCourtRoomMember(room, participant.id);
    this.syncCourtRoomTimers(room);
    if (room.status !== "debate") throw new ApiError(409, "court_not_debating", "The court is not in a debate round right now.");
    const moderation = this.flagIfNeeded(input.text, participant.id, "kurami-court", "court-argument", room.id);
    const argument: CourtRoomArgumentState = {
      id: `court-argument-${createSessionId()}`,
      roomId: room.id,
      participantId: participant.id,
      authorName: participant.nickname,
      round: room.activeRound,
      stance: input.stance,
      stakeholder: input.stakeholder,
      evidence: input.evidence,
      text: moderation.redactedText,
      flagged: !moderation.ok,
      createdAt: new Date().toISOString()
    };
    room.arguments.push(argument);
    this.aiRequests.total += 1;
    this.aiRequests.estimatedTokens += 160;
    this.addCourtJudgeMessage(room, {
      round: room.activeRound,
      tone: "question",
      text: this.createCourtJudgeResponse(room, argument)
    });
    participant.points += 35;
    if (input.evidence && input.evidence.length > 12) participant.points += 15;
    if (input.stakeholder.length > 5) participant.points += 20;
    participant.badges = awardBadges(["kurami-court"]).map((badge) => badge.name);
    this.participants.set(participant.id, participant);
    this.courtRooms.set(room.id, room);
    this.recordActivity({
      tone: "submit",
      workshopId: "kurami-court",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} entered a Round ${room.activeRound} court argument.`
    });
    return this.publicCourtRoom(room, participant.id);
  }

  submitCourtRoomFinalVote(input: CourtRoomVoteInput) {
    const participant = this.requireParticipant(input.participantId);
    const room = this.requireCourtRoom(input.roomId);
    this.requireCourtRoomMember(room, participant.id);
    this.syncCourtRoomTimers(room);
    if (room.status !== "final-vote") throw new ApiError(409, "court_vote_not_open", "The final vote is not open yet.");
    const moderation = this.flagIfNeeded(input.reason, participant.id, "kurami-court", "court-final-vote", room.id);
    room.votes = room.votes.filter((vote) => vote.participantId !== participant.id);
    room.votes.push({
      id: `court-room-vote-${createSessionId()}`,
      roomId: room.id,
      participantId: participant.id,
      voterName: participant.nickname,
      vote: input.vote,
      reason: moderation.redactedText,
      createdAt: new Date().toISOString()
    });
    this.courtVotes = this.courtVotes.filter((vote) => !(vote.caseId === room.caseId && vote.participantId === participant.id && vote.phase === "final"));
    this.courtVotes.push({
      id: `court-vote-${createSessionId()}`,
      participantId: participant.id,
      teamId: room.id,
      caseId: room.caseId,
      phase: "final",
      vote: input.vote,
      reason: moderation.redactedText,
      stakeholder: "Whole class courtroom",
      appealNeeded: input.vote !== "approve",
      createdAt: new Date().toISOString()
    });
    participant.points += 25;
    participant.badges = awardBadges(["kurami-court"]).map((badge) => badge.name);
    this.participants.set(participant.id, participant);
    this.courtRooms.set(room.id, room);
    this.recordActivity({
      tone: "vote",
      workshopId: "kurami-court",
      teamId: room.id,
      teamName: room.name,
      participantName: participant.nickname,
      message: `${participant.nickname} cast a final vote in ${room.name}.`
    });
    return this.publicCourtRoom(room, participant.id);
  }

  submitCharterProposal(teamId: string, text: string) {
    const moderation = this.flagIfNeeded(text, undefined, "kurami-court", "charter-proposal", teamId);
    const proposal: CharterProposalState = {
      id: `charter-${createSessionId()}`,
      teamId,
      text: moderation.redactedText,
      status: moderation.ok ? "approved" : "flagged",
      votes: [],
      createdAt: new Date().toISOString()
    };
    this.charterProposals.push(proposal);
    const team = this.teams.get(teamId);
    this.recordActivity({
      tone: "submit",
      workshopId: "kurami-court",
      teamId,
      teamName: team?.name,
      message: `${team?.name ?? "A team"} proposed a charter rule.`
    });
    return proposal;
  }

  submitCharterVote(participantId: string, proposalId: string) {
    const participant = this.requireParticipant(participantId);
    const proposal = this.charterProposals.find((item) => item.id === proposalId);
    if (!proposal) throw new Error("Charter proposal not found.");
    if (!proposal.votes.includes(participantId)) proposal.votes.push(participantId);
    this.recordActivity({
      tone: "vote",
      workshopId: "kurami-court",
      teamId: participant.teamId,
      teamName: participant.teamName,
      participantName: participant.nickname,
      message: `${participant.nickname} voted for a charter rule.`
    });
    return proposal;
  }

  deleteData(scope: string, targetId?: string) {
    if (scope === "participant" && targetId) {
      this.participants.delete(targetId);
    }
    if (scope === "team" && targetId) {
      for (const participant of this.participants.values()) {
        if (participant.teamId === targetId) this.participants.delete(participant.id);
      }
      this.stories.delete(targetId);
    }
    if (scope === "stories") this.stories.clear();
    if (scope === "votes") {
      this.courtVotes = [];
      this.detectiveVotes = [];
      for (const room of this.rooms.values()) room.votes = [];
    }
    if (scope === "event") {
      this.resetEventForDemo();
    }
    return { ok: true, scope, targetId };
  }

  leaderboard(mode: "individual" | "team" | "rotation-group") {
    if (!this.event.settings.leaderboardEnabled) return [];
    if (mode === "individual") {
      return this.listParticipants()
        .sort((a, b) => b.points - a.points)
        .slice(0, 25)
        .map((participant) => ({ id: participant.id, label: participant.nickname, points: participant.points, group: participant.group }));
    }
    if (mode === "rotation-group") {
      return ROTATION_GROUPS.map((group) => ({
        id: group,
        label: group,
        points: this.listParticipants()
          .filter((participant) => participant.group === group)
          .reduce((sum, participant) => sum + participant.points, 0),
        group
      })).sort((a, b) => b.points - a.points);
    }
    return [...this.teams.values()]
      .sort((a, b) => b.points - a.points)
      .map((team) => ({ id: team.id, label: team.name, points: team.points, group: team.group }));
  }

  private joinResult(participant: InternalParticipant): JoinResult {
    return {
      participant: this.publicParticipant(participant),
      event: this.getState(),
      privacyNoticeAcceptedAt: new Date().toISOString()
    };
  }

  private publicParticipant(participant: InternalParticipant): ParticipantSummary {
    return {
      id: participant.id,
      sessionId: participant.sessionId,
      nickname: participant.nickname,
      group: participant.group,
      teamId: participant.teamId,
      teamName: participant.teamName,
      points: participant.points,
      badges: participant.badges,
      connectionState: participant.connectionState,
      currentWorkshop: currentWorkshopForGroup(participant.group, this.event.currentRotation),
      completedWorkshops: completedWorkshopsForGroup(participant.group, this.event.currentRotation)
    };
  }

  private forceStart(now: Date) {
    const incompleteActiveTeams = [...this.teams.values()].filter((team) => team.memberCount > 0 && team.memberCount < TEAM_TARGET_SIZE);
    for (const team of incompleteActiveTeams) {
      const anchor =
        [...this.participants.values()].find((participant) => participant.teamId === team.id && participant.status !== "removed" && !participant.isAi) ??
        [...this.participants.values()].find((participant) => participant.teamId === team.id && participant.status !== "removed");
      if (anchor) this.ensureDemoCompanions(anchor);
    }

    this.event.status = "running";
    this.event.currentRotation = this.event.currentRotation === 0 ? 1 : this.event.currentRotation;
    this.event.rotationStartedAt = now.toISOString();
    this.event.rotationEndsAt = new Date(now.getTime() + WORKSHOP_DURATION_MINUTES * 60_000).toISOString();
    this.recordActivity({
      tone: "control",
      message:
        incompleteActiveTeams.length > 0
          ? `Force Start filled ${incompleteActiveTeams.length} incomplete active team${incompleteActiveTeams.length === 1 ? "" : "s"} with AI classmates and started the workshop.`
          : "Force Start started the workshop timer."
    });
  }

  private facilitatorDescriptor(scope: FacilitatorScope) {
    if (scope === "lead") return { scope, roomName: "All Rooms", isLead: true };
    return { scope, roomName: FACILITATOR_ROOM_ASSIGNMENTS[scope].name, isLead: false };
  }

  private assignmentForScope(scope: FacilitatorScope) {
    return scope === "lead" ? undefined : FACILITATOR_ROOM_ASSIGNMENTS[scope];
  }

  private roomIdsForFacilitatorScope(scope: FacilitatorScope, workshopId?: WorkshopId) {
    const assignment = this.assignmentForScope(scope);
    if (!assignment) {
      if (workshopId === "whos-who") return [...this.rooms.keys()];
      if (workshopId === "data-detective") return [...this.detectiveRooms.keys()];
      if (workshopId === "storibloom") return [...this.storyRooms.keys()];
      if (workshopId === "kurami-court") return [...this.courtRooms.keys()];
      return [...this.rooms.keys(), ...this.detectiveRooms.keys(), ...this.storyRooms.keys(), ...this.courtRooms.keys()];
    }
    if (workshopId === "whos-who") return [...assignment.whoWhoRoomIds];
    if (workshopId === "data-detective") return [...assignment.detectiveRoomIds];
    if (workshopId === "storibloom") return [...assignment.storyRoomIds];
    if (workshopId === "kurami-court") return [assignment.courtRoomId];
    return [...assignment.whoWhoRoomIds, ...assignment.detectiveRoomIds, ...assignment.storyRoomIds, assignment.courtRoomId];
  }

  private teamAllowedForScope(scope: FacilitatorScope, teamId?: string) {
    if (scope === "lead") return true;
    if (!teamId) return false;
    const assignment = FACILITATOR_ROOM_ASSIGNMENTS[scope];
    return this.teams.get(teamId)?.group === assignment.rotationGroup || teamId.startsWith(`${scope}-team-`);
  }

  private roomAllowedForScope(scope: FacilitatorScope, roomId?: string) {
    if (scope === "lead") return true;
    if (!roomId) return false;
    return this.roomIdsForFacilitatorScope(scope).includes(roomId);
  }

  private scopeEventState(event: EventState, scope: FacilitatorScope, visibleParticipants: ParticipantSummary[]) {
    if (scope === "lead") return event;
    const assignment = FACILITATOR_ROOM_ASSIGNMENTS[scope];
    const groupCounts = ROTATION_GROUPS.reduce<Record<RotationGroupName, number>>(
      (counts, group) => {
        counts[group] = group === assignment.rotationGroup ? visibleParticipants.length : 0;
        return counts;
      },
      { Gold: 0, Black: 0, Green: 0, Purple: 0 }
    );
    return {
      ...event,
      teams: event.teams.filter((team) => team.group === assignment.rotationGroup),
      groupCounts,
      participantsOnline: visibleParticipants.filter((participant) => participant.connectionState === "online").length,
      participantsDisconnected: visibleParticipants.filter((participant) => participant.connectionState !== "online").length
    };
  }

  private activityAllowedForScope(scope: FacilitatorScope, item: ActivityFeedItem) {
    if (scope === "lead") return true;
    if (this.teamAllowedForScope(scope, item.teamId)) return true;
    if (this.roomAllowedForScope(scope, item.teamId)) return true;
    return false;
  }

  private moderationAllowedForScope(scope: FacilitatorScope, flag: ModerationFlagState) {
    if (scope === "lead") return true;
    const participant = flag.participantId ? this.participants.get(flag.participantId) : undefined;
    if (participant && this.teamAllowedForScope(scope, participant.teamId)) return true;
    if (this.teamAllowedForScope(scope, flag.contentId)) return true;
    if (this.roomAllowedForScope(scope, flag.contentId)) return true;
    return false;
  }

  private scopeDashboard(dashboard: DashboardState, scope: FacilitatorScope): DashboardState {
    const visibleParticipants = dashboard.participants.filter((participant) => this.teamAllowedForScope(scope, participant.teamId));
    const visibleParticipantIds = new Set(visibleParticipants.map((participant) => participant.id));
    const progressParticipants = dashboard.progress.participants.filter((participant) => visibleParticipantIds.has(participant.participantId));
    const activityFeed = dashboard.activityFeed.filter((item) => this.activityAllowedForScope(scope, item));
    const event = this.scopeEventState(dashboard.event, scope, visibleParticipants);
    const activeTeams = event.teams.filter((team) => team.memberCount > 0);
    const readyTeams = activeTeams.filter((team) => team.ready).length;
    return {
      ...dashboard,
      facilitator: this.facilitatorDescriptor(scope),
      event,
      participants: visibleParticipants,
      moderationQueue: dashboard.moderationQueue.filter((flag) => this.moderationAllowedForScope(scope, flag)),
      progress: {
        participants: progressParticipants,
        teams: dashboard.progress.teams.filter((team) => this.teamAllowedForScope(scope, team.teamId))
      },
      activityFeed,
      summary: {
        ...dashboard.summary,
        humanParticipants: progressParticipants.filter((participant) => !participant.isAi).length,
        aiClassmates: progressParticipants.filter((participant) => participant.isAi).length,
        activeTeams: activeTeams.length,
        readyTeams,
        totalSubmissions: activityFeed.filter((item) => item.tone === "submit").length,
        totalVotes: activityFeed.filter((item) => item.tone === "vote").length
      }
    };
  }

  private buildProgress() {
    const participants = [...this.participants.values()].filter((participant) => participant.status !== "removed");
    const participantProgress = participants.map((participant) => this.buildParticipantProgress(participant));
    const teamProgress = this.teamSummaries().map((team) => {
      const teamParticipants = participantProgress.filter((participant) => participant.teamId === team.id);
      const countStatus = (status: ProgressStatus) => teamParticipants.filter((participant) => participant.status === status).length;
      return {
        teamId: team.id,
        teamName: team.name,
        group: team.group,
        currentWorkshop: currentWorkshopForGroup(team.group, this.event.currentRotation),
        readiness: `${team.memberCount}/${team.targetSize} ${team.ready ? "ready" : "waiting"}`,
        ready: team.ready,
        joined: teamParticipants.length,
        waiting: countStatus("waiting"),
        active: countStatus("active"),
        submitted: countStatus("submitted"),
        voted: countStatus("voted"),
        lastActivityAt: this.activityFeed.find((item) => item.teamId === team.id)?.at
      };
    });
    return { participants: participantProgress, teams: teamProgress };
  }

  private buildParticipantProgress(participant: InternalParticipant): ParticipantProgressState {
    const currentWorkshop = currentWorkshopForGroup(participant.group, this.event.currentRotation);
    const team = this.teams.get(participant.teamId);
    let status: ProgressStatus = "joined";
    if (currentWorkshop === "whos-who") {
      const room = this.rooms.get(participant.roomId);
      const identity = room?.identities.find((item) => item.participantId === participant.id);
      if (!identity || room?.gamePhase === "lobby") status = "waiting";
      else if (this.participantHasVote(participant, currentWorkshop)) status = "voted";
      else if (this.participantHasSubmission(participant, currentWorkshop)) status = "submitted";
      else status = "active";
    } else if (currentWorkshop === "data-detective") {
      if (!participant.detectiveRoomId) status = "waiting";
      else if (this.participantHasVote(participant, currentWorkshop)) status = "voted";
      else if (this.participantHasSubmission(participant, currentWorkshop)) status = "submitted";
      else status = "active";
    } else if (team && team.memberCount < TEAM_TARGET_SIZE) status = "waiting";
    else if (this.participantHasVote(participant, currentWorkshop)) status = "voted";
    else if (this.participantHasSubmission(participant, currentWorkshop)) status = "submitted";
    else if (this.event.status === "running") status = "active";

    return {
      participantId: participant.id,
      nickname: participant.nickname,
      group: participant.group,
      teamId: participant.teamId,
      teamName: participant.teamName,
      currentWorkshop,
      isAi: Boolean(participant.isAi),
      status,
      points: participant.points,
      badges: participant.badges
    };
  }

  private participantHasSubmission(participant: InternalParticipant, workshopId: WorkshopId) {
    if (workshopId === "whos-who") {
      const room = this.rooms.get(participant.roomId);
      return Boolean(room?.responses.some((response) => response.identityId === participant.identityId) || room?.chat.some((message) => message.identityId === participant.identityId));
    }
    if (workshopId === "data-detective") {
      return (
        this.discoveries.some((discovery) => discovery.participantId === participant.id) ||
        this.detectiveChat.some((message) => message.participantId === participant.id) ||
        this.recommendations.some((recommendation) => recommendation.participantId === participant.id)
      );
    }
    if (workshopId === "storibloom") {
      const story = [...this.stories.values()].find((item) => item.teamId === participant.teamId);
      return Boolean(story && (story.finalText || story.draft || story.published || story.revisions.length > 0 || Object.keys(story.seed).length > 0));
    }
    return this.courtReasoning.some((reasoning) => reasoning.participantId === participant.id || reasoning.teamId === participant.teamId);
  }

  private participantHasVote(participant: InternalParticipant, workshopId: WorkshopId) {
    if (workshopId === "whos-who") {
      const room = this.rooms.get(participant.roomId);
      return Boolean(room?.votes.some((vote) => vote.participantId === participant.id));
    }
    if (workshopId === "kurami-court") {
      return this.courtVotes.some((vote) => vote.participantId === participant.id) || this.charterProposals.some((proposal) => proposal.votes.includes(participant.id));
    }
    if (workshopId === "data-detective") {
      return this.detectiveVotes.some((vote) => vote.participantId === participant.id);
    }
    return false;
  }

  private buildActivityFeed() {
    const realItems = this.activityFeed.slice(0, 18);
    const fillerNeeded = Math.max(0, 8 - realItems.length);
    return [...realItems, ...this.eventPulseActivityItems().slice(0, fillerNeeded)].slice(0, 18);
  }

  private eventPulseActivityItems(): ActivityFeedItem[] {
    const now = Date.now();
    const currentWorkshopNames = [...new Set(this.teamSummaries().filter((team) => team.memberCount > 0).map((team) => WORKSHOPS[currentWorkshopForGroup(team.group, this.event.currentRotation)].shortName))];
    const activeWorkshopText = currentWorkshopNames.length > 0 ? currentWorkshopNames.join(", ") : "all workshops";
    return [
      {
        id: "event-pulse-activity-1",
        at: new Date(now - 30_000).toISOString(),
        tone: "system",
        message: `Live display is ready for ${activeWorkshopText}.`
      },
      {
        id: "event-pulse-activity-2",
        at: new Date(now - 75_000).toISOString(),
        tone: "system",
        message: "Who's Who will fill open game seats with hidden AI classmates when the facilitator starts a room."
      },
      {
        id: "event-pulse-activity-3",
        at: new Date(now - 120_000).toISOString(),
        tone: "system",
        message: "Teams can scan the QR code, join, and wait for the activity to start automatically."
      },
      {
        id: "event-pulse-activity-4",
        at: new Date(now - 180_000).toISOString(),
        tone: "system",
        message: "Facilitator notes and export are ready for the live event."
      }
    ];
  }

  private buildSummary(): DemoSummaryState {
    const participants = [...this.participants.values()].filter((participant) => participant.status !== "removed");
    const humanParticipants = participants.filter((participant) => !participant.isAi).length;
    const aiClassmates = participants.filter((participant) => participant.isAi).length;
    const activeTeams = this.teamSummaries().filter((team) => team.memberCount > 0);
    const readyTeams = activeTeams.filter((team) => team.ready).length;
    const stories = [...this.stories.values()];
    const storiesWithContent = stories.filter((story) => story.finalText || story.draft || story.published);
    const totalSubmissions =
      [...this.rooms.values()].reduce((sum, room) => sum + room.responses.length + room.chat.filter((message) => !message.isAi).length, 0) +
      this.discoveries.length +
      this.detectiveChat.length +
      this.recommendations.length +
      storiesWithContent.length +
      this.courtReasoning.length +
      this.charterProposals.filter((proposal) => !proposal.id.startsWith("charter-seed-")).length;
    const totalVotes =
      [...this.rooms.values()].reduce((sum, room) => sum + room.votes.length, 0) +
      this.detectiveVotes.length +
      this.courtVotes.length +
      this.charterProposals.reduce((sum, proposal) => sum + proposal.votes.length, 0);
    const topCharterRules = [...this.charterProposals]
      .filter((proposal) => proposal.status === "approved" || proposal.status === "published")
      .sort((a, b) => b.votes.length - a.votes.length)
      .slice(0, 8)
      .map((proposal) => ({ id: proposal.id, text: proposal.text, votes: proposal.votes.length, status: proposal.status }));
    const featuredStories = storiesWithContent.slice(0, 6).map((story) => {
      const team = this.teams.get(story.teamId);
      const text = story.finalText || story.draft;
      return {
        id: story.id,
        teamId: story.teamId,
        teamName: team?.name ?? story.teamId,
        title: story.title,
        excerpt: text.slice(0, 220),
        status: story.status
      };
    });

    return {
      humanParticipants,
      aiClassmates,
      activeTeams: activeTeams.length,
      readyTeams,
      totalSubmissions,
      totalVotes,
      publishedStories: stories.filter((story) => story.status === "published").length,
      finalCharterRules: topCharterRules.length,
      topCharterRules,
      featuredStories
    };
  }

  private recordActivity(input: Omit<ActivityFeedItem, "id" | "at">) {
    this.activityFeed = [
      {
        id: `activity-${createSessionId()}`,
        at: new Date().toISOString(),
        ...input
      },
      ...this.activityFeed
    ].slice(0, 80);
  }

  private refreshParticipants() {
    for (const participant of this.participants.values()) {
      participant.currentWorkshop = currentWorkshopForGroup(participant.group, this.event.currentRotation);
      participant.completedWorkshops = completedWorkshopsForGroup(participant.group, this.event.currentRotation);
      participant.badges = awardBadges(participant.completedWorkshops).map((badge) => badge.name);
      this.participants.set(participant.id, participant);
    }
  }

  private resetEventForDemo() {
    this.participants.clear();
    this.sessions.clear();
    this.discoveries = [];
    this.recommendations = [];
    this.detectiveChat = [];
    this.detectiveVotes = [];
    this.activeDetectiveStage = 1;
    this.courtVotes = [];
    this.courtReasoning = [];
    this.activeCourtCaseId = COURT_CASES[0]?.id ?? "ai-school-counselor";
    this.charterProposals = createSeedCharterProposals();
    this.moderationFlags = [];
    this.aiRequests = { total: 0, failed: 0, estimatedTokens: 0 };
    this.activityFeed = [];
    this.resetDemoAndRoomAssignments();

    this.event.status = "onboarding";
    this.event.currentRotation = 0;
    this.event.rotationStartedAt = null;
    this.event.rotationEndsAt = null;
    this.event.timerSecondsRemaining = WELCOME_DURATION_SECONDS;
    this.event.announcement = "Event reset complete. Students can rejoin with the event code.";
    this.event.settings = {
      ...this.event.settings,
      leaderboardEnabled: true,
      leaderboardMode: "team",
      aiEnabled: true,
      fallbackMode: false,
      manuallyUnlockedWorkshops: [],
      lockedWorkshops: []
    };
    this.recordActivity({ tone: "control", message: "Event reset complete. Students can rejoin with the event code." });
  }

  private resetDemoAndRoomAssignments() {
    for (const team of this.teams.values()) {
      team.memberCount = 0;
      team.points = 0;
      team.currentWorkshop = currentWorkshopForGroup(team.group, 0);
      team.seatsFilled = 0;
      team.seatsRemaining = TEAM_TARGET_SIZE;
      team.ready = false;
      this.teams.set(team.id, team);
      this.stories.set(team.storyId, this.createStory(team.id, team.storyId));
    }
    const firstPrompt = WHOS_WHO_PROMPTS[0];
    if (!firstPrompt) throw new Error("Who's Who prompt bank is empty.");
    for (const room of this.rooms.values()) {
      for (const identity of room.identities) {
        this.releaseIdentity(identity);
        identity.isAi = false;
        delete identity.personaId;
        delete identity.aiPersonaNote;
      }
      room.roundNumber = 1;
      room.roundId = `${room.id}-round-1`;
      room.promptId = firstPrompt.id;
      room.promptText = firstPrompt.text;
      room.chat = [];
      room.gameEvents = [
        {
          id: `game-event-${room.id}-reset`,
          at: new Date().toISOString(),
          tone: "system",
          message: "Room reset. Students can enter the room ID when the facilitator is ready."
        }
      ];
      room.responses = [];
      room.votes = [];
      room.stage = "lobby";
      room.gamePhase = "lobby";
      room.revealed = false;
      delete room.startedAt;
      delete room.endedAt;
      delete room.winner;
      this.rooms.set(room.id, room);
    }
    this.detectiveRooms.clear();
    for (const room of this.createDetectiveRooms()) {
      this.detectiveRooms.set(room.id, room);
    }
    this.storyRooms.clear();
    for (const room of this.createStoryRooms()) {
      this.storyRooms.set(room.id, room);
      this.stories.set(room.storyId, this.createStory(room.id, room.storyId));
    }
    this.courtRooms.clear();
    for (const room of this.createCourtRooms()) {
      this.courtRooms.set(room.id, room);
    }
    for (const participant of this.participants.values()) {
      delete participant.storyRoomId;
      delete participant.courtRoomId;
      this.participants.set(participant.id, participant);
    }
  }

  private createTeams(): InternalTeam[] {
    return ROTATION_GROUPS.flatMap((group) =>
      Array.from({ length: 5 }, (_, index) => {
        const teamNumber = index + 1;
        const id = `${group.toLowerCase()}-team-${teamNumber}`;
        return {
          id,
          name: `${group} Team ${teamNumber}`,
          group,
          memberCount: 0,
          targetSize: TEAM_TARGET_SIZE,
          seatsFilled: 0,
          seatsRemaining: TEAM_TARGET_SIZE,
          ready: false,
          points: 0,
          currentWorkshop: currentWorkshopForGroup(group, 0),
          storyId: `story-${id}`
        };
      })
    );
  }

  private createDetectiveRooms(): DetectiveRoomState[] {
    return DETECTIVE_INVESTOR_ROOMS.map((business) => ({
      id: business.roomId,
      name: `${business.name} Investor Room`,
      businessId: business.id,
      memberIds: [],
      status: "lobby",
      createdAt: new Date().toISOString()
    }));
  }

  private createStoryRooms(): StoryRoomState[] {
    return STORY_ROOM_DEFINITIONS.map((room) => ({
      id: room.id,
      name: room.name,
      lane: room.lane,
      focus: room.focus,
      storyId: `story-${room.id}`,
      memberIds: [],
      status: "lobby",
      activeStage: 1,
      title: `${room.name} Story`,
      finalText: "",
      authorshipNote: "",
      chat: [],
      proposals: [],
      guideMessages: [
        {
          id: `story-guide-${room.id}-welcome`,
          roomId: room.id,
          requesterName: "Kurami Guide",
          prompt: "Welcome",
          response: `${room.name} is the ${room.lane}. ${room.focus} Join the room, talk through ideas, suggest changes, and vote on what belongs in the story.`,
          scope: "room",
          createdAt: new Date().toISOString()
        }
      ]
    }));
  }

  private createCourtRooms(): CourtRoomState[] {
    return COURT_ROOM_DEFINITIONS.map((room) => {
      const caseFile = this.courtCases.find((item) => item.id === room.caseId) ?? this.courtCases[0];
      return {
        id: room.id,
        name: room.name,
        docket: room.docket,
        caseId: caseFile?.id ?? this.activeCourtCaseId,
        memberIds: [],
        status: "lobby",
        activeRound: 1,
        judgeMessages: [
          {
            id: `court-judge-${room.id}-welcome`,
            roomId: room.id,
            round: 0,
            tone: "opening",
            text: `${room.name} is open. Join the courtroom, read the case file, and wait for the facilitator to start the 30-minute hearing.`,
            createdAt: new Date().toISOString()
          }
        ],
        arguments: [],
        votes: []
      };
    });
  }

  private createRooms(): WhoWhoRoomState[] {
    return ROTATION_GROUPS.flatMap((group) =>
      ["alpha", "beta"].map((suffix) => {
        const roomId = `${group.toLowerCase()}-${suffix}`;
        const identities: WhoWhoIdentityState[] = WHOS_WHO_GAME_NAMES.map((displayName) => ({
          id: `${roomId}-${displayName.toLowerCase()}`,
          displayName,
          isAi: false,
          alive: true
        }));
        const prompt = WHOS_WHO_PROMPTS[0];
        if (!prompt) throw new Error("Who's Who prompt bank is empty.");
        return {
          id: roomId,
          name: `${group} Room ${suffix === "alpha" ? "Alpha" : "Beta"}`,
          group,
          stage: "lobby",
          gamePhase: "lobby",
          seatCount: WHOS_WHO_SEAT_COUNT,
          roundId: `${roomId}-round-1`,
          roundNumber: 1,
          promptId: prompt.id,
          promptText: prompt.text,
          identities,
          chat: [],
          gameEvents: [
            {
              id: `game-event-${roomId}-lobby`,
              at: new Date().toISOString(),
              tone: "system",
              message: "Room created. Students enter this room ID, then the facilitator starts the game."
            }
          ],
          responses: [],
          votes: [],
          abilityUses: [],
          revealed: false
        };
      })
    );
  }

  private createStory(teamId: string, storyId: string): StoryState {
    return {
      id: storyId,
      teamId,
      title: "Untitled Bloom",
      stage: 1,
      seed: {},
      protagonist: {},
      conflict: {},
      plot: {},
      ethicsChecklist: {},
      draft: "",
      finalText: "",
      revisions: [],
      published: null,
      status: "draft"
    };
  }

  private teamSummaries(): TeamSummary[] {
    return [...this.teams.values()].map((team) => ({
      id: team.id,
      name: team.name,
      group: team.group,
      memberCount: team.memberCount,
      targetSize: TEAM_TARGET_SIZE,
      seatsFilled: Math.min(team.memberCount, TEAM_TARGET_SIZE),
      seatsRemaining: Math.max(0, TEAM_TARGET_SIZE - team.memberCount),
      ready: team.memberCount >= TEAM_TARGET_SIZE,
      points: team.points,
      currentWorkshop: currentWorkshopForGroup(team.group, this.event.currentRotation)
    }));
  }

  private chooseRoom(group: RotationGroupName, teamId: string) {
    const teamNumber = Number(teamId.split("-").at(-1) ?? "1");
    return `${group.toLowerCase()}-${teamNumber % 2 === 0 ? "beta" : "alpha"}`;
  }

  private chooseBalancedWorkshopGroup() {
    const firstGroup = ROTATION_GROUPS[0];
    if (!firstGroup) throw new Error("No rotation groups configured.");

    const humanParticipants = [...this.participants.values()].filter((participant) => participant.status !== "removed" && !participant.isAi);
    const groupCounts = ROTATION_GROUPS.reduce<Record<RotationGroupName, number>>(
      (counts, group) => {
        counts[group] = humanParticipants.filter((participant) => participant.group === group).length;
        return counts;
      },
      { Gold: 0, Black: 0, Green: 0, Purple: 0 }
    );
    const workshopCounts = Object.keys(WORKSHOPS).reduce<Record<WorkshopId, number>>((counts, workshopId) => {
      counts[workshopId as WorkshopId] = 0;
      return counts;
    }, {} as Record<WorkshopId, number>);

    for (const participant of humanParticipants) {
      const workshopId = currentWorkshopForGroup(participant.group, this.event.currentRotation);
      workshopCounts[workshopId] += 1;
    }

    return ROTATION_GROUPS.reduce((leastFull, group) => {
      const groupWorkshop = currentWorkshopForGroup(group, this.event.currentRotation);
      const leastFullWorkshop = currentWorkshopForGroup(leastFull, this.event.currentRotation);
      const groupWorkshopCount = workshopCounts[groupWorkshop];
      const leastFullWorkshopCount = workshopCounts[leastFullWorkshop];
      if (groupWorkshopCount < leastFullWorkshopCount) return group;
      if (groupWorkshopCount === leastFullWorkshopCount && groupCounts[group] < groupCounts[leastFull]) return group;
      return leastFull;
    }, firstGroup);
  }

  private requireParticipantTeamReady(participant: InternalParticipant) {
    this.requireTeamReady(participant.teamId);
  }

  private requireTeamReady(teamId: string) {
    const team = this.teams.get(teamId);
    if (!team) throw new Error("Team not found.");
    if (team.memberCount < TEAM_TARGET_SIZE) {
      throw new ApiError(409, "team_not_ready", `Waiting for ${TEAM_TARGET_SIZE} teammates before the workshop starts. ${Math.max(0, TEAM_TARGET_SIZE - team.memberCount)} seat${TEAM_TARGET_SIZE - team.memberCount === 1 ? "" : "s"} still open.`);
    }
  }

  private ensureDemoCompanions(anchor: InternalParticipant) {
    const team = this.teams.get(anchor.teamId);
    if (!team) return;

    const activeTeamMembers = [...this.participants.values()].filter((participant) => participant.teamId === anchor.teamId && participant.status !== "removed");
    const existingAiCount = activeTeamMembers.filter((participant) => participant.isAi).length;
    const needed = Math.max(0, TEAM_TARGET_SIZE - activeTeamMembers.length);

    for (let index = 0; index < needed; index += 1) {
      const companionNumber = existingAiCount + index + 1;
      const id = `demo-ai-${anchor.teamId}-${companionNumber}`;
      if (this.participants.has(id)) continue;
      const identityId = this.assignDemoAiIdentity(anchor.roomId, id, companionNumber);
      const nickname = DEMO_AI_COMPANIONS[(companionNumber - 1) % DEMO_AI_COMPANIONS.length] ?? `AI Classmate ${companionNumber}`;
      const participant: InternalParticipant = {
        id,
        sessionId: `demo-session-${id}`,
        nickname,
        group: anchor.group,
        teamId: anchor.teamId,
        teamName: anchor.teamName,
        points: 0,
        badges: awardBadges(completedWorkshopsForGroup(anchor.group, this.event.currentRotation)).map((badge) => badge.name),
        connectionState: "online",
        currentWorkshop: currentWorkshopForGroup(anchor.group, this.event.currentRotation),
        completedWorkshops: completedWorkshopsForGroup(anchor.group, this.event.currentRotation),
        roomId: anchor.roomId,
        identityId,
        status: "active",
        isAi: true,
        joinedAt: new Date().toISOString()
      };
      this.participants.set(id, participant);
      team.memberCount += 1;
    }

    this.teams.set(team.id, team);
  }

  private ensureDemoDetectiveRoomActivity(roomId: string, anchor: InternalParticipant) {
    const room = this.requireDetectiveRoom(roomId);
    const business = this.requireDetectiveBusiness(room.businessId);
    const aiParticipants = [...this.participants.values()].filter((participant) => participant.teamId === anchor.teamId && participant.isAi);
    aiParticipants.slice(0, 3).forEach((participant) => {
      participant.detectiveRoomId = room.id;
      this.participants.set(participant.id, participant);
      if (!room.memberIds.includes(participant.id)) room.memberIds.push(participant.id);
    });
    this.detectiveRooms.set(room.id, room);

    if (!this.detectiveChat.some((message) => message.roomId === room.id && message.participantId.startsWith("demo-ai-"))) {
      const firstAi = aiParticipants[0];
      const secondAi = aiParticipants[1];
      if (firstAi) {
        this.detectiveChat.push({
          id: `demo-detective-chat-${room.id}-1`,
          roomId: room.id,
          participantId: firstAi.id,
          authorName: firstAi.nickname,
          text: `I am checking whether "${business.claimsToVerify[0] ?? "the core claim"}" is proven by outside evidence or only the pitch deck.`,
          createdAt: new Date().toISOString()
        });
      }
      if (secondAi) {
        this.detectiveChat.push({
          id: `demo-detective-chat-${room.id}-2`,
          roomId: room.id,
          participantId: secondAi.id,
          authorName: secondAi.nickname,
          text: "I will look for a competitor or public source so our funding vote is not just based on the founder story.",
          createdAt: new Date().toISOString()
        });
      }
    }

    if (this.discoveries.some((discovery) => discovery.roomId === room.id && discovery.participantId.startsWith("demo-ai-"))) return;
    const documents = business.documents.slice(0, 3);
    const categories = ["Transparency", "Privacy", "Accountability", "Bias"] as const;

    documents.slice(0, 2).forEach((document, index) => {
      const aiParticipant = aiParticipants[index % aiParticipants.length];
      if (!aiParticipant) return;
      const category = categories[index % categories.length] ?? "Transparency";
      this.discoveries.push({
        id: `demo-discovery-${room.id}-${index + 1}`,
        participantId: aiParticipant.id,
        roomId: room.id,
        teamId: room.id,
        authorName: aiParticipant.nickname,
        documentId: document.id,
        claim: business.claimsToVerify[index] ?? "The business claim needs outside verification.",
        finding: `AI analyst note: ${document.summary} This is useful, but investors still need a current outside source before trusting the pitch.`,
        sourceTitle: `Dossier: ${document.title}`,
        evidenceType: document.type === "risk" ? "customer-risk" : "company-document",
        stance: index === 0 ? "needs-more-research" : "supports-reject",
        category,
        severity: index === 0 ? "high" : "medium",
        confidence: 4,
        explanation: `The dossier creates a ${category.toLowerCase()} question investors should verify with public evidence.`,
        affectedGroups: "Customers, operators, and communities affected by the automated decision.",
        safeguard: "Require a pilot audit, clear opt-out or appeal path, and source-backed success metrics before funding.",
        nextStep: business.researchTargets[index] ?? "Find one reputable outside source.",
        pointsAwarded: 75,
        createdAt: new Date().toISOString()
      });
    });
  }

  private ensureDemoCourtVotes(teamId: string, caseId: string) {
    if (this.courtVotes.some((vote) => vote.teamId === teamId && vote.caseId === caseId && vote.phase === "initial" && vote.participantId.startsWith("demo-ai-"))) return;
    const aiParticipants = [...this.participants.values()].filter((participant) => participant.teamId === teamId && participant.isAi);
    const votes: CourtVoteValue[] = ["need-more-information", "approve-with-restrictions", "reject"];

    aiParticipants.slice(0, 3).forEach((participant, index) => {
      this.courtVotes.push({
        id: `demo-court-vote-${caseId}-${participant.id}`,
        participantId: participant.id,
        teamId,
        caseId,
        phase: "initial",
        vote: votes[index % votes.length] ?? "need-more-information",
        reason: "AI classmate note: the decision needs clearer evidence, safeguards, and an appeal path before it should affect real people.",
        stakeholder: COURT_STAKEHOLDER_LENSES[index % COURT_STAKEHOLDER_LENSES.length],
        restriction: COURT_RESTRICTION_OPTIONS[index % COURT_RESTRICTION_OPTIONS.length],
        appealNeeded: true,
        createdAt: new Date().toISOString()
      });
    });
  }

  private assignHumanIdentity(roomId: string, participantId: string) {
    const room = this.requireRoom(roomId);
    const identity = room.identities.find((item) => item.participantId === participantId) ?? this.assignIdentitySlot(room, participantId, false, participantId);
    this.rooms.set(room.id, room);
    return identity.id;
  }

  private assignDemoAiIdentity(roomId: string, participantId: string, companionNumber: number) {
    const room = this.requireRoom(roomId);
    const identity = room.identities.find((item) => item.participantId === participantId) ?? this.assignIdentitySlot(room, participantId, true, `${participantId}-${companionNumber}`);
    this.rooms.set(room.id, room);
    return identity.id;
  }

  private assignIdentitySlot(room: WhoWhoRoomState, participantId: string, isAi: boolean, seed: string) {
    const available = room.identities.filter((identity) => !identity.participantId);
    if (available.length === 0) throw new ApiError(409, "room_full", "That Who's Who room already has all 21 seats filled.");
    const identity = available[this.stableIndex(seed, available.length)];
    if (!identity) throw new Error("No Who's Who identity available.");
    this.prepareIdentity(identity, isAi, seed, room.identities.indexOf(identity), participantId);
    return identity;
  }

  private prepareIdentity(identity: WhoWhoIdentityState, isAi: boolean, seed: string, slotIndex: number, participantId?: string) {
    identity.participantId = participantId;
    identity.isAi = isAi;
    identity.alive = true;
    identity.joinedAt = new Date().toISOString();
    delete identity.eliminatedAt;
    delete identity.eliminatedReason;
    if (isAi) {
      const persona = WHOS_WHO_PERSONAS[this.stableIndex(`${seed}-persona`, Math.max(1, WHOS_WHO_PERSONAS.length))];
      identity.personaId = persona?.id;
      identity.role = this.pickWhoWhoRole(seed, slotIndex);
      identity.aiPersonaNote = WHOS_WHO_AI_PERSONA_NOTES[this.stableIndex(`${seed}-note`, WHOS_WHO_AI_PERSONA_NOTES.length)];
      return;
    }
    delete identity.personaId;
    delete identity.aiPersonaNote;
    identity.role = this.pickWhoWhoRole(seed, slotIndex);
  }

  private releaseIdentity(identity: WhoWhoIdentityState) {
    delete identity.participantId;
    delete identity.role;
    delete identity.joinedAt;
    delete identity.eliminatedAt;
    delete identity.eliminatedReason;
    identity.alive = true;
  }

  private pickWhoWhoRole(seed: string, slotIndex: number): WhoWhoRoleName {
    return WHOS_WHO_ROLES[(this.stableIndex(seed, WHOS_WHO_ROLES.length) + slotIndex) % WHOS_WHO_ROLES.length] ?? "Investigator";
  }

  private stableIndex(seed: string, length: number) {
    if (length <= 0) return 0;
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }
    return hash % length;
  }

  private whoWhoAbilityForRole(role?: string) {
    return WHOS_WHO_ROLE_ABILITIES.find((ability) => ability.role === role);
  }

  private whoWhoVoteScore(room: WhoWhoRoomState, identityId: string) {
    const rawVotes = room.votes.filter((vote) => vote.roundId === room.roundId && vote.identityId === identityId).length;
    const modifier = room.abilityUses
      .filter((use) => use.roundId === room.roundId && use.targetIdentityId === identityId)
      .reduce((sum, use) => sum + (use.voteModifier ?? 0), 0);
    return Math.max(0, rawVotes + modifier);
  }

  private isWhoWhoProtected(room: WhoWhoRoomState, identityId: string) {
    return room.abilityUses.some((use) => use.roundId === room.roundId && use.targetIdentityId === identityId && use.protects);
  }

  private addGameEvent(room: WhoWhoRoomState, tone: WhoWhoGameEventState["tone"], message: string) {
    room.gameEvents = [
      {
        id: `game-event-${createSessionId()}`,
        at: new Date().toISOString(),
        tone,
        message
      },
      ...room.gameEvents
    ].slice(0, 18);
  }

  private setWhoWhoTimedPhase(room: WhoWhoRoomState, gamePhase: WhoWhoGamePhase, stage: WhoWhoRoomState["stage"], seconds?: number, now = new Date()) {
    room.gamePhase = gamePhase;
    room.stage = stage;
    room.phaseStartedAt = now.toISOString();
    if (!seconds) {
      delete room.phaseEndsAt;
      return;
    }
    const phaseEndMs = now.getTime() + seconds * 1000;
    const workshopEndMs = room.workshopEndsAt ? Date.parse(room.workshopEndsAt) : Number.POSITIVE_INFINITY;
    room.phaseEndsAt = new Date(Math.min(phaseEndMs, workshopEndMs)).toISOString();
  }

  private syncWhoWhoTimers(room: WhoWhoRoomState) {
    if (room.gamePhase === "lobby" || room.gamePhase === "ended") return;
    const now = new Date();
    const workshopEndMs = room.workshopEndsAt ? Date.parse(room.workshopEndsAt) : undefined;
    if (workshopEndMs && now.getTime() >= workshopEndMs) {
      const remainingAi = room.identities.filter((identity) => identity.isAi && identity.alive).length;
      this.setWhoWhoTimedPhase(room, "ended", "reveal", undefined, now);
      room.revealed = true;
      room.endedAt = now.toISOString();
      room.winner = remainingAi === 0 ? "humans" : "ai";
      this.addGameEvent(
        room,
        room.winner === "humans" ? "success" : "warning",
        room.winner === "humans" ? "The 45-minute clock expired after humans found every hidden AI." : "The 45-minute clock expired. AI wins because hidden AI classmates were still in the room."
      );
      return;
    }

    const phaseEndMs = room.phaseEndsAt ? Date.parse(room.phaseEndsAt) : undefined;
    if (!phaseEndMs || now.getTime() < phaseEndMs) return;
    if (room.gamePhase === "chat") {
      this.setWhoWhoTimedPhase(room, "vote", "voting", WHOS_WHO_NIGHT_SECONDS, now);
      this.addGameEvent(room, "warning", `Day ${room.roundNumber} ended. Night accusations are open for ${Math.round(WHOS_WHO_NIGHT_SECONDS / 60)} minutes.`);
      return;
    }
    if (room.gamePhase === "vote") {
      this.setWhoWhoTimedPhase(room, "resolve", "review", undefined, now);
      this.addGameEvent(room, "warning", "Night accusations are locked. Waiting for the facilitator to resolve the vote.");
    }
  }

  private startWhoWhoGame(room: WhoWhoRoomState) {
    const firstPrompt = WHOS_WHO_PROMPTS[0];
    if (!firstPrompt) throw new Error("Who's Who prompt bank is empty.");
    const now = new Date();
    room.roundNumber = 1;
    room.roundId = `${room.id}-round-1`;
    room.promptId = firstPrompt.id;
    room.promptText = firstPrompt.text;
    room.startedAt = now.toISOString();
    room.workshopEndsAt = new Date(now.getTime() + WORKSHOP_DURATION_SECONDS * 1000).toISOString();
    this.setWhoWhoTimedPhase(room, "chat", "discussion", WHOS_WHO_DAY_SECONDS, now);
    delete room.endedAt;
    delete room.winner;
    room.revealed = false;
    room.votes = [];
    room.responses = [];
    room.chat = [];
    room.abilityUses = [];
    for (const [index, identity] of room.identities.entries()) {
      const participant = identity.participantId ? this.participants.get(identity.participantId) : undefined;
      const isAi = Boolean(participant?.isAi) || !identity.participantId;
      const roleSeed = identity.participantId ? identity.participantId : `${room.id}-${identity.id}-${index}`;
      this.prepareIdentity(identity, isAi, roleSeed, index, identity.participantId);
    }
    this.addGameEvent(room, "success", `${room.id} started. Empty seats were filled with hidden AI classmates. Day ${room.roundNumber} is open for discussion.`);
    this.addAiChatBurst(room, Math.min(4, room.identities.filter((identity) => identity.isAi).length));
  }

  private resetWhoWhoRoom(room: WhoWhoRoomState) {
    const firstPrompt = WHOS_WHO_PROMPTS[0];
    if (!firstPrompt) throw new Error("Who's Who prompt bank is empty.");
    room.roundNumber = 1;
    room.roundId = `${room.id}-round-1`;
    room.promptId = firstPrompt.id;
    room.promptText = firstPrompt.text;
    room.stage = "lobby";
    room.gamePhase = "lobby";
    room.chat = [];
    room.responses = [];
    room.votes = [];
    room.abilityUses = [];
    room.revealed = false;
    delete room.startedAt;
    delete room.endedAt;
    delete room.workshopEndsAt;
    delete room.phaseStartedAt;
    delete room.phaseEndsAt;
    delete room.winner;
    for (const [index, identity] of room.identities.entries()) {
      const participant = identity.participantId ? this.participants.get(identity.participantId) : undefined;
      if (participant && !participant.isAi) {
        this.prepareIdentity(identity, false, participant.id, index, participant.id);
      } else {
        this.releaseIdentity(identity);
        identity.isAi = false;
        delete identity.personaId;
        delete identity.aiPersonaNote;
      }
    }
    room.gameEvents = [
      {
        id: `game-event-${createSessionId()}`,
        at: new Date().toISOString(),
        tone: "system",
        message: "Room reset. Human players are still seated; AI seats will fill on start."
      }
    ];
  }

  private openWhoWhoVote(room: WhoWhoRoomState, forced = false) {
    this.syncWhoWhoTimers(room);
    if (room.gamePhase === "ended") {
      throw new ApiError(409, "game_ended", "Reset the room before opening another vote.");
    }
    if (room.gamePhase === "lobby") this.startWhoWhoGame(room);
    this.setWhoWhoTimedPhase(room, "vote", "voting", WHOS_WHO_NIGHT_SECONDS);
    this.addGameEvent(
      room,
      forced ? "warning" : "system",
      forced
        ? `Game master forced Round ${room.roundNumber} into Night. Accusations are open for ${Math.round(WHOS_WHO_NIGHT_SECONDS / 60)} minutes.`
        : `Night ${room.roundNumber} is open. Players should accuse the classmate they think is AI.`
    );
  }

  private advanceWhoWhoRoundManually(room: WhoWhoRoomState) {
    this.syncWhoWhoTimers(room);
    if (room.gamePhase === "ended") {
      throw new ApiError(409, "game_ended", "Reset the room before moving to another round.");
    }
    if (room.gamePhase === "lobby") {
      this.startWhoWhoGame(room);
      this.addGameEvent(room, "system", `Round ${room.roundNumber} is live. Talk, compare clues, then accuse.`);
      return;
    }
    room.roundNumber += 1;
    room.roundId = `${room.id}-round-${room.roundNumber}`;
    this.setWhoWhoTimedPhase(room, "chat", "discussion", WHOS_WHO_DAY_SECONDS);
    this.addGameEvent(room, "system", `Game master moved everyone to Day ${room.roundNumber}. Previous accusations stay in the log; discussion is open again.`);
    this.addAiChatBurst(room, 2);
  }

  private resolveWhoWhoRound(room: WhoWhoRoomState) {
    this.syncWhoWhoTimers(room);
    const currentVotes = room.votes.filter((vote) => vote.roundId === room.roundId);
    const totalPressure = room.identities.reduce((sum, identity) => sum + this.whoWhoVoteScore(room, identity.id), 0);
    if (totalPressure === 0) {
      this.openWhoWhoVote(room);
      this.addGameEvent(room, "warning", "No accusations yet. Keep voting or use Reset if you need a fresh room.");
      return;
    }
    this.setWhoWhoTimedPhase(room, "resolve", "review");
    const aliveIdentities = room.identities.filter((identity) => identity.alive);
    const target = [...aliveIdentities].sort((a, b) => {
      const bVotes = this.whoWhoVoteScore(room, b.id);
      const aVotes = this.whoWhoVoteScore(room, a.id);
      if (bVotes !== aVotes) return bVotes - aVotes;
      return a.id.localeCompare(b.id);
    })[0];
    if (!target) return;
    target.alive = false;
    target.eliminatedAt = new Date().toISOString();
    target.eliminatedReason = `The room voted out ${target.displayName}.`;
    this.addGameEvent(room, target.isAi ? "success" : "warning", `${target.displayName} was voted out. ${target.isAi ? "That was hidden AI." : "That was a human player."}`);

    if (target.isAi) {
      const correctVoters = currentVotes.filter((vote) => vote.identityId === target.id);
      for (const vote of correctVoters) {
        const voter = this.participants.get(vote.participantId);
        if (voter) {
          voter.points += 40;
          this.participants.set(voter.id, voter);
        }
      }
    }

    const aiAlive = room.identities.filter((identity) => identity.isAi && identity.alive).length;
    if (aiAlive > 0) {
      const humans = room.identities.filter((identity) => !identity.isAi && identity.participantId && identity.alive);
      const victim = humans[this.stableIndex(`${room.id}-${room.roundId}-strike`, humans.length)];
      if (victim) {
        if (this.isWhoWhoProtected(room, victim.id)) {
          this.addGameEvent(room, "success", `${victim.displayName} was guarded. The hidden AI counterstrike was blocked.`);
        } else {
          victim.alive = false;
          victim.eliminatedAt = new Date().toISOString();
          victim.eliminatedReason = "The hidden AI took this player out after the vote.";
          this.addGameEvent(room, "warning", `${victim.displayName} was taken out by the hidden AI.`);
        }
      }
    }

    const remainingAi = room.identities.filter((identity) => identity.isAi && identity.alive).length;
    const remainingHumans = room.identities.filter((identity) => !identity.isAi && identity.participantId && identity.alive).length;
    if (remainingAi === 0) {
      this.setWhoWhoTimedPhase(room, "ended", "reveal");
      room.revealed = true;
      room.endedAt = new Date().toISOString();
      room.winner = "humans";
      this.addGameEvent(room, "success", "Humans win. Every hidden AI was found.");
      return;
    }
    if (remainingHumans === 0) {
      this.setWhoWhoTimedPhase(room, "ended", "reveal");
      room.revealed = true;
      room.endedAt = new Date().toISOString();
      room.winner = "ai";
      this.addGameEvent(room, "warning", "AI wins. No human players are still alive.");
      return;
    }

    room.roundNumber += 1;
    room.roundId = `${room.id}-round-${room.roundNumber}`;
    this.setWhoWhoTimedPhase(room, "chat", "discussion", WHOS_WHO_DAY_SECONDS);
    this.addGameEvent(room, "system", `Day ${room.roundNumber} started. Talk, compare clues, then accuse again at Night.`);
    this.addAiChatBurst(room, 2);
  }

  private addAiChatBurst(room: WhoWhoRoomState, count: number) {
    if (room.gamePhase !== "chat") return;
    const aiIdentities = room.identities.filter((identity) => identity.isAi && identity.alive);
    if (aiIdentities.length === 0) return;
    const createdAt = new Date().toISOString();
    for (let index = 0; index < count; index += 1) {
      const identity = aiIdentities[(room.chat.length + index) % aiIdentities.length];
      const text = WHOS_WHO_AI_LINES[(room.chat.length + index) % WHOS_WHO_AI_LINES.length];
      if (!identity || !text) continue;
      room.chat.push({
        id: `chat-ai-${createSessionId()}`,
        roundId: room.roundId,
        identityId: identity.id,
        displayName: identity.displayName,
        text,
        isAi: true,
        createdAt
      });
      this.aiRequests.total += 1;
      this.aiRequests.estimatedTokens += Math.ceil(text.length / 4);
    }
  }

  private requireParticipantIdentity(room: WhoWhoRoomState, participantId: string) {
    const identity = room.identities.find((item) => item.participantId === participantId);
    if (!identity) throw new ApiError(409, "not_in_room", "Enter this room ID before playing.");
    return identity;
  }

  private ensureAiResponses(room: WhoWhoRoomState) {
    for (const identity of room.identities.filter((item) => item.isAi)) {
      const alreadySubmitted = room.responses.some((response) => response.roundId === room.roundId && response.identityId === identity.id);
      if (alreadySubmitted || !identity.personaId) continue;
      room.responses.push({
        id: `response-${createSessionId()}`,
        roundId: room.roundId,
        identityId: identity.id,
        displayName: identity.displayName,
        text: generateFallbackPersonaResponse(identity.personaId, room.promptText, room.responses.length + identity.displayName.length),
        flagged: false,
        moderation: { ok: true, reasons: [], redactedText: "" },
        submittedAt: new Date().toISOString()
      });
    }
  }

  private publicRoom(room: WhoWhoRoomState, includeReveal = room.revealed, viewerParticipantId?: string) {
    this.syncWhoWhoTimers(room);
    const shuffledResponses = [...room.responses].sort((a, b) => a.identityId.localeCompare(b.identityId));
    const currentVotes = room.votes.filter((vote) => vote.roundId === room.roundId);
    const votesByIdentity = room.identities.map((identity) => ({
      identityId: identity.id,
      displayName: identity.displayName,
      votes: this.whoWhoVoteScore(room, identity.id)
    }));
    const visibleAbilityUses = room.abilityUses.filter((use) => includeReveal || use.isPublic || use.participantId === viewerParticipantId);
    const voteInsights = currentVotes.slice(-8).map((vote) => {
      const identity = room.identities.find((item) => item.id === vote.identityId);
      return {
        id: vote.id,
        displayName: identity?.displayName ?? "Unknown",
        evidenceType: vote.evidenceType,
        assumptionTag: vote.assumptionTag,
        confidence: vote.confidence,
        evidence: vote.evidence,
        counterEvidence: vote.counterEvidence
      };
    });
    const seatsFilled = room.identities.filter((identity) => identity.participantId || identity.isAi).length;
    const aiRemaining = room.identities.filter((identity) => identity.isAi && identity.alive).length;
    const humansAlive = room.identities.filter((identity) => !identity.isAi && identity.participantId && identity.alive).length;
    const currentPlayer = viewerParticipantId ? room.identities.find((identity) => identity.participantId === viewerParticipantId) : undefined;
    const nowMs = Date.now();
    const phaseSecondsRemaining = room.phaseEndsAt ? Math.max(0, Math.ceil((Date.parse(room.phaseEndsAt) - nowMs) / 1000)) : undefined;
    const workshopSecondsRemaining = room.workshopEndsAt ? Math.max(0, Math.ceil((Date.parse(room.workshopEndsAt) - nowMs) / 1000)) : undefined;
    const phaseName = room.gamePhase === "chat" ? "Day" : room.gamePhase === "vote" ? "Night" : room.gamePhase === "resolve" ? "Resolve" : room.gamePhase === "lobby" ? "Lobby" : "Ended";
    return {
      ...room,
      identities: room.identities.map((identity) => ({
        id: identity.id,
        displayName: identity.displayName,
        alive: identity.alive,
        role: includeReveal || identity.participantId === viewerParticipantId ? identity.role : undefined,
        isAi: includeReveal ? identity.isAi : undefined,
        personaId: includeReveal ? identity.personaId : undefined,
        participantId: includeReveal ? identity.participantId : undefined,
        eliminatedAt: identity.eliminatedAt,
        eliminatedReason: identity.eliminatedReason,
        joined: Boolean(identity.participantId || identity.isAi),
        aiPersonaNote: includeReveal ? identity.aiPersonaNote : undefined
      })),
      chat: room.chat.slice(-80).map((message) => ({
        id: message.id,
        roundId: message.roundId,
        identityId: message.identityId,
        displayName: message.displayName,
        text: message.text,
        isAi: includeReveal ? message.isAi : undefined,
        createdAt: message.createdAt
      })),
      responses: shuffledResponses.map((response) => ({
        id: response.id,
        roundId: response.roundId,
        identityId: response.identityId,
        displayName: response.displayName,
        text: response.text,
        flagged: response.flagged,
        submittedAt: response.submittedAt
      })),
      votes: currentVotes.map((vote) => ({
        id: vote.id,
        roundId: vote.roundId,
        identityId: vote.identityId,
        confidence: vote.confidence,
        evidence: vote.evidence,
        createdAt: vote.createdAt
      })),
      abilityUses: visibleAbilityUses.slice(-16).map((use) => ({
        id: use.id,
        roundId: use.roundId,
        actorIdentityId: use.actorIdentityId,
        actorDisplayName: use.actorDisplayName,
        targetIdentityId: use.targetIdentityId,
        targetDisplayName: use.targetDisplayName,
        role: use.role,
        abilityName: use.abilityName,
        phase: use.phase,
        result: use.result,
        isPublic: use.isPublic,
        voteModifier: use.voteModifier,
        protects: includeReveal || use.participantId === viewerParticipantId ? use.protects : undefined,
        createdAt: use.createdAt
      })),
      roleAbilities: WHOS_WHO_ROLE_ABILITIES,
      votesByIdentity,
      voteInsights,
      game: {
        phase: room.gamePhase,
        seatCount: room.seatCount,
        seatsFilled,
        seatsOpen: Math.max(0, room.seatCount - seatsFilled),
        ready: seatsFilled >= room.seatCount,
        roundNumber: room.roundNumber,
        startedAt: room.startedAt,
        endedAt: room.endedAt,
        workshopEndsAt: room.workshopEndsAt,
        phaseStartedAt: room.phaseStartedAt,
        phaseEndsAt: room.phaseEndsAt,
        phaseName,
        phaseSecondsRemaining,
        workshopSecondsRemaining,
        daySeconds: WHOS_WHO_DAY_SECONDS,
        nightSeconds: WHOS_WHO_NIGHT_SECONDS,
        winner: room.winner,
        humansAlive,
        aiRemaining: includeReveal ? aiRemaining : undefined,
        roundRule: `Each round has a ${Math.round(WHOS_WHO_DAY_SECONDS / 60)}-minute Day discussion, then a ${Math.round(WHOS_WHO_NIGHT_SECONDS / 60)}-minute Night accusation period. Resolve the vote to eliminate the top-accused classmate.`,
        winRule: "Humans win by finding every hidden AI classmate. AI wins if no human players are still alive.",
        facilitatorControl: "The facilitator can force Night, resolve the vote, or move everyone to the next Day."
      },
      currentPlayer: currentPlayer
        ? {
            id: currentPlayer.id,
            displayName: currentPlayer.displayName,
            role: currentPlayer.role,
            roleAbility: this.whoWhoAbilityForRole(currentPlayer.role),
            alive: currentPlayer.alive,
            eliminatedAt: currentPlayer.eliminatedAt,
            eliminatedReason: currentPlayer.eliminatedReason
          }
        : undefined,
      takeaway: WORKSHOP_TAKEAWAYS["whos-who"]
    };
  }

  private getWhoWhoState(participantId?: string) {
    const participant = participantId ? this.participants.get(participantId) : undefined;
    const room = participant ? this.requireRoom(participant.roomId) : [...this.rooms.values()][0];
    if (!room) throw new Error("No Who's Who room found.");
    if (this.options.demoMode && room.gamePhase !== "lobby" && room.chat.length < 3) {
      this.addAiChatBurst(room, 2);
      this.rooms.set(room.id, room);
    }
    return {
      promptBank: WHOS_WHO_PROMPTS,
      personas: WHOS_WHO_PERSONAS,
      lenses: WHOS_WHO_INVESTIGATION_LENSES,
      assumptionTags: WHOS_WHO_ASSUMPTION_TAGS,
      debriefQuestions: WHOS_WHO_DEBRIEF_QUESTIONS,
      room: this.publicRoom(room, room.revealed, participantId),
      rooms: [...this.rooms.values()].map((item) => {
        const seatsFilled = item.identities.filter((identity) => identity.participantId || identity.isAi).length;
        return { id: item.id, name: item.name, group: item.group, stage: item.stage, gamePhase: item.gamePhase, seatsFilled, seatCount: item.seatCount };
      }),
      scoring: POINT_RULES.filter((rule) => rule.workshopId === "whos-who" || rule.workshopId === "shared")
    };
  }

  private getDetectiveState(participantId?: string) {
    const participant = participantId ? this.participants.get(participantId) : undefined;
    if (this.options.demoMode && participant && !participant.isAi && participant.detectiveRoomId) this.ensureDemoDetectiveRoomActivity(participant.detectiveRoomId, participant);
    const activeRoom = participant?.detectiveRoomId ? this.detectiveRooms.get(participant.detectiveRoomId) : undefined;
    const roomSummaries = [...this.detectiveRooms.values()].map((room) => {
      const business = this.requireDetectiveBusiness(room.businessId);
      const votes = this.detectiveVotes.filter((vote) => vote.roomId === room.id);
      return {
        id: room.id,
        name: room.name,
        status: room.status,
        business,
        memberCount: room.memberIds.length,
        members: room.memberIds.map((memberId) => {
          const member = this.participants.get(memberId);
          return {
            id: memberId,
            nickname: member?.nickname ?? "Investigator",
            isAi: Boolean(member?.isAi)
          };
        }),
        claimsCount: this.discoveries.filter((claim) => claim.roomId === room.id).length,
        finalClaimsCount: this.recommendations.filter((recommendation) => recommendation.roomId === room.id).length,
        votes: {
          fund: votes.filter((vote) => vote.vote === "fund").length,
          reject: votes.filter((vote) => vote.vote === "reject").length,
          total: votes.length
        }
      };
    });
    return {
      scenario: {
        name: "Investor Scavenger Hunt",
        description: "Eight investor rooms investigate assigned AI businesses, verify claims with internet facts, and decide whether to fund or reject each company.",
        activeStage: this.activeDetectiveStage
      },
      roomIds: DETECTIVE_INVESTOR_ROOMS.map((room) => room.roomId),
      businesses: DETECTIVE_INVESTOR_ROOMS,
      rooms: roomSummaries,
      activeRoom: activeRoom
        ? {
            ...roomSummaries.find((room) => room.id === activeRoom.id),
            claims: this.discoveries.filter((claim) => claim.roomId === activeRoom.id),
            chat: this.detectiveChat.filter((message) => message.roomId === activeRoom.id),
            finalClaims: this.recommendations.filter((recommendation) => recommendation.roomId === activeRoom.id),
            votes: this.detectiveVotes.filter((vote) => vote.roomId === activeRoom.id),
            voteSummary: roomSummaries.find((room) => room.id === activeRoom.id)?.votes ?? { fund: 0, reject: 0, total: 0 }
          }
        : null,
      categories: ETHICAL_CATEGORIES,
      stageGuides: DETECTIVE_STAGE_GUIDES,
      connectionPrompts: DETECTIVE_CONNECTION_PROMPTS,
      decisionRubric: DETECTIVE_DECISION_RUBRIC,
      evidence: this.evidence.map((item) => ({
        ...item,
        revealed: item.stage <= this.activeDetectiveStage
      })),
      discoveries: this.discoveries,
      chat: this.detectiveChat,
      recommendations: this.recommendations,
      votes: this.detectiveVotes,
      takeaway: WORKSHOP_TAKEAWAYS["data-detective"]
    };
  }

  private getStoribloomState(participantId?: string) {
    const participant = participantId ? this.participants.get(participantId) : undefined;
    const teamStory = participant ? [...this.stories.values()].find((story) => story.teamId === participant.teamId) : undefined;
    for (const room of this.storyRooms.values()) {
      this.syncStoryRoomTimers(room);
      this.storyRooms.set(room.id, room);
    }
    const activeRoom = participant?.storyRoomId ? this.storyRooms.get(participant.storyRoomId) : undefined;
    return {
      inspiration: STORY_INSPIRATION,
      stageGuides: STORY_STAGE_GUIDES,
      roomStageGuides: STORY_ROOM_STAGE_GUIDES,
      roomIds: STORY_ROOM_DEFINITIONS.map((room) => room.id),
      rooms: [...this.storyRooms.values()].map((room) => this.publicStoryRoomSummary(room)),
      activeRoom: activeRoom ? this.publicStoryRoom(activeRoom, participant?.id) : null,
      ethicsCheckpoints: STORY_ETHICS_CHECKPOINTS,
      humanEditRequirements: STORY_HUMAN_EDIT_REQUIREMENTS,
      story: teamStory ?? [...this.stories.values()][0],
      stories: [...this.stories.values()],
      reminder: RESPONSIBLE_USE_REMINDER,
      takeaway: WORKSHOP_TAKEAWAYS.storibloom
    };
  }

  private publicStoryRoomSummary(room: StoryRoomState) {
    const publicRoom = this.publicStoryRoom(room);
    return {
      id: publicRoom.id,
      name: publicRoom.name,
      lane: publicRoom.lane,
      focus: publicRoom.focus,
      status: publicRoom.status,
      activeStage: publicRoom.activeStage,
      stageTitle: publicRoom.stageTitle,
      memberCount: publicRoom.memberCount,
      proposalCount: publicRoom.proposals.length,
      approvedProposalCount: publicRoom.approvedIdeas.length,
      chatCount: publicRoom.chat.length,
      title: publicRoom.title,
      hasFinalStory: Boolean(publicRoom.finalText),
      phaseSecondsRemaining: publicRoom.phaseSecondsRemaining,
      workshopSecondsRemaining: publicRoom.workshopSecondsRemaining
    };
  }

  private publicStoryRoom(room: StoryRoomState, participantId?: string) {
    this.syncStoryRoomTimers(room);
    const guide = STORY_ROOM_STAGE_GUIDES.find((item) => item.stage === room.activeStage) ?? STORY_ROOM_STAGE_GUIDES[0];
    const visibleGuideMessages = room.guideMessages.filter((message) => message.scope === "room" || !participantId || message.participantId === participantId);
    return {
      id: room.id,
      name: room.name,
      lane: room.lane,
      focus: room.focus,
      storyId: room.storyId,
      status: room.status,
      activeStage: room.activeStage,
      stageTitle: guide?.title ?? "Lobby",
      stageGoal: guide?.goal ?? "Join the room, read the creative lane, and wait for the facilitator to start.",
      startedAt: room.startedAt,
      endedAt: room.endedAt,
      stageEndsAt: room.stageEndsAt,
      workshopEndsAt: room.workshopEndsAt,
      phaseSecondsRemaining: this.secondsUntil(room.stageEndsAt),
      workshopSecondsRemaining: this.secondsUntil(room.workshopEndsAt),
      memberCount: room.memberIds.length,
      members: room.memberIds.map((id) => {
        const member = this.participants.get(id);
        return { id, nickname: member?.nickname ?? "Student", teamName: member?.teamName ?? "Room member" };
      }),
      chat: room.chat.slice(-80),
      proposals: room.proposals.map((proposal) => {
        const approve = proposal.votes.filter((vote) => vote.vote === "approve").length;
        const rework = proposal.votes.filter((vote) => vote.vote === "rework").length;
        return {
          ...proposal,
          approvals: approve,
          reworks: rework,
          status: approve > rework ? "approved" : rework > approve ? "needs-rework" : "open"
        };
      }),
      approvedIdeas: this.storyRoomApprovedIdeas(room),
      guideMessages: visibleGuideMessages.slice(-30),
      title: room.title,
      finalText: room.finalText,
      authorshipNote: room.authorshipNote
    };
  }

  private syncStoryRoomTimers(room: StoryRoomState) {
    if (room.status !== "running" || !room.startedAt) return;
    const startedAtMs = new Date(room.startedAt).getTime();
    const nowMs = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
    if (elapsedSeconds >= WORKSHOP_DURATION_SECONDS) {
      room.status = "ended";
      room.activeStage = 6;
      room.endedAt = room.endedAt ?? new Date(startedAtMs + WORKSHOP_DURATION_SECONDS * 1000).toISOString();
      delete room.stageEndsAt;
      room.workshopEndsAt = new Date(startedAtMs + WORKSHOP_DURATION_SECONDS * 1000).toISOString();
      return;
    }
    const stageIndex = Math.min(5, Math.floor(elapsedSeconds / STORY_ROOM_STAGE_SECONDS));
    room.activeStage = stageIndex + 1;
    const stageEndMs = startedAtMs + (stageIndex + 1) * STORY_ROOM_STAGE_SECONDS * 1000;
    room.stageEndsAt = new Date(Math.min(stageEndMs, startedAtMs + WORKSHOP_DURATION_SECONDS * 1000)).toISOString();
    room.workshopEndsAt = new Date(startedAtMs + WORKSHOP_DURATION_SECONDS * 1000).toISOString();
  }

  private storyRoomApprovedIdeas(room: StoryRoomState) {
    return room.proposals
      .map((proposal) => {
        const approvals = proposal.votes.filter((vote) => vote.vote === "approve").length;
        const reworks = proposal.votes.filter((vote) => vote.vote === "rework").length;
        return { id: proposal.id, kind: proposal.kind, text: proposal.text, authorName: proposal.authorName, approvals, reworks };
      })
      .filter((proposal) => proposal.approvals > proposal.reworks)
      .sort((a, b) => b.approvals - a.approvals || a.reworks - b.reworks);
  }

  private createStoryGuideResponse(room: StoryRoomState, stageTitle: string, prompt: string, approvedIdeas: Array<{ kind: string; text: string }>) {
    const latestIdea = approvedIdeas[0]?.text ?? room.focus;
    const stageHint =
      room.activeStage <= 2
        ? "Pitch two concrete seeds, then vote on the one with the clearest setting and emotional promise."
        : room.activeStage === 3
          ? "Give the protagonist a want, a fear, and a hard choice. Avoid making them perfect."
          : room.activeStage === 4
            ? "Make the turning point a human decision, not a magic AI fix."
            : room.activeStage === 5
              ? "Draft from approved ideas, then mark at least one sentence humans will rewrite."
              : "Polish the ending, authorship note, and one detail only your room could have invented.";
    return `For ${room.name} in ${stageTitle}: ${stageHint} Based on the strongest approved idea so far, "${latestIdea}", try this next move: ${prompt.endsWith("?") ? "answer it with one specific scene choice and one reason." : "turn it into a short proposal the room can vote on."}`;
  }

  private updateStoryFromRoom(room: StoryRoomState, participantId?: string) {
    const story = this.stories.get(room.storyId) ?? this.createStory(room.id, room.storyId);
    const before = story.finalText || story.draft;
    story.teamId = room.id;
    story.title = room.title || story.title;
    story.stage = room.activeStage;
    story.finalText = room.finalText;
    story.draft = story.draft || room.finalText;
    story.plot = { ...story.plot, approvedIdeas: this.storyRoomApprovedIdeas(room).map((idea) => `${idea.kind}: ${idea.text}`).join("\n"), authorshipNote: room.authorshipNote };
    if (room.finalText && room.finalText !== before) {
      story.revisions.push({
        beforeText: before,
        afterText: room.finalText,
        reason: "Story room final edit",
        createdAt: new Date().toISOString()
      });
    }
    if (room.finalText.length >= 120) {
      story.status = "published";
      story.published = {
        storyId: room.storyId,
        participantId: participantId ?? "room",
        title: room.title || `${room.name} Story`,
        finalText: room.finalText,
        authorshipStatement: room.authorshipNote || `${room.name} created this story through human discussion, group voting, and AI guidance.`,
        ethicalRevision: "The room reviewed the story for stereotypes, privacy risks, and generic AI choices.",
        humanContributionSummary: "Students proposed, discussed, voted, revised, and saved the final story.",
        aiContributionSummary: "Kurami Guide suggested structure, questions, and revision prompts."
      };
    }
    this.stories.set(story.id, story);
    return story;
  }

  private publicCourtRoomSummary(room: CourtRoomState) {
    const publicRoom = this.publicCourtRoom(room);
    return {
      id: publicRoom.id,
      name: publicRoom.name,
      docket: publicRoom.docket,
      status: publicRoom.status,
      caseId: publicRoom.case.id,
      caseTitle: publicRoom.case.title,
      activeRound: publicRoom.activeRound,
      roundTitle: publicRoom.roundTitle,
      memberCount: publicRoom.memberCount,
      argumentCount: publicRoom.arguments.length,
      voteSummary: publicRoom.voteSummary,
      phaseSecondsRemaining: publicRoom.phaseSecondsRemaining,
      workshopSecondsRemaining: publicRoom.workshopSecondsRemaining
    };
  }

  private publicCourtRoom(room: CourtRoomState, participantId?: string) {
    this.syncCourtRoomTimers(room);
    const caseFile = this.courtCases.find((item) => item.id === room.caseId) ?? this.courtCases[0];
    const roundGuide = COURT_ROOM_ROUNDS.find((item) => item.round === room.activeRound) ?? COURT_ROOM_ROUNDS[0];
    const participantVote = participantId ? room.votes.find((vote) => vote.participantId === participantId) : undefined;
    return {
      id: room.id,
      name: room.name,
      docket: room.docket,
      status: room.status,
      activeRound: room.activeRound,
      roundTitle: roundGuide?.title ?? "Lobby",
      roundGoal: roundGuide?.goal ?? "Join the room and wait for the facilitator to start.",
      roundPrompt: roundGuide?.judgePrompt ?? "Wait for the judge to open the hearing.",
      roundEndsAt: room.roundEndsAt,
      debateEndsAt: room.debateEndsAt,
      finalVoteEndsAt: room.finalVoteEndsAt,
      phaseSecondsRemaining: room.status === "debate" ? this.secondsUntil(room.roundEndsAt) : room.status === "final-vote" ? this.secondsUntil(room.finalVoteEndsAt) : undefined,
      workshopSecondsRemaining: room.status === "ended" ? 0 : this.secondsUntil(room.finalVoteEndsAt),
      memberCount: room.memberIds.length,
      members: room.memberIds.map((id) => {
        const member = this.participants.get(id);
        return { id, nickname: member?.nickname ?? "Student", teamName: member?.teamName ?? "Courtroom participant" };
      }),
      case: caseFile ?? {
        id: room.caseId,
        title: "Court Case",
        scenario: "No case file loaded.",
        missingDetail: "No sealed detail loaded.",
        keyIssues: []
      },
      sealedDetailVisible: room.status !== "lobby" && room.activeRound >= 3,
      rounds: COURT_ROOM_ROUNDS,
      judgeMessages: room.judgeMessages.slice(-40),
      arguments: room.arguments.slice(-120),
      votes: room.votes.slice(-120),
      voteSummary: calculateVoteBreakdown(room.votes.map((vote) => vote.vote)),
      participantVote
    };
  }

  private syncCourtRoomTimers(room: CourtRoomState, options: { skipAutoAdvance?: boolean } = {}) {
    if (room.status !== "debate" || !room.startedAt) return;
    const startedAtMs = new Date(room.startedAt).getTime();
    const nowMs = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
    if (!options.skipAutoAdvance && elapsedSeconds >= COURT_WORKSHOP_SECONDS) {
      room.status = "ended";
      room.activeRound = COURT_ROOM_ROUNDS.length;
      room.endedAt = room.endedAt ?? new Date(startedAtMs + COURT_WORKSHOP_SECONDS * 1000).toISOString();
      delete room.roundEndsAt;
      delete room.debateEndsAt;
      delete room.finalVoteEndsAt;
      this.addCourtJudgeMessage(room, {
        round: room.activeRound,
        tone: "timer",
        text: "The 30-minute hearing has ended. Court is adjourned."
      });
      this.courtRooms.set(room.id, room);
      return;
    }
    if (!options.skipAutoAdvance && elapsedSeconds >= COURT_DEBATE_SECONDS) {
      room.status = "final-vote";
      room.activeRound = COURT_ROOM_ROUNDS.length;
      delete room.roundEndsAt;
      room.finalVoteEndsAt = new Date(startedAtMs + COURT_WORKSHOP_SECONDS * 1000).toISOString();
      this.addCourtJudgeMessage(room, {
        round: room.activeRound,
        tone: "timer",
        text: "Debate time has ended. The final five-minute vote is now open."
      });
      this.courtRooms.set(room.id, room);
      return;
    }
    const nextRound = Math.min(COURT_ROOM_ROUNDS.length, Math.floor(elapsedSeconds / COURT_ROUND_SECONDS) + 1);
    if (!options.skipAutoAdvance && nextRound !== room.activeRound) {
      room.activeRound = nextRound;
      this.ensureCourtRoundPrompt(room, nextRound);
    }
    room.roundEndsAt = new Date(startedAtMs + room.activeRound * COURT_ROUND_SECONDS * 1000).toISOString();
    room.debateEndsAt = new Date(startedAtMs + COURT_DEBATE_SECONDS * 1000).toISOString();
    room.finalVoteEndsAt = new Date(startedAtMs + COURT_WORKSHOP_SECONDS * 1000).toISOString();
    this.courtRooms.set(room.id, room);
  }

  private ensureCourtRoundPrompt(room: CourtRoomState, round: number) {
    const guide = COURT_ROOM_ROUNDS.find((item) => item.round === round);
    if (!guide) return;
    if (room.judgeMessages.some((message) => message.round === round && message.tone === "opening" && message.text === guide.judgePrompt)) return;
    this.addCourtJudgeMessage(room, { round, tone: "opening", text: guide.judgePrompt });
  }

  private addCourtJudgeMessage(room: CourtRoomState, input: Omit<CourtJudgeMessageState, "id" | "roomId" | "createdAt">) {
    const recentDuplicate = room.judgeMessages.slice(-3).some((message) => message.text === input.text && message.round === input.round);
    if (recentDuplicate) return;
    room.judgeMessages.push({
      id: `court-judge-${createSessionId()}`,
      roomId: room.id,
      createdAt: new Date().toISOString(),
      ...input
    });
  }

  private createCourtJudgeResponse(room: CourtRoomState, argument: CourtRoomArgumentState) {
    const text = `${argument.text} ${argument.evidence ?? ""}`.toLowerCase();
    const stanceLabel: Record<CourtVoteValue, string> = {
      approve: "approval",
      "approve-with-restrictions": "approval with restrictions",
      reject: "rejection",
      "need-more-information": "a pause for more information"
    };
    const roundGuide = COURT_ROOM_ROUNDS.find((item) => item.round === argument.round);
    let followUp = "Name one concrete fact, safeguard, or accountability owner that would make this argument stronger.";
    if (text.includes("privacy") || text.includes("data") || text.includes("consent")) followUp = "What data should be off-limits, and how would affected people give meaningful consent?";
    else if (text.includes("bias") || text.includes("fair") || text.includes("discrimination")) followUp = "Which group might carry the unfair burden, and what test would prove the system is fair enough?";
    else if (text.includes("appeal") || text.includes("review") || text.includes("human")) followUp = "Who gets final human authority, and how quickly can an affected person appeal?";
    else if (text.includes("safety") || text.includes("harm") || text.includes("risk")) followUp = "What harm is most likely, and what evidence would show the risk is low enough?";
    else if (text.includes("benefit") || text.includes("help") || text.includes("access")) followUp = "What benefit is real, and who might still be excluded from receiving it?";
    return `Judge Kurami heard ${argument.authorName}'s case for ${stanceLabel[argument.stance]} in ${roundGuide?.title ?? room.name}. ${followUp}`;
  }

  private getCourtState(participantId?: string) {
    const participant = participantId ? this.participants.get(participantId) : undefined;
    if (this.options.demoMode && participant && !participant.isAi) this.ensureDemoCourtVotes(participant.teamId, this.activeCourtCaseId);
    const activeRoom = participant?.courtRoomId ? this.courtRooms.get(participant.courtRoomId) : undefined;
    return {
      cases: this.courtCases,
      activeCaseId: this.activeCourtCaseId,
      questions: KURAMI_QUESTIONS,
      stakeholderLenses: COURT_STAKEHOLDER_LENSES,
      restrictionOptions: COURT_RESTRICTION_OPTIONS,
      deliberationPrompts: COURT_DELIBERATION_PROMPTS,
      durationMinutes: 30,
      roomIds: COURT_ROOM_DEFINITIONS.map((room) => room.id),
      roomRounds: COURT_ROOM_ROUNDS,
      rooms: [...this.courtRooms.values()].map((room) => this.publicCourtRoomSummary(room)),
      activeRoom: activeRoom ? this.publicCourtRoom(activeRoom, participant?.id) : null,
      results: this.getCourtResults(this.activeCourtCaseId),
      reasoning: this.courtReasoning,
      charter: this.charterProposals,
      takeaway: WORKSHOP_TAKEAWAYS["kurami-court"]
    };
  }

  private getCourtResults(caseId: string) {
    const initial = calculateVoteBreakdown(this.courtVotes.filter((vote) => vote.caseId === caseId && vote.phase === "initial").map((vote) => vote.vote));
    const final = calculateVoteBreakdown(this.courtVotes.filter((vote) => vote.caseId === caseId && vote.phase === "final").map((vote) => vote.vote));
    const changed = this.courtVotes.filter((vote) => {
      if (vote.caseId !== caseId || vote.phase !== "final") return false;
      const initialVote = this.courtVotes.find((item) => item.caseId === caseId && item.participantId === vote.participantId && item.phase === "initial");
      return initialVote ? initialVote.vote !== vote.vote : false;
    }).length;
    return { initial, final, changed };
  }

  private requireParticipant(participantId: string) {
    const participant = this.participants.get(participantId);
    if (!participant) throw new ApiError(409, "participant_not_found", "Your student session expired. Please rejoin the event, then enter the room ID again.");
    return participant;
  }

  private requireRoom(roomId: string) {
    const normalizedRoomId = normalizeWhoWhoRoomId(roomId);
    const room = this.rooms.get(normalizedRoomId);
    if (!room) throw new ApiError(404, "room_not_found", `Room ${normalizedRoomId || roomId} was not found. Try a room ID like gold-alpha.`);
    return room;
  }

  private requireDetectiveRoom(roomId: string) {
    const normalizedRoomId = normalizeDetectiveRoomId(roomId);
    const room = this.detectiveRooms.get(normalizedRoomId);
    if (!room) {
      const availableRoomIds = DETECTIVE_INVESTOR_ROOMS.map((item) => item.roomId).join(", ");
      throw new ApiError(404, "detective_room_not_found", `Room ${normalizedRoomId || roomId} was not found. Try ${availableRoomIds}.`);
    }
    return room;
  }

  private requireDetectiveBusiness(businessId: string): DetectiveBusiness {
    const business = DETECTIVE_INVESTOR_ROOMS.find((item) => item.id === businessId);
    if (!business) throw new ApiError(404, "detective_business_not_found", "Business dossier not found.");
    return business;
  }

  private ensureDetectiveRoomMember(room: DetectiveRoomState, participant: InternalParticipant) {
    if (!room.memberIds.includes(participant.id)) {
      if (participant.detectiveRoomId && participant.detectiveRoomId !== room.id) {
        throw new ApiError(409, "wrong_detective_room", `You are currently in ${participant.detectiveRoomId}. Join ${room.id} before posting here.`);
      }
      room.memberIds.push(participant.id);
      participant.detectiveRoomId = room.id;
      this.participants.set(participant.id, participant);
      this.detectiveRooms.set(room.id, room);
    }
  }

  private requireStory(storyId: string) {
    const story = this.stories.get(storyId);
    if (!story) throw new Error("Story not found.");
    return story;
  }

  private requireStoryRoom(roomId: string) {
    const normalizedRoomId = normalizeStoryRoomId(roomId);
    const room = this.storyRooms.get(normalizedRoomId);
    if (!room) {
      const availableRoomIds = STORY_ROOM_DEFINITIONS.map((item) => item.id).join(", ");
      throw new ApiError(404, "story_room_not_found", `Room ${normalizedRoomId || roomId} was not found. Try ${availableRoomIds}.`);
    }
    return room;
  }

  private requireStoryRoomMember(room: StoryRoomState, participantId: string) {
    if (!room.memberIds.includes(participantId)) {
      throw new ApiError(409, "story_room_required", "Join this Storibloom room before contributing.");
    }
  }

  private requireCourtRoom(roomId: string) {
    const normalizedRoomId = normalizeCourtRoomId(roomId);
    const room = this.courtRooms.get(normalizedRoomId);
    if (!room) {
      const availableRoomIds = COURT_ROOM_DEFINITIONS.map((item) => item.id).join(", ");
      throw new ApiError(404, "court_room_not_found", `Courtroom ${normalizedRoomId || roomId} was not found. Try ${availableRoomIds}.`);
    }
    return room;
  }

  private requireCourtRoomMember(room: CourtRoomState, participantId: string) {
    if (!room.memberIds.includes(participantId)) {
      throw new ApiError(409, "court_room_required", "Join this Kurami Court room before contributing.");
    }
  }

  private secondsUntil(value?: string) {
    if (!value) return undefined;
    return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 1000));
  }

  private flagIfNeeded(text: string, participantId: string | undefined, workshopId: WorkshopId | undefined, contentType: string, contentId: string) {
    const moderation = moderateText(text);
    if (!moderation.ok) {
      this.moderationFlags.push({
        id: `flag-${createSessionId()}`,
        participantId,
        workshopId,
        contentType,
        contentId,
        reason: moderation.reasons.join(", "),
        severity: moderation.severity ?? "low",
        redactedText: moderation.redactedText,
        resolved: false,
        createdAt: new Date().toISOString()
      });
    }
    return moderation;
  }
}
