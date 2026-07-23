import http from "node:http";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { Server } from "socket.io";
import {
  aiGenerateSchema,
  announcementSchema,
  charterProposalSchema,
  charterVoteSchema,
  courtRoomArgumentSchema,
  courtRoomControlSchema,
  courtRoomJoinSchema,
  courtRoomVoteSchema,
  courtReasoningSchema,
  courtVoteSchema,
  deleteDataSchema,
  detectiveChatSchema,
  detectiveDiscoverySchema,
  detectiveFundingVoteSchema,
  detectiveJoinRoomSchema,
  detectiveRecommendationSchema,
  eventControlSchema,
  facilitatorLoginSchema,
  joinEventSchema,
  participantPatchSchema,
  storyGenerateSchema,
  storyPublishSchema,
  storyRoomChatSchema,
  storyRoomControlSchema,
  storyRoomGuideSchema,
  storyRoomJoinSchema,
  storyRoomProposalSchema,
  storyRoomProposalVoteSchema,
  storyRoomSaveSchema,
  workshopIdSchema,
  workshopUnlockSchema,
  whoWhoAccuseSchema,
  whoWhoChatSchema,
  whoWhoGameControlSchema,
  whoWhoJoinRoomSchema,
  whoWhoRoleAbilitySchema,
  whoWhoRoundControlSchema,
  whoWhoResponseSchema,
  whoWhoVoteSchema
} from "@responsible-ai-lab/shared";
import { timerSnapshot, WORKSHOP_DURATION_MINUTES } from "@responsible-ai-lab/shared";
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "@responsible-ai-lab/shared";
import { AIService } from "./aiService.js";
import { config, productionReadiness } from "./config.js";
import { ApiError, asyncHandler, errorHandler, notFound, parseBody } from "./http.js";
import { LiveState } from "./live.js";
import { logger } from "./logger.js";
import { requireFacilitator, requireLeadFacilitator, requireRoomFacilitator, signFacilitatorToken, verifyPinForScope, type FacilitatorScope } from "./security.js";
import { EventStore } from "./store.js";

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
  cors: {
    origin: config.APP_URL,
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60_000,
    skipMiddlewares: true
  }
});

const live = new LiveState();
const store = new EventStore({
  eventCode: config.EVENT_CODE,
  lowBandwidthDefault: config.LOW_BANDWIDTH_DEFAULT,
  hasDatabaseUrl: Boolean(config.DATABASE_URL),
  hasRedisUrl: Boolean(config.REDIS_URL),
  hasOpenAiKey: Boolean(config.OPENAI_API_KEY),
  demoMode: config.DEMO_MODE
});
const ai = new AIService();

function requiredParam(value: string | undefined, name: string) {
  if (!value) throw new ApiError(400, "missing_param", `Missing route parameter: ${name}.`);
  return value;
}

function facilitatorScope(res: express.Response): FacilitatorScope {
  return (res.locals.facilitator as { scope?: FacilitatorScope } | undefined)?.scope ?? "lead";
}

function facilitatorCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: config.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
    ...(maxAge ? { maxAge } : {})
  };
}

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(
  cors({
    origin: config.APP_URL,
    credentials: true
  })
);
app.use(express.json({ limit: "80kb" }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: config.NODE_ENV === "production" ? 3_000 : 600,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);
app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "responsible-ai-lab-server", time: new Date().toISOString() });
});

app.get("/ready", (_req, res) => {
  res.json({
    ok: true,
    environment: config.NODE_ENV,
    demoMode: config.DEMO_MODE,
    eventCode: config.EVENT_CODE,
    workshopDurationMinutes: WORKSHOP_DURATION_MINUTES,
    productionReadiness,
    live: live.health(),
    event: store.getState(),
    aiEnabled: ai.enabled()
  });
});

app.post(
  "/api/events",
  requireLeadFacilitator,
  asyncHandler(async (_req, res) => {
    res.status(201).json(store.createEvent());
  })
);

app.get(
  "/api/events/:eventId",
  asyncHandler(async (_req, res) => {
    res.json(store.getState());
  })
);

app.patch(
  "/api/events/:eventId",
  requireLeadFacilitator,
  asyncHandler(async (req, res) => {
    const input = parseBody(eventControlSchema, req.body);
    const state = store.control(input);
    io.emit("event:state", state);
    res.json(state);
  })
);

app.post(
  "/api/events/join",
  asyncHandler(async (req, res) => {
    const input = parseBody(joinEventSchema, req.body);
    const result = store.join(input);
    io.emit("participant:assigned", result);
    io.emit("event:state", result.event);
    res.status(201).json(result);
  })
);

