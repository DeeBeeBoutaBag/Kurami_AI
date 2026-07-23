import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Award,
  BadgeCheck,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleAlert,
  Clock,
  Crown,
  Download,
  Eye,
  FileDown,
  FileSearch,
  Gavel,
  HeartHandshake,
  Lightbulb,
  ListChecks,
  Lock,
  LogOut,
  Megaphone,
  Network,
  Pause,
  Play,
  Presentation,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Sprout,
  Unlock,
  Users,
  Vote,
  Wifi,
  WifiOff
} from "lucide-react";
import { Button, FieldLabel, StatusPill, Surface } from "@responsible-ai-lab/ui";
import {
  BADGES,
  EVENT_NAME,
  FACILITATOR_ROOM_ASSIGNMENTS,
  FACILITATOR_ROOM_OPTIONS,
  FACILITATOR_ROOM_SCOPES,
  RESPONSIBLE_USE_REMINDER,
  ROTATION_GROUPS,
  TEAM_COLLABORATION_ROLES,
  TEAM_TARGET_SIZE,
  WORKSHOP_DURATION_MINUTES,
  WORKSHOP_TAKEAWAYS,
  WORKSHOPS,
  currentWorkshopForGroup,
  normalizeDetectiveRoomId,
  normalizeCourtRoomId,
  normalizeStoryRoomId,
  normalizeWhoWhoRoomId,
  portalStateForWorkshop,
  workshopPortalLabel,
  type EventState,
  type ParticipantSummary,
  type PortalState,
  type WorkshopId
} from "@responsible-ai-lab/shared";
import { api, type ActivityFeedItem, type DashboardResponse, type EventExportResponse, type FacilitatorRoomScope, type WhoWhoGameAction } from "./api.js";
import { QrCode } from "./qr.js";
import { useSession } from "./session.js";
import { getSocket } from "./socket.js";
import { ToastProvider, errorMessage, useToast } from "./toast.js";

const workshopOrder = Object.keys(WORKSHOPS) as WorkshopId[];

const RUN_OF_SHOW_STEPS = [
  "Ask students to scan the QR code.",
  "Confirm each room is using the correct facilitator login.",
  "Students enter room IDs and wait in the lobby.",
  "Start the current workshop.",
  "Pause for one share-out before rotating."
] as const;

const FACILITATOR_NOTES: Record<WorkshopId, Array<{ time: string; cue: string }>> = {
  "whos-who": [
    { time: "0-5", cue: "Seat the room, start the game, and explain Day discussion versus Night accusations." },
    { time: "5-17", cue: "Run Day 1 and Night 1. Encourage students to ask for concrete details, not vibes." },
    { time: "17-29", cue: "Resolve the vote, show the consequence, then move to the next Day." },
    { time: "29-40", cue: "Run one more Day/Night cycle and spotlight how evidence changes accusations." },
    { time: "40-45", cue: "Reveal or summarize the room: what did humans notice, and where did AI blend in?" }
  ],
  "data-detective": [
    { time: "0-5", cue: "Split the main room into the assigned investor rooms and give each group one Data-Detective room ID." },
    { time: "5-20", cue: "Students read the dossier, search the internet, and capture reputable facts as claims." },
    { time: "20-32", cue: "Rooms discuss the shared claim board and challenge weak sources or unsupported claims." },
    { time: "32-40", cue: "Students submit final investor claims and vote fund or reject." },
    { time: "40-45", cue: "Project one room and ask which fact most changed the funding decision." }
  ],
  storibloom: [
    { time: "0-5", cue: "Give each group one Storibloom room ID and wait until students see the room lobby." },
    { time: "5-12.5", cue: "Start rooms manually. Students use chat and proposals to vote on story seeds." },
    { time: "12.5-20", cue: "Rooms build character and conflict ideas, then approve or rework proposals." },
    { time: "20-27.5", cue: "Rooms shape plot beats and ask Kurami Guide for structure or ethical tension." },
    { time: "27.5-37.5", cue: "Rooms build a draft from voted ideas and challenge generic AI choices." },
    { time: "37.5-45", cue: "Rooms human-edit, save the final story, and explain how AI guided rather than authored." }
  ],
  "kurami-court": [
    { time: "0-3", cue: "Give each class one courtroom ID, let students join, and ask them to read the case file." },
    { time: "3-8", cue: "Start Round 1. Students make opening arguments: approve, restrict, reject, or need more information." },
    { time: "8-13", cue: "Move to Round 2. Push students to name who benefits, who is harmed, and who has the least power." },
    { time: "13-18", cue: "Move to Round 3. Point out the sealed detail and ask what evidence changed their position." },
    { time: "18-23", cue: "Move to Round 4. Students propose restrictions, human oversight, accountability, and appeals." },
    { time: "23-28", cue: "Move to Round 5. Students make closing arguments and challenge one weak claim." },
    { time: "28-30", cue: "Open final vote. Project the result and ask what Responsible AI rule the class would keep." }
  ]
};

const STORY_PROPOSAL_KINDS = [
  { id: "seed", label: "Story seed" },
  { id: "character", label: "Character" },
  { id: "conflict", label: "Conflict" },
  { id: "plot", label: "Plot beat" },
  { id: "dialogue", label: "Dialogue" },
  { id: "revision", label: "Revision" },
  { id: "title", label: "Title" },
  { id: "ethics", label: "Ethics check" }
] as const;

const COURT_STANCE_OPTIONS = [
  { id: "need-more-information", label: "Need more information" },
  { id: "approve-with-restrictions", label: "Approve with restrictions" },
  { id: "reject", label: "Reject" },
  { id: "approve", label: "Approve" }
] as const;

function isFacilitatorRoomScope(value: unknown): value is FacilitatorRoomScope {
  return typeof value === "string" && (FACILITATOR_ROOM_SCOPES as readonly string[]).includes(value);
}

function facilitatorAssignment(scope: FacilitatorRoomScope) {
  return scope === "lead" ? null : FACILITATOR_ROOM_ASSIGNMENTS[scope];
}

