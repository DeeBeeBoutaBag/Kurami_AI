export type WorkshopId = "whos-who" | "data-detective" | "storibloom" | "kurami-court";

export type RotationGroupName = "Gold" | "Black" | "Green" | "Purple";

export type EventStatus = "draft" | "onboarding" | "running" | "paused" | "ended";

export type PortalState = "available" | "completed" | "locked" | "paused" | "rejoin";

export type LeaderboardMode = "individual" | "team" | "rotation-group";

export type ParticipantRole = "participant" | "workshop-facilitator" | "lead-facilitator";

export type WorkshopStageStatus = "locked" | "open" | "complete";

export type ModerationSeverity = "low" | "medium" | "high";

export type ConnectionState = "online" | "reconnecting" | "offline";

export interface WorkshopDefinition {
  id: WorkshopId;
  name: string;
  shortName: string;
  badge: string;
  route: string;
  identity: {
    tagline: string;
    palette: string[];
    texture: string;
  };
}

export interface RotationWindow {
  label: string;
  startMinute: number;
  endMinute: number;
  kind: "welcome" | "rotation" | "transition" | "break" | "closing";
  rotationNumber?: 1 | 2 | 3 | 4;
}

export interface ParticipantSummary {
  id: string;
  sessionId: string;
  nickname: string;
  group: RotationGroupName;
  teamId: string;
  teamName: string;
  points: number;
  badges: string[];
  connectionState: ConnectionState;
  currentWorkshop: WorkshopId;
  completedWorkshops: WorkshopId[];
}

export interface TeamSummary {
  id: string;
  name: string;
  group: RotationGroupName;
  memberCount: number;
  targetSize: number;
  seatsFilled: number;
  seatsRemaining: number;
  ready: boolean;
  points: number;
  currentWorkshop: WorkshopId;
}

export interface EventSettings {
  leaderboardEnabled: boolean;
  leaderboardMode: LeaderboardMode;
  aiEnabled: boolean;
  lowBandwidthMode: boolean;
  fallbackMode: boolean;
  manuallyUnlockedWorkshops: WorkshopId[];
  lockedWorkshops: WorkshopId[];
}

export interface EventState {
  eventId: string;
  eventCode: string;
  eventName: string;
  status: EventStatus;
  currentRotation: 0 | 1 | 2 | 3 | 4;
  rotationStartedAt: string | null;
  rotationEndsAt: string | null;
  timerSecondsRemaining: number;
  announcement: string | null;
  settings: EventSettings;
  participantsOnline: number;
  participantsDisconnected: number;
  groupCounts: Record<RotationGroupName, number>;
  teams: TeamSummary[];
  serverTime: string;
}

export interface JoinResult {
  participant: ParticipantSummary;
  event: EventState;
  privacyNoticeAcceptedAt: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  workshopId?: WorkshopId;
}

export interface PointRule {
  id: string;
  workshopId: WorkshopId | "shared";
  label: string;
  points: number;
}

export interface WhoWhoPersona {
  id: "atlas" | "nova" | "cipher";
  displayName: string;
  description: string;
  voice: string[];
  fallbackResponses: string[];
}

export interface WhoWhoPrompt {
  id: string;
  text: string;
  maxCharacters: number;
}

export interface DetectiveEvidence {
  id: string;
  stage: 1 | 2 | 3 | 4 | 5;
  title: string;
  type: "document" | "chart" | "table" | "email" | "map" | "note" | "policy" | "audit";
  summary: string;
  body: string;
  ethicalCategories: EthicalCategory[];
  hiddenValue?: number;
}

export interface DetectiveInvestigationDocument {
  id: string;
  title: string;
  type: "brief" | "metric" | "risk" | "customer" | "policy" | "source";
  summary: string;
  body: string;
  prompts: string[];
}

export interface DetectiveBusiness {
  id: string;
  roomId: string;
  name: string;
  industry: string;
  fundingAsk: string;
  investorQuestion: string;
  description: string;
  claimsToVerify: string[];
  researchTargets: string[];
  documents: DetectiveInvestigationDocument[];
}

export type EthicalCategory =
  | "Bias"
  | "Privacy"
  | "Consent"
  | "Representation"
  | "Data quality"
  | "Transparency"
  | "Explainability"
  | "Accountability"
  | "Security"
  | "Accessibility"
  | "Human oversight"
  | "Appeals and due process";

export interface StoryInspirationBank {
  genres: string[];
  settings: string[];
  themes: string[];
  emotions: string[];
  audiences: string[];
}

export interface CourtCase {
  id: string;
  title: string;
  scenario: string;
  missingDetail: string;
  keyIssues: string[];
}

export interface VoteBreakdown {
  approve: number;
  approveWithRestrictions: number;
  reject: number;
  needMoreInformation: number;
  total: number;
}

export interface ModerationResult {
  ok: boolean;
  severity?: ModerationSeverity;
  reasons: string[];
  redactedText: string;
}

export interface TimerSnapshot {
  status: EventStatus;
  currentRotation: EventState["currentRotation"];
  secondsRemaining: number;
  endsAt: string | null;
}