app.post(
  "/api/events/:eventId/join",
  asyncHandler(async (req, res) => {
    const input = parseBody(joinEventSchema, req.body);
    const result = store.join(input);
    io.emit("participant:assigned", result);
    io.emit("event:state", result.event);
    res.status(201).json(result);
  })
);

app.get(
  "/api/events/current/state",
  asyncHandler(async (_req, res) => {
    res.json(store.getState());
  })
);

app.post(
  "/api/events/current/announce",
  requireLeadFacilitator,
  asyncHandler(async (req, res) => {
    const input = parseBody(announcementSchema, req.body);
    const announcement = store.announce(input.message);
    io.emit("announcement:new", announcement);
    io.emit("event:state", store.getState());
    res.status(201).json(announcement);
  })
);

app.get(
  "/api/events/current/participants",
  requireLeadFacilitator,
  asyncHandler(async (_req, res) => {
    res.json(store.listParticipants());
  })
);

app.get(
  "/api/events/:eventId/state",
  asyncHandler(async (_req, res) => {
    res.json(store.getState());
  })
);

app.post(
  "/api/events/:eventId/rotate",
  requireLeadFacilitator,
  asyncHandler(async (_req, res) => {
    const state = store.control({ action: "advance-rotation" });
    io.emit("rotation:updated", state);
    res.json(state);
  })
);

app.post(
  "/api/events/:eventId/announce",
  requireLeadFacilitator,
  asyncHandler(async (req, res) => {
    const input = parseBody(announcementSchema, req.body);
    const announcement = store.announce(input.message);
    io.emit("announcement:new", announcement);
    io.emit("event:state", store.getState());
    res.status(201).json(announcement);
  })
);

app.get(
  "/api/events/:eventId/participants",
  requireLeadFacilitator,
  asyncHandler(async (_req, res) => {
    res.json(store.listParticipants());
  })
);

app.patch(
  "/api/participants/:participantId",
  requireLeadFacilitator,
  asyncHandler(async (req, res) => {
    const input = parseBody(participantPatchSchema, req.body);
    const participant = store.patchParticipant(requiredParam(req.params.participantId, "participantId"), input);
    io.emit("event:state", store.getState());
    res.json(participant);
  })
);

app.post(
  "/api/participants/:participantId/reset",
  requireLeadFacilitator,
  asyncHandler(async (req, res) => {
    const participant = store.resetParticipant(requiredParam(req.params.participantId, "participantId"));
    io.emit("event:state", store.getState());
    res.json(participant);
  })
);

app.get(
  "/api/workshops/:workshopId/state",
  asyncHandler(async (req, res) => {
    const workshopId = workshopIdSchema.parse(req.params.workshopId);
    const participantId = typeof req.query.participantId === "string" ? req.query.participantId : undefined;
    res.json(store.getWorkshopState(workshopId, participantId));
  })
);

app.post(
  "/api/whos-who/response",
  asyncHandler(async (req, res) => {
    const input = parseBody(whoWhoResponseSchema, req.body);
    const room = store.submitWhoWhoResponse(input);
    io.to(input.roomId).emit("room:updated", { roomId: input.roomId, workshopId: "whos-who", state: room });
    res.status(201).json(room);
  })
);

app.post(
  "/api/whos-who/vote",
  asyncHandler(async (req, res) => {
    const input = parseBody(whoWhoVoteSchema, req.body);
    const room = store.submitWhoWhoVote(input);
    io.to(input.roomId).emit("vote:results", { scope: input.roomId, results: room.votesByIdentity });
    res.status(201).json(room);
  })
);

app.post(
  "/api/whos-who/room/:roomId/join",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(whoWhoJoinRoomSchema, { ...req.body, roomId });
    const room = store.joinWhoWhoRoom(input);
    io.to(input.roomId).emit("room:updated", { roomId: input.roomId, workshopId: "whos-who", state: room });
    io.emit("event:state", store.getState());
    res.status(201).json(room);
  })
);

app.post(
  "/api/whos-who/room/:roomId/chat",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(whoWhoChatSchema, { ...req.body, roomId });
    const room = store.submitWhoWhoChat(input);
    io.to(input.roomId).emit("room:updated", { roomId: input.roomId, workshopId: "whos-who", state: room });
    res.status(201).json(room);
  })
);

