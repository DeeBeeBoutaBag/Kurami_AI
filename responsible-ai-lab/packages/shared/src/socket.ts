import type { EventState, JoinResult, TimerSnapshot, WorkshopId } from "./types.js";

export interface ServerToClientEvents {
  "event:state": (state: EventState) => void;
  "rotation:updated": (state: EventState) => void;
  "timer:updated": (timer: TimerSnapshot) => void;
  "announcement:new": (announcement: { message: string; createdAt: string }) => void;
  "participant:assigned": (result: JoinResult) => void;
  "room:updated": (payload: { roomId: string; workshopId: WorkshopId; state: unknown }) => void;
  "response:revealed": (payload: { roomId: string; roundId: string; responses: unknown[] }) => void;
  "vote:results": (payload: { scope: string; results: unknown }) => void;
  "workshop:locked": (payload: { workshopId: WorkshopId }) => void;
  "workshop:unlocked": (payload: { workshopId: WorkshopId }) => void;
  "story:generation-status": (payload: { teamId: string; status: "queued" | "running" | "complete" | "failed"; message: string }) => void;
  "facilitator:message": (payload: { level: "info" | "warning" | "error"; message: string }) => void;
  "connection:warning": (payload: { message: string }) => void;
  "fallback:activated": (payload: { enabled: boolean; reason?: string }) => void;
}

export interface ClientToServerEvents {
  "participant:join": (payload: { eventCode: string; nickname: string; acceptedResponsibleUse: true }, ack: (result: { ok: boolean; data?: JoinResult; error?: string }) => void) => void;
  "participant:reconnect": (payload: { sessionId: string }, ack: (result: { ok: boolean; data?: JoinResult; error?: string }) => void) => void;
  "room:join": (payload: { participantId: string; roomId: string; workshopId: WorkshopId }) => void;
  "room:leave": (payload: { participantId: string; roomId: string }) => void;
  "response:submit": (payload: { participantId: string; roomId: string; roundId: string; text: string }) => void;
  "vote:submit": (payload: { participantId: string; scope: string; vote: string; reason?: string }) => void;
  "team:answer": (payload: { participantId: string; teamId: string; workshopId: WorkshopId; answer: unknown }) => void;
  "story:update": (payload: { teamId: string; storyId: string; patch: unknown }) => void;
  "story:generate": (payload: { teamId: string; storyId: string; approvedPlan: string }) => void;
  "clue:discover": (payload: { participantId: string; teamId: string; evidenceId: string }) => void;
  "recommendation:submit": (payload: { teamId: string; recommendation: unknown }) => void;
  "charter:submit": (payload: { teamId: string; text: string }) => void;
  heartbeat: (payload: { participantId?: string; sentAt: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  participantId?: string;
  facilitatorId?: string;
  eventId?: string;
  role?: "participant" | "facilitator";
}
