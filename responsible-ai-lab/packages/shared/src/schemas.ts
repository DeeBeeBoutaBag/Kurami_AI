import { z } from "zod";
import { ETHICAL_CATEGORIES, FACILITATOR_ROOM_SCOPES, ROTATION_GROUPS } from "./constants.js";

export const workshopIdSchema = z.enum(["whos-who", "data-detective", "storibloom", "kurami-court"]);
export const rotationGroupSchema = z.enum(ROTATION_GROUPS);
export const eventStatusSchema = z.enum(["draft", "onboarding", "running", "paused", "ended"]);
export const leaderboardModeSchema = z.enum(["individual", "team", "rotation-group"]);

export const joinEventSchema = z.object({
  eventCode: z.string().trim().min(3).max(32).transform((value) => value.toUpperCase()),
  nickname: z
    .string()
    .trim()
    .max(24, "Keep nicknames under 24 characters.")
    .refine((value) => value.length === 0 || value.length >= 2, "Choose a nickname with at least 2 characters, or leave it blank for an anonymous student name.")
    .refine((value) => value.length === 0 || /^[\p{L}\p{N} ._\-']+$/u.test(value), "Use letters, numbers, spaces, apostrophes, dots, underscores, or hyphens."),
  acceptedResponsibleUse: z.literal(true),
  restoreSessionId: z.string().uuid().optional()
});

export const facilitatorLoginSchema = z.object({
  pin: z.string().min(4).max(128),
  roomScope: z.enum(FACILITATOR_ROOM_SCOPES).default("lead")
});

export const announcementSchema = z.object({
  message: z.string().trim().min(1).max(260)
});

export const eventControlSchema = z.object({
  action: z.enum([
    "start",
    "pause",
    "resume",
    "end",
    "force-start",
    "advance-rotation",
    "previous-rotation",
    "extend",
    "shorten",
    "lock-all",
    "reset-event",
    "fallback-on",
    "fallback-off",
    "leaderboard-on",
    "leaderboard-off",
    "ai-on",
    "ai-off",
    "low-bandwidth-on",
    "low-bandwidth-off"
  ]),
  minutes: z.number().int().min(1).max(30).optional()
});

export const workshopUnlockSchema = z.object({
  workshopId: workshopIdSchema,
  unlocked: z.boolean()
});

export const participantPatchSchema = z.object({
  nickname: z.string().trim().min(2).max(24).optional(),
  group: rotationGroupSchema.optional(),
  teamId: z.string().min(2).max(64).optional(),
  pointsDelta: z.number().int().min(-500).max(500).optional(),
  status: z.enum(["active", "absent", "removed"]).optional()
});

export const whoWhoResponseSchema = z.object({
  participantId: z.string().min(1),
  roomId: z.string().min(1),
  roundId: z.string().min(1),
  promptId: z.string().min(1),
  text: z.string().trim().min(2).max(420)
});

export const whoWhoVoteSchema = z.object({
  participantId: z.string().min(1),
  roomId: z.string().min(1),
  roundId: z.string().min(1),
  identityId: z.string().min(1),
  confidence: z.number().int().min(1).max(5),
  evidence: z.string().trim().min(3).max(500),
  evidenceType: z.enum(["language-pattern", "consistency", "specificity", "assumption-check", "transparency", "other"]).optional(),
  assumptionTag: z.string().trim().min(2).max(120).optional(),
  counterEvidence: z.string().trim().max(500).optional(),
  finalVoteIdentityIds: z.array(z.string().min(1)).max(3).optional()
});

export function normalizeWhoWhoRoomId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const normalizeDetectiveRoomId = normalizeWhoWhoRoomId;
export const normalizeStoryRoomId = normalizeWhoWhoRoomId;
export const normalizeCourtRoomId = normalizeWhoWhoRoomId;

const whoWhoRoomIdSchema = z
  .string()
  .transform((value) => normalizeWhoWhoRoomId(value))
  .refine((value) => value.length >= 3 && value.length <= 64, "Enter a valid room ID, like gold-alpha.");

export const whoWhoJoinRoomSchema = z.object({
  participantId: z.string().min(1),
  roomId: whoWhoRoomIdSchema
});

export const whoWhoChatSchema = z.object({
  participantId: z.string().min(1),
  roomId: whoWhoRoomIdSchema,
  text: z.string().trim().min(1).max(360)
});

export const whoWhoAccuseSchema = z.object({
  participantId: z.string().min(1),
  roomId: whoWhoRoomIdSchema,
  identityId: z.string().min(1),
  reason: z.string().trim().min(2).max(360)
});

export const whoWhoRoleAbilitySchema = z.object({
  participantId: z.string().min(1),
  roomId: whoWhoRoomIdSchema,
  targetIdentityId: z.string().min(1)
});

export const whoWhoGameControlSchema = z.object({
  roomId: whoWhoRoomIdSchema,
  action: z.enum(["start", "open-vote", "force-vote", "resolve", "next-round", "reset", "reveal"])
});

export const whoWhoRoundControlSchema = z.object({
  roomId: z.string().min(1),
  promptId: z.string().min(1).optional(),
  stage: z.enum(["lobby", "instructions", "warm-up", "round", "review", "discussion", "voting", "reveal", "debrief"]).optional()
});

const detectiveRoomIdSchema = z
  .string()
  .transform((value) => normalizeDetectiveRoomId(value))
  .refine((value) => value.length >= 3 && value.length <= 64, "Enter a valid room ID, like venture-north or venture-ne.");

export const detectiveJoinRoomSchema = z.object({
  participantId: z.string().min(1),
  roomId: detectiveRoomIdSchema
});

export const detectiveDiscoverySchema = z.object({
  participantId: z.string().min(1),
  roomId: detectiveRoomIdSchema.optional(),
  teamId: z.string().min(1).optional(),
  evidenceId: z.string().min(1).optional(),
  relatedEvidenceId: z.string().min(1).optional(),
  documentId: z.string().min(1).optional(),
  claim: z.string().trim().min(6).max(320),
  finding: z.string().trim().min(12).max(900),
  sourceTitle: z.string().trim().min(3).max(180),
  sourceUrl: z.string().trim().url().max(600).optional().or(z.literal("")),
  evidenceType: z.enum(["company-document", "outside-source", "metric", "competitor", "customer-risk", "policy-risk"]).default("outside-source"),
  stance: z.enum(["supports-fund", "supports-reject", "needs-more-research"]).default("needs-more-research"),
  category: z.enum(ETHICAL_CATEGORIES),
  severity: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  confidence: z.number().int().min(1).max(5).default(3),
  explanation: z.string().trim().max(900).optional(),
  affectedGroups: z.string().trim().max(300).optional(),
  safeguard: z.string().trim().max(500).optional(),
  dueProcessImpact: z.string().trim().max(500).optional(),
  nextStep: z.string().trim().max(400).optional()
}).refine((value) => Boolean(value.roomId || value.teamId), "Room ID is required.");

export const detectiveChatSchema = z.object({
  participantId: z.string().min(1),
  roomId: detectiveRoomIdSchema,
  text: z.string().trim().min(1).max(500)
});

export const detectiveRecommendationSchema = z.object({
  participantId: z.string().min(1),
  roomId: detectiveRoomIdSchema.optional(),
  teamId: z.string().min(1).optional(),
  finalClaim: z.string().trim().min(12).max(1000),
  strongestEvidence: z.string().trim().min(8).max(900),
  openQuestions: z.string().trim().max(900).optional(),
  conditions: z.string().trim().max(1000).optional(),
  decision: z.enum(["fund", "reject"]),
  accountableParty: z.string().trim().max(500).optional(),
  minimumConditions: z.string().trim().max(1000).optional(),
  independentAuditPlan: z.string().trim().max(1000).optional()
}).refine((value) => Boolean(value.roomId || value.teamId), "Room ID is required.");

export const detectiveFundingVoteSchema = z.object({
  participantId: z.string().min(1),
  roomId: detectiveRoomIdSchema,
  vote: z.enum(["fund", "reject"]),
  reason: z.string().trim().min(4).max(500)
});

export const storySeedSchema = z.object({
  teamId: z.string().min(1),
  genre: z.string().trim().min(2).max(80),
  setting: z.string().trim().min(2).max(140),
  theme: z.string().trim().min(2).max(80),
  emotion: z.string().trim().min(2).max(80),
  audience: z.string().trim().min(2).max(100)
});

export const storyContributionSchema = z.object({
  teamId: z.string().min(1),
  stage: z.number().int().min(1).max(6),
  authorParticipantId: z.string().min(1).optional(),
  text: z.string().trim().min(2).max(1200)
});

export const storyGenerateSchema = z.object({
  participantId: z.string().min(1),
  teamId: z.string().min(1),
  storyId: z.string().min(1),
  approvedPlan: z.string().trim().min(20).max(3000),
  ethicsChecklist: z.record(z.string(), z.boolean())
});

export const storyPublishSchema = z.object({
  participantId: z.string().min(1),
  storyId: z.string().min(1),
  title: z.string().trim().min(2).max(120),
  finalText: z.string().trim().min(120).max(3000),
  authorshipStatement: z.string().trim().min(40).max(800),
  ethicalRevision: z.string().trim().min(8).max(700),
  humanContributionSummary: z.string().trim().min(8).max(700),
  aiContributionSummary: z.string().trim().min(8).max(700)
});

const storyRoomIdSchema = z
  .string()
  .transform((value) => normalizeStoryRoomId(value))
  .refine((value) => value.length >= 3 && value.length <= 64, "Enter a valid room ID, like bloom-alpha.");

export const storyRoomJoinSchema = z.object({
  participantId: z.string().min(1),
  roomId: storyRoomIdSchema
});

export const storyRoomChatSchema = z.object({
  participantId: z.string().min(1),
  roomId: storyRoomIdSchema,
  text: z.string().trim().min(1).max(600)
});

export const storyRoomProposalSchema = z.object({
  participantId: z.string().min(1),
  roomId: storyRoomIdSchema,
  kind: z.enum(["seed", "character", "conflict", "plot", "dialogue", "revision", "title", "ethics"]),
  text: z.string().trim().min(4).max(700)
});

export const storyRoomProposalVoteSchema = z.object({
  participantId: z.string().min(1),
  roomId: storyRoomIdSchema,
  proposalId: z.string().min(1),
  vote: z.enum(["approve", "rework"])
});

export const storyRoomGuideSchema = z.object({
  participantId: z.string().min(1),
  roomId: storyRoomIdSchema,
  prompt: z.string().trim().min(3).max(700),
  scope: z.enum(["personal", "room"]).default("room")
});

export const storyRoomSaveSchema = z.object({
  participantId: z.string().min(1),
  roomId: storyRoomIdSchema,
  title: z.string().trim().min(2).max(120).optional(),
  finalText: z.string().trim().min(1).max(5000).optional(),
  authorshipNote: z.string().trim().max(900).optional()
});

export const storyRoomControlSchema = z.object({
  roomId: storyRoomIdSchema,
  action: z.enum(["start", "reset", "end"])
});

const courtVoteValueSchema = z.enum(["approve", "approve-with-restrictions", "reject", "need-more-information"]);
const courtRoomIdSchema = z
  .string()
  .transform((value) => normalizeCourtRoomId(value))
  .refine((value) => value.length >= 3 && value.length <= 64, "Enter a valid courtroom ID, like court-alpha.");

export const courtRoomJoinSchema = z.object({
  participantId: z.string().min(1),
  roomId: courtRoomIdSchema
});

export const courtRoomArgumentSchema = z.object({
  participantId: z.string().min(1),
  roomId: courtRoomIdSchema,
  stance: courtVoteValueSchema,
  stakeholder: z.string().trim().min(2).max(180),
  evidence: z.string().trim().max(500).optional(),
  text: z.string().trim().min(8).max(900)
});

export const courtRoomVoteSchema = z.object({
  participantId: z.string().min(1),
  roomId: courtRoomIdSchema,
  vote: courtVoteValueSchema,
  reason: z.string().trim().min(3).max(600)
});

export const courtRoomControlSchema = z.object({
  roomId: courtRoomIdSchema,
  action: z.enum(["start", "next-round", "final-vote", "end", "reset"])
});

export const courtVoteSchema = z.object({
  participantId: z.string().min(1),
  teamId: z.string().min(1),
  caseId: z.string().min(1),
  phase: z.enum(["initial", "final"]),
  vote: courtVoteValueSchema,
  reason: z.string().trim().min(3).max(600),
  stakeholder: z.string().trim().max(180).optional(),
  restriction: z.string().trim().max(240).optional(),
  appealNeeded: z.boolean().optional()
});

export const courtReasoningSchema = z.object({
  participantId: z.string().min(1),
  teamId: z.string().min(1),
  caseId: z.string().min(1),
  reasoning: z.string().trim().min(8).max(1000),
  stakeholders: z.string().trim().min(4).max(700),
  accountability: z.string().trim().min(4).max(700),
  appeal: z.string().trim().min(4).max(700)
});

export const charterProposalSchema = z.object({
  teamId: z.string().min(1),
  text: z.string().trim().min(8).max(240)
});

export const charterVoteSchema = z.object({
  participantId: z.string().min(1),
  proposalId: z.string().min(1)
});

export const aiGenerateSchema = z.object({
  teamId: z.string().min(1),
  kind: z.enum(["whos-who-persona", "story-brainstorm", "story-plan", "story-draft", "story-ethics", "facilitator-support"]),
  payload: z.record(z.unknown())
});

export const deleteDataSchema = z.object({
  scope: z.enum(["participant", "team", "workshop", "stories", "votes", "event"]),
  targetId: z.string().min(1).optional(),
  confirm: z.literal("DELETE")
});

export type JoinEventInput = z.infer<typeof joinEventSchema>;
export type FacilitatorLoginInput = z.infer<typeof facilitatorLoginSchema>;
export type EventControlInput = z.infer<typeof eventControlSchema>;
export type WhoWhoResponseInput = z.infer<typeof whoWhoResponseSchema>;
export type WhoWhoVoteInput = z.infer<typeof whoWhoVoteSchema>;
export type WhoWhoJoinRoomInput = z.infer<typeof whoWhoJoinRoomSchema>;
export type WhoWhoChatInput = z.infer<typeof whoWhoChatSchema>;
export type WhoWhoAccuseInput = z.infer<typeof whoWhoAccuseSchema>;
export type WhoWhoRoleAbilityInput = z.infer<typeof whoWhoRoleAbilitySchema>;
export type WhoWhoGameControlInput = z.infer<typeof whoWhoGameControlSchema>;
export type WhoWhoRoundControlInput = z.infer<typeof whoWhoRoundControlSchema>;
export type DetectiveJoinRoomInput = z.infer<typeof detectiveJoinRoomSchema>;
export type DetectiveDiscoveryInput = z.infer<typeof detectiveDiscoverySchema>;
export type DetectiveChatInput = z.infer<typeof detectiveChatSchema>;
export type DetectiveRecommendationInput = z.infer<typeof detectiveRecommendationSchema>;
export type DetectiveFundingVoteInput = z.infer<typeof detectiveFundingVoteSchema>;
export type StoryGenerateInput = z.infer<typeof storyGenerateSchema>;
export type StoryPublishInput = z.infer<typeof storyPublishSchema>;
export type StoryRoomJoinInput = z.infer<typeof storyRoomJoinSchema>;
export type StoryRoomChatInput = z.infer<typeof storyRoomChatSchema>;
export type StoryRoomProposalInput = z.infer<typeof storyRoomProposalSchema>;
export type StoryRoomProposalVoteInput = z.infer<typeof storyRoomProposalVoteSchema>;
export type StoryRoomGuideInput = z.infer<typeof storyRoomGuideSchema>;
export type StoryRoomSaveInput = z.infer<typeof storyRoomSaveSchema>;
export type StoryRoomControlInput = z.infer<typeof storyRoomControlSchema>;
export type CourtRoomJoinInput = z.infer<typeof courtRoomJoinSchema>;
export type CourtRoomArgumentInput = z.infer<typeof courtRoomArgumentSchema>;
export type CourtRoomVoteInput = z.infer<typeof courtRoomVoteSchema>;
export type CourtRoomControlInput = z.infer<typeof courtRoomControlSchema>;
export type CourtVoteInput = z.infer<typeof courtVoteSchema>;
export type CourtReasoningInput = z.infer<typeof courtReasoningSchema>;