app.post(
  "/api/whos-who/room/:roomId/accuse",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(whoWhoAccuseSchema, { ...req.body, roomId });
    const room = store.submitWhoWhoAccusation(input);
    io.to(input.roomId).emit("vote:results", { scope: input.roomId, results: room.votesByIdentity });
    io.to(input.roomId).emit("room:updated", { roomId: input.roomId, workshopId: "whos-who", state: room });
    res.status(201).json(room);
  })
);

app.post(
  "/api/whos-who/room/:roomId/ability",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(whoWhoRoleAbilitySchema, { ...req.body, roomId });
    const room = store.useWhoWhoRoleAbility(input);
    io.to(input.roomId).emit("vote:results", { scope: input.roomId, results: room.votesByIdentity });
    io.to(input.roomId).emit("room:updated", { roomId: input.roomId, workshopId: "whos-who", state: room });
    res.status(201).json(room);
  })
);

app.get(
  "/api/whos-who/room/:roomId",
  asyncHandler(async (req, res) => {
    res.json(store.getWhoWhoRoom(requiredParam(req.params.roomId, "roomId")));
  })
);

app.get(
  "/api/facilitator/whos-who/room/:roomId",
  requireRoomFacilitator,
  asyncHandler(async (req, res) => {
    res.json(store.getWhoWhoRoom(requiredParam(req.params.roomId, "roomId"), { reveal: true }));
  })
);

app.post(
  "/api/whos-who/room/:roomId/game",
  requireRoomFacilitator,
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(whoWhoGameControlSchema, { ...req.body, roomId });
    const room = store.controlWhoWhoGame(input);
    io.to(input.roomId).emit("room:updated", { roomId: input.roomId, workshopId: "whos-who", state: store.getWhoWhoRoom(input.roomId) });
    io.emit("event:state", store.getState());
    res.json(room);
  })
);

app.post(
  "/api/whos-who/room/:roomId/reveal",
  requireRoomFacilitator,
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const room = store.revealWhoWho(roomId);
    io.to(roomId).emit("response:revealed", { roomId, roundId: room.roundId, responses: room.responses });
    res.json(room);
  })
);

app.post(
  "/api/whos-who/room/:roomId/round",
  requireRoomFacilitator,
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(whoWhoRoundControlSchema, { ...req.body, roomId });
    const room = store.advanceWhoWhoRound(roomId, input.promptId, input.stage);
    io.to(roomId).emit("room:updated", { roomId, workshopId: "whos-who", state: room });
    res.json(room);
  })
);

app.post(
  "/api/data-detective/room/:roomId/join",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(detectiveJoinRoomSchema, { ...req.body, roomId });
    const state = store.joinDetectiveRoom(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "data-detective", state });
    res.status(201).json(state);
  })
);

app.post(
  "/api/data-detective/discovery",
  asyncHandler(async (req, res) => {
    const input = parseBody(detectiveDiscoverySchema, req.body);
    const discovery = store.submitDiscovery(input);
    io.emit("room:updated", { roomId: input.roomId ?? input.teamId ?? "data-detective", workshopId: "data-detective", state: store.getWorkshopState("data-detective", input.participantId) });
    res.status(201).json(discovery);
  })
);

app.post(
  "/api/data-detective/room/:roomId/chat",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(detectiveChatSchema, { ...req.body, roomId });
    const message = store.submitDetectiveChat(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "data-detective", state: store.getWorkshopState("data-detective", input.participantId) });
    res.status(201).json(message);
  })
);

app.post(
  "/api/data-detective/recommendation",
  asyncHandler(async (req, res) => {
    const input = parseBody(detectiveRecommendationSchema, req.body);
    const recommendation = store.submitRecommendation(input);
    io.emit("room:updated", { roomId: input.roomId ?? input.teamId ?? "data-detective", workshopId: "data-detective", state: store.getWorkshopState("data-detective", input.participantId) });
    res.status(201).json(recommendation);
  })
);

app.post(
  "/api/data-detective/room/:roomId/vote",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(detectiveFundingVoteSchema, { ...req.body, roomId });
    const vote = store.submitDetectiveVote(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "data-detective", state: store.getWorkshopState("data-detective", input.participantId) });
    res.status(201).json(vote);
  })
);

app.post(
  "/api/data-detective/stage",
  requireLeadFacilitator,
  asyncHandler(async (req, res) => {
    const stage = Number(req.body?.stage ?? 1);
    const state = store.unlockDetectiveStage(stage);
    io.emit("room:updated", { roomId: "data-detective", workshopId: "data-detective", state });
    res.json(state);
  })
);

