import { FACILITATOR_ROOM_SCOPES, type EventState, type JoinResult, type ParticipantSummary, type WorkshopId } from "@responsible-ai-lab/shared";

export type WhoWhoGameAction = "start" | "open-vote" | "force-vote" | "resolve" | "next-round" | "reset" | "reveal";
export type FacilitatorRoomScope = (typeof FACILITATOR_ROOM_SCOPES)[number];

function normalizeApiUrl(value?: string) {
  const raw = (value ?? "http://localhost:4000").trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes("localhost") || raw.startsWith("127.") || raw.startsWith("0.0.0.0")) return `http://${raw}`;
  return `https://${raw}`;
}

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

interface ApiErrorShape {
  error?: {
    code: string;
    message: string;
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorShape;
    throw new Error(payload.error?.message ?? `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export const api = {
  apiUrl: API_URL,
  join: (body: { eventCode: string; nickname: string; acceptedResponsibleUse: true; restoreSessionId?: string }) =>
    request<JoinResult>("/api/events/join", { method: "POST", body: JSON.stringify(body) }),
  eventState: () => request<EventState>("/api/events/current/state"),
  workshopState: <T>(workshopId: WorkshopId, participantId?: string) =>
    request<T>(`/api/workshops/${workshopId}/state${participantId ? `?participantId=${encodeURIComponent(participantId)}` : ""}`),
  facilitatorWorkshopState: <T>(workshopId: WorkshopId) => request<T>(`/api/facilitator/workshops/${workshopId}/state`),
  leaderboard: (mode: "individual" | "team" | "rotation-group") => request<Array<{ id: string; label: string; points: number; group: string }>>(`/api/leaderboard?mode=${mode}`),
  facilitatorLogin: (pin: string, roomScope: FacilitatorRoomScope) =>
    request<{ ok: true; token: string; roomScope: FacilitatorRoomScope }>("/api/facilitator/login", { method: "POST", body: JSON.stringify({ pin, roomScope }) }),
  dashboard: () => request<DashboardResponse>("/api/facilitator/dashboard"),
  exportResults: () => request<EventExportResponse>("/api/facilitator/export"),
  control: (body: { action: string; minutes?: number }) => request<EventState>("/api/facilitator/control", { method: "POST", body: JSON.stringify(body) }),
  announce: (message: string) => request<{ message: string; createdAt: string }>("/api/events/current/announce", { method: "POST", body: JSON.stringify({ message }) }),
  unlock: (workshopId: WorkshopId, unlocked: boolean) => request<EventState>("/api/facilitator/unlock", { method: "POST", body: JSON.stringify({ workshopId, unlocked }) }),
  participants: () => request<ParticipantSummary[]>("/api/events/current/participants"),
  whoWhoResponse: (body: Record<string, unknown>) => request<unknown>("/api/whos-who/response", { method: "POST", body: JSON.stringify(body) }),
  whoWhoVote: (body: Record<string, unknown>) => request<unknown>("/api/whos-who/vote", { method: "POST", body: JSON.stringify(body) }),
  whoWhoRoom: <T = unknown>(roomId: string) => request<T>(`/api/whos-who/room/${encodeURIComponent(roomId)}`),
  facilitatorWhoWhoRoom: <T = unknown>(roomId: string) => request<T>(`/api/facilitator/whos-who/room/${encodeURIComponent(roomId)}`),
  whoWhoJoinRoom: (roomId: string, participantId: string) => request<unknown>(`/api/whos-who/room/${encodeURIComponent(roomId)}/join`, { method: "POST", body: JSON.stringify({ participantId }) }),
  whoWhoChat: (roomId: string, body: Record<string, unknown>) => request<unknown>(`/api/whos-who/room/${encodeURIComponent(roomId)}/chat`, { method: "POST", body: JSON.stringify(body) }),
  whoWhoAccuse: (roomId: string, body: Record<string, unknown>) => request<unknown>(`/api/whos-who/room/${encodeURIComponent(roomId)}/accuse`, { method: "POST", body: JSON.stringify(body) }),
  whoWhoAbility: (roomId: string, body: Record<string, unknown>) => request<unknown>(`/api/whos-who/room/${encodeURIComponent(roomId)}/ability`, { method: "POST", body: JSON.stringify(body) }),
  whoWhoGame: (roomId: string, action: WhoWhoGameAction) => request<unknown>(`/api/whos-who/room/${encodeURIComponent(roomId)}/game`, { method: "POST", body: JSON.stringify({ action }) }),
  whoWhoReveal: (roomId: string) => request<unknown>(`/api/whos-who/room/${roomId}/reveal`, { method: "POST" }),
  whoWhoNextRound: (roomId: string, body: Record<string, unknown> = {}) => request<unknown>(`/api/whos-who/room/${roomId}/round`, { method: "POST", body: JSON.stringify(body) }),
  detectiveJoinRoom: (roomId: string, participantId: string) => request<unknown>(`/api/data-detective/room/${encodeURIComponent(roomId)}/join`, { method: "POST", body: JSON.stringify({ participantId }) }),
  detectiveDiscovery: (body: Record<string, unknown>) => request<unknown>("/api/data-detective/discovery", { method: "POST", body: JSON.stringify(body) }),
  detectiveChat: (roomId: string, body: Record<string, unknown>) => request<unknown>(`/api/data-detective/room/${encodeURIComponent(roomId)}/chat`, { method: "POST", body: JSON.stringify(body) }),
  detectiveRecommendation: (body: Record<string, unknown>) => request<unknown>("/api/data-detective/recommendation", { method: "POST", body: JSON.stringify(body) }),
  detectiveVote: (roomId: string, body: Record<string, unknown>) => request<unknown>(`/api/data-detective/room/${encodeURIComponent(roomId)}/vote`, { method: "POST", body: JSON.stringify(body) }),
  detectiveStage: (stage: number) => request<unknown>("/api/data-detective/stage", { method: "POST", body: JSON.stringify({ stage }) }),
  storyUpdate: (storyId: string, body: Record<string, unknown>) => request<unknown>(`/api/storibloom/story/${storyId}`, { method: "PATCH", body: JSON.stringify(body) }),
  storyGenerate: (body: Record<string, unknown>) => request<unknown>("/api/storibloom/generate", { method: "POST", body: JSON.stringify(body) }),
  storyPublish: (body: Record<string, unknown>) => request<unknown>("/api/storibloom/publish", { method: "POST", body: JSON.stringify(body) }),
  storyRoomJoin: (roomId: string, participantId: string) => request<unknown>(`/api/storibloom/room/${encodeURIComponent(roomId)}/join`, { method: "POST", body: JSON.stringify({ participantId }) }),
  storyRoomChat: (roomId: string, body: Record<string, unknown>) => request<unknown>(`/api/storibloom/room/${encodeURIComponent(roomId)}/chat`, { method: "POST", body: JSON.stringify(body) }),
  storyRoomProposal: (roomId: string, body: Record<string, unknown>) => request<unknown>(`/api/storibloom/room/${encodeURIComponent(roomId)}/proposal`, { method: "POST", body: JSON.stringify(body) }),
  storyRoomProposalVote: (roomId: string, proposalId: string, body: Record<string, unknown>) =>
    request<unknown>(`/api/storibloom/room/${encodeURIComponent(roomId)}/proposal/${encodeURIComponent(proposalId)}/vote`, { method: "POST", body: JSON.stringify(body) }),
  storyRoomGuide: (roomId: string, body: Record<string, unknown>) => request<unknown>(`/api/storibloom/room/${encodeURIComponent(roomId)}/guide`, { method: "POST", body: JSON.stringify(body) }),
  storyRoomDraft: (roomId: string, body: Record<string, unknown>) => request<unknown>(`/api/storibloom/room/${encodeURIComponent(roomId)}/draft`, { method: "POST", body: JSON.stringify(body) }),
  storyRoomSave: (roomId: string, body: Record<string, unknown>) => request<unknown>(`/api/storibloom/room/${encodeURIComponent(roomId)}/save`, { method: "POST", body: JSON.stringify(body) }),
  storyRoomControl: (roomId: string, action: "start" | "reset" | "end") => request<unknown>(`/api/storibloom/room/${encodeURIComponent(roomId)}/control`, { method: "POST", body: JSON.stringify({ action }) }),
  courtVote: (body: Record<string, unknown>) => request<unknown>("/api/kurami-court/vote", { method: "POST", body: JSON.stringify(body) }),
  courtReasoning: (body: Record<string, unknown>) => request<unknown>("/api/kurami-court/reasoning", { method: "POST", body: JSON.stringify(body) }),
  courtReveal: (caseId: string) => request<unknown>(`/api/kurami-court/case/${caseId}/reveal`, { method: "POST" }),
  courtRoom: <T = unknown>(roomId: string) => request<T>(`/api/kurami-court/room/${encodeURIComponent(roomId)}`),
  courtRoomJoin: (roomId: string, participantId: string) => request<unknown>(`/api/kurami-court/room/${encodeURIComponent(roomId)}/join`, { method: "POST", body: JSON.stringify({ participantId }) }),
  courtRoomArgument: (roomId: string, body: Record<string, unknown>) => request<unknown>(`/api/kurami-court/room/${encodeURIComponent(roomId)}/argument`, { method: "POST", body: JSON.stringify(body) }),
  courtRoomVote: (roomId: string, body: Record<string, unknown>) => request<unknown>(`/api/kurami-court/room/${encodeURIComponent(roomId)}/vote`, { method: "POST", body: JSON.stringify(body) }),
  courtRoomControl: (roomId: string, action: "start" | "next-round" | "final-vote" | "end" | "reset") =>
    request<unknown>(`/api/kurami-court/room/${encodeURIComponent(roomId)}/control`, { method: "POST", body: JSON.stringify({ action }) }),
  charterProposal: (body: Record<string, unknown>) => request<unknown>("/api/charter/proposal", { method: "POST", body: JSON.stringify(body) }),
  charterVote: (body: Record<string, unknown>) => request<unknown>("/api/charter/vote", { method: "POST", body: JSON.stringify(body) }),
  deleteData: (body: Record<string, unknown>) => request<unknown>("/api/events/current/data", { method: "DELETE", body: JSON.stringify(body) })
};

export interface DashboardResponse {
  facilitator: {
    scope: FacilitatorRoomScope;
    roomName: string;
    isLead: boolean;
  };
  event: EventState;
  participants: ParticipantSummary[];
  schedule: Array<{ label: string; startMinute: number; endMinute: number; kind: string; rotationNumber?: number }>;
  system: {
    api: "ok";
    database: string;
    redis: string;
    openai: string;
  };
  moderationQueue: Array<{ id: string; reason: string; severity: string; contentType: string; redactedText: string; createdAt: string }>;
  apiUsage: {
    aiRequests: number;
    failedAiRequests: number;
    estimatedTokens: number;
  };
  progress: EventProgress;
  activityFeed: ActivityFeedItem[];
  summary: EventSummary;
}

export interface ActivityFeedItem {
  id: string;
  at: string;
  tone: "join" | "submit" | "vote" | "control" | "system";
  workshopId?: WorkshopId;
  teamId?: string;
  teamName?: string;
  participantName?: string;
  message: string;
}

export interface ParticipantProgress {
  participantId: string;
  nickname: string;
  group: string;
  teamId: string;
  teamName: string;
  currentWorkshop: WorkshopId;
  isAi: boolean;
  status: "joined" | "waiting" | "active" | "submitted" | "voted";
  points: number;
  badges: string[];
}

export interface TeamProgress {
  teamId: string;
  teamName: string;
  group: string;
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

export interface EventProgress {
  participants: ParticipantProgress[];
  teams: TeamProgress[];
}

export interface EventSummary {
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

export interface EventExportResponse {
  exportedAt: string;
  event: EventState;
  participants: ParticipantSummary[];
  progress: EventProgress;
  activityFeed: ActivityFeedItem[];
  summary: EventSummary;
  submissions: Record<string, unknown>;
  aiUsage: {
    aiRequests: number;
    failedAiRequests: number;
    estimatedTokens: number;
  };
}