function formatRoomLabel(roomId: string) {
  return roomId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function scopedWhoWhoRooms(scope: FacilitatorRoomScope) {
  const assignment = facilitatorAssignment(scope);
  const roomIds = assignment
    ? [...assignment.whoWhoRoomIds]
    : ROTATION_GROUPS.flatMap((group) => ["alpha", "beta"].map((room) => `${group.toLowerCase()}-${room}`));
  return roomIds.map((id) => ({ id, label: formatRoomLabel(id) }));
}

interface WhoWhoState {
  room: {
    id: string;
    name: string;
    stage: string;
    gamePhase: "lobby" | "chat" | "vote" | "resolve" | "ended";
    roundId: string;
    roundNumber?: number;
    promptId: string;
    promptText: string;
    identities: Array<{ id: string; displayName: string; alive: boolean; role?: string; isAi?: boolean; personaId?: string; participantId?: string; eliminatedReason?: string; joined?: boolean; aiPersonaNote?: string }>;
    chat: Array<{ id: string; identityId: string; displayName: string; text: string; isAi?: boolean; createdAt: string }>;
    gameEvents: Array<{ id: string; at: string; tone: "system" | "success" | "warning"; message: string }>;
    responses: Array<{ id: string; identityId: string; displayName: string; text: string; flagged: boolean; submittedAt: string }>;
    votes: Array<{ id: string; identityId: string; evidence: string; createdAt: string }>;
    abilityUses: Array<{
      id: string;
      roundId: string;
      actorIdentityId: string;
      actorDisplayName: string;
      targetIdentityId: string;
      targetDisplayName: string;
      role: string;
      abilityName: string;
      phase: string;
      result: string;
      isPublic: boolean;
      voteModifier?: number;
      protects?: boolean;
      createdAt: string;
    }>;
    roleAbilities: Array<{ role: string; abilityName: string; timing: string; description: string }>;
    votesByIdentity: Array<{ identityId: string; displayName: string; votes: number }>;
    voteInsights: Array<{ id: string; displayName: string; evidenceType?: string; assumptionTag?: string; confidence: number; evidence: string; counterEvidence?: string }>;
    game: {
      phase: "lobby" | "chat" | "vote" | "resolve" | "ended";
      seatCount: number;
      seatsFilled: number;
      seatsOpen: number;
      ready: boolean;
      roundNumber: number;
      winner?: "humans" | "ai";
      humansAlive: number;
      aiRemaining?: number;
      startedAt?: string;
      endedAt?: string;
      workshopEndsAt?: string;
      phaseStartedAt?: string;
      phaseEndsAt?: string;
      phaseName: "Lobby" | "Day" | "Night" | "Resolve" | "Ended";
      phaseSecondsRemaining?: number;
      workshopSecondsRemaining?: number;
      daySeconds: number;
      nightSeconds: number;
      roundRule: string;
      winRule: string;
      facilitatorControl: string;
    };
    currentPlayer?: { id: string; displayName: string; role?: string; roleAbility?: { role: string; abilityName: string; timing: string; description: string }; alive: boolean; eliminatedReason?: string };
    takeaway: string;
  };
  rooms: Array<{ id: string; name: string; group: string; stage: string; gamePhase: string; seatsFilled: number; seatCount: number }>;
  promptBank: Array<{ id: string; text: string; maxCharacters: number }>;
  personas: Array<{ id: string; displayName: string; description: string }>;
  lenses: Array<{ id: string; title: string; prompt: string }>;
  assumptionTags: string[];
  debriefQuestions: string[];
}

interface DetectiveState {
  scenario: { name: string; description: string; activeStage: number };
  roomIds: string[];
  businesses: DetectiveBusiness[];
  rooms: DetectiveRoomSummary[];
  activeRoom: DetectiveActiveRoom | null;
  categories: string[];
  stageGuides: Array<{ stage: number; title: string; mission: string; successCriteria: string[] }>;
  connectionPrompts: string[];
  decisionRubric: string[];
  evidence: Array<{ id: string; stage: number; title: string; type: string; summary: string; body: string; ethicalCategories: string[]; revealed: boolean }>;
  discoveries: DetectiveClaim[];
  chat: DetectiveChatMessage[];
  recommendations: DetectiveFinalClaim[];
  votes: DetectiveFundingVote[];
  takeaway: string;
}

interface DetectiveDocument {
  id: string;
  title: string;
  type: string;
  summary: string;
  body: string;
  prompts: string[];
}

interface DetectiveBusiness {
  id: string;
  roomId: string;
  name: string;
  industry: string;
  fundingAsk: string;
  investorQuestion: string;
  description: string;
  claimsToVerify: string[];
  researchTargets: string[];
  documents: DetectiveDocument[];
}

interface DetectiveRoomSummary {
  id: string;
  name: string;
  status: "lobby" | "research" | "decision" | "closed";
  business: DetectiveBusiness;
  memberCount: number;
  members: Array<{ id: string; nickname: string; isAi: boolean }>;
  claimsCount: number;
  finalClaimsCount: number;
  votes: { fund: number; reject: number; total: number };
}

interface DetectiveClaim {
  id: string;
  roomId: string;
  participantId: string;
  authorName: string;
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
  nextStep?: string;
  pointsAwarded: number;
  createdAt: string;
}

interface DetectiveChatMessage {
  id: string;
  roomId: string;
  participantId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

interface DetectiveFinalClaim {
  id: string;
  roomId: string;
  participantId: string;
  authorName: string;
  finalClaim: string;
  strongestEvidence: string;
  openQuestions?: string;
  conditions?: string;
  decision: "fund" | "reject";
  createdAt: string;
}

interface DetectiveFundingVote {
  id: string;
  roomId: string;
  participantId: string;
  voterName: string;
  vote: "fund" | "reject";
  reason: string;
  createdAt: string;
}

type DetectiveActiveRoom = DetectiveRoomSummary & {
  claims: DetectiveClaim[];
  chat: DetectiveChatMessage[];
  finalClaims: DetectiveFinalClaim[];
  votes: DetectiveFundingVote[];
  voteSummary: { fund: number; reject: number; total: number };
};

function DetectiveStepGuide({
  activeRoom,
  participantId
}: {
  activeRoom: DetectiveActiveRoom | null;
  participantId: string;
}) {
  const hasClaim = Boolean(activeRoom?.claims.some((claim) => claim.participantId === participantId));
  const hasDiscussion = Boolean(activeRoom?.chat.some((message) => message.participantId === participantId));
  const hasFinalClaim = Boolean(activeRoom?.finalClaims.some((claim) => claim.participantId === participantId));
  const hasVote = Boolean(activeRoom?.votes.some((vote) => vote.participantId === participantId));
  const steps = [
    {
      label: "Join Room",
      detail: activeRoom ? activeRoom.id : "Enter the room ID",
      done: Boolean(activeRoom),
      active: !activeRoom
    },
    {
      label: "Read Dossier",
      detail: activeRoom ? activeRoom.business.name : "Wait for your business",
      done: Boolean(activeRoom),
      active: false
    },
    {
      label: "Post Claim",
      detail: "Add one source-backed finding",
      done: hasClaim,
      active: Boolean(activeRoom && !hasClaim)
    },
    {
      label: "Discuss",
      detail: "Challenge or support a claim",
      done: hasDiscussion,
      active: Boolean(activeRoom && hasClaim && !hasDiscussion)
    },
    {
      label: "Final Vote",
      detail: "Fund or reject",
      done: hasFinalClaim || hasVote,
      active: Boolean(activeRoom && hasClaim && (hasDiscussion || activeRoom.claims.length > 2) && !hasFinalClaim && !hasVote)
    }
  ];
  const current = steps.find((step) => step.active) ?? [...steps].reverse().find((step) => step.done) ?? steps[0];

  return (
    <Surface className="detective-guide-card">
      <div>
        <p className="eyebrow">What to do now</p>
        <h2>{current?.label ?? "Join Room"}</h2>
        <p className="muted">{current?.detail ?? "Enter the room ID from your facilitator."}</p>
      </div>
      <div className="detective-step-list" aria-label="Data-Detective steps">
        {steps.map((step, index) => (
          <div key={step.label} className={`detective-step ${step.done ? "detective-step-done" : ""} ${step.active ? "detective-step-active" : ""}`}>
            <span>{index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

interface StoryState {
  inspiration: {
    genres: string[];
    settings: string[];
    themes: string[];
    emotions: string[];
    audiences: string[];
  };
  stageGuides: Array<{ stage: number; title: string; questions: string[] }>;
  roomStageGuides: Array<{ stage: number; title: string; goal: string }>;
  roomIds: string[];
  rooms: Array<{
    id: string;
    name: string;
    lane: string;
    focus: string;
    status: "lobby" | "running" | "ended";
    activeStage: number;
    stageTitle: string;
    memberCount: number;
    proposalCount: number;
    approvedProposalCount: number;
    chatCount: number;
    title: string;
    hasFinalStory: boolean;
    phaseSecondsRemaining?: number;
    workshopSecondsRemaining?: number;
  }>;
  activeRoom: {
    id: string;
    name: string;
    lane: string;
    focus: string;
    storyId: string;
    status: "lobby" | "running" | "ended";
    activeStage: number;
    stageTitle: string;
    stageGoal: string;
    startedAt?: string;
    endedAt?: string;
    stageEndsAt?: string;
    workshopEndsAt?: string;
    phaseSecondsRemaining?: number;
    workshopSecondsRemaining?: number;
    memberCount: number;
    members: Array<{ id: string; nickname: string; teamName: string }>;
    chat: Array<{ id: string; authorName: string; text: string; createdAt: string }>;
    proposals: Array<{
      id: string;
      authorName: string;
      kind: string;
      text: string;
      createdAt: string;
      approvals: number;
      reworks: number;
      status: "approved" | "needs-rework" | "open";
      votes: Array<{ participantId: string; voterName: string; vote: "approve" | "rework"; createdAt: string }>;
    }>;
    approvedIdeas: Array<{ id: string; kind: string; text: string; authorName: string; approvals: number; reworks: number }>;
    guideMessages: Array<{ id: string; requesterName: string; prompt: string; response: string; scope: "personal" | "room"; createdAt: string }>;
    title: string;
    finalText: string;
    authorshipNote: string;
  } | null;
  ethicsCheckpoints: string[];
  humanEditRequirements: string[];
  story: {
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
    revisions: Array<{ reason: string; createdAt: string }>;
    published: unknown | null;
    status: string;
  };
  stories: StoryState["story"][];
  reminder: string;
  takeaway: string;
}

interface CourtState {
  cases: Array<{ id: string; title: string; scenario: string; missingDetail: string; keyIssues: string[] }>;
  activeCaseId: string;
  questions: readonly string[];
  stakeholderLenses: string[];
  restrictionOptions: string[];
  deliberationPrompts: string[];
  durationMinutes: number;
  roomIds: string[];
  roomRounds: Array<{ round: number; title: string; goal: string; judgePrompt: string }>;
  rooms: Array<{
    id: string;
    name: string;
    docket: string;
    status: "lobby" | "debate" | "final-vote" | "ended";
    caseId: string;
    caseTitle: string;
    activeRound: number;
    roundTitle: string;
    memberCount: number;
    argumentCount: number;
    voteSummary: CourtState["results"]["final"];
    phaseSecondsRemaining?: number;
    workshopSecondsRemaining?: number;
  }>;
  activeRoom: {
    id: string;
    name: string;
    docket: string;
    status: "lobby" | "debate" | "final-vote" | "ended";
    activeRound: number;
    roundTitle: string;
    roundGoal: string;
    roundPrompt: string;
    roundEndsAt?: string;
    debateEndsAt?: string;
    finalVoteEndsAt?: string;
    phaseSecondsRemaining?: number;
    workshopSecondsRemaining?: number;
    memberCount: number;
    members: Array<{ id: string; nickname: string; teamName: string }>;
    case: { id: string; title: string; scenario: string; missingDetail: string; keyIssues: string[] };
    sealedDetailVisible: boolean;
    rounds: Array<{ round: number; title: string; goal: string; judgePrompt: string }>;
    judgeMessages: Array<{ id: string; round: number; tone: "opening" | "question" | "ruling" | "timer"; text: string; basedOnParticipantId?: string; createdAt: string }>;
    arguments: Array<{ id: string; participantId: string; authorName: string; round: number; stance: string; stakeholder: string; evidence?: string; text: string; flagged: boolean; createdAt: string }>;
    votes: Array<{ id: string; participantId: string; voterName: string; vote: string; reason: string; createdAt: string }>;
    voteSummary: CourtState["results"]["final"];
    participantVote?: { vote: string; reason: string };
  } | null;
  results: {
    initial: Record<string, number>;
    final: Record<string, number>;
    changed: number;
  };
  reasoning: Array<{ id: string; teamId: string; reasoning: string; highlighted: boolean }>;
  charter: Array<{ id: string; text: string; status: string; votes: string[] }>;
  takeaway: string;
}

export default function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}

function AppRoutes() {
  const setEvent = useSession((state) => state.setEvent);
  const setConnection = useSession((state) => state.setConnection);
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    socket.on("connect", () => setConnection("online"));
    socket.on("disconnect", () => setConnection("reconnecting"));
    socket.on("event:state", (event) => {
      setEvent(event);
      queryClient.setQueryData(["event"], event);
    });
    socket.on("announcement:new", () => {
      void queryClient.invalidateQueries({ queryKey: ["event"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });
    socket.on("timer:updated", (timer) => {
      queryClient.setQueryData<EventState>(["event"], (event) => (event ? { ...event, timerSecondsRemaining: timer.secondsRemaining, rotationEndsAt: timer.endsAt } : event));
    });
    const online = () => setConnection("online");
    const offline = () => setConnection("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("event:state");
      socket.off("announcement:new");
      socket.off("timer:updated");
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [queryClient, setConnection, setEvent]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/display" element={<PresenterModePage />} />
      <Route path="/display/live" element={<WorkshopLiveDisplayPage />} />
      <Route path="/display/whos-who/:roomId" element={<WhoWhoProjectionPage />} />
      <Route path="/display/data-detective/:roomId" element={<DataDetectiveProjectionPage />} />
      <Route path="/display/storibloom/:roomId" element={<StoribloomProjectionPage />} />
      <Route path="/display/kurami-court/:roomId" element={<KuramiCourtProjectionPage />} />
      <Route path="/display/summary" element={<EventSummaryPage />} />
      <Route path="/hub" element={<HubPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/badges" element={<BadgesPage />} />
      <Route path="/closing" element={<ClosingPage />} />
      <Route path="/whos-who" element={<WhoWhoPage />} />
      <Route path="/whos-who/room/:roomId" element={<WhoWhoPage />} />
      <Route path="/data-detective" element={<DataDetectivePage />} />
      <Route path="/data-detective/room/:roomId" element={<DataDetectivePage />} />
      <Route path="/data-detective/investigation/:teamId" element={<DataDetectivePage />} />
      <Route path="/storibloom" element={<StoribloomPage />} />
      <Route path="/storibloom/story/:storyId" element={<StoribloomPage />} />
      <Route path="/storibloom/gallery" element={<StoryGalleryPage />} />
      <Route path="/kurami-court" element={<KuramiCourtPage />} />
      <Route path="/kurami-court/case/:caseId" element={<KuramiCourtPage />} />
      <Route path="/charter" element={<CharterPage />} />
      <Route path="/facilitator/login" element={<FacilitatorLoginPage />} />
      <Route path="/facilitator" element={<FacilitatorDashboardPage />} />
      <Route path="/facilitator/:section" element={<FacilitatorDashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function PageShell({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className="min-h-screen bg-midnight text-ivory">
      <TopNav />
      <main className={compact ? "mx-auto w-full max-w-5xl px-4 pb-12 pt-6" : "mx-auto w-full max-w-7xl px-4 pb-12 pt-6"}>{children}</main>
    </div>
  );
}

function TopNav() {
  const participant = useSession((state) => state.participant);
  const connection = useSession((state) => state.connection);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-midnight/88 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3" aria-label="Primary">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-black tracking-normal">
          <span className="brand-mark" aria-hidden="true">
            <Lightbulb size={22} strokeWidth={2.8} />
          </span>
          {EVENT_NAME}
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          <NavItem to="/hub">Hub</NavItem>
          <NavItem to="/leaderboard">Leaderboard</NavItem>
          <NavItem to="/charter">Charter</NavItem>
          <NavItem to="/facilitator">Facilitator</NavItem>
        </div>
        <div className="flex items-center gap-2">
          {participant ? <StatusPill tone="good">{participant.group}</StatusPill> : null}
          <ConnectionPill connection={connection} />
        </div>
      </nav>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
      {children}
    </NavLink>
  );
}

function ConnectionPill({ connection }: { connection: "online" | "reconnecting" | "offline" }) {
  if (connection === "offline") {
    return (
      <StatusPill tone="danger">
        <WifiOff size={14} /> Offline
      </StatusPill>
    );
  }
  if (connection === "reconnecting") {
    return (
      <StatusPill tone="warn">
        <Wifi size={14} /> Reconnecting
      </StatusPill>
    );
  }
  return (
    <StatusPill tone="good">
      <Wifi size={14} /> Live
    </StatusPill>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen bg-midnight text-ivory">
      <section className="hero-scene">
        <TopNav />
        <div className="hero-content">
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="eyebrow">
            Live responsible AI arena
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            Kurami.AI
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="hero-copy">
            Students step into four fast-moving rooms: social deduction, investor investigation, AI-guided story creation, and courtroom debate. Every choice turns into evidence, votes, and a class artifact.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="flex flex-wrap gap-3">
            <Link to="/join" className="button button-primary button-large">
              <Sparkles size={20} /> Join Event
            </Link>
            <Link className="button button-quiet button-large" to="/facilitator/login">
              <ShieldCheck size={20} /> Facilitator
            </Link>
            <Link className="button button-quiet button-large" to="/privacy">
              <ShieldCheck size={20} /> Privacy
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="hero-badges" aria-label="Event format">
            <span>4 main rooms</span>
            <span>8 split rooms for research and stories</span>
            <span>Live votes and artifacts</span>
          </motion.div>
        </div>
        <div className="world-strip" aria-label="Workshop worlds">
          {workshopOrder.map((id) => (
            <Link key={id} to={WORKSHOPS[id].route} className={`world-tile world-${id}`}>
              <span>{WORKSHOPS[id].name}</span>
              <small>{WORKSHOPS[id].identity.tagline}</small>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function JoinPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setParticipant = useSession((state) => state.setParticipant);
  const setEvent = useSession((state) => state.setEvent);
  const toast = useToast();
  const returnTo = safeReturnTo(location.search);
  const [eventCode, setEventCode] = useState("ETHICS2026");
  const [nickname, setNickname] = useState("");
  const [accepted, setAccepted] = useState(false);
  const mutation = useMutation({
    mutationFn: () => api.join({ eventCode, nickname, acceptedResponsibleUse: true, restoreSessionId: localStorage.getItem("rai_session_id") ?? undefined }),
    onSuccess: (result) => {
      localStorage.setItem("rai_session_id", result.participant.sessionId);
      setParticipant(result.participant);
      setEvent(result.event);
      toast({ tone: "success", message: `Joined ${result.participant.teamName}.` });
      navigate(returnTo);
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!accepted) return;
    mutation.mutate();
  }

  return (
    <PageShell compact>
      <div className="two-column">
        <Surface>
          <p className="eyebrow">Student entry</p>
          <h1 className="page-title">Enter your room ready.</h1>
          <p className="muted">Use the event code from your facilitator. You can use a nickname or stay anonymous with an automatic Student name.</p>
          <form onSubmit={submit} className="form-stack">
            <div>
              <FieldLabel htmlFor="event-code">Event code</FieldLabel>
              <input id="event-code" value={eventCode} onChange={(event) => setEventCode(event.target.value)} className="input" autoComplete="off" />
            </div>
            <div>
              <FieldLabel htmlFor="nickname">Nickname optional</FieldLabel>
              <input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} className="input" autoComplete="nickname" maxLength={24} placeholder="Blank becomes Student 1" />
            </div>
            <label className="check-row">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
              <span>I will not enter private or sensitive personal information, and I understand that workshop data is temporary.</span>
            </label>
            <Button type="submit" disabled={!accepted || mutation.isPending}>
              <ChevronRight size={18} /> {mutation.isPending ? "Joining" : "Enter Hub"}
            </Button>
            {mutation.error ? <p className="error-text">{mutation.error.message}</p> : null}
          </form>
        </Surface>
        <div className="notice-panel">
          <ShieldCheck size={32} />
          <h2>Before you enter</h2>
          <p>Your nickname, anonymous session, group, team, answers, votes, points, and badges are stored for this event. Facilitators can delete event data.</p>
          <p>Do not enter legal names, contact details, medical details, financial details, or sensitive personal stories.</p>
          <Link className="button button-quiet" to="/facilitator/login">
            <ShieldCheck size={18} /> Facilitator login
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

function HubPage() {
  const participant = useSession((state) => state.participant);
  const storedEvent = useSession((state) => state.event);
  const setEvent = useSession((state) => state.setEvent);
  const { data: event = storedEvent } = useQuery({ queryKey: ["event"], queryFn: api.eventState, refetchInterval: 10_000 });

  useEffect(() => {
    if (event) setEvent(event);
  }, [event, setEvent]);

  if (!participant) return <Navigate to="/join" replace />;
  if (!event) return <PageShell>Loading event...</PageShell>;

  const suggestedWorkshopId = currentWorkshopForGroup(participant.group, event.currentRotation);
  const suggestedWorkshop = WORKSHOPS[suggestedWorkshopId];
  const suggestedDuration = suggestedWorkshopId === "kurami-court" ? 30 : WORKSHOP_DURATION_MINUTES;

  return (
    <PageShell>
      <section className="hub-hero">
        <div>
          <p className="eyebrow">Event hub</p>
          <h1>{participant.nickname}</h1>
          <p>
            {participant.group} group · {participant.teamName}
          </p>
        </div>
        <div className="timer-block" aria-label="Workshop countdown">
          <Clock size={26} />
          <strong>{formatSeconds(event.timerSecondsRemaining)}</strong>
          <span>{event.status === "paused" ? "Paused" : `Rotation ${event.currentRotation}`}</span>
        </div>
      </section>

      {event.announcement ? (
        <div className="announcement">
          <Megaphone size={20} />
          <span>{event.announcement}</span>
        </div>
      ) : null}

      <section className="portal-grid" aria-label="Workshop portals">
        {workshopOrder.map((workshopId) => {
          const state = portalStateForWorkshop({
            workshopId,
            group: participant.group,
            currentRotation: event.currentRotation,
            status: event.status,
            completedWorkshops: participant.completedWorkshops,
            settings: event.settings
          });
          return <WorkshopPortal key={workshopId} workshopId={workshopId} state={state} suggested={workshopId === suggestedWorkshopId} />;
        })}
      </section>

      <section className="stats-row">
        <Metric label="Points" value={participant.points.toString()} icon={<Award size={22} />} />
        <Metric label="Badges" value={participant.badges.length.toString()} icon={<BadgeCheck size={22} />} />
        <Metric label="Current length" value={`${suggestedDuration} min`} icon={<Clock size={22} />} />
        <Metric label="Suggested" value={suggestedWorkshop.shortName} icon={<Network size={22} />} />
      </section>
    </PageShell>
  );
}

function WorkshopPortal({ workshopId, state, suggested }: { workshopId: WorkshopId; state: PortalState; suggested: boolean }) {
  const workshop = WORKSHOPS[workshopId];
  const locked = state === "locked" || state === "paused";
  const durationMinutes = workshopId === "kurami-court" ? 30 : WORKSHOP_DURATION_MINUTES;
  return (
    <article className={`portal portal-${workshopId} ${suggested ? "portal-active" : ""}`}>
      <div className="portal-topline">
        <StatusPill tone={state === "available" ? "good" : state === "completed" ? "neutral" : state === "paused" ? "warn" : "danger"}>
          {state === "locked" ? <Lock size={14} /> : state === "paused" ? <Pause size={14} /> : state === "available" ? <Unlock size={14} /> : <Check size={14} />}
          {workshopPortalLabel(state)}
        </StatusPill>
        {suggested ? <StatusPill tone="warn">Suggested</StatusPill> : null}
      </div>
      <h2>{workshop.name}</h2>
      <p>{workshop.identity.tagline}</p>
      <span className="duration-note">
        <Clock size={15} /> {durationMinutes}-minute workshop
      </span>
      <Link className={`button ${locked ? "button-disabled" : "button-primary"}`} to={locked ? "/hub" : workshop.route} aria-disabled={locked}>
        <ChevronRight size={18} /> Enter Workshop
      </Link>
    </article>
  );
}

function WhoWhoRules({ game }: { game: WhoWhoState["room"]["game"] }) {
  return (
    <div className="mafia-rule-list">
      <div>
        <strong>Round</strong>
        <p>{game.roundRule}</p>
      </div>
      <div>
        <strong>Win</strong>
        <p>{game.winRule}</p>
      </div>
      <div>
        <strong>Game master</strong>
        <p>{game.facilitatorControl}</p>
      </div>
    </div>
  );
}

function WhoWhoPage() {
  const participant = useRequiredParticipant();
  const params = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data } = useQuery({ queryKey: ["workshop", "whos-who", participant.id], queryFn: () => api.workshopState<WhoWhoState>("whos-who", participant.id), refetchInterval: 7_000 });
  const [roomCode, setRoomCode] = useState(() => params.roomId ?? (typeof window === "undefined" ? "" : window.sessionStorage.getItem("kurami_whos_who_room") ?? ""));
  const [chatText, setChatText] = useState("");
  const [accuseIdentityId, setAccuseIdentityId] = useState("");
  const [accuseReason, setAccuseReason] = useState("");
  const [roleTargetIdentityId, setRoleTargetIdentityId] = useState("");
  const now = useNow();

  useEffect(() => {
    if (!roomCode && data?.room.id) setRoomCode(data.room.id);
  }, [data?.room.id, roomCode]);

  const joinRoom = useMutation({
    mutationFn: () => api.whoWhoJoinRoom(normalizeWhoWhoRoomId(roomCode), participant.id),
    onSuccess: () => {
      if (typeof window !== "undefined") window.sessionStorage.setItem("kurami_whos_who_room", normalizeWhoWhoRoomId(roomCode));
      setRoomCode(normalizeWhoWhoRoomId(roomCode));
      toast({ tone: "success", message: "Room joined. Your cover name is live." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "whos-who", participant.id] });
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast({ tone: "error", message });
      if (message.toLowerCase().includes("session expired")) {
        localStorage.removeItem("rai_session_id");
        localStorage.removeItem("rai_participant");
        window.location.assign("/join");
      }
    }
  });

  const chatMutation = useMutation({
    mutationFn: () =>
      api.whoWhoChat(data?.room.id ?? roomCode, {
        participantId: participant.id,
        text: chatText
      }),
    onSuccess: () => {
      setChatText("");
      toast({ tone: "success", message: "Message sent." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "whos-who", participant.id] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });

  const accuseMutation = useMutation({
    mutationFn: (identityId: string) =>
      api.whoWhoAccuse(data?.room.id ?? roomCode, {
        participantId: participant.id,
        identityId,
        reason: accuseReason
      }),
    onSuccess: () => {
      setAccuseReason("");
      toast({ tone: "success", message: "Accusation locked." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "whos-who", participant.id] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });

  const roleAbilityMutation = useMutation({
    mutationFn: (targetIdentityId: string) =>
      api.whoWhoAbility(data?.room.id ?? roomCode, {
        participantId: participant.id,
        targetIdentityId
      }),
    onSuccess: () => {
      toast({ tone: "success", message: "Role power used." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "whos-who", participant.id] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });

  if (!data) return <PageShell>Loading Who's Who...</PageShell>;
  const { room } = data;
  const player = room.currentPlayer;
  const phaseLabel = room.game.phase === "lobby" ? "Waiting" : room.game.phase === "chat" ? "Day discussion" : room.game.phase === "vote" ? "Night accusations" : room.game.phase === "resolve" ? "Resolve vote" : "Ended";
  const phaseSeconds = secondsUntil(room.game.phaseEndsAt, now) ?? room.game.phaseSecondsRemaining;
  const workshopSeconds = secondsUntil(room.game.workshopEndsAt, now) ?? room.game.workshopSecondsRemaining;
  const aliveTargets = room.identities.filter((identity) => identity.joined && identity.alive && identity.id !== player?.id);
  const selectedAccuseIdentity = accuseIdentityId || aliveTargets[0]?.id || "";
  const canChat = Boolean(player?.alive && room.game.phase === "chat");
  const canAccuse = Boolean(player?.alive && selectedAccuseIdentity && room.game.phase === "vote");
  const roleAbility = player?.roleAbility ?? room.roleAbilities.find((ability) => ability.role === player?.role);
  const roleTargets = room.identities.filter((identity) => identity.joined && identity.alive);
  const selectedRoleTarget = roleTargetIdentityId || roleTargets[0]?.id || "";
  const roleUsedThisRound = Boolean(player && room.abilityUses.some((use) => use.roundId === room.roundId && use.actorIdentityId === player.id));
  const roleNeedsDay = roleAbility?.role === "Archivist";
  const roleNeedsNight = roleAbility ? ["Skeptic", "Protector", "Strategist"].includes(roleAbility.role) : false;
  const rolePhaseAllowed = Boolean(roleAbility && ((roleNeedsDay && room.game.phase === "chat") || (roleNeedsNight && room.game.phase === "vote") || (!roleNeedsDay && !roleNeedsNight && (room.game.phase === "chat" || room.game.phase === "vote"))));
  const canUseRole = Boolean(player?.alive && roleAbility && selectedRoleTarget && !roleUsedThisRound && rolePhaseAllowed);
  const visibleRoleUses = room.abilityUses.filter((use) => use.actorIdentityId === player?.id || use.isPublic);
  const roleStatus = !roleAbility ? "No role" : roleUsedThisRound ? "Used" : rolePhaseAllowed ? "Ready" : "Locked";
  const roleHelp = !roleAbility ? "Join the room and wait for the game to start." : roleUsedThisRound ? "You can use one role power each round." : rolePhaseAllowed ? roleAbility.description : `${roleAbility.abilityName} works during ${roleAbility.timing}.`;

  return (
    <WorkshopShell workshopId="whos-who" icon={<Eye size={24} />} title={room.name} kicker={`Room ${room.id} · AI mafia`}>
      <Surface className="mafia-join-card">
        <div>
          <p className="eyebrow">Who's Who live room</p>
          <h2>Enter your room ID</h2>
          <p className="muted">The facilitator gives the room ID. The game runs on a 45-minute clock: Day is for discussion, Night is for accusations, then the game master resolves the vote.</p>
        </div>
        <form
          className="mafia-room-form"
          onSubmit={(event) => {
            event.preventDefault();
            joinRoom.mutate();
          }}
        >
          <label>
            <span className="field-label">Room ID</span>
            <input className="input" value={roomCode} onChange={(event) => setRoomCode(event.target.value)} onBlur={() => setRoomCode(normalizeWhoWhoRoomId(roomCode))} placeholder="gold-alpha" autoCapitalize="none" />
          </label>
          <Button type="submit" disabled={normalizeWhoWhoRoomId(roomCode).length < 3 || joinRoom.isPending}>
            <Play size={18} /> Join Room
          </Button>
        </form>
        <div className="mafia-status-strip" aria-label="Room status">
          <div>
            <span>Seats</span>
            <strong>
              {room.game.seatsFilled}/{room.game.seatCount}
            </strong>
          </div>
          <div>
            <span>Phase</span>
            <strong>{phaseLabel}</strong>
          </div>
          <div>
            <span>Round</span>
            <strong>{room.game.roundNumber}</strong>
          </div>
          <div>
            <span>Phase clock</span>
            <strong>{typeof phaseSeconds === "number" ? formatSeconds(phaseSeconds) : "Manual"}</strong>
          </div>
          <div>
            <span>Game clock</span>
            <strong>{typeof workshopSeconds === "number" ? formatSeconds(workshopSeconds) : `${WORKSHOP_DURATION_MINUTES}:00`}</strong>
          </div>
          <div>
            <span>Alive humans</span>
            <strong>{room.game.humansAlive}</strong>
          </div>
        </div>
      </Surface>

      <section className="mafia-layout">
        <div className="mafia-main">
          <Surface className={player && !player.alive ? "mafia-self-card mafia-eliminated" : "mafia-self-card"}>
            <div>
              <p className="eyebrow">{player ? "Your cover" : "Waiting for room"}</p>
              <h2>{player?.displayName ?? "Join the assigned room"}</h2>
              <p>{player ? player.role ?? "Role assigned by the game" : "You will receive a random cover name and role after joining."}</p>
            </div>
            <StatusPill tone={player?.alive ? "good" : player ? "danger" : "warn"}>{player?.alive ? "Alive" : player ? "Taken out" : "Not seated"}</StatusPill>
            {player && !player.alive ? <p className="muted">Your screen is greyed out, but you can still watch the chat and results.</p> : null}
            {room.game.winner ? <p className="takeaway">{room.game.winner === "humans" ? "Humans found the hidden AI." : "AI survived the room."}</p> : null}
          </Surface>

          <Surface className="mafia-role-card">
            <div className="surface-title-row">
              <div>
                <p className="eyebrow">{player?.role ?? "Role pending"}</p>
                <h2>{roleAbility?.abilityName ?? "Role power"}</h2>
              </div>
              <StatusPill tone={canUseRole ? "good" : roleUsedThisRound ? "neutral" : "warn"}>{roleStatus}</StatusPill>
            </div>
            <p className="muted">{roleHelp}</p>
            {roleAbility ? (
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  roleAbilityMutation.mutate(selectedRoleTarget);
                }}
              >
                <label>
                  <span className="field-label">Target</span>
                  <select className="select" value={selectedRoleTarget} onChange={(event) => setRoleTargetIdentityId(event.target.value)} disabled={!rolePhaseAllowed || roleUsedThisRound}>
                    {roleTargets.map((identity) => (
                      <option key={identity.id} value={identity.id}>
                        {identity.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <Button type="submit" disabled={!canUseRole || roleAbilityMutation.isPending}>
                  <Sparkles size={18} /> Use Role
                </Button>
              </form>
            ) : null}
            <div className="mafia-ability-list">
              {visibleRoleUses.length === 0 ? <p className="muted">Role clues and public role effects will appear here.</p> : null}
              {visibleRoleUses.map((use) => (
                <article key={use.id} className={`mafia-ability-use ${use.isPublic ? "mafia-ability-public" : ""}`}>
                  <strong>
                    {use.abilityName} · {use.targetDisplayName}
                  </strong>
                  <p>{use.result}</p>
                </article>
              ))}
            </div>
          </Surface>

          <Surface>
            <div className="surface-title-row">
              <h2>Room seats</h2>
              <StatusPill tone={room.game.ready ? "good" : "warn"}>
                {room.game.seatsFilled}/{room.game.seatCount} filled
              </StatusPill>
            </div>
            <div className="mafia-seat-grid">
              {room.identities.map((identity, index) => (
                <div key={identity.id} className={`mafia-seat ${identity.joined ? "mafia-seat-filled" : ""} ${identity.alive ? "" : "mafia-seat-dead"} ${identity.id === player?.id ? "mafia-seat-self" : ""}`}>
                  <span>{index + 1}</span>
                  <strong>{identity.displayName}</strong>
                  <small>{identity.joined ? (identity.alive ? "alive" : "taken out") : "open"}</small>
                </div>
              ))}
            </div>
          </Surface>

          <Surface>
            <div className="surface-title-row">
              <h2>Day discussion</h2>
              <StatusPill tone={canChat ? "good" : "warn"}>{canChat ? "Day is open" : "Day locked"}</StatusPill>
            </div>
            <div className="mafia-chat-feed" aria-live="polite">
              {room.chat.length === 0 ? <p className="muted">Messages appear here once the game master starts the room.</p> : null}
              {room.chat.map((message) => (
                <article key={message.id} className={`mafia-chat-message ${message.identityId === player?.id ? "mafia-chat-self" : ""}`}>
                  <strong>{message.displayName}</strong>
                  <p>{message.text}</p>
                </article>
              ))}
            </div>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              chatMutation.mutate();
            }}
          >
              <textarea className="textarea" value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder={canChat ? "Share a clue, defend yourself, or ask someone to explain their read." : "Day discussion is locked. Watch until the next Day."} maxLength={360} rows={3} disabled={!canChat} />
            <Button type="submit" disabled={!canChat || chatText.trim().length < 1 || chatMutation.isPending}>
              <Send size={18} /> Send
            </Button>
          </form>
        </Surface>
        </div>

        <aside className="mafia-side">
          <Surface className="mafia-rules-card">
            <h2>How rounds move</h2>
            <WhoWhoRules game={room.game} />
          </Surface>

          <Surface>
            <div className="surface-title-row">
              <h2>Night accusations</h2>
              <StatusPill tone={canAccuse ? "good" : "warn"}>{canAccuse ? "Night is open" : "Night locked"}</StatusPill>
            </div>
            <form
              className="form-stack"
              onSubmit={(event) => {
                event.preventDefault();
                accuseMutation.mutate(selectedAccuseIdentity);
              }}
            >
              <label>
                <span className="field-label">Suspect</span>
                <select className="select" value={selectedAccuseIdentity} onChange={(event) => setAccuseIdentityId(event.target.value)} disabled={!canAccuse}>
                  {aliveTargets.map((identity) => (
                    <option key={identity.id} value={identity.id}>
                      {identity.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <textarea className="textarea" value={accuseReason} onChange={(event) => setAccuseReason(event.target.value)} placeholder={canAccuse ? "What did they say during Day that feels AI-made?" : "Accusations open at Night."} rows={4} disabled={!canAccuse} />
              <Button type="submit" disabled={!canAccuse || accuseReason.trim().length < 2 || accuseMutation.isPending}>
                <Vote size={18} /> Accuse
              </Button>
            </form>
            <div className="vote-bars">
              {room.votesByIdentity.filter((vote) => vote.votes > 0).length === 0 ? <p className="muted">Accusations will appear here.</p> : null}
              {room.votesByIdentity
                .filter((vote) => vote.votes > 0)
                .map((vote) => (
                  <div key={vote.identityId} className="bar-line">
                    <span>{vote.displayName}</span>
                    <meter min={0} max={Math.max(1, room.votesByIdentity.reduce((sum, item) => sum + item.votes, 0))} value={vote.votes} />
                    <strong>{vote.votes}</strong>
                  </div>
                ))}
            </div>
          </Surface>

          <Surface>
            <h2>Game log</h2>
            <div className="mafia-event-list">
              {room.gameEvents.map((event) => (
                <article key={event.id} className={`mafia-event mafia-event-${event.tone}`}>
                  <p>{event.message}</p>
                </article>
              ))}
            </div>
          </Surface>

          {room.identities.some((identity) => typeof identity.isAi === "boolean") ? (
            <Surface>
              <h2>Reveal</h2>
              <div className="identity-grid">
                {room.identities
                  .filter((identity) => identity.joined)
                  .map((identity) => (
                    <div key={identity.id} className={identity.isAi ? "identity-ai" : "identity-human"}>
                      <strong>{identity.displayName}</strong>
                      <span>{identity.isAi ? "AI classmate" : "Human player"}</span>
                    </div>
                  ))}
              </div>
            </Surface>
          ) : null}
        </aside>
      </section>
    </WorkshopShell>
  );
}

function WhoWhoProjectionPage() {
  const { roomId = "gold-alpha" } = useParams();
  const { data: room } = useQuery({ queryKey: ["display", "whos-who", roomId], queryFn: () => api.whoWhoRoom<WhoWhoState["room"]>(roomId), refetchInterval: 3_000 });
  const now = useNow();

  if (!room) return <PageShell>Loading Who's Who room...</PageShell>;
  const phaseLabel = room.game.phase === "lobby" ? "Waiting for start" : room.game.phase === "chat" ? "Day discussion" : room.game.phase === "vote" ? "Night accusations" : room.game.phase === "resolve" ? "Resolve vote" : "Game ended";
  const phaseSeconds = secondsUntil(room.game.phaseEndsAt, now) ?? room.game.phaseSecondsRemaining;
  const workshopSeconds = secondsUntil(room.game.workshopEndsAt, now) ?? room.game.workshopSecondsRemaining;
  const liveVotes = room.votesByIdentity.filter((vote) => vote.votes > 0);

  return (
    <PageShell>
      <section className="display-hero mafia-display-hero">
        <div>
          <p className="eyebrow">Who's Who live</p>
          <h1>{room.name}</h1>
          <p>Room ID {room.id}</p>
        </div>
        <div className="timer-block">
          <span>{phaseLabel}</span>
          <strong>{typeof phaseSeconds === "number" ? formatSeconds(phaseSeconds) : "Ready"}</strong>
          <small>
            {room.game.seatsFilled}/{room.game.seatCount} seats · {typeof workshopSeconds === "number" ? formatSeconds(workshopSeconds) : `${WORKSHOP_DURATION_MINUTES}:00`} game
          </small>
        </div>
      </section>
      <section className="mafia-projection-grid">
        <Surface className="mafia-rules-card">
          <div className="surface-title-row">
            <h2>How this round works</h2>
            <StatusPill tone={room.game.winner ? "good" : "warn"}>Round {room.game.roundNumber}</StatusPill>
          </div>
          <WhoWhoRules game={room.game} />
        </Surface>
        <Surface>
          <div className="surface-title-row">
            <h2>Current room</h2>
            <StatusPill tone={room.game.phase === "ended" ? "neutral" : room.game.ready ? "good" : "warn"}>{phaseLabel}</StatusPill>
          </div>
          <div className="mafia-seat-grid mafia-seat-grid-display">
            {room.identities.map((identity, index) => (
              <div key={identity.id} className={`mafia-seat ${identity.joined ? "mafia-seat-filled" : ""} ${identity.alive ? "" : "mafia-seat-dead"}`}>
                <span>{index + 1}</span>
                <strong>{identity.displayName}</strong>
                <small>{identity.joined ? (identity.alive ? "alive" : "taken out") : "open"}</small>
              </div>
            ))}
          </div>
        </Surface>
        <Surface>
          <h2>Live chat</h2>
          <div className="mafia-chat-feed mafia-chat-feed-display">
            {room.chat.slice(-10).map((message) => (
              <article key={message.id} className="mafia-chat-message">
                <strong>{message.displayName}</strong>
                <p>{message.text}</p>
              </article>
            ))}
            {room.chat.length === 0 ? <p className="muted">Waiting for the first clue.</p> : null}
          </div>
        </Surface>
        <Surface>
          <h2>Accusations</h2>
          <div className="vote-bars">
            {liveVotes.length === 0 ? <p className="muted">No accusations yet.</p> : null}
            {liveVotes.map((vote) => (
              <div key={vote.identityId} className="bar-line">
                <span>{vote.displayName}</span>
                <meter min={0} max={Math.max(1, liveVotes.reduce((sum, item) => sum + item.votes, 0))} value={vote.votes} />
                <strong>{vote.votes}</strong>
              </div>
            ))}
          </div>
        </Surface>
        <Surface>
          <h2>Role effects</h2>
          <div className="mafia-ability-list">
            {room.abilityUses.filter((use) => use.isPublic).length === 0 ? <p className="muted">Public role effects will appear here.</p> : null}
            {room.abilityUses
              .filter((use) => use.isPublic)
              .slice(-6)
              .map((use) => (
                <article key={use.id} className="mafia-ability-use mafia-ability-public">
                  <strong>{use.abilityName}</strong>
                  <p>{use.result}</p>
                </article>
              ))}
          </div>
        </Surface>
        <Surface>
          <h2>Game log</h2>
          <div className="mafia-event-list">
            {room.gameEvents.slice(0, 8).map((event) => (
              <article key={event.id} className={`mafia-event mafia-event-${event.tone}`}>
                <p>{event.message}</p>
              </article>
            ))}
          </div>
        </Surface>
      </section>
    </PageShell>
  );
}

function DataDetectiveProjectionPage() {
  const { roomId = "venture-north" } = useParams();
  const { data } = useQuery({ queryKey: ["display", "data-detective", roomId], queryFn: () => api.workshopState<DetectiveState>("data-detective"), refetchInterval: 3_000 });

  if (!data) return <PageShell>Loading Data-Detective room...</PageShell>;
  const room = data.rooms.find((item) => item.id === normalizeDetectiveRoomId(roomId)) ?? data.rooms[0];
  if (!room) return <PageShell>No detective rooms found.</PageShell>;
  const claims = data.discoveries.filter((claim) => claim.roomId === room.id);
  const chat = data.chat.filter((message) => message.roomId === room.id);
  const finalClaims = data.recommendations.filter((claim) => claim.roomId === room.id);
  const votes = data.votes.filter((vote) => vote.roomId === room.id);
  const fundVotes = votes.filter((vote) => vote.vote === "fund").length;
  const rejectVotes = votes.filter((vote) => vote.vote === "reject").length;

  return (
    <PageShell>
      <section className="display-hero detective-display-hero">
        <div>
          <p className="eyebrow">Data-Detective live</p>
          <h1>{room.business.name}</h1>
          <p>
            Room ID {room.id} · {room.business.industry}
          </p>
        </div>
        <div className="timer-block">
          <span>Funding vote</span>
          <strong>
            {fundVotes}/{rejectVotes}
          </strong>
          <small>fund / reject · {claims.length} claims · {room.memberCount} joined</small>
        </div>
      </section>
      <section className="mafia-projection-grid">
        <Surface>
          <h2>Investor question</h2>
          <p>{room.business.investorQuestion}</p>
          <div className="tag-row">
            {room.business.claimsToVerify.map((claim) => (
              <span key={claim} className="tag">
                {claim}
              </span>
            ))}
          </div>
        </Surface>
        <Surface>
          <h2>Vote board</h2>
          <div className="vote-bars">
            <div className="bar-line">
              <span>Fund</span>
              <meter min={0} max={Math.max(1, votes.length)} value={fundVotes} />
              <strong>{fundVotes}</strong>
            </div>
            <div className="bar-line">
              <span>Reject</span>
              <meter min={0} max={Math.max(1, votes.length)} value={rejectVotes} />
              <strong>{rejectVotes}</strong>
            </div>
          </div>
        </Surface>
        <Surface>
          <h2>Live claims</h2>
          <div className="response-list">
            {claims.slice(-6).map((claim) => (
              <article key={claim.id} className="evidence-item detective-claim">
                <strong>{claim.claim}</strong>
                <p>{claim.finding}</p>
                <small>
                  {claim.authorName} · {claim.stance.replaceAll("-", " ")}
                </small>
              </article>
            ))}
            {claims.length === 0 ? <p className="muted">Waiting for claims.</p> : null}
          </div>
        </Surface>
        <Surface>
          <h2>Room discussion</h2>
          <div className="mafia-chat-feed mafia-chat-feed-display">
            {chat.slice(-8).map((message) => (
              <article key={message.id} className="mafia-chat-message">
                <strong>{message.authorName}</strong>
                <p>{message.text}</p>
              </article>
            ))}
            {chat.length === 0 ? <p className="muted">Waiting for discussion.</p> : null}
          </div>
        </Surface>
        <Surface>
          <h2>Final claims</h2>
          <div className="response-list">
            {finalClaims.slice(-5).map((claim) => (
              <article key={claim.id} className="evidence-item detective-final-claim">
                <strong>{claim.decision === "fund" ? "Fund" : "Reject"}</strong>
                <p>{claim.finalClaim}</p>
                <small>{claim.authorName}</small>
              </article>
            ))}
            {finalClaims.length === 0 ? <p className="muted">No final claims yet.</p> : null}
          </div>
        </Surface>
      </section>
    </PageShell>
  );
}

function StoribloomProjectionPage() {
  const { roomId = "bloom-alpha" } = useParams();
  const now = useNow();
  const { data } = useQuery({ queryKey: ["display", "storibloom", roomId], queryFn: () => api.workshopState<StoryState>("storibloom"), refetchInterval: 3_000 });

  if (!data) return <PageShell>Loading Storibloom room...</PageShell>;
  const normalizedRoomId = normalizeStoryRoomId(roomId);
  const roomSummary = data.rooms.find((item) => item.id === normalizedRoomId) ?? data.rooms[0];
  const activeRoom = data.activeRoom?.id === normalizedRoomId ? data.activeRoom : null;
  const room = roomSummary ?? activeRoom;
  if (!room) return <PageShell>No Storibloom rooms found.</PageShell>;
  const phaseSeconds = secondsUntil(activeRoom?.stageEndsAt, now) ?? room.phaseSecondsRemaining;
  const workshopSeconds = secondsUntil(activeRoom?.workshopEndsAt, now) ?? room.workshopSecondsRemaining;
  const proposals = activeRoom?.proposals ?? [];
  const approvedIdeas = activeRoom?.approvedIdeas ?? [];
  const guideMessages = activeRoom?.guideMessages ?? [];
  const chat = activeRoom?.chat ?? [];
  const stageTitle = activeRoom?.stageTitle ?? room.stageTitle;
  const stageGoal = activeRoom?.stageGoal ?? data.roomStageGuides.find((guide) => guide.stage === room.activeStage)?.goal ?? "Students are building and revising the story together.";
  const proposalCount = roomSummary?.proposalCount ?? proposals.length;
  const approvedProposalCount = roomSummary?.approvedProposalCount ?? approvedIdeas.length;
  const chatCount = roomSummary?.chatCount ?? chat.length;

  return (
    <PageShell>
      <section className="display-hero storibloom-display-hero">
        <div>
          <p className="eyebrow">Storibloom live</p>
          <h1>{room.name}</h1>
          <p>
            Room ID {room.id} · {room.lane}
          </p>
        </div>
        <div className="timer-block">
          <span>{room.status === "lobby" ? "Waiting for facilitator" : room.status === "ended" ? "Story saved" : `Stage ${room.activeStage}: ${stageTitle}`}</span>
          <strong>{typeof phaseSeconds === "number" ? formatSeconds(phaseSeconds) : room.status === "lobby" ? "Ready" : "Manual"}</strong>
          <small>
            {room.memberCount} joined · {typeof workshopSeconds === "number" ? formatSeconds(workshopSeconds) : `${WORKSHOP_DURATION_MINUTES}:00`} workshop
          </small>
        </div>
      </section>
      <section className="mafia-projection-grid">
        <Surface>
          <div className="surface-title-row">
            <h2>Story Focus</h2>
            <StatusPill tone={room.status === "running" ? "good" : room.status === "ended" ? "neutral" : "warn"}>{room.status}</StatusPill>
          </div>
          <p>{room.focus}</p>
          <p className="story-focus">{stageGoal}</p>
        </Surface>
        <Surface>
          <h2>Room Progress</h2>
          <div className="mafia-master-summary">
            <div>
              <span>Members</span>
              <strong>{room.memberCount}</strong>
            </div>
            <div>
              <span>Ideas</span>
              <strong>{proposalCount}</strong>
            </div>
            <div>
              <span>Approved</span>
              <strong>{approvedProposalCount}</strong>
            </div>
            <div>
              <span>Chat</span>
              <strong>{chatCount}</strong>
            </div>
          </div>
        </Surface>
        <Surface>
          <h2>Boardroom Chat</h2>
          <div className="mafia-chat-feed mafia-chat-feed-display">
            {chat.slice(-8).map((message) => (
              <article key={message.id} className="mafia-chat-message">
                <strong>{message.authorName}</strong>
                <p>{message.text}</p>
              </article>
            ))}
            {chat.length === 0 ? <p className="muted">Waiting for the room discussion.</p> : null}
          </div>
        </Surface>
        <Surface>
          <h2>Idea Vote Board</h2>
          <div className="story-proposal-list">
            {proposals.slice(-6).map((proposal) => (
              <article key={proposal.id} className={`story-proposal story-proposal-${proposal.status}`}>
                <div className="surface-title-row">
                  <strong>{STORY_PROPOSAL_KINDS.find((kind) => kind.id === proposal.kind)?.label ?? proposal.kind}</strong>
                  <StatusPill tone={proposal.status === "approved" ? "good" : proposal.status === "needs-rework" ? "warn" : "neutral"}>
                    {proposal.approvals}/{proposal.reworks}
                  </StatusPill>
                </div>
                <p>{proposal.text}</p>
                <small>{proposal.authorName}</small>
              </article>
            ))}
            {proposals.length === 0 ? <p className="muted">Story proposals will appear here.</p> : null}
          </div>
        </Surface>
        <Surface>
          <h2>Approved Story Ingredients</h2>
          <div className="approved-idea-list">
            {approvedIdeas.slice(-6).map((idea) => (
              <article key={idea.id} className="approved-idea">
                <strong>{STORY_PROPOSAL_KINDS.find((kind) => kind.id === idea.kind)?.label ?? idea.kind}</strong>
                <p>{idea.text}</p>
                <small>
                  {idea.authorName} · {idea.approvals} approvals
                </small>
              </article>
            ))}
            {approvedIdeas.length === 0 ? <p className="muted">Approved ideas will appear after room votes.</p> : null}
          </div>
        </Surface>
        <Surface>
          <h2>Kurami Guide</h2>
          <div className="story-guide-list">
            {guideMessages.slice(-4).map((message) => (
              <article key={message.id} className={`story-guide-message ${message.scope === "room" ? "story-guide-room" : ""}`}>
                <strong>{message.requesterName}</strong>
                <p>{message.prompt}</p>
                <small>{message.response}</small>
              </article>
            ))}
            {guideMessages.length === 0 ? <p className="muted">AI guidance will appear after students ask for help.</p> : null}
          </div>
        </Surface>
        <Surface>
          <h2>Final Story</h2>
          <p className="story-focus">{activeRoom?.title || room.title || "The title will appear when the room saves its story."}</p>
          <p>{activeRoom?.finalText || "The final story will appear here after the room saves it."}</p>
          {activeRoom?.authorshipNote ? <small>{activeRoom.authorshipNote}</small> : null}
        </Surface>
      </section>
    </PageShell>
  );
}

function KuramiCourtProjectionPage() {
  const { roomId = "court-alpha" } = useParams();
  const now = useNow();
  const { data } = useQuery({ queryKey: ["display", "kurami-court", roomId], queryFn: () => api.workshopState<CourtState>("kurami-court"), refetchInterval: 3_000 });
  const { data: liveRoom } = useQuery({ queryKey: ["display", "kurami-court-room", roomId], queryFn: () => api.courtRoom<NonNullable<CourtState["activeRoom"]>>(roomId), refetchInterval: 3_000 });

  if (!data || !liveRoom) return <PageShell>Loading Kurami Court room...</PageShell>;
  const roomSummary = data.rooms.find((item) => item.id === normalizeCourtRoomId(roomId)) ?? data.rooms[0];
  const displayRoom =
    liveRoom ??
    (roomSummary
      ? {
          ...roomSummary,
          case: data.cases.find((item) => item.id === roomSummary.caseId) ?? data.cases[0],
          roundGoal: "Project this room after at least one student joins, or use facilitator controls to start it.",
          roundPrompt: "Waiting for the live courtroom feed.",
          sealedDetailVisible: roomSummary.activeRound >= 3,
          rounds: data.roomRounds,
          judgeMessages: [],
          arguments: [],
          votes: [],
          members: [],
          participantVote: undefined,
          finalVoteEndsAt: undefined,
          roundEndsAt: undefined
        }
      : null);
  if (!displayRoom?.case) return <PageShell>No Kurami Court rooms found.</PageShell>;
  const phaseSeconds = secondsUntil(displayRoom.roundEndsAt, now) ?? (displayRoom.status === "final-vote" ? secondsUntil(displayRoom.finalVoteEndsAt, now) : displayRoom.phaseSecondsRemaining);
  const workshopSeconds = secondsUntil(displayRoom.finalVoteEndsAt, now) ?? displayRoom.workshopSecondsRemaining;

  return (
    <PageShell>
      <section className="display-hero court-display-hero">
        <div>
          <p className="eyebrow">Kurami Court live</p>
          <h1>{displayRoom.name}</h1>
          <p>
            Room ID {displayRoom.id} · {displayRoom.docket}
          </p>
        </div>
        <div className="timer-block">
          <span>{displayRoom.status === "debate" ? `Round ${displayRoom.activeRound}: ${displayRoom.roundTitle}` : displayRoom.status.replace("-", " ")}</span>
          <strong>{typeof phaseSeconds === "number" ? formatSeconds(phaseSeconds) : "Ready"}</strong>
          <small>
            {displayRoom.memberCount} joined · {typeof workshopSeconds === "number" ? formatSeconds(workshopSeconds) : `${data.durationMinutes}:00`} hearing
          </small>
        </div>
      </section>
      <section className="mafia-projection-grid">
        <Surface>
          <h2>Case File</h2>
          <p>{displayRoom.case.scenario}</p>
          <div className={displayRoom.sealedDetailVisible ? "new-evidence" : "new-evidence sealed"}>
            <CircleAlert size={20} />
            <span>{displayRoom.sealedDetailVisible ? displayRoom.case.missingDetail : "Sealed detail unlocks in Round 3."}</span>
          </div>
        </Surface>
        <Surface>
          <h2>AI Judge</h2>
          <div className="court-judge-feed">
            {displayRoom.judgeMessages.slice(-6).map((message) => (
              <article key={message.id} className={`court-judge-message court-judge-${message.tone}`}>
                <strong>{message.round > 0 ? `Round ${message.round}` : "Lobby"}</strong>
                <p>{message.text}</p>
              </article>
            ))}
            {displayRoom.judgeMessages.length === 0 ? <p className="muted">Judge messages will appear after the room starts.</p> : null}
          </div>
        </Surface>
        <Surface>
          <h2>Live Arguments</h2>
          <div className="court-argument-feed">
            {displayRoom.arguments.slice(-8).map((argument) => (
              <article key={argument.id} className="court-argument-card">
                <div>
                  <strong>{argument.authorName}</strong>
                  <span>Round {argument.round}</span>
                </div>
                <p>{argument.text}</p>
                <small>{argument.stakeholder}</small>
              </article>
            ))}
            {displayRoom.arguments.length === 0 ? <p className="muted">Waiting for arguments.</p> : null}
          </div>
        </Surface>
        <Surface>
          <h2>Final Vote</h2>
          <VoteComparison results={{ initial: data.results.initial, final: displayRoom.voteSummary, changed: data.results.changed }} />
        </Surface>
      </section>
    </PageShell>
  );
}

function DataDetectivePage() {
  const participant = useRequiredParticipant();
  const params = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const initialRouteRoom = params.roomId ?? params.teamId;
  const { data } = useQuery({ queryKey: ["workshop", "data-detective", participant.id], queryFn: () => api.workshopState<DetectiveState>("data-detective", participant.id), refetchInterval: 4_000 });
  const [roomCode, setRoomCode] = useState(() => initialRouteRoom ?? (typeof window === "undefined" ? "" : window.sessionStorage.getItem("kurami_detective_room") ?? ""));
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [claimForm, setClaimForm] = useState({
    claim: "",
    finding: "",
    sourceTitle: "",
    sourceUrl: "",
    evidenceType: "outside-source",
    stance: "needs-more-research",
    category: "Transparency",
    severity: "medium",
    confidence: 3,
    nextStep: ""
  });
  const [chatText, setChatText] = useState("");
  const [finalForm, setFinalForm] = useState({
    finalClaim: "",
    strongestEvidence: "",
    openQuestions: "",
    conditions: "",
    decision: "reject" as "fund" | "reject"
  });
  const [voteReason, setVoteReason] = useState("");

  useEffect(() => {
    const socket = getSocket();
    const invalidate = (payload: { workshopId?: WorkshopId }) => {
      if (payload.workshopId === "data-detective") void queryClient.invalidateQueries({ queryKey: ["workshop", "data-detective", participant.id] });
    };
    socket.on("room:updated", invalidate);
    return () => {
      socket.off("room:updated", invalidate);
    };
  }, [participant.id, queryClient]);

  useEffect(() => {
    if (!selectedDocumentId && data?.activeRoom?.business.documents[0]) setSelectedDocumentId(data.activeRoom.business.documents[0].id);
  }, [data?.activeRoom?.business.documents, selectedDocumentId]);

  const joinRoom = useMutation({
    mutationFn: () => api.detectiveJoinRoom(normalizeDetectiveRoomId(roomCode), participant.id),
    onSuccess: () => {
      const normalized = normalizeDetectiveRoomId(roomCode);
      if (typeof window !== "undefined") window.sessionStorage.setItem("kurami_detective_room", normalized);
      setRoomCode(normalized);
      toast({ tone: "success", message: "Investor room joined." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "data-detective", participant.id] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });

  const claimMutation = useMutation({
    mutationFn: () =>
      api.detectiveDiscovery({
        participantId: participant.id,
        roomId: data?.activeRoom?.id,
        documentId: selectedDocumentId || undefined,
        ...claimForm
      }),
    onSuccess: () => {
      setClaimForm({ ...claimForm, claim: "", finding: "", sourceTitle: "", sourceUrl: "", nextStep: "" });
      toast({ tone: "success", message: "Claim added to the room board." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "data-detective", participant.id] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });

  const chatMutation = useMutation({
    mutationFn: () =>
      api.detectiveChat(data?.activeRoom?.id ?? roomCode, {
        participantId: participant.id,
        text: chatText
      }),
    onSuccess: () => {
      setChatText("");
      toast({ tone: "success", message: "Discussion note posted." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "data-detective", participant.id] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });

  const recommendationMutation = useMutation({
    mutationFn: () => api.detectiveRecommendation({ participantId: participant.id, roomId: data?.activeRoom?.id, ...finalForm }),
    onSuccess: () => {
      setFinalForm({ finalClaim: "", strongestEvidence: "", openQuestions: "", conditions: "", decision: finalForm.decision });
      toast({ tone: "success", message: "Final claim and vote submitted." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "data-detective", participant.id] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });

  const voteMutation = useMutation({
    mutationFn: (vote: "fund" | "reject") =>
      api.detectiveVote(data?.activeRoom?.id ?? roomCode, {
        participantId: participant.id,
        vote,
        reason: voteReason
      }),
    onSuccess: () => {
      setVoteReason("");
      toast({ tone: "success", message: "Funding vote updated." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "data-detective", participant.id] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });

  if (!data) return <PageShell>Loading investigation...</PageShell>;
  const activeRoom = data.activeRoom;
  const roomCodeList = data.roomIds.length > 0 ? data.roomIds : data.rooms.map((room) => room.id);
  const roomCodeText = roomCodeList.join(", ");
  const selectedDocument = activeRoom?.business.documents.find((document) => document.id === selectedDocumentId) ?? activeRoom?.business.documents[0];
  const topVote = activeRoom?.voteSummary
    ? activeRoom.voteSummary.fund === activeRoom.voteSummary.reject
      ? "Tied"
      : activeRoom.voteSummary.fund > activeRoom.voteSummary.reject
        ? "Fund leading"
        : "Reject leading"
    : "No votes";

  return (
    <WorkshopShell workshopId="data-detective" icon={<FileSearch size={24} />} title="Data-Detective Investor Hunt" kicker={activeRoom ? `Room ${activeRoom.id}` : "Eight-room scavenger hunt"}>
      <Surface className="detective-join-card">
        <div>
          <p className="eyebrow">Investor room assignment</p>
          <h2>Enter the room ID from your facilitator</h2>
          <p className="muted">
            Your facilitator will give one of these room IDs: <strong>{roomCodeText}</strong>. Join that room, then work with everyone inside it.
          </p>
        </div>
        <form
          className="mafia-room-form"
          onSubmit={(event) => {
            event.preventDefault();
            joinRoom.mutate();
          }}
        >
          <label>
            <span className="field-label">Room ID</span>
            <input className="input" value={roomCode} onChange={(event) => setRoomCode(event.target.value)} onBlur={() => setRoomCode(normalizeDetectiveRoomId(roomCode))} placeholder="venture-north" autoCapitalize="none" />
          </label>
          <Button type="submit" disabled={normalizeDetectiveRoomId(roomCode).length < 3 || joinRoom.isPending}>
            <Play size={18} /> Join Room
          </Button>
        </form>
        <div className="detective-room-strip">
          {data.rooms.map((room) => (
            <button key={room.id} className={`detective-room-chip ${activeRoom?.id === room.id ? "detective-room-chip-active" : ""}`} type="button" onClick={() => setRoomCode(room.id)}>
              <strong>{room.id}</strong>
              <span>
                {room.business.name} · {room.memberCount} joined
              </span>
              <small>Tap to fill the room ID box</small>
            </button>
          ))}
        </div>
      </Surface>
      <DetectiveStepGuide activeRoom={activeRoom} participantId={participant.id} />

      {!activeRoom ? (
        <div className="workshop-grid">
          <Surface>
            <h2>How this hunt works</h2>
            <ol className="question-list">
              <li>Join the room ID the facilitator gives you.</li>
              <li>Read the investor dossier and pick claims to verify.</li>
              <li>Use the internet to find reputable facts, sources, competitors, and risks.</li>
              <li>Post findings to the shared claim board so the room can discuss them.</li>
              <li>Write final claims and vote fund or reject.</li>
            </ol>
          </Surface>
          <Surface>
            <h2>Open investor rooms</h2>
            <div className="response-list">
              {data.rooms.map((room) => (
                <article key={room.id} className="evidence-item">
                  <strong>{room.business.name}</strong>
                  <p>{room.business.industry}</p>
                  <span className="tag">{room.id}</span>
                </article>
              ))}
            </div>
          </Surface>
        </div>
      ) : (
        <>
          <section className="detective-brief">
            <Surface>
              <p className="eyebrow">{activeRoom.business.industry}</p>
              <h2>{activeRoom.business.name}</h2>
              <p>{activeRoom.business.description}</p>
              <div className="detective-kpi-grid">
                <div>
                  <span>Funding ask</span>
                  <strong>{activeRoom.business.fundingAsk}</strong>
                </div>
                <div>
                  <span>Room members</span>
                  <strong>{activeRoom.memberCount}</strong>
                </div>
                <div>
                  <span>Claims</span>
                  <strong>{activeRoom.claims.length}</strong>
                </div>
                <div>
                  <span>Vote</span>
                  <strong>{topVote}</strong>
                </div>
              </div>
            </Surface>
            <Surface>
              <h2>Claims to verify</h2>
              <div className="tag-row">
                {activeRoom.business.claimsToVerify.map((claim) => (
                  <span key={claim} className="tag">
                    {claim}
                  </span>
                ))}
              </div>
            </Surface>
          </section>

          <section className="evidence-board">
            {activeRoom.business.documents.map((document) => (
              <button key={document.id} className={`evidence-card ${selectedDocument?.id === document.id ? "evidence-card-active" : ""}`} type="button" onClick={() => setSelectedDocumentId(document.id)}>
                <span>{document.type}</span>
                <strong>{document.title}</strong>
                <p>{document.summary}</p>
              </button>
            ))}
          </section>

          <div className="workshop-grid">
            <Surface>
              <h2>{selectedDocument?.title ?? "Investigator document"}</h2>
              <p>{selectedDocument?.body}</p>
              <ol className="question-list">
                {(selectedDocument?.prompts ?? activeRoom.business.researchTargets).map((prompt) => (
                  <li key={prompt}>{prompt}</li>
                ))}
              </ol>
            </Surface>
            <Surface>
              <h2>Add a claim or finding</h2>
              <p className="microcopy">Add one useful finding at a time. Your room will see it immediately.</p>
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  claimMutation.mutate();
                }}
              >
                <label>
                  <span className="field-label">Claim you are testing</span>
                  <textarea className="textarea" value={claimForm.claim} onChange={(event) => setClaimForm({ ...claimForm, claim: event.target.value })} placeholder="Example: BrightCart needs a price fairness rule before funding." rows={2} />
                </label>
                <label>
                  <span className="field-label">What you found</span>
                  <textarea className="textarea" value={claimForm.finding} onChange={(event) => setClaimForm({ ...claimForm, finding: event.target.value })} placeholder="Write the fact, pattern, risk, or comparison your source showed." rows={4} />
                </label>
                <div className="field-grid">
                  <label>
                    <span className="field-label">Source title</span>
                    <input className="input" value={claimForm.sourceTitle} onChange={(event) => setClaimForm({ ...claimForm, sourceTitle: event.target.value })} placeholder="Dossier, article, report, or company page" />
                  </label>
                  <label>
                    <span className="field-label">Source URL optional</span>
                    <input className="input" value={claimForm.sourceUrl} onChange={(event) => setClaimForm({ ...claimForm, sourceUrl: event.target.value })} placeholder="https://..." />
                  </label>
                </div>
                <div className="field-grid">
                  <label>
                    <span className="field-label">Stance</span>
                    <select className="select" value={claimForm.stance} onChange={(event) => setClaimForm({ ...claimForm, stance: event.target.value })}>
                      <option value="supports-fund">Supports fund</option>
                      <option value="supports-reject">Supports reject</option>
                      <option value="needs-more-research">Needs more research</option>
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Evidence type</span>
                    <select className="select" value={claimForm.evidenceType} onChange={(event) => setClaimForm({ ...claimForm, evidenceType: event.target.value })}>
                      <option value="outside-source">Outside source</option>
                      <option value="company-document">Company document</option>
                      <option value="metric">Metric</option>
                      <option value="competitor">Competitor</option>
                      <option value="customer-risk">Customer risk</option>
                      <option value="policy-risk">Policy risk</option>
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Category</span>
                    <select className="select" value={claimForm.category} onChange={(event) => setClaimForm({ ...claimForm, category: event.target.value })}>
                      {data.categories.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="field-grid">
                  <label>
                    <span className="field-label">Severity</span>
                    <select className="select" value={claimForm.severity} onChange={(event) => setClaimForm({ ...claimForm, severity: event.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Confidence</span>
                    <input className="input" type="number" min={1} max={5} value={claimForm.confidence} onChange={(event) => setClaimForm({ ...claimForm, confidence: Number(event.target.value) })} />
                  </label>
                </div>
                <label>
                  <span className="field-label">Next thing to verify optional</span>
                  <textarea className="textarea" value={claimForm.nextStep} onChange={(event) => setClaimForm({ ...claimForm, nextStep: event.target.value })} placeholder="What should the room check next?" rows={2} />
                </label>
                <Button type="submit" disabled={claimForm.claim.trim().length < 6 || claimForm.finding.trim().length < 12 || claimForm.sourceTitle.trim().length < 3 || claimMutation.isPending}>
                  <ShieldCheck size={18} /> Add Claim
                </Button>
              </form>
            </Surface>
          </div>

          <div className="workshop-grid">
            <Surface>
              <div className="surface-title-row">
                <h2>Shared claim board</h2>
                <StatusPill tone="neutral">{activeRoom.claims.length} claims</StatusPill>
              </div>
              <div className="response-list">
                {activeRoom.claims.length === 0 ? <p className="muted">Claims will appear here for everyone in the room.</p> : null}
                {activeRoom.claims.map((claim) => (
                  <article key={claim.id} className="evidence-item detective-claim">
                    <div className="surface-title-row">
                      <strong>{claim.claim}</strong>
                      <span className="tag">{claim.stance.replaceAll("-", " ")}</span>
                    </div>
                    <p>{claim.finding}</p>
                    <small>
                      {claim.authorName} · {claim.sourceTitle} · {claim.category} · confidence {claim.confidence}
                    </small>
                    {claim.sourceUrl ? (
                      <a className="source-link" href={claim.sourceUrl} target="_blank" rel="noreferrer">
                        Open source
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </Surface>
            <Surface>
              <div className="surface-title-row">
                <h2>Room discussion</h2>
                <StatusPill tone="good">Live</StatusPill>
              </div>
              <div className="mafia-chat-feed detective-chat-feed" aria-live="polite">
                {activeRoom.chat.length === 0 ? <p className="muted">Discuss sources, divide research, and challenge weak claims.</p> : null}
                {activeRoom.chat.map((message) => (
                  <article key={message.id} className={`mafia-chat-message ${message.participantId === participant.id ? "mafia-chat-self" : ""}`}>
                    <strong>{message.authorName}</strong>
                    <p>{message.text}</p>
                  </article>
                ))}
              </div>
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  chatMutation.mutate();
                }}
              >
                <label>
                  <span className="field-label">Room note</span>
                  <textarea className="textarea" value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Share what you are researching or ask the room to check a claim." rows={3} />
                </label>
                <Button type="submit" disabled={chatText.trim().length < 1 || chatMutation.isPending}>
                  <Send size={18} /> Send
                </Button>
              </form>
            </Surface>
          </div>

          <Surface>
            <h2>Final investor claims and funding vote</h2>
            <p className="microcopy">Use this when your room is ready to make the investment call. Submitting also records your vote.</p>
            <div className="tag-row">
              {activeRoom.business.researchTargets.map((target) => (
                <span key={target} className="tag">
                  {target}
                </span>
              ))}
            </div>
            <form
              className="deep-form"
              onSubmit={(event) => {
                event.preventDefault();
                recommendationMutation.mutate();
              }}
            >
              <div className="field-grid">
                <label>
                  <span className="field-label">Decision</span>
                  <select className="select" value={finalForm.decision} onChange={(event) => setFinalForm({ ...finalForm, decision: event.target.value as "fund" | "reject" })}>
                    <option value="fund">Fund / approve</option>
                    <option value="reject">Reject / do not fund</option>
                  </select>
                </label>
                <label>
                  <span className="field-label">Vote totals</span>
                  <div className="input readonly-input">
                    Fund {activeRoom.voteSummary.fund} · Reject {activeRoom.voteSummary.reject}
                  </div>
                </label>
              </div>
              <label>
                <span className="field-label">Final claim</span>
                <textarea className="textarea" value={finalForm.finalClaim} onChange={(event) => setFinalForm({ ...finalForm, finalClaim: event.target.value })} placeholder="Should investors fund or reject, and why?" rows={3} />
              </label>
              <label>
                <span className="field-label">Strongest evidence</span>
                <textarea className="textarea" value={finalForm.strongestEvidence} onChange={(event) => setFinalForm({ ...finalForm, strongestEvidence: event.target.value })} placeholder="Name the source or finding that changed the decision." rows={3} />
              </label>
              <label>
                <span className="field-label">Conditions or rejection reason</span>
                <textarea className="textarea" value={finalForm.conditions} onChange={(event) => setFinalForm({ ...finalForm, conditions: event.target.value })} placeholder="What must change before funding, or why is rejection necessary?" rows={2} />
              </label>
              <label>
                <span className="field-label">Open questions optional</span>
                <textarea className="textarea" value={finalForm.openQuestions} onChange={(event) => setFinalForm({ ...finalForm, openQuestions: event.target.value })} placeholder="What should investors still ask?" rows={2} />
              </label>
              <Button type="submit" disabled={finalForm.finalClaim.trim().length < 12 || finalForm.strongestEvidence.trim().length < 8 || recommendationMutation.isPending}>
                <FileSearch size={18} /> Submit Final Claim
              </Button>
            </form>
          </Surface>

          <div className="workshop-grid">
            <Surface>
              <h2>Final claims</h2>
              <div className="response-list">
                {activeRoom.finalClaims.length === 0 ? <p className="muted">Final claims appear here when investigators are ready.</p> : null}
                {activeRoom.finalClaims.map((claim) => (
                  <article key={claim.id} className="evidence-item detective-final-claim">
                    <div className="surface-title-row">
                      <strong>{claim.decision === "fund" ? "Fund" : "Reject"}</strong>
                      <span className="tag">{claim.authorName}</span>
                    </div>
                    <p>{claim.finalClaim}</p>
                    <small>{claim.strongestEvidence}</small>
                  </article>
                ))}
              </div>
            </Surface>
            <Surface>
              <h2>Quick vote</h2>
              <div className="vote-bars">
                <div className="bar-line">
                  <span>Fund</span>
                  <meter min={0} max={Math.max(1, activeRoom.voteSummary.total)} value={activeRoom.voteSummary.fund} />
                  <strong>{activeRoom.voteSummary.fund}</strong>
                </div>
                <div className="bar-line">
                  <span>Reject</span>
                  <meter min={0} max={Math.max(1, activeRoom.voteSummary.total)} value={activeRoom.voteSummary.reject} />
                  <strong>{activeRoom.voteSummary.reject}</strong>
                </div>
              </div>
              <form className="form-stack">
                <label>
                  <span className="field-label">Reason for your vote</span>
                  <textarea className="textarea" value={voteReason} onChange={(event) => setVoteReason(event.target.value)} placeholder="One sentence is enough." rows={3} />
                </label>
                <div className="button-row">
                  <Button type="button" tone="quiet" disabled={voteReason.trim().length < 4 || voteMutation.isPending} onClick={() => voteMutation.mutate("fund")}>
                    <Check size={18} /> Fund
                  </Button>
                  <Button type="button" tone="danger" disabled={voteReason.trim().length < 4 || voteMutation.isPending} onClick={() => voteMutation.mutate("reject")}>
                    <Vote size={18} /> Reject
                  </Button>
                </div>
              </form>
            </Surface>
          </div>
        </>
      )}
      <Takeaway>{data.takeaway}</Takeaway>
    </WorkshopShell>
  );
}

function StoribloomPage() {
  const participant = useRequiredParticipant();
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const now = useNow();
  const initialRouteRoom = params.storyId && params.storyId.startsWith("bloom-") ? params.storyId : "";
  const { data } = useQuery({ queryKey: ["workshop", "storibloom", participant.id], queryFn: () => api.workshopState<StoryState>("storibloom", participant.id), refetchInterval: 3_000 });
  const [roomCode, setRoomCode] = useState(() => initialRouteRoom || (typeof window === "undefined" ? "" : window.sessionStorage.getItem("kurami_story_room") ?? ""));
  const [chatText, setChatText] = useState("");
  const [proposalKind, setProposalKind] = useState<(typeof STORY_PROPOSAL_KINDS)[number]["id"]>("seed");
  const [proposalText, setProposalText] = useState("");
  const [guidePrompt, setGuidePrompt] = useState("");
  const [guideScope, setGuideScope] = useState<"room" | "personal">("room");
  const [finalText, setFinalText] = useState("");
  const [title, setTitle] = useState("");
  const [authorshipNote, setAuthorshipNote] = useState("");

  useEffect(() => {
    const socket = getSocket();
    const invalidate = (payload: { workshopId?: WorkshopId }) => {
      if (payload.workshopId === "storibloom") void queryClient.invalidateQueries({ queryKey: ["workshop", "storibloom", participant.id] });
    };
    socket.on("room:updated", invalidate);
    return () => {
      socket.off("room:updated", invalidate);
    };
  }, [participant.id, queryClient]);

  const activeRoom = data?.activeRoom ?? null;
  const phaseSeconds = secondsUntil(activeRoom?.stageEndsAt, now) ?? activeRoom?.phaseSecondsRemaining;
  const workshopSeconds = secondsUntil(activeRoom?.workshopEndsAt, now) ?? activeRoom?.workshopSecondsRemaining;
  const displayStageTitle = activeRoom?.status === "lobby" ? "Lobby" : activeRoom?.stageTitle;
  const displayStageGoal = activeRoom?.status === "lobby" ? "Join the room, read the creative lane, and wait for the facilitator to start." : activeRoom?.stageGoal;
  const roomCodeList = data?.roomIds ?? [];
  const roomCodeText = roomCodeList.join(", ");
  const handleStoryError = (error: unknown) => {
    const message = errorMessage(error);
    toast({ tone: "error", message });
    if (isExpiredStudentSession(message)) {
      const normalized = normalizeStoryRoomId(activeRoom?.id ?? roomCode);
      if (normalized && typeof window !== "undefined") window.sessionStorage.setItem("kurami_story_room", normalized);
      clearStoredStudentSession();
      navigate("/join?returnTo=/storibloom", { replace: true });
    }
  };

  const joinRoom = useMutation({
    mutationFn: () => api.storyRoomJoin(normalizeStoryRoomId(roomCode), participant.id),
    onSuccess: () => {
      const normalized = normalizeStoryRoomId(roomCode);
      if (typeof window !== "undefined") window.sessionStorage.setItem("kurami_story_room", normalized);
      setRoomCode(normalized);
      toast({ tone: "success", message: "Storibloom room joined." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "storibloom", participant.id] });
    },
    onError: handleStoryError
  });

  const chatMutation = useMutation({
    mutationFn: () => api.storyRoomChat(activeRoom?.id ?? roomCode, { participantId: participant.id, text: chatText }),
    onSuccess: () => {
      setChatText("");
      toast({ tone: "success", message: "Story chat posted." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "storibloom", participant.id] });
    },
    onError: handleStoryError
  });

  const proposalMutation = useMutation({
    mutationFn: () => api.storyRoomProposal(activeRoom?.id ?? roomCode, { participantId: participant.id, kind: proposalKind, text: proposalText }),
    onSuccess: () => {
      setProposalText("");
      toast({ tone: "success", message: "Idea sent to the voting board." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "storibloom", participant.id] });
    },
    onError: handleStoryError
  });

  const proposalVoteMutation = useMutation({
    mutationFn: ({ proposalId, vote }: { proposalId: string; vote: "approve" | "rework" }) => api.storyRoomProposalVote(activeRoom?.id ?? roomCode, proposalId, { participantId: participant.id, vote }),
    onSuccess: () => {
      toast({ tone: "success", message: "Vote counted." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "storibloom", participant.id] });
    },
    onError: handleStoryError
  });

  const guideMutation = useMutation({
    mutationFn: () =>
      api.storyRoomGuide(activeRoom?.id ?? roomCode, {
        participantId: participant.id,
        prompt: guidePrompt,
        scope: guideScope
      }),
    onSuccess: () => {
      setGuidePrompt("");
      toast({ tone: "success", message: "Kurami Guide responded." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "storibloom", participant.id] });
    },
    onError: handleStoryError
  });

  const draftMutation = useMutation({
    mutationFn: () => api.storyRoomDraft(activeRoom?.id ?? roomCode, { participantId: participant.id }),
    onSuccess: () => {
      toast({ tone: "success", message: "Collaborative draft created." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "storibloom", participant.id] });
    },
    onError: handleStoryError
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.storyRoomSave(activeRoom?.id ?? roomCode, {
        participantId: participant.id,
        title: title || activeRoom?.title,
        finalText,
        authorshipNote
      }),
    onSuccess: () => {
      toast({ tone: "success", message: "Final story saved." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "storibloom", participant.id] });
    },
    onError: handleStoryError
  });

  useEffect(() => {
    if (activeRoom?.finalText) setFinalText(activeRoom.finalText);
    if (activeRoom?.title) setTitle(activeRoom.title);
    if (activeRoom?.authorshipNote) setAuthorshipNote(activeRoom.authorshipNote);
  }, [activeRoom?.authorshipNote, activeRoom?.finalText, activeRoom?.title]);

  if (!data) return <PageShell>Loading Storibloom...</PageShell>;

  return (
    <WorkshopShell workshopId="storibloom" icon={<Sprout size={24} />} title="Storibloom Boardroom" kicker={activeRoom ? `${activeRoom.name} · ${displayStageTitle}` : "8 story rooms"}>
      <Surface className="story-room-join">
        <div>
          <p className="eyebrow">Story room assignment</p>
          <h2>Enter the room ID from your facilitator</h2>
          <p className="muted">
            Available rooms: <strong>{roomCodeText}</strong>. Join your room, wait in the lobby, then create the story together when the facilitator starts it.
          </p>
        </div>
        <form
          className="mafia-room-form"
          onSubmit={(event) => {
            event.preventDefault();
            joinRoom.mutate();
          }}
        >
          <label>
            <span className="field-label">Room ID</span>
            <input className="input" value={roomCode} onChange={(event) => setRoomCode(event.target.value)} onBlur={() => setRoomCode(normalizeStoryRoomId(roomCode))} placeholder="bloom-alpha" autoCapitalize="none" />
          </label>
          <Button type="button" onClick={() => joinRoom.mutate()} disabled={normalizeStoryRoomId(roomCode).length < 3 || joinRoom.isPending}>
            <Play size={18} /> Join Room
          </Button>
        </form>
        <div className="story-room-strip">
          {data.rooms.map((room) => (
            <button key={room.id} className={`story-room-chip ${activeRoom?.id === room.id ? "story-room-chip-active" : ""}`} type="button" onClick={() => setRoomCode(room.id)}>
              <strong>{room.id}</strong>
              <span>{room.name} · {room.memberCount} joined</span>
              <small>{room.status} · {room.lane}</small>
            </button>
          ))}
        </div>
      </Surface>

      {!activeRoom ? (
        <Surface>
          <div className="section-head">
            <div>
              <p className="eyebrow">Lobby first</p>
              <h2>Join one story room to begin</h2>
              <p className="muted">The room opens in a lobby. Your facilitator starts each room manually, then the six story stages advance automatically across 45 minutes.</p>
            </div>
            <StatusPill tone="warn">Waiting for room</StatusPill>
          </div>
        </Surface>
      ) : (
        <>
          <Surface className="story-room-status">
            <div>
              <p className="eyebrow">{activeRoom.lane}</p>
              <h2>{displayStageTitle}</h2>
              <p className="muted">{displayStageGoal}</p>
            </div>
            <div className="mafia-master-summary">
              <div>
                <span>Status</span>
                <strong>{activeRoom.status}</strong>
              </div>
              <div>
                <span>Room</span>
                <strong>{activeRoom.id}</strong>
              </div>
              <div>
                <span>Members</span>
                <strong>{activeRoom.memberCount}</strong>
              </div>
              <div>
                <span>Stage clock</span>
                <strong>{typeof phaseSeconds === "number" ? formatSeconds(phaseSeconds) : "Lobby"}</strong>
              </div>
              <div>
                <span>Workshop clock</span>
                <strong>{typeof workshopSeconds === "number" ? formatSeconds(workshopSeconds) : "45:00"}</strong>
              </div>
              <div>
                <span>Approved ideas</span>
                <strong>{activeRoom.approvedIdeas.length}</strong>
              </div>
            </div>
          </Surface>

          <div className="story-road">
            {data.roomStageGuides.map((guide) => (
              <div key={guide.stage} className={`story-step ${activeRoom.status !== "lobby" && activeRoom.activeStage >= guide.stage ? "story-step-active" : ""}`}>
                <strong>{guide.stage}. {guide.title}</strong>
                <small>{guide.goal}</small>
              </div>
            ))}
          </div>

          {activeRoom.status === "lobby" ? (
            <Surface>
              <div className="section-head">
                <div>
                  <p className="eyebrow">Waiting room</p>
                  <h2>Waiting for facilitator start</h2>
                  <p className="muted">You can read the room focus and get ready. The boardroom unlocks when your facilitator starts this room.</p>
                </div>
                <StatusPill tone="warn">Lobby</StatusPill>
              </div>
              <p className="story-focus">{activeRoom.focus}</p>
            </Surface>
          ) : null}

          <div className="story-boardroom">
            <Surface className="story-chat-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Boardroom chat</p>
                  <h2>Talk the story out</h2>
                </div>
                <StatusPill tone="neutral">{activeRoom.chat.length} messages</StatusPill>
              </div>
              <div className="story-chat-list">
                {activeRoom.chat.map((message) => (
                  <article key={message.id} className="story-chat-message">
                    <strong>{message.authorName}</strong>
                    <p>{message.text}</p>
                    <small>{formatRelativeTime(message.createdAt)}</small>
                  </article>
                ))}
                {activeRoom.chat.length === 0 ? <p className="muted">Start by sharing a seed, character idea, conflict, line of dialogue, or concern.</p> : null}
              </div>
              <form
                className="chat-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  chatMutation.mutate();
                }}
              >
                <input className="input" value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder={activeRoom.status === "lobby" ? "Waiting for facilitator start..." : "Add a boardroom thought..."} disabled={activeRoom.status !== "running"} />
                <Button type="submit" disabled={chatText.trim().length < 1 || chatMutation.isPending || activeRoom.status !== "running"}>
                  <Send size={18} /> Send
                </Button>
              </form>
            </Surface>

            <Surface className="story-guide-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Kurami Guide</p>
                  <h2>AI story coach</h2>
                </div>
                <BrainCircuit size={22} />
              </div>
              <div className="story-guide-list">
                {activeRoom.guideMessages.map((message) => (
                  <article key={message.id} className={`story-guide-message story-guide-${message.scope}`}>
                    <strong>{message.scope === "room" ? "Room help" : "Personal help"} · {message.requesterName}</strong>
                    <small>{message.prompt}</small>
                    <p>{message.response}</p>
                  </article>
                ))}
              </div>
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  guideMutation.mutate();
                }}
              >
                <label>
                  <span className="field-label">Ask the guide</span>
                  <textarea className="textarea" rows={3} value={guidePrompt} onChange={(event) => setGuidePrompt(event.target.value)} placeholder="Ask for help with stakes, plot, dialogue, ethics, or revision..." disabled={activeRoom.status !== "running"} />
                </label>
                <label>
                  <span className="field-label">Visibility</span>
                  <select className="select" value={guideScope} onChange={(event) => setGuideScope(event.target.value as "room" | "personal")} disabled={activeRoom.status !== "running"}>
                    <option value="room">Share with room</option>
                    <option value="personal">Personal side note</option>
                  </select>
                </label>
                <Button type="submit" disabled={guidePrompt.trim().length < 3 || guideMutation.isPending || activeRoom.status !== "running"}>
                  <Sparkles size={18} /> Ask Guide
                </Button>
              </form>
            </Surface>
          </div>

          <div className="story-boardroom">
            <Surface>
              <div className="section-head">
                <div>
                  <p className="eyebrow">Idea proposals</p>
                  <h2>Suggest and vote</h2>
                </div>
                <StatusPill tone="neutral">{activeRoom.proposals.length} ideas</StatusPill>
              </div>
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  proposalMutation.mutate();
                }}
              >
                <div className="field-grid">
                  <label>
                    <span className="field-label">Idea type</span>
                    <select className="select" value={proposalKind} onChange={(event) => setProposalKind(event.target.value as typeof proposalKind)} disabled={activeRoom.status !== "running"}>
                      {STORY_PROPOSAL_KINDS.map((kind) => (
                        <option key={kind.id} value={kind.id}>
                          {kind.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Suggestion</span>
                    <input className="input" value={proposalText} onChange={(event) => setProposalText(event.target.value)} placeholder={activeRoom.status === "lobby" ? "Waiting for facilitator start..." : "Suggest a detail, scene, change, or title..."} disabled={activeRoom.status !== "running"} />
                  </label>
                </div>
                <Button type="submit" disabled={proposalText.trim().length < 4 || proposalMutation.isPending || activeRoom.status !== "running"}>
                  <Lightbulb size={18} /> Suggest Idea
                </Button>
              </form>
              <div className="story-proposal-list">
                {activeRoom.proposals.map((proposal) => (
                  <article key={proposal.id} className={`story-proposal story-proposal-${proposal.status}`}>
                    <div className="section-head">
                      <div>
                        <strong>{STORY_PROPOSAL_KINDS.find((kind) => kind.id === proposal.kind)?.label ?? proposal.kind}</strong>
                        <small>{proposal.authorName} · {formatRelativeTime(proposal.createdAt)}</small>
                      </div>
                      <StatusPill tone={proposal.status === "approved" ? "good" : proposal.status === "needs-rework" ? "warn" : "neutral"}>
                        {proposal.approvals}/{proposal.reworks}
                      </StatusPill>
                    </div>
                    <p>{proposal.text}</p>
                    <div className="button-row">
                        <Button tone="quiet" onClick={() => proposalVoteMutation.mutate({ proposalId: proposal.id, vote: "approve" })} disabled={proposalVoteMutation.isPending || activeRoom.status !== "running"}>
                        <Check size={18} /> Approve
                      </Button>
                      <Button tone="quiet" onClick={() => proposalVoteMutation.mutate({ proposalId: proposal.id, vote: "rework" })} disabled={proposalVoteMutation.isPending || activeRoom.status !== "running"}>
                        <RotateCcw size={18} /> Rework
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </Surface>

            <Surface>
              <div className="section-head">
                <div>
                  <p className="eyebrow">Final artifact</p>
                  <h2>Build the story</h2>
                </div>
                <BookOpen size={22} />
              </div>
              <div className="approved-idea-list">
                {activeRoom.approvedIdeas.slice(0, 8).map((idea) => (
                  <article key={idea.id} className="approved-idea">
                    <strong>{idea.kind}</strong>
                    <p>{idea.text}</p>
                    <small>{idea.approvals} approvals</small>
                  </article>
                ))}
                {activeRoom.approvedIdeas.length === 0 ? <p className="muted">Approved ideas will appear here after the room votes.</p> : null}
              </div>
              <div className="button-row">
                <Button onClick={() => draftMutation.mutate()} disabled={draftMutation.isPending || activeRoom.status !== "running"}>
                  <BrainCircuit size={18} /> Build Draft From Votes
                </Button>
              </div>
              <label>
                <span className="field-label">Final title</span>
                <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Room story title" disabled={activeRoom.status !== "running"} />
              </label>
              <label>
                <span className="field-label">Final story</span>
                <textarea className="textarea story-editor" value={finalText} onChange={(event) => setFinalText(event.target.value)} rows={12} placeholder="Build a story from approved ideas. Humans should revise the AI-guided draft before saving." disabled={activeRoom.status !== "running"} />
              </label>
              <label>
                <span className="field-label">Authorship note</span>
                <textarea className="textarea" value={authorshipNote} onChange={(event) => setAuthorshipNote(event.target.value)} rows={3} placeholder="Explain what humans decided and how Kurami Guide helped." disabled={activeRoom.status !== "running"} />
              </label>
              <Button tone="success" onClick={() => saveMutation.mutate()} disabled={finalText.trim().length < 1 || saveMutation.isPending || activeRoom.status !== "running"}>
                <Check size={18} /> Save Final Story
              </Button>
            </Surface>
          </div>
        </>
      )}
      <Takeaway>{data.takeaway}</Takeaway>
    </WorkshopShell>
  );
}

function KuramiCourtPage() {
  const participant = useRequiredParticipant();
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const now = useNow();
  const initialRouteRoom = params.caseId && params.caseId.startsWith("court-") ? params.caseId : "";
  const { data } = useQuery({ queryKey: ["workshop", "kurami-court", participant.id], queryFn: () => api.workshopState<CourtState>("kurami-court", participant.id), refetchInterval: 3_000 });
  const [roomCode, setRoomCode] = useState(() => initialRouteRoom || (typeof window === "undefined" ? "" : window.sessionStorage.getItem("kurami_court_room") ?? ""));
  const [stance, setStance] = useState<(typeof COURT_STANCE_OPTIONS)[number]["id"]>("need-more-information");
  const [stakeholder, setStakeholder] = useState("");
  const [evidence, setEvidence] = useState("");
  const [argumentText, setArgumentText] = useState("");
  const [finalVote, setFinalVote] = useState<(typeof COURT_STANCE_OPTIONS)[number]["id"]>("need-more-information");
  const [finalReason, setFinalReason] = useState("");

  useEffect(() => {
    const socket = getSocket();
    const invalidate = (payload: { workshopId?: WorkshopId }) => {
      if (payload.workshopId === "kurami-court") void queryClient.invalidateQueries({ queryKey: ["workshop", "kurami-court", participant.id] });
    };
    const invalidateVotes = () => {
      void queryClient.invalidateQueries({ queryKey: ["workshop", "kurami-court", participant.id] });
    };
    socket.on("room:updated", invalidate);
    socket.on("vote:results", invalidateVotes);
    return () => {
      socket.off("room:updated", invalidate);
      socket.off("vote:results", invalidateVotes);
    };
  }, [participant.id, queryClient]);

  const activeRoom = data?.activeRoom ?? null;
  const roomCodeList = data?.roomIds ?? [];
  const phaseSeconds = secondsUntil(activeRoom?.roundEndsAt, now) ?? (activeRoom?.status === "final-vote" ? secondsUntil(activeRoom?.finalVoteEndsAt, now) : activeRoom?.phaseSecondsRemaining);
  const workshopSeconds = secondsUntil(activeRoom?.finalVoteEndsAt, now) ?? activeRoom?.workshopSecondsRemaining;
  const roomCodeText = roomCodeList.join(", ");
  const handleCourtError = (error: unknown) => {
    const message = errorMessage(error);
    toast({ tone: "error", message });
    if (isExpiredStudentSession(message)) {
      const normalized = normalizeCourtRoomId(activeRoom?.id ?? roomCode);
      if (normalized && typeof window !== "undefined") window.sessionStorage.setItem("kurami_court_room", normalized);
      clearStoredStudentSession();
      navigate("/join?returnTo=/kurami-court", { replace: true });
    }
  };

  const joinRoom = useMutation({
    mutationFn: () => api.courtRoomJoin(normalizeCourtRoomId(roomCode), participant.id),
    onSuccess: () => {
      const normalized = normalizeCourtRoomId(roomCode);
      if (typeof window !== "undefined") window.sessionStorage.setItem("kurami_court_room", normalized);
      setRoomCode(normalized);
      toast({ tone: "success", message: "Courtroom joined." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "kurami-court", participant.id] });
    },
    onError: handleCourtError
  });

  const argumentMutation = useMutation({
    mutationFn: () =>
      api.courtRoomArgument(activeRoom?.id ?? roomCode, {
        participantId: participant.id,
        stance,
        stakeholder,
        evidence,
        text: argumentText
      }),
    onSuccess: () => {
      setArgumentText("");
      setEvidence("");
      toast({ tone: "success", message: "Argument entered into the record." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "kurami-court", participant.id] });
    },
    onError: handleCourtError
  });

  const finalVoteMutation = useMutation({
    mutationFn: () =>
      api.courtRoomVote(activeRoom?.id ?? roomCode, {
        participantId: participant.id,
        vote: finalVote,
        reason: finalReason
      }),
    onSuccess: () => {
      setFinalReason("");
      toast({ tone: "success", message: "Final court vote counted." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "kurami-court", participant.id] });
    },
    onError: handleCourtError
  });

  if (!data) return <PageShell>Loading Kurami Court...</PageShell>;

  return (
    <WorkshopShell workshopId="kurami-court" icon={<Gavel size={24} />} title="Kurami Court" kicker={activeRoom ? `${activeRoom.name} · ${activeRoom.docket}` : "4 live courtrooms"}>
      {!activeRoom ? (
        <Surface>
          <p className="eyebrow">Courtroom lobby</p>
          <h2>Enter the courtroom ID your facilitator gives you.</h2>
          <p className="muted">There are four courtrooms running at once. Everyone in your class joins the same room, reads the same case, argues together, and votes at the end.</p>
          <form
            className="vote-row"
            onSubmit={(event) => {
              event.preventDefault();
              joinRoom.mutate();
            }}
          >
            <input className="input" value={roomCode} onChange={(event) => setRoomCode(event.target.value)} onBlur={() => setRoomCode(normalizeCourtRoomId(roomCode))} placeholder="court-alpha" autoCapitalize="none" />
            <Button type="submit" disabled={normalizeCourtRoomId(roomCode).length < 3 || joinRoom.isPending}>
              <Gavel size={18} /> Join Court
            </Button>
          </form>
          <div className="room-code-bank">
            {roomCodeList.map((id) => (
              <button key={id} type="button" onClick={() => setRoomCode(id)} className="room-code-chip">
                {id}
              </button>
            ))}
          </div>
          <p className="muted">Available courtroom IDs: {roomCodeText}</p>
        </Surface>
      ) : (
        <>
          <Surface>
            <div className="court-status-grid">
              <div>
                <p className="eyebrow">{activeRoom.status === "lobby" ? "Waiting for facilitator" : activeRoom.status === "final-vote" ? "Final vote open" : activeRoom.status === "ended" ? "Court adjourned" : `Round ${activeRoom.activeRound} of 5`}</p>
                <h2>{activeRoom.case.title}</h2>
                <p>{activeRoom.roundGoal}</p>
              </div>
              <div className="mafia-master-summary court-clock-summary">
                <div>
                  <span>Room</span>
                  <strong>{activeRoom.id}</strong>
                </div>
                <div>
                  <span>Joined</span>
                  <strong>{activeRoom.memberCount}</strong>
                </div>
                <div>
                  <span>Round clock</span>
                  <strong>{typeof phaseSeconds === "number" ? formatSeconds(phaseSeconds) : "Manual"}</strong>
                </div>
                <div>
                  <span>Workshop clock</span>
                  <strong>{typeof workshopSeconds === "number" ? formatSeconds(workshopSeconds) : `${data.durationMinutes}:00`}</strong>
                </div>
              </div>
            </div>
            <div className="court-round-road">
              {activeRoom.rounds.map((round) => (
                <span key={round.round} className={round.round === activeRoom.activeRound && activeRoom.status === "debate" ? "active" : round.round < activeRoom.activeRound || activeRoom.status === "final-vote" || activeRoom.status === "ended" ? "done" : ""}>
                  {round.round}. {round.title}
                </span>
              ))}
              <span className={activeRoom.status === "final-vote" ? "active" : activeRoom.status === "ended" ? "done" : ""}>Final Vote</span>
            </div>
          </Surface>

          <div className="court-grid">
            <Surface>
              <h2>Case File</h2>
              <p className="case-text">{activeRoom.case.scenario}</p>
              <div className={activeRoom.sealedDetailVisible ? "new-evidence" : "new-evidence sealed"}>
                <CircleAlert size={20} />
                <span>{activeRoom.sealedDetailVisible ? activeRoom.case.missingDetail : "Sealed detail unlocks in Round 3."}</span>
              </div>
              <div className="tag-row">
                {activeRoom.case.keyIssues.map((issue) => (
                  <span key={issue} className="tag">
                    {issue}
                  </span>
                ))}
              </div>
            </Surface>
            <Surface>
              <h2>Judge Bench</h2>
              <div className="court-judge-feed">
                {activeRoom.judgeMessages.slice(-8).map((message) => (
                  <article key={message.id} className={`court-judge-message court-judge-${message.tone}`}>
                    <strong>{message.round > 0 ? `Round ${message.round}` : "Lobby"} · AI Judge</strong>
                    <p>{message.text}</p>
                  </article>
                ))}
              </div>
            </Surface>
          </div>

          <div className="court-debate-layout">
            <Surface>
              <h2>Enter an Argument</h2>
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  argumentMutation.mutate();
                }}
              >
                <div className="field-grid">
                  <label>
                    <span className="field-label">Your position</span>
                    <select className="select" value={stance} onChange={(event) => setStance(event.target.value as typeof stance)} disabled={activeRoom.status !== "debate"}>
                      {COURT_STANCE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Most affected stakeholder</span>
                    <input className="input" value={stakeholder} onChange={(event) => setStakeholder(event.target.value)} placeholder="Students, families, patients..." disabled={activeRoom.status !== "debate"} />
                  </label>
                </div>
                <label>
                  <span className="field-label">Evidence or example</span>
                  <input className="input" value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Case fact, source, classroom example, or safeguard" disabled={activeRoom.status !== "debate"} />
                </label>
                <label>
                  <span className="field-label">Argument for the record</span>
                  <textarea className="textarea" value={argumentText} onChange={(event) => setArgumentText(event.target.value)} rows={5} placeholder="Make your point. The AI Judge will respond based on what you say." disabled={activeRoom.status !== "debate"} />
                </label>
                <Button type="submit" disabled={activeRoom.status !== "debate" || stakeholder.trim().length < 2 || argumentText.trim().length < 8 || argumentMutation.isPending}>
                  <Send size={18} /> Enter Argument
                </Button>
              </form>
            </Surface>
            <Surface>
              <h2>Class Record</h2>
              <div className="court-argument-feed">
                {activeRoom.arguments.length === 0 ? <p className="muted">Arguments will appear here when classmates enter them.</p> : null}
                {activeRoom.arguments.slice(-16).map((argument) => (
                  <article key={argument.id} className="court-argument-card">
                    <div>
                      <strong>{argument.authorName}</strong>
                      <span>Round {argument.round} · {COURT_STANCE_OPTIONS.find((option) => option.id === argument.stance)?.label ?? argument.stance}</span>
                    </div>
                    <p>{argument.text}</p>
                    <small>{argument.stakeholder}{argument.evidence ? ` · ${argument.evidence}` : ""}</small>
                  </article>
                ))}
              </div>
            </Surface>
          </div>

          <Surface>
            <div className="court-final-vote">
              <div>
                <h2>Final Vote</h2>
                <p className="muted">{activeRoom.status === "final-vote" ? "The vote is open. Cast one final decision for the courtroom." : activeRoom.status === "ended" ? "Court is adjourned. Review the final vote." : "Final vote opens after Round 5 or when the facilitator opens it."}</p>
                <VoteComparison results={{ initial: data.results.initial, final: activeRoom.voteSummary, changed: data.results.changed }} />
              </div>
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  finalVoteMutation.mutate();
                }}
              >
                <select className="select" value={finalVote} onChange={(event) => setFinalVote(event.target.value as typeof finalVote)} disabled={activeRoom.status !== "final-vote"}>
                  {COURT_STANCE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <textarea className="textarea" value={finalReason} onChange={(event) => setFinalReason(event.target.value)} rows={3} placeholder={activeRoom.participantVote ? `Your current vote: ${COURT_STANCE_OPTIONS.find((option) => option.id === activeRoom.participantVote?.vote)?.label ?? activeRoom.participantVote.vote}` : "One final reason for the judge"} disabled={activeRoom.status !== "final-vote"} />
                <Button type="submit" disabled={activeRoom.status !== "final-vote" || finalReason.trim().length < 3 || finalVoteMutation.isPending}>
                  <Vote size={18} /> Cast Final Vote
                </Button>
              </form>
            </div>
          </Surface>
        </>
      )}
      <Takeaway>{data.takeaway}</Takeaway>
    </WorkshopShell>
  );
}

function PresenterModePage() {
  const token = useSession((state) => state.facilitatorToken);
  const setEvent = useSession((state) => state.setEvent);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: dashboard } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard, refetchInterval: 5_000, enabled: Boolean(token) });
  const { data: publicEvent } = useQuery({ queryKey: ["event"], queryFn: api.eventState, refetchInterval: 5_000, enabled: !dashboard });
  const event = dashboard?.event ?? publicEvent;
  const joinUrl = `${window.location.origin}/join`;
  const control = useMutation({
    mutationFn: api.control,
    onSuccess: (updated) => {
      setEvent(updated);
      toast({ tone: "success", message: "Presenter control updated." });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["event"] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });
  const exportResults = useMutation({
    mutationFn: api.exportResults,
    onSuccess: (payload) => {
      downloadEventExport(payload);
      toast({ tone: "success", message: "Results exported." });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });

  if (!event) return <PageShell>Loading presenter mode...</PageShell>;
  const canControlEvent = Boolean(dashboard?.facilitator.isLead);

  return (
    <PageShell>
      <section className="display-hero">
        <div className="display-copy">
          <p className="eyebrow">Presenter mode</p>
          <h1>Join {event.eventName}</h1>
          <div className="display-code" aria-label="Event code">
            {event.eventCode}
          </div>
          <p>{joinUrl}</p>
          <div className="button-row">
            {canControlEvent ? (
              <>
                <Button tone="success" onClick={() => control.mutate({ action: "force-start" })}>
                  <Play size={18} /> Force Start
                </Button>
                <Button tone="quiet" onClick={() => control.mutate({ action: event.settings.fallbackMode ? "fallback-off" : "fallback-on" })}>
                  <CircleAlert size={18} /> {event.settings.fallbackMode ? "Fallback off" : "Fallback on"}
                </Button>
                <Button tone="quiet" onClick={() => exportResults.mutate()} disabled={exportResults.isPending}>
                  <Download size={18} /> Export
                </Button>
              </>
            ) : token ? (
              <StatusPill tone="neutral">{dashboard?.facilitator.roomName ?? "Room facilitator"}</StatusPill>
            ) : (
              <Link className="button button-quiet" to="/facilitator/login">
                <ShieldCheck size={18} /> Log in for controls
              </Link>
            )}
            <Link className="button button-quiet" to="/display/live">
              <Radio size={18} /> Live Display
            </Link>
            <Link className="button button-quiet" to="/display/summary">
              <Presentation size={18} /> Summary
            </Link>
          </div>
        </div>
        <div className="qr-panel">
          <QrCode value={joinUrl} label="QR code for student join page" />
          <strong>Scan to join</strong>
        </div>
      </section>

      <div className="workshop-grid">
        <RunSheetPanel event={event} />
        <Surface>
          <p className="eyebrow">Status</p>
          <div className="system-grid">
            <Metric label="Rotation" value={event.currentRotation.toString()} icon={<Clock size={20} />} />
            <Metric label="Timer" value={formatSeconds(event.timerSecondsRemaining)} icon={<Clock size={20} />} />
            <Metric label="Fallback" value={event.settings.fallbackMode ? "On" : "Off"} icon={<CircleAlert size={20} />} />
          </div>
        </Surface>
      </div>

      <TeamReadinessPanel event={event} />
      {dashboard ? <ActivityFeedPanel items={dashboard.activityFeed} /> : null}
    </PageShell>
  );
}

function WorkshopLiveDisplayPage() {
  const token = useSession((state) => state.facilitatorToken);
  const { data: dashboard } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard, refetchInterval: 4_000, enabled: Boolean(token) });
  const { data: publicEvent } = useQuery({ queryKey: ["event"], queryFn: api.eventState, refetchInterval: 4_000, enabled: !dashboard });
  const event = dashboard?.event ?? publicEvent;

  if (!event) return <PageShell>Loading live display...</PageShell>;

  const activeTeams = event.teams.filter((team) => team.memberCount > 0);
  const activeWorkshopNames = [...new Set(activeTeams.map((team) => WORKSHOPS[currentWorkshopForGroup(team.group, event.currentRotation)].name))];
  const allReady = activeTeams.length > 0 && activeTeams.every((team) => team.ready);

  return (
    <PageShell>
      <section className={`live-display-hero ${allReady ? "all-ready-pulse" : ""}`}>
        <div>
          <p className="eyebrow">Workshop live</p>
          <h1>{event.currentRotation === 0 ? "Onboarding" : `Rotation ${event.currentRotation}`}</h1>
          <p>{activeWorkshopNames.length > 0 ? activeWorkshopNames.join(" · ") : "Waiting for students to join"}</p>
        </div>
        <div className="timer-block">
          <Clock size={28} />
          <strong>{formatSeconds(event.timerSecondsRemaining)}</strong>
          <span>{allReady ? "All active teams ready" : event.status}</span>
        </div>
      </section>
      <div className="workshop-grid">
        <Surface>
          <p className="eyebrow">Room pulse</p>
          <div className="system-grid">
            <Metric label="Active teams" value={activeTeams.length.toString()} icon={<Users size={20} />} />
            <Metric label="Ready teams" value={`${activeTeams.filter((team) => team.ready).length}/${Math.max(1, activeTeams.length)}`} icon={<BadgeCheck size={20} />} />
            <Metric label="Students online" value={event.participantsOnline.toString()} icon={<Wifi size={20} />} />
          </div>
        </Surface>
        {dashboard ? <ActivityFeedPanel items={dashboard.activityFeed} title="Live submissions and votes" /> : <RunSheetPanel event={event} />}
      </div>
      <TeamReadinessPanel event={event} />
      {dashboard ? <StudentProgressPanel dashboard={dashboard} compact /> : null}
    </PageShell>
  );
}

function EventSummaryPage() {
  const token = useSession((state) => state.facilitatorToken);
  const toast = useToast();
  const { data: dashboard } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard, refetchInterval: 8_000, enabled: Boolean(token) });
  const exportResults = useMutation({
    mutationFn: api.exportResults,
    onSuccess: (payload) => {
      downloadEventExport(payload);
      toast({ tone: "success", message: "Results exported." });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });

  if (!token) {
    return (
      <PageShell compact>
        <Surface>
          <p className="eyebrow">Event summary</p>
          <h1 className="page-title">Here's what your class created.</h1>
          <p className="muted">Log in as facilitator to show class artifacts, votes, charter rules, stories, and AI usage.</p>
          <Link className="button button-primary" to="/facilitator/login">
            <ShieldCheck size={18} /> Log in
          </Link>
        </Surface>
      </PageShell>
    );
  }

  if (!dashboard) return <PageShell>Loading summary...</PageShell>;

  return (
    <PageShell>
      <section className="summary-hero">
        <div>
          <p className="eyebrow">Event summary</p>
          <h1>Here's what your class created.</h1>
          <p>
            {dashboard.summary.humanParticipants} students, {dashboard.summary.aiClassmates} AI classmates, {dashboard.summary.totalSubmissions} submissions, {dashboard.summary.totalVotes} votes.
          </p>
        </div>
        <Button tone="quiet" onClick={() => exportResults.mutate()} disabled={exportResults.isPending}>
          <FileDown size={18} /> Export Results
        </Button>
      </section>
      <div className="system-grid">
        <Metric label="Ready teams" value={`${dashboard.summary.readyTeams}/${Math.max(1, dashboard.summary.activeTeams)}`} icon={<BadgeCheck size={20} />} />
        <Metric label="Published stories" value={dashboard.summary.publishedStories.toString()} icon={<BookOpen size={20} />} />
        <Metric label="Charter rules" value={dashboard.summary.finalCharterRules.toString()} icon={<Crown size={20} />} />
      </div>
      <div className="workshop-grid">
        <Surface>
          <p className="eyebrow">Class charter</p>
          <div className="response-list">
            {dashboard.summary.topCharterRules.map((rule) => (
              <article key={rule.id} className="evidence-item">
                <strong>{rule.votes} votes</strong>
                <p>{rule.text}</p>
                <small>{rule.status}</small>
              </article>
            ))}
            {dashboard.summary.topCharterRules.length === 0 ? <p className="muted">Charter rules will appear after students vote.</p> : null}
          </div>
        </Surface>
        <Surface>
          <p className="eyebrow">Story artifacts</p>
          <div className="response-list">
            {dashboard.summary.featuredStories.map((story) => (
              <article key={story.id} className="evidence-item">
                <strong>{story.title}</strong>
                <p>{story.excerpt || "Story draft started."}</p>
                <small>{story.teamName}</small>
              </article>
            ))}
            {dashboard.summary.featuredStories.length === 0 ? <p className="muted">Story artifacts will appear after teams draft or publish.</p> : null}
          </div>
        </Surface>
      </div>
      <ActivityFeedPanel items={dashboard.activityFeed} />
    </PageShell>
  );
}

function FacilitatorLoginPage() {
  const navigate = useNavigate();
  const setToken = useSession((state) => state.setFacilitatorToken);
  const storedScope = useSession((state) => state.facilitatorScope);
  const [pin, setPin] = useState("");
  const [roomScope, setRoomScope] = useState<FacilitatorRoomScope>(isFacilitatorRoomScope(storedScope) ? storedScope : "lead");
  const mutation = useMutation({
    mutationFn: () => api.facilitatorLogin(pin, roomScope),
    onSuccess: (result) => {
      setToken(result.token, result.roomScope);
      navigate("/facilitator");
    }
  });
  return (
    <PageShell compact>
      <Surface className="login-panel">
        <p className="eyebrow">Facilitator access</p>
        <h1 className="page-title">Open the right control room.</h1>
        <p className="muted">Choose your assigned room before logging in. Room facilitators only see students, workshop rooms, activity, and controls for their room.</p>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <label>
            <span className="field-label">Room scope</span>
            <select className="select" value={roomScope} onChange={(event) => setRoomScope(event.target.value as FacilitatorRoomScope)}>
              {FACILITATOR_ROOM_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <p className="microcopy">{FACILITATOR_ROOM_OPTIONS.find((option) => option.id === roomScope)?.description}</p>
          <input className="input" value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" placeholder="Facilitator PIN" />
          <Button type="submit" disabled={pin.length < 4 || mutation.isPending}>
            <ShieldCheck size={18} /> Unlock Dashboard
          </Button>
          {mutation.error ? <p className="error-text">{mutation.error.message}</p> : null}
        </form>
      </Surface>
    </PageShell>
  );
}

function FacilitatorDashboardPage() {
  const token = useSession((state) => state.facilitatorToken);
  const setToken = useSession((state) => state.setFacilitatorToken);
  const setEvent = useSession((state) => state.setEvent);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [announcement, setAnnouncement] = useState("");
  const { data, error } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard, refetchInterval: 8_000, enabled: Boolean(token) });
  const logout = useMutation({
    mutationFn: api.facilitatorLogout,
    onSettled: () => {
      setToken(null);
      queryClient.removeQueries({ queryKey: ["dashboard"] });
      toast({ tone: "success", message: "Facilitator logged out. Choose another room." });
      navigate("/facilitator/login", { replace: true });
    }
  });
  const control = useMutation({
    mutationFn: api.control,
    onSuccess: (event) => {
      setEvent(event);
      toast({ tone: "success", message: "Facilitator control updated." });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["event"] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });
  const announce = useMutation({
    mutationFn: () => api.announce(announcement),
    onSuccess: () => {
      setAnnouncement("");
      toast({ tone: "success", message: "Announcement sent." });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });
  const exportResults = useMutation({
    mutationFn: api.exportResults,
    onSuccess: (payload) => {
      downloadEventExport(payload);
      toast({ tone: "success", message: "Results exported." });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });

  if (!token) return <Navigate to="/facilitator/login" replace />;
  if (error) return <Navigate to="/facilitator/login" replace />;
  if (!data) return <PageShell>Loading dashboard...</PageShell>;
  const isLead = data.facilitator.isLead;
  const scopedAssignment = facilitatorAssignment(data.facilitator.scope);

  return (
    <PageShell>
      <section className="facilitator-head">
        <div>
          <p className="eyebrow">{isLead ? "Lead facilitator" : data.facilitator.roomName}</p>
          <h1>{data.event.eventName}</h1>
          <p>
            Code {data.event.eventCode} · Rotation {data.event.currentRotation} · {isLead ? "Full event control" : `${scopedAssignment?.rotationGroup ?? "Room"} room view`} · {data.event.status}
          </p>
        </div>
        <div className="dashboard-actions">
          <div className="timer-block">
            <Clock size={24} />
            <strong>{formatSeconds(data.event.timerSecondsRemaining)}</strong>
            <span>Master timer</span>
          </div>
          <Button tone="quiet" onClick={() => logout.mutate()} disabled={logout.isPending}>
            <LogOut size={18} /> Switch room
          </Button>
        </div>
      </section>
      {isLead ? (
        <section className="control-grid">
          <ControlButton icon={<Play size={18} />} label="Start" onClick={() => control.mutate({ action: "start" })} />
          <ControlButton icon={<Play size={18} />} label="Force Start" onClick={() => control.mutate({ action: "force-start" })} />
          <ControlButton icon={<Pause size={18} />} label="Pause" onClick={() => control.mutate({ action: "pause" })} />
          <ControlButton icon={<Play size={18} />} label="Resume" onClick={() => control.mutate({ action: "resume" })} />
          <ControlButton icon={<ChevronRight size={18} />} label="Advance" onClick={() => control.mutate({ action: "advance-rotation" })} />
          <ControlButton icon={<RotateCcw size={18} />} label="Previous" onClick={() => control.mutate({ action: "previous-rotation" })} />
          <ControlButton icon={<Clock size={18} />} label="+5 min" onClick={() => control.mutate({ action: "extend", minutes: 5 })} />
          <ControlButton icon={<Clock size={18} />} label="-5 min" onClick={() => control.mutate({ action: "shorten", minutes: 5 })} />
          <ControlButton icon={<CircleAlert size={18} />} label={data.event.settings.fallbackMode ? "Fallback off" : "Fallback on"} onClick={() => control.mutate({ action: data.event.settings.fallbackMode ? "fallback-off" : "fallback-on" })} />
          <Link className="button button-quiet" to="/display">
            <Network size={18} /> QR Display
          </Link>
          <Link className="button button-quiet" to="/display/live">
            <Radio size={18} /> Live Display
          </Link>
          <Link className="button button-quiet" to="/display/summary">
            <Presentation size={18} /> Summary
          </Link>
          <Button tone="quiet" onClick={() => exportResults.mutate()} disabled={exportResults.isPending}>
            <Download size={18} /> Export Results
          </Button>
        </section>
      ) : (
        <Surface className="room-scope-card">
          <div>
            <p className="eyebrow">Room-limited console</p>
            <h2>{data.facilitator.roomName}</h2>
            <p className="muted">
              You can see and control this room's Who's Who room, Data-Detective split rooms, Storibloom split rooms, and courtroom only. Lead-only event controls are hidden.
            </p>
          </div>
          <div className="button-row">
            <Link className="button button-quiet" to="/display/live">
              <Radio size={18} /> Room Live Display
            </Link>
            <Link className="button button-quiet" to="/display/summary">
              <Presentation size={18} /> Summary
            </Link>
          </div>
        </Surface>
      )}
      <div className="workshop-grid">
        {isLead ? (
          <Surface>
            <h2>Broadcast</h2>
            <form
              className="form-stack"
              onSubmit={(event) => {
                event.preventDefault();
                announce.mutate();
              }}
            >
              <input className="input" value={announcement} onChange={(event) => setAnnouncement(event.target.value)} maxLength={260} placeholder="Message all students" />
              <Button type="submit" disabled={announcement.trim().length === 0 || announce.isPending}>
                <Megaphone size={18} /> Send Announcement
              </Button>
            </form>
          </Surface>
        ) : null}
        <Surface>
          <h2>System</h2>
          <div className="system-grid">
            <Metric label="Online" value={data.event.participantsOnline.toString()} icon={<Wifi size={20} />} />
            <Metric label="Disconnected" value={data.event.participantsDisconnected.toString()} icon={<WifiOff size={20} />} />
            <Metric label="Database" value={data.system.database} icon={<ShieldCheck size={20} />} />
            <Metric label="Redis" value={data.system.redis} icon={<Network size={20} />} />
            <Metric label="OpenAI" value={data.system.openai} icon={<BrainCircuit size={20} />} />
            <Metric label="AI requests" value={data.apiUsage.aiRequests.toString()} icon={<Sparkles size={20} />} />
          </div>
        </Surface>
      </div>
      <TeamReadinessPanel event={data.event} />
      <div className="workshop-grid">
        <RunSheetPanel event={data.event} />
        <ActivityFeedPanel items={data.activityFeed} />
      </div>
      <StudentProgressPanel dashboard={data} />
      <FacilitatorNotesPanel />
      <FacilitatorWorkshopControls dashboard={data} />
    </PageShell>
  );
}

function TeamReadinessPanel({ event }: { event: EventState }) {
  const activeTeams = event.teams.filter((team) => team.memberCount > 0);
  const allActiveTeamsReady = activeTeams.length > 0 && activeTeams.every((team) => team.ready);
  return (
    <Surface className={allActiveTeamsReady ? "all-ready-pulse" : undefined}>
      <div className="section-head">
        <div>
          <p className="eyebrow">Team readiness</p>
          <h2>{allActiveTeamsReady ? "All active teams are ready." : "Wait for seats, then start."}</h2>
        </div>
        <StatusPill tone={allActiveTeamsReady ? "good" : "warn"}>
          {event.teams.filter((team) => team.ready).length}/{event.teams.length} ready
        </StatusPill>
      </div>
      <div className="team-readiness-grid">
        {event.teams.map((team) => {
          const label = `${team.memberCount}/${team.targetSize} ${team.ready ? "ready" : "waiting"}`;
          const workshop = WORKSHOPS[currentWorkshopForGroup(team.group, event.currentRotation)];
          return (
            <div key={team.id} className={team.ready ? "team-ready-card team-ready" : "team-ready-card"}>
              <strong>{team.name}</strong>
              <span>{label}</span>
              <small>{workshop.shortName}</small>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

function RunSheetPanel({ event }: { event: EventState }) {
  const activeTeams = event.teams.filter((team) => team.memberCount > 0);
  const allActiveTeamsReady = activeTeams.length > 0 && activeTeams.every((team) => team.ready);
  const complete = (step: (typeof RUN_OF_SHOW_STEPS)[number]) => {
    if (step === "Ask students to scan the QR code.") return event.participantsOnline > 0;
    if (step === "Confirm each room is using the correct facilitator login.") return true;
    if (step === "Students enter room IDs and wait in the lobby.") return activeTeams.some((team) => team.memberCount > 0);
    if (step === "Start the current workshop.") return event.currentRotation >= 1 && event.status === "running";
    return event.currentRotation > 1 || event.status === "ended";
  };
  return (
    <Surface>
      <div className="section-head">
        <div>
          <p className="eyebrow">Live run sheet</p>
          <h2>Facilitator cues</h2>
        </div>
        <StatusPill tone={allActiveTeamsReady ? "good" : "neutral"}>{allActiveTeamsReady ? "Ready cue" : "On script"}</StatusPill>
      </div>
      <ol className="script-list">
        {RUN_OF_SHOW_STEPS.map((step) => (
          <li key={step} className={complete(step) ? "script-step script-step-done" : "script-step"}>
            <span>{complete(step) ? <Check size={16} /> : <ListChecks size={16} />}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
      <p className="microcopy">Keep the facilitator PIN private and keep projected screens on the room view students should see.</p>
    </Surface>
  );
}

function StudentProgressPanel({ dashboard, compact = false }: { dashboard: DashboardResponse; compact?: boolean }) {
  const visibleParticipants = compact ? dashboard.progress.participants.slice(0, 24) : dashboard.progress.participants.slice(0, 80);
  return (
    <Surface>
      <div className="section-head">
        <div>
          <p className="eyebrow">Progress indicators</p>
          <h2>Student progress</h2>
          <p className="microcopy">Joined, waiting, active, submitted, voted.</p>
        </div>
        <StatusPill tone="neutral">{dashboard.progress.participants.length} seats</StatusPill>
      </div>
      <div className="team-progress-grid">
        {dashboard.progress.teams
          .filter((team) => team.joined > 0 || !compact)
          .map((team) => (
            <article key={team.teamId} className="team-progress-card">
              <div className="section-head">
                <div>
                  <strong>{team.teamName}</strong>
                  <small>{WORKSHOPS[team.currentWorkshop].shortName}</small>
                </div>
                <StatusPill tone={team.ready ? "good" : "warn"}>{team.readiness}</StatusPill>
              </div>
              <div className="progress-chips">
                <span>joined {team.joined}</span>
                <span>waiting {team.waiting}</span>
                <span>active {team.active}</span>
                <span>submitted {team.submitted}</span>
                <span>voted {team.voted}</span>
              </div>
            </article>
          ))}
      </div>
      <div className="participant-progress-list">
        {visibleParticipants.map((participant) => (
          <div key={participant.participantId} className="participant-progress-row">
            <span>
              {participant.nickname}
              {participant.isAi ? <small>AI</small> : null}
            </span>
            <span>{participant.teamName}</span>
            <StatusPill tone={statusTone(participant.status)}>{participant.status}</StatusPill>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function ActivityFeedPanel({ items, title = "Live activity" }: { items: ActivityFeedItem[]; title?: string }) {
  return (
    <Surface>
      <div className="section-head">
        <div>
          <p className="eyebrow">Activity feed</p>
          <h2>{title}</h2>
        </div>
        <Activity size={22} />
      </div>
      <div className="activity-feed">
        {items.map((item) => (
          <article key={item.id} className={`activity-item activity-${item.tone}`}>
            <span>{activityIcon(item.tone)}</span>
            <div>
              <strong>{item.message}</strong>
              <small>{formatRelativeTime(item.at)}</small>
            </div>
          </article>
        ))}
      </div>
    </Surface>
  );
}

function FacilitatorNotesPanel() {
  return (
    <Surface>
      <div className="section-head">
        <div>
          <p className="eyebrow">Workshop timing notes</p>
          <h2>Facilitator cues by workshop</h2>
        </div>
        <Clock size={22} />
      </div>
      <div className="notes-grid">
        {workshopOrder.map((workshopId) => (
          <article key={workshopId} className={`notes-card portal-${workshopId}`}>
            <strong>{WORKSHOPS[workshopId].name}</strong>
            <div className="response-list">
              {FACILITATOR_NOTES[workshopId].map((note) => (
                <div key={`${workshopId}-${note.time}`} className="note-row">
                  <span>{note.time}</span>
                  <p>{note.cue}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Surface>
  );
}

function FacilitatorWorkshopControls({ dashboard }: { dashboard: DashboardResponse }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isLead = dashboard.facilitator.isLead;
  const whoWhoRooms = scopedWhoWhoRooms(dashboard.facilitator.scope);
  const [whoWhoRoom, setWhoWhoRoom] = useState(whoWhoRooms[0]?.id ?? "gold-alpha");
  const now = useNow();

  useEffect(() => {
    const firstRoom = whoWhoRooms[0]?.id;
    if (firstRoom && !whoWhoRooms.some((room) => room.id === whoWhoRoom)) {
      setWhoWhoRoom(firstRoom);
    }
  }, [whoWhoRoom, whoWhoRooms]);

  const { data: whoWhoGameRoom } = useQuery({ queryKey: ["facilitator", "whos-who", whoWhoRoom], queryFn: () => api.facilitatorWhoWhoRoom<WhoWhoState["room"]>(whoWhoRoom), refetchInterval: 3_000, enabled: Boolean(whoWhoRoom) });
  const { data: detectiveState } = useQuery({ queryKey: ["facilitator", "data-detective", dashboard.facilitator.scope], queryFn: () => api.facilitatorWorkshopState<DetectiveState>("data-detective"), refetchInterval: 4_000 });
  const { data: storyState } = useQuery({ queryKey: ["facilitator", "storibloom", dashboard.facilitator.scope], queryFn: () => api.facilitatorWorkshopState<StoryState>("storibloom"), refetchInterval: 4_000 });
  const { data: courtState } = useQuery({ queryKey: ["facilitator", "kurami-court", dashboard.facilitator.scope], queryFn: () => api.facilitatorWorkshopState<CourtState>("kurami-court"), refetchInterval: 4_000 });
  const unlock = useMutation({
    mutationFn: ({ workshopId, unlocked }: { workshopId: WorkshopId; unlocked: boolean }) => api.unlock(workshopId, unlocked),
    onSuccess: () => {
      toast({ tone: "success", message: "Workshop access updated." });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });
  const whoWhoGame = useMutation({
    mutationFn: (action: WhoWhoGameAction) => api.whoWhoGame(whoWhoRoom, action),
    onSuccess: (_, action) => {
      toast({ tone: "success", message: `Who's Who ${action.replace("-", " ")} complete.` });
      void queryClient.invalidateQueries({ queryKey: ["facilitator", "whos-who", whoWhoRoom] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });
  const stage = useMutation({
    mutationFn: (value: number) => api.detectiveStage(value),
    onSuccess: () => {
      toast({ tone: "success", message: "Detective stage updated." });
      void queryClient.invalidateQueries({ queryKey: ["facilitator", "data-detective"] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });
  const storyRoomControl = useMutation({
    mutationFn: ({ roomId, action }: { roomId: string; action: "start" | "reset" | "end" }) => api.storyRoomControl(roomId, action),
    onSuccess: (_, variables) => {
      toast({ tone: "success", message: `${variables.roomId} ${variables.action} complete.` });
      void queryClient.invalidateQueries({ queryKey: ["facilitator", "storibloom"] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });
  const courtRoomControl = useMutation({
    mutationFn: ({ roomId, action }: { roomId: string; action: "start" | "next-round" | "final-vote" | "end" | "reset" }) => api.courtRoomControl(roomId, action),
    onSuccess: (_, variables) => {
      toast({ tone: "success", message: `${variables.roomId} ${variables.action.replace("-", " ")} complete.` });
      void queryClient.invalidateQueries({ queryKey: ["facilitator", "kurami-court"] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });
  const whoWhoPhaseSeconds = secondsUntil(whoWhoGameRoom?.game.phaseEndsAt, now) ?? whoWhoGameRoom?.game.phaseSecondsRemaining;
  const whoWhoWorkshopSeconds = secondsUntil(whoWhoGameRoom?.game.workshopEndsAt, now) ?? whoWhoGameRoom?.game.workshopSecondsRemaining;
  return (
    <section className="facilitator-panels">
      {workshopOrder.map((workshopId) => (
        <Surface key={workshopId}>
          <h2>{WORKSHOPS[workshopId].name}</h2>
          <p>{WORKSHOPS[workshopId].identity.tagline}</p>
          {isLead ? (
            <div className="button-row">
              <Button tone="quiet" onClick={() => unlock.mutate({ workshopId, unlocked: true })}>
                <Unlock size={18} /> Unlock
              </Button>
              <Button tone="quiet" onClick={() => unlock.mutate({ workshopId, unlocked: false })}>
                <Lock size={18} /> Lock
              </Button>
            </div>
          ) : null}
          {workshopId === "whos-who" ? (
            <div className="form-stack">
              <div className="field-grid">
                <label>
                  <span className="field-label">Room ID</span>
                  <select className="select" value={whoWhoRoom} onChange={(event) => setWhoWhoRoom(event.target.value)}>
                    {whoWhoRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.label} · {room.id}
                      </option>
                    ))}
                  </select>
                </label>
                {isLead ? (
                  <label>
                    <span className="field-label">Manual room ID</span>
                    <input className="input" value={whoWhoRoom} onChange={(event) => setWhoWhoRoom(event.target.value.trim().toLowerCase())} />
                  </label>
                ) : null}
              </div>
              {whoWhoGameRoom ? (
                <div className="mafia-master-summary">
                  <div>
                    <span>Seats</span>
                    <strong>
                      {whoWhoGameRoom.game.seatsFilled}/{whoWhoGameRoom.game.seatCount}
                    </strong>
                  </div>
                  <div>
                    <span>Phase</span>
                    <strong>{whoWhoGameRoom.game.phaseName}</strong>
                  </div>
                  <div>
                    <span>Round</span>
                    <strong>{whoWhoGameRoom.game.roundNumber}</strong>
                  </div>
                  <div>
                    <span>Phase clock</span>
                    <strong>{typeof whoWhoPhaseSeconds === "number" ? formatSeconds(whoWhoPhaseSeconds) : "Manual"}</strong>
                  </div>
                  <div>
                    <span>Game clock</span>
                    <strong>{typeof whoWhoWorkshopSeconds === "number" ? formatSeconds(whoWhoWorkshopSeconds) : `${WORKSHOP_DURATION_MINUTES}:00`}</strong>
                  </div>
                  <div>
                    <span>Humans alive</span>
                    <strong>{whoWhoGameRoom.game.humansAlive}</strong>
                  </div>
                  <div>
                    <span>AI alive</span>
                    <strong>{whoWhoGameRoom.game.aiRemaining ?? 0}</strong>
                  </div>
                </div>
              ) : null}
              {whoWhoGameRoom ? (
                <div className="mafia-master-rules">
                  <WhoWhoRules game={whoWhoGameRoom.game} />
                </div>
              ) : null}
              <div className="button-row">
                <Button tone="quiet" onClick={() => whoWhoGame.mutate("start")} disabled={whoWhoGame.isPending}>
                  <Play size={18} /> Start Game
                </Button>
                <Button tone="quiet" onClick={() => whoWhoGame.mutate("force-vote")} disabled={whoWhoGame.isPending}>
                  <Vote size={18} /> Force Night
                </Button>
                <Button tone="quiet" onClick={() => whoWhoGame.mutate("resolve")} disabled={whoWhoGame.isPending}>
                  <Check size={18} /> Resolve Vote
                </Button>
                <Button tone="quiet" onClick={() => whoWhoGame.mutate("next-round")} disabled={whoWhoGame.isPending}>
                  <ChevronRight size={18} /> Next Day
                </Button>
                <Button tone="quiet" onClick={() => whoWhoGame.mutate("reveal")} disabled={whoWhoGame.isPending}>
                  <Eye size={18} /> Reveal Room
                </Button>
                <Button tone="danger" onClick={() => whoWhoGame.mutate("reset")} disabled={whoWhoGame.isPending}>
                  <RotateCcw size={18} /> Reset Room
                </Button>
                <Link className="button button-quiet" to={`/display/whos-who/${whoWhoRoom}`}>
                  <Presentation size={18} /> Project Room
                </Link>
              </div>
              {whoWhoGameRoom ? (
                <div className="mafia-master-grid">
                  {whoWhoGameRoom.identities.map((identity) => (
                    <div key={identity.id} className={`mafia-master-seat ${identity.isAi ? "mafia-master-ai" : ""} ${identity.alive ? "" : "mafia-seat-dead"}`}>
                      <strong>{identity.displayName}</strong>
                      <span>{identity.joined ? (identity.isAi ? "AI" : "Human") : "Open seat"}</span>
                      <small>
                        {identity.role ?? "No role"}
                        {identity.role ? ` · ${whoWhoGameRoom.roleAbilities.find((ability) => ability.role === identity.role)?.abilityName ?? "Role power"}` : ""}
                        {identity.aiPersonaNote ? ` · ${identity.aiPersonaNote}` : ""}
                      </small>
                    </div>
                  ))}
                </div>
              ) : null}
              {whoWhoGameRoom && whoWhoGameRoom.abilityUses.length > 0 ? (
                <div className="mafia-ability-list">
                  {whoWhoGameRoom.abilityUses.slice(-8).map((use) => (
                    <article key={use.id} className={`mafia-ability-use ${use.isPublic ? "mafia-ability-public" : ""}`}>
                      <strong>
                        {use.actorDisplayName} · {use.abilityName}
                      </strong>
                      <p>{use.result}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {workshopId === "data-detective" ? (
            <div className="form-stack">
              {isLead ? (
                <div className="button-row">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Button key={value} tone="quiet" onClick={() => stage.mutate(value)}>
                      Stage {value}
                    </Button>
                  ))}
                </div>
              ) : null}
              <div className="mafia-master-summary">
                {(detectiveState?.rooms ?? []).map((room) => (
                  <div key={room.id}>
                    <span>{room.id}</span>
                    <strong>{room.memberCount} joined</strong>
                    <small>
                      {room.business.name} · {room.claimsCount} claims · {room.votes.fund}/{room.votes.reject} vote
                    </small>
                  </div>
                ))}
              </div>
              <div className="button-row">
                {(detectiveState?.rooms ?? []).map((room) => (
                  <Link key={room.id} className="button button-quiet" to={`/display/data-detective/${room.id}`}>
                    <Presentation size={18} /> Project {room.id}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          {workshopId === "storibloom" ? (
            <div className="form-stack">
              <div className="mafia-master-summary">
                {(storyState?.rooms ?? []).map((room) => (
                  <div key={room.id}>
                    <span>{room.id}</span>
                    <strong>{room.memberCount} joined</strong>
                    <small>
                      {room.status} · {room.stageTitle} · {room.approvedProposalCount} approved
                    </small>
                  </div>
                ))}
              </div>
              <div className="story-facilitator-room-list">
                {(storyState?.rooms ?? []).map((room) => (
                  <article key={room.id} className="story-facilitator-room">
                    <div>
                      <strong>{room.name}</strong>
                      <small>{room.id} · {room.lane}</small>
                    </div>
                    <div className="button-row">
                      <Button tone="quiet" onClick={() => storyRoomControl.mutate({ roomId: room.id, action: "start" })} disabled={storyRoomControl.isPending || room.status === "running"}>
                        <Play size={18} /> Start
                      </Button>
                      <Button tone="quiet" onClick={() => storyRoomControl.mutate({ roomId: room.id, action: "end" })} disabled={storyRoomControl.isPending || room.status === "ended"}>
                        <Check size={18} /> End
                      </Button>
                      <Button tone="danger" onClick={() => storyRoomControl.mutate({ roomId: room.id, action: "reset" })} disabled={storyRoomControl.isPending}>
                        <RotateCcw size={18} /> Reset
                      </Button>
                      <Link className="button button-quiet" to={`/display/storibloom/${room.id}`}>
                        <Presentation size={18} /> Project
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          {workshopId === "kurami-court" ? (
            <div className="form-stack">
              <div className="mafia-master-summary">
                {(courtState?.rooms ?? []).map((room) => (
                  <div key={room.id}>
                    <span>{room.id}</span>
                    <strong>{room.status === "debate" ? `Round ${room.activeRound}` : room.status}</strong>
                    <small>
                      {room.memberCount} joined · {room.argumentCount} arguments · {room.voteSummary.total} votes
                    </small>
                  </div>
                ))}
              </div>
              <div className="story-facilitator-room-list">
                {(courtState?.rooms ?? []).map((room) => (
                  <article key={room.id} className="story-facilitator-room">
                    <div>
                      <strong>{room.name}</strong>
                      <small>
                        {room.docket} · {room.caseTitle}
                      </small>
                    </div>
                    <div className="button-row">
                      <Button tone="quiet" onClick={() => courtRoomControl.mutate({ roomId: room.id, action: "start" })} disabled={courtRoomControl.isPending || room.status === "debate"}>
                        <Play size={18} /> Start
                      </Button>
                      <Button tone="quiet" onClick={() => courtRoomControl.mutate({ roomId: room.id, action: "next-round" })} disabled={courtRoomControl.isPending || room.status === "ended"}>
                        <ChevronRight size={18} /> Next Round
                      </Button>
                      <Button tone="quiet" onClick={() => courtRoomControl.mutate({ roomId: room.id, action: "final-vote" })} disabled={courtRoomControl.isPending || room.status === "ended"}>
                        <Vote size={18} /> Final Vote
                      </Button>
                      <Button tone="quiet" onClick={() => courtRoomControl.mutate({ roomId: room.id, action: "end" })} disabled={courtRoomControl.isPending || room.status === "ended"}>
                        <Check size={18} /> End
                      </Button>
                      <Button tone="danger" onClick={() => courtRoomControl.mutate({ roomId: room.id, action: "reset" })} disabled={courtRoomControl.isPending}>
                        <RotateCcw size={18} /> Reset
                      </Button>
                      <Link className="button button-quiet" to={`/display/kurami-court/${room.id}`}>
                        <Presentation size={18} /> Project
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </Surface>
      ))}
      <Surface>
        <h2>Participants</h2>
        <div className="participant-table" role="table" aria-label="Participant status">
          {dashboard.participants.slice(0, 80).map((participant) => (
            <div key={participant.id} role="row">
              <span>{participant.nickname}</span>
              <span>{participant.group}</span>
              <span>{participant.teamName}</span>
              <span>{participant.points} pts</span>
            </div>
          ))}
        </div>
      </Surface>
      <Surface>
        <h2>Moderation</h2>
        {dashboard.moderationQueue.length === 0 ? <p className="muted">No unresolved flags.</p> : null}
        {dashboard.moderationQueue.map((flag) => (
          <article key={flag.id} className="evidence-item">
            <strong>{flag.severity}</strong>
            <p>{flag.reason}</p>
            <small>{flag.contentType}</small>
          </article>
        ))}
      </Surface>
    </section>
  );
}

function StoryGalleryPage() {
  const participant = useRequiredParticipant();
  const { data } = useQuery({ queryKey: ["workshop", "storibloom", participant.id], queryFn: () => api.workshopState<StoryState>("storibloom", participant.id) });
  return (
    <PageShell>
      <p className="eyebrow">Moderated library</p>
      <h1 className="page-title">Story Gallery</h1>
      <section className="portal-grid">
        {data?.stories.map((story) => (
          <article key={story.id} className="portal portal-storibloom">
            <StatusPill tone={story.status === "published" ? "good" : "warn"}>{story.status}</StatusPill>
            <h2>{story.title || "Untitled Bloom"}</h2>
            <p>{(story.finalText || story.draft || "A story seed is still growing.").slice(0, 180)}</p>
          </article>
        ))}
      </section>
    </PageShell>
  );
}

function CharterPage() {
  const participant = useRequiredParticipant();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data } = useQuery({ queryKey: ["workshop", "kurami-court"], queryFn: () => api.workshopState<CourtState>("kurami-court", participant.id) });
  const [text, setText] = useState("");
  const proposalMutation = useMutation({
    mutationFn: () => api.charterProposal({ teamId: participant.teamId, text }),
    onSuccess: () => {
      setText("");
      toast({ tone: "success", message: "Charter rule submitted." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "kurami-court"] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });
  const voteMutation = useMutation({
    mutationFn: (proposalId: string) => api.charterVote({ participantId: participant.id, proposalId }),
    onSuccess: () => {
      toast({ tone: "success", message: "Charter vote counted." });
      void queryClient.invalidateQueries({ queryKey: ["workshop", "kurami-court"] });
    },
    onError: (error) => toast({ tone: "error", message: errorMessage(error) })
  });
  return (
    <PageShell>
      <p className="eyebrow">Youth Responsible AI Charter</p>
      <h1 className="page-title">Rules worth keeping.</h1>
      <Surface>
        <form
          className="vote-row"
          onSubmit={(event) => {
            event.preventDefault();
            proposalMutation.mutate();
          }}
        >
          <input className="input" value={text} onChange={(event) => setText(event.target.value)} maxLength={240} placeholder="One rule every AI system should follow" />
          <Button type="submit" disabled={text.length < 8}>
            <Send size={18} /> Submit Rule
          </Button>
        </form>
      </Surface>
      <section className="portal-grid">
        {data?.charter.map((proposal) => (
          <article key={proposal.id} className="portal portal-kurami-court">
            <StatusPill tone={proposal.status === "approved" ? "good" : "warn"}>{proposal.status}</StatusPill>
            <p>{proposal.text}</p>
            <Button tone="quiet" onClick={() => voteMutation.mutate(proposal.id)}>
              <Crown size={18} /> Vote {proposal.votes.length}
            </Button>
          </article>
        ))}
      </section>
    </PageShell>
  );
}

function LeaderboardPage() {
  const [mode, setMode] = useState<"individual" | "team" | "rotation-group">("team");
  const { data = [] } = useQuery({ queryKey: ["leaderboard", mode], queryFn: () => api.leaderboard(mode), refetchInterval: 12_000 });
  return (
    <PageShell compact>
      <p className="eyebrow">Leaderboard</p>
      <h1 className="page-title">Points for responsible moves.</h1>
      <div className="segmented">
        {(["team", "rotation-group", "individual"] as const).map((item) => (
          <button key={item} className={mode === item ? "segment-active" : ""} onClick={() => setMode(item)}>
            {item}
          </button>
        ))}
      </div>
      <Surface>
        {data.map((entry, index) => (
          <div key={entry.id} className="leader-row">
            <strong>{index + 1}</strong>
            <span>{entry.label}</span>
            <span>{entry.group}</span>
            <b>{entry.points}</b>
          </div>
        ))}
      </Surface>
    </PageShell>
  );
}

function BadgesPage() {
  const participant = useSession((state) => state.participant);
  return (
    <PageShell>
      <p className="eyebrow">Badges</p>
      <h1 className="page-title">Evidence over assumptions.</h1>
      <section className="portal-grid">
        {BADGES.map((badge) => (
          <article key={badge.id} className="portal">
            <Award size={28} />
            <h2>{badge.name}</h2>
            <p>{badge.description}</p>
            <StatusPill tone={participant?.badges.includes(badge.name) ? "good" : "neutral"}>{participant?.badges.includes(badge.name) ? "Earned" : "Open"}</StatusPill>
          </article>
        ))}
      </section>
    </PageShell>
  );
}

function ClosingPage() {
  const participant = useSession((state) => state.participant);
  const questions = [
    "What is one risk you will pay more attention to?",
    "What is one way AI can be used responsibly?",
    "What responsibility belongs to AI developers?",
    "What responsibility belongs to users?",
    "What rule should every AI system follow?"
  ];
  return (
    <PageShell compact>
      <p className="eyebrow">Closing reflection</p>
      <h1 className="page-title">What will you carry forward?</h1>
      <Surface>
        <div className="system-grid">
          <Metric label="Team score" value={participant?.points.toString() ?? "0"} icon={<Award size={20} />} />
          <Metric label="Badges" value={participant?.badges.length.toString() ?? "0"} icon={<BadgeCheck size={20} />} />
          <Metric label="Group" value={participant?.group ?? "Open"} icon={<HeartHandshake size={20} />} />
        </div>
      </Surface>
      <Surface>
        <form className="form-stack">
          {questions.map((question) => (
            <label key={question}>
              <span className="field-label">{question}</span>
              <textarea className="textarea" rows={3} />
            </label>
          ))}
          <Button>
            <Send size={18} /> Submit Exit Poll
          </Button>
        </form>
      </Surface>
    </PageShell>
  );
}

function PrivacyPage() {
  return (
    <PageShell compact>
      <p className="eyebrow">Privacy and safety</p>
      <h1 className="page-title">Small data, clear control.</h1>
      <Surface>
        <div className="copy-block">
          <p>The lab collects event code, nickname, anonymous session ID, rotation group, team, room assignment, answers, votes, points, badges, moderation flags, and facilitator actions.</p>
          <p>Data is used to run the live event, restore disconnected sessions, show team progress, moderate content, and support debriefs. Facilitators can delete individual participant data, team data, workshop submissions, stories, votes, or the full event.</p>
          <p>AI outputs may be inaccurate, biased, generic, or incomplete. Participants should not enter private, identifying, medical, financial, or sensitive personal information.</p>
        </div>
      </Surface>
    </PageShell>
  );
}

function HelpPage() {
  return (
    <PageShell compact>
      <p className="eyebrow">Help</p>
      <h1 className="page-title">Stay with your team.</h1>
      <Surface>
        <div className="copy-block">
          <p>If Wi-Fi drops, keep the page open. Your browser keeps drafts locally while the socket reconnects.</p>
          <p>Facilitators can reset rooms, move participants, activate fallback mode, and broadcast updates.</p>
          <p>Use the event code, your nickname, and the hub to rejoin the current workshop.</p>
        </div>
      </Surface>
    </PageShell>
  );
}

function WorkshopShell({ workshopId, title, kicker, icon, children }: { workshopId: WorkshopId; title: string; kicker: string; icon: ReactNode; children: ReactNode }) {
  const workshop = WORKSHOPS[workshopId];
  const participant = useSession((state) => state.participant);
  const storedEvent = useSession((state) => state.event);
  const setEvent = useSession((state) => state.setEvent);
  const { data: event = storedEvent } = useQuery({ queryKey: ["event"], queryFn: api.eventState, refetchInterval: 4_000, enabled: Boolean(participant) });

  useEffect(() => {
    if (event) setEvent(event);
  }, [event, setEvent]);

  const team = participant && event ? event.teams.find((item) => item.id === participant.teamId) : undefined;
  const roomBasedWorkshop = workshopId === "whos-who" || workshopId === "data-detective" || workshopId === "storibloom" || workshopId === "kurami-court";
  const waitingForSeats = roomBasedWorkshop ? false : Boolean(team && !team.ready);
  const facilitatorPaused = event?.status === "paused";
  const workshopMinutes = workshopId === "kurami-court" ? 30 : WORKSHOP_DURATION_MINUTES;

  return (
    <PageShell>
      <header className={`workshop-header workshop-${workshopId}`}>
        <div className="workshop-icon">{icon}</div>
        <div>
          <p className="eyebrow">{kicker}</p>
          <h1>{title}</h1>
          <p>{workshop.identity.tagline}</p>
          <StatusPill tone="neutral">
            <Clock size={14} /> {workshopMinutes}-minute workshop
          </StatusPill>
        </div>
      </header>
      {team && !roomBasedWorkshop ? <TeamCollaborationPanel team={team} paused={facilitatorPaused} /> : null}
      <AnimatePresence mode="wait">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">
          {team && (waitingForSeats || facilitatorPaused) ? <TeamWaitingRoom team={team} paused={facilitatorPaused} /> : children}
        </motion.div>
      </AnimatePresence>
    </PageShell>
  );
}

function TeamCollaborationPanel({ team, paused }: { team: EventState["teams"][number]; paused: boolean }) {
  return (
    <section className="team-collaboration-panel">
      <div>
        <p className="eyebrow">{team.name}</p>
        <h2>{paused ? "Workshop paused" : team.ready ? "Team ready" : "Filling team seats"}</h2>
      </div>
      <div className="team-seat-meter" aria-label="Team seats filled">
        {Array.from({ length: TEAM_TARGET_SIZE }, (_, index) => (
          <span key={index} className={index < team.seatsFilled ? "seat-dot seat-dot-filled" : "seat-dot"} />
        ))}
        <strong>
          {team.memberCount}/{team.targetSize}
        </strong>
      </div>
      <div className="role-row" aria-label="Team collaboration roles">
        {TEAM_COLLABORATION_ROLES.map((role, index) => (
          <span key={role} className={index < team.memberCount ? "tag" : "tag tag-muted"}>
            {role}
          </span>
        ))}
      </div>
    </section>
  );
}

function TeamWaitingRoom({ team, paused }: { team: EventState["teams"][number]; paused: boolean }) {
  return (
    <Surface>
      <div className="waiting-room">
        <HeartHandshake size={36} />
        <div>
          <p className="eyebrow">{team.name}</p>
          <h2>{paused ? "Facilitator paused the workshop." : "You are waiting for teammates."}</h2>
          <p>
            {paused
              ? "The activity will reopen when the facilitator resumes the room."
              : `${team.seatsFilled} of ${team.targetSize} seats are filled. Activity starts automatically when ${team.targetSize} seats are filled.`}
          </p>
          {!paused ? <p>Stay on this screen. Your facilitator can force start if timing or Wi-Fi makes the room uneven.</p> : null}
        </div>
      </div>
    </Surface>
  );
}

function Takeaway({ children }: { children: ReactNode }) {
  return (
    <div className="takeaway">
      <ShieldCheck size={20} />
      <p>{children}</p>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ControlButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Button tone="quiet" onClick={onClick}>
      {icon} {label}
    </Button>
  );
}

function QuickSelect({ label, values, value, onChange }: { label: string; values: string[]; value?: string; onChange: (value: string) => void }) {
  return (
    <label className="form-stack">
      <span className="field-label">{label}</span>
      <select className="select" value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose</option>
        {values.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}

function VoteComparison({ results }: { results: CourtState["results"] }) {
  const rows = [
    ["Approve", "approve"],
    ["Restrictions", "approveWithRestrictions"],
    ["Reject", "reject"],
    ["More info", "needMoreInformation"]
  ] as const;
  return (
    <div className="vote-bars">
      {rows.map(([label, key]) => {
        const initial = results.initial[key] ?? 0;
        const final = results.final[key] ?? 0;
        const max = Math.max(1, ...rows.map(([, rowKey]) => Math.max(results.initial[rowKey] ?? 0, results.final[rowKey] ?? 0)));
        return (
          <div key={key} className="bar-line">
            <span>{label}</span>
            <meter min={0} max={max} value={initial} />
            <meter min={0} max={max} value={final} />
            <strong>{initial}/{final}</strong>
          </div>
        );
      })}
      <p className="microcopy">{results.changed} participants changed their vote after evidence.</p>
    </div>
  );
}

function useRequiredParticipant(): ParticipantSummary {
  const participant = useSession((state) => state.participant);
  if (!participant) {
    throw new Error("Participant session required.");
  }
  return participant;
}

function safeReturnTo(search: string) {
  const value = new URLSearchParams(search).get("returnTo");
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/hub";
}

function clearStoredStudentSession() {
  localStorage.removeItem("rai_session_id");
  localStorage.removeItem("rai_participant");
  localStorage.removeItem("rai_event");
}

function isExpiredStudentSession(message: string) {
  return message.toLowerCase().includes("session expired") || message.toLowerCase().includes("student session");
}

function statusTone(status: "joined" | "waiting" | "active" | "submitted" | "voted") {
  if (status === "waiting") return "warn";
  if (status === "submitted" || status === "voted") return "good";
  return "neutral";
}

function activityIcon(tone: ActivityFeedItem["tone"]) {
  if (tone === "join") return <Users size={18} />;
  if (tone === "vote") return <Vote size={18} />;
  if (tone === "submit") return <Send size={18} />;
  if (tone === "control") return <Presentation size={18} />;
  return <Sparkles size={18} />;
}

function formatRelativeTime(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function downloadEventExport(payload: EventExportResponse) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kurami-ai-${payload.event.eventCode.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function formatSeconds(value: number) {
  const minutes = Math.floor(Math.max(0, value) / 60);
  const seconds = Math.max(0, value) % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function secondsUntil(value: string | undefined, now: number) {
  if (!value) return undefined;
  return Math.max(0, Math.ceil((new Date(value).getTime() - now) / 1000));
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);
  return now;
}