app.post(
  "/api/storibloom/generate",
  asyncHandler(async (req, res) => {
    const input = parseBody(storyGenerateSchema, req.body);
    io.emit("story:generation-status", { teamId: input.teamId, status: "queued", message: "Story draft request received." });
    const story = store.generateStory(input.storyId, input.participantId);
    io.emit("story:generation-status", { teamId: input.teamId, status: "complete", message: "Draft ready for human editing." });
    res.status(201).json(story);
  })
);

app.patch(
  "/api/storibloom/story/:storyId",
  asyncHandler(async (req, res) => {
    res.json(store.updateStory(requiredParam(req.params.storyId, "storyId"), req.body as Parameters<typeof store.updateStory>[1]));
  })
);

app.post(
  "/api/storibloom/publish",
  asyncHandler(async (req, res) => {
    const input = parseBody(storyPublishSchema, req.body);
    res.status(201).json(store.publishStory(input));
  })
);

app.post(
  "/api/storibloom/room/:roomId/join",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(storyRoomJoinSchema, { ...req.body, roomId });
    const room = store.joinStoryRoom(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "storibloom", state: store.getWorkshopState("storibloom", input.participantId) });
    res.status(201).json(room);
  })
);

app.post(
  "/api/storibloom/room/:roomId/chat",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(storyRoomChatSchema, { ...req.body, roomId });
    const message = store.submitStoryRoomChat(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "storibloom", state: store.getWorkshopState("storibloom", input.participantId) });
    res.status(201).json(message);
  })
);

app.post(
  "/api/storibloom/room/:roomId/proposal",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(storyRoomProposalSchema, { ...req.body, roomId });
    const proposal = store.submitStoryRoomProposal(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "storibloom", state: store.getWorkshopState("storibloom", input.participantId) });
    res.status(201).json(proposal);
  })
);

app.post(
  "/api/storibloom/room/:roomId/proposal/:proposalId/vote",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const proposalId = requiredParam(req.params.proposalId, "proposalId");
    const input = parseBody(storyRoomProposalVoteSchema, { ...req.body, roomId, proposalId });
    const room = store.voteStoryRoomProposal(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "storibloom", state: store.getWorkshopState("storibloom", input.participantId) });
    res.status(201).json(room);
  })
);

app.post(
  "/api/storibloom/room/:roomId/guide",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(storyRoomGuideSchema, { ...req.body, roomId });
    const message = store.askStoryRoomGuide({ ...input, scope: input.scope ?? "room" });
    io.emit("room:updated", { roomId: input.roomId, workshopId: "storibloom", state: store.getWorkshopState("storibloom", input.participantId) });
    res.status(201).json(message);
  })
);

app.post(
  "/api/storibloom/room/:roomId/draft",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const participantId = typeof req.body?.participantId === "string" ? req.body.participantId : undefined;
    const room = store.generateStoryRoomDraft(roomId, participantId);
    io.emit("room:updated", { roomId, workshopId: "storibloom", state: store.getWorkshopState("storibloom", participantId) });
    res.status(201).json(room);
  })
);

app.post(
  "/api/storibloom/room/:roomId/save",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(storyRoomSaveSchema, { ...req.body, roomId });
    const room = store.saveStoryRoom(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "storibloom", state: store.getWorkshopState("storibloom", input.participantId) });
    res.status(201).json(room);
  })
);

app.post(
  "/api/storibloom/room/:roomId/control",
  requireRoomFacilitator,
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(storyRoomControlSchema, { ...req.body, roomId });
    const room = store.controlStoryRoom(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "storibloom", state: store.getWorkshopState("storibloom") });
    res.json(room);
  })
);

app.post(
  "/api/kurami-court/vote",
  asyncHandler(async (req, res) => {
    const input = parseBody(courtVoteSchema, req.body);
    const results = store.submitCourtVote(input);
    io.emit("vote:results", { scope: input.caseId, results });
    res.status(201).json(results);
  })
);

app.post(
  "/api/kurami-court/reasoning",
  asyncHandler(async (req, res) => {
    const input = parseBody(courtReasoningSchema, req.body);
    const reasoning = store.submitCourtReasoning({
      ...input,
      id: `reasoning-${Date.now()}`,
      highlighted: false,
      createdAt: new Date().toISOString()
    });
    res.status(201).json(reasoning);
  })
);

