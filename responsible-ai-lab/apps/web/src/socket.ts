import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@responsible-ai-lab/shared";
import { api } from "./api.js";

export type LabSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: LabSocket | null = null;

export function getSocket() {
  socket ??= io(api.apiUrl, {
    withCredentials: true,
    autoConnect: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5_000
  });
  return socket;
}
