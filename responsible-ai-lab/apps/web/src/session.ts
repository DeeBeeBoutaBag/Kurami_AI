import { create } from "zustand";
import type { EventState, ParticipantSummary } from "@responsible-ai-lab/shared";
import type { FacilitatorRoomScope } from "./api.js";

interface SessionState {
  participant: ParticipantSummary | null;
  event: EventState | null;
  facilitatorToken: string | null;
  facilitatorScope: FacilitatorRoomScope | null;
  connection: "online" | "reconnecting" | "offline";
  setParticipant: (participant: ParticipantSummary | null) => void;
  setEvent: (event: EventState | null) => void;
  setFacilitatorToken: (token: string | null, scope?: FacilitatorRoomScope | null) => void;
  setConnection: (connection: SessionState["connection"]) => void;
}

const storedParticipant = localStorage.getItem("rai_participant");
const storedEvent = localStorage.getItem("rai_event");
const storedFacilitatorToken = localStorage.getItem("rai_facilitator_token");
const storedFacilitatorScope = localStorage.getItem("rai_facilitator_scope") as FacilitatorRoomScope | null;

export const useSession = create<SessionState>((set) => ({
  participant: storedParticipant ? (JSON.parse(storedParticipant) as ParticipantSummary) : null,
  event: storedEvent ? (JSON.parse(storedEvent) as EventState) : null,
  facilitatorToken: storedFacilitatorToken,
  facilitatorScope: storedFacilitatorScope,
  connection: navigator.onLine ? "online" : "offline",
  setParticipant: (participant) => {
    if (participant) localStorage.setItem("rai_participant", JSON.stringify(participant));
    else localStorage.removeItem("rai_participant");
    set({ participant });
  },
  setEvent: (event) => {
    if (event) localStorage.setItem("rai_event", JSON.stringify(event));
    else localStorage.removeItem("rai_event");
    set({ event });
  },
  setFacilitatorToken: (token, scope = null) => {
    if (token) localStorage.setItem("rai_facilitator_token", token);
    else localStorage.removeItem("rai_facilitator_token");
    if (token && scope) localStorage.setItem("rai_facilitator_scope", scope);
    else if (!token) localStorage.removeItem("rai_facilitator_scope");
    set({ facilitatorToken: token, facilitatorScope: token ? scope : null });
  },
  setConnection: (connection) => set({ connection })
}));