app.post(
  "/api/kurami-court/case/:caseId/reveal",
  requireLeadFacilitator,
  asyncHandler(async (req, res) => {
    const caseId = requiredParam(req.params.caseId, "caseId");
    const state = store.revealCourtEvidence(caseId);
    io.emit("room:updated", { roomId: caseId, workshopId: "kurami-court", state });
    res.json(state);
  })
);

app.post(
  "/api/kurami-court/room/:roomId/join",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(courtRoomJoinSchema, { ...req.body, roomId });
    const room = store.joinCourtRoom(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "kurami-court", state: store.getWorkshopState("kurami-court", input.participantId) });
    res.status(201).json(room);
  })
);

app.get(
  "/api/kurami-court/room/:roomId",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    res.json(store.getCourtRoom(roomId));
  })
);

app.post(
  "/api/kurami-court/room/:roomId/argument",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(courtRoomArgumentSchema, { ...req.body, roomId });
    const room = store.submitCourtRoomArgument(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "kurami-court", state: store.getWorkshopState("kurami-court", input.participantId) });
    res.status(201).json(room);
  })
);

app.post(
  "/api/kurami-court/room/:roomId/vote",
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(courtRoomVoteSchema, { ...req.body, roomId });
    const room = store.submitCourtRoomFinalVote(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "kurami-court", state: store.getWorkshopState("kurami-court", input.participantId) });
    io.emit("vote:results", { scope: input.roomId, results: room.voteSummary });
    res.status(201).json(room);
  })
);

app.post(
  "/api/kurami-court/room/:roomId/control",
  requireRoomFacilitator,
  asyncHandler(async (req, res) => {
    const roomId = requiredParam(req.params.roomId, "roomId");
    const input = parseBody(courtRoomControlSchema, { ...req.body, roomId });
    const room = store.controlCourtRoom(input);
    io.emit("room:updated", { roomId: input.roomId, workshopId: "kurami-court", state: store.getWorkshopState("kurami-court") });
    res.json(room);
  })
);

app.post(
  "/api/charter/proposal",
  asyncHandler(async (req, res) => {
    const input = parseBody(charterProposalSchema, req.body);
    res.status(201).json(store.submitCharterProposal(input.teamId, input.text));
  })
);

app.post(
  "/api/charter/vote",
  asyncHandler(async (req, res) => {
    const input = parseBody(charterVoteSchema, req.body);
    res.status(201).json(store.submitCharterVote(input.participantId, input.proposalId));
  })
);

app.get(
  "/api/leaderboard",
  asyncHandler(async (req, res) => {
    const mode = req.query.mode === "individual" || req.query.mode === "rotation-group" ? req.query.mode : "team";
    res.json(store.leaderboard(mode));
  })
);

app.post(
  "/api/facilitator/login",
  asyncHandler(async (req, res) => {
    const input = parseBody(facilitatorLoginSchema, req.body);
    const roomScope = input.roomScope ?? "lead";
    if (!verifyPinForScope(input.pin, roomScope)) throw new ApiError(401, "invalid_pin", "That facilitator PIN did not work for the selected room.");
    const token = signFacilitatorToken(roomScope);
    res.cookie("facilitator_token", token, facilitatorCookieOptions(8 * 60 * 60 * 1000));
    res.json({ ok: true, token, roomScope });
  })
);

app.post(
  "/api/facilitator/logout",
  asyncHandler(async (_req, res) => {
    res.clearCookie("facilitator_token", facilitatorCookieOptions());
    res.json({ ok: true });
  })
);

app.get(
  "/api/facilitator/dashboard",
  requireFacilitator,
  asyncHandler(async (_req, res) => {
    res.json(store.getDashboard(facilitatorScope(res)));
  })
);

app.get(
  "/api/facilitator/workshops/:workshopId/state",
  requireFacilitator,
  asyncHandler(async (req, res) => {
    const workshopId = workshopIdSchema.parse(req.params.workshopId);
    res.json(store.getFacilitatorWorkshopState(workshopId, facilitatorScope(res)));
  })
);

app.get(
  "/api/facilitator/export",
  requireLeadFacilitator,
  asyncHandler(async (_req, res) => {
    res.setHeader("Content-Disposition", `attachment; filename="kurami-ai-${config.EVENT_CODE.toLowerCase()}-results.json"`);
    res.json(store.exportResults());
  })
);

app.post(
  "/api/facilitator/control",
  requireLeadFacilitator,
  asyncHandler(async (req, res) => {
    const input = parseBody(eventControlSchema, req.body);
    const state = store.control(input);
    io.emit("event:state", state);
    if (input.action === "fallback-on" || input.action === "fallback-off") io.emit("fallback:activated", { enabled: state.settings.fallbackMode });
    res.json(state);
  })
);

app.post(
  "/api/facilitator/unlock",
  requireLeadFacilitator,
  asyncHandler(async (req, res) => {
    const input = parseBody(workshopUnlockSchema, req.body);
    const state = store.unlockWorkshop(input.workshopId, input.unlocked);
    io.emit(input.unlocked ? "workshop:unlocked" : "workshop:locked", { workshopId: input.workshopId });
    io.emit("event:state", state);
    res.json(state);
  })
);

app.post(
  "/api/facilitator/fallback",
  requireLeadFacilitator,
  asyncHandler(async (req, res) => {
    const enabled = Boolean(req.body?.enabled ?? true);
    const state = store.control({ action: enabled ? "fallback-on" : "fallback-off" });
    io.emit("fallback:activated", { enabled, reason: enabled ? "Facilitator activated fallback mode." : undefined });
    res.json(state);
  })
);

app.post(
  "/api/ai/generate",
  asyncHandler(async (req, res) => {
    const input = parseBody(aiGenerateSchema, req.body);
    if (input.kind === "story-draft") {
      const payload = input.payload as Record<string, string>;
      const text = await ai.storyDraft({
        teamId: input.teamId,
        teamName: payload.teamName ?? "Team",
        genre: payload.genre ?? "speculative",
        setting: payload.setting ?? "a future city",
        theme: payload.theme ?? "responsibility",
        protagonist: payload.protagonist ?? "the protagonist",
        conflict: payload.conflict ?? "a difficult decision",
        approvedPlan: payload.approvedPlan ?? ""
      });
      res.status(201).json({ text, queue: ai.queueStatus(input.teamId) });
      return;
    }
    res.status(201).json({ text: "Fallback suggestion: ask who benefits, who could be harmed, and what human review should exist.", queue: ai.queueStatus(input.teamId) });
  })
);

app.delete(
  "/api/events/current/data",
  requireLeadFacilitator,
  asyncHandler(async (req, res) => {
    const input = parseBody(deleteDataSchema, req.body);
    res.json(store.deleteData(input.scope, input.targetId));
  })
);

app.delete(
  "/api/events/:eventId/data",
  requireLeadFacilitator,
  asyncHandler(async (req, res) => {
    const input = parseBody(deleteDataSchema, req.body);
    res.json(store.deleteData(input.scope, input.targetId));
  })
);

io.on("connection", (socket) => {
  socket.emit("event:state", store.getState());

  socket.on("participant:join", (payload, ack) => {
    try {
      const input = joinEventSchema.parse({ ...payload, acceptedResponsibleUse: true });
      const result = store.join(input);
      socket.data.participantId = result.participant.id;
      socket.data.eventId = result.event.eventId;
      socket.join(result.participant.teamId);
      socket.join(result.participant.group);
      ack({ ok: true, data: result });
      io.emit("event:state", result.event);
    } catch (error) {
      ack({ ok: false, error: error instanceof Error ? error.message : "Join failed." });
    }
  });

  socket.on("participant:reconnect", (payload, ack) => {
    const result = store.restore(payload.sessionId);
    if (result) {
      socket.data.participantId = result.participant.id;
      socket.join(result.participant.teamId);
      ack({ ok: true, data: result });
      return;
    }
    ack({ ok: false, error: "Could not restore that session." });
  });

  socket.on("room:join", (payload) => {
    socket.join(payload.roomId);
  });

  socket.on("room:leave", (payload) => {
    socket.leave(payload.roomId);
  });

  socket.on("heartbeat", () => {
    socket.emit("timer:updated", timerSnapshot(store.getState()));
  });
});

app.use(notFound);
app.use(errorHandler);

const timer = setInterval(() => {
  io.emit("timer:updated", timerSnapshot(store.getState()));
}, 5_000);

async function start() {
  await live.connect();
  server.listen(config.PORT, () => {
    logger.info({ port: config.PORT, appUrl: config.APP_URL }, "Kurami.AI server listening.");
  });
}

async function shutdown(signal: string) {
  logger.info({ signal }, "Graceful shutdown started.");
  clearInterval(timer);
  await live.close();
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  logger.info("Graceful shutdown complete.");
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    logger.error({ error }, "Shutdown failed.");
    process.exit(1);
  });
});

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    logger.error({ error }, "Shutdown failed.");
    process.exit(1);
  });
});

start().catch((error) => {
  logger.error({ error }, "Server failed to start.");
  process.exit(1);
});
