-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'onboarding', 'running', 'paused', 'ended');

-- CreateEnum
CREATE TYPE "RotationStatus" AS ENUM ('locked', 'open', 'paused', 'complete');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('active', 'absent', 'removed');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('locked', 'open', 'complete');

-- CreateEnum
CREATE TYPE "VotePhase" AS ENUM ('initial', 'final');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'flagged', 'approved', 'published', 'unpublished', 'removed');

-- CreateEnum
CREATE TYPE "AIRequestStatus" AS ENUM ('queued', 'running', 'complete', 'failed', 'canceled');

-- CreateTable
CREATE TABLE "Facilitator" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'lead-facilitator',
    "pinHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facilitator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "currentRotation" INTEGER NOT NULL DEFAULT 0,
    "rotationStartedAt" TIMESTAMP(3),
    "rotationEndsAt" TIMESTAMP(3),
    "announcement" TEXT,
    "demoMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSettings" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "leaderboardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "leaderboardMode" TEXT NOT NULL DEFAULT 'team',
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lowBandwidthMode" BOOLEAN NOT NULL DEFAULT false,
    "fallbackMode" BOOLEAN NOT NULL DEFAULT false,
    "manuallyUnlockedWorkshops" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lockedWorkshops" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rotation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "RotationStatus" NOT NULL DEFAULT 'locked',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationGroup" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "normalizedNickname" TEXT NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'active',
    "groupId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "whoWhoRoomId" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantSession" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ParticipantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopProgress" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'locked',
    "stage" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "workshopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantBadge" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT,
    "teamId" TEXT,
    "workshopId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhoWhoRoom" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'lobby',
    "activePromptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhoWhoRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhoWhoRound" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "promptId" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'instructions',
    "submissionsCloseAt" TIMESTAMP(3),
    "votingCloseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhoWhoRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhoWhoIdentity" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isAi" BOOLEAN NOT NULL DEFAULT false,
    "personaId" TEXT,
    "participantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhoWhoIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhoWhoResponse" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "participantId" TEXT,
    "text" TEXT NOT NULL,
    "moderatedText" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "revealed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhoWhoResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhoWhoVote" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "evidence" TEXT NOT NULL,
    "finalVote" BOOLEAN NOT NULL DEFAULT false,
    "changedOpinion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhoWhoVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetectiveScenario" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "activeStage" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetectiveScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetectiveEvidence" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "categories" TEXT[],
    "hiddenValue" INTEGER,
    "revealed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DetectiveEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetectiveDiscovery" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "participantId" TEXT,
    "teamId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "affectedGroups" TEXT NOT NULL,
    "safeguard" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DetectiveDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetectiveRecommendation" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "stopImmediately" TEXT NOT NULL,
    "missingInformation" TEXT NOT NULL,
    "likelyHarmed" TEXT NOT NULL,
    "safeguard" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "accountableParty" TEXT NOT NULL,
    "appealProcess" TEXT NOT NULL,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DetectiveRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryProject" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT,
    "genre" TEXT,
    "setting" TEXT,
    "theme" TEXT,
    "emotion" TEXT,
    "audience" TEXT,
    "stage" INTEGER NOT NULL DEFAULT 1,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryStage" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'open',
    "data" JSONB,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StoryStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryContribution" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "participantId" TEXT,
    "stage" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryGeneration" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AIRequestStatus" NOT NULL DEFAULT 'complete',
    "aiRequestLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryRevision" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "beforeText" TEXT NOT NULL,
    "afterText" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedStory" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "finalText" TEXT NOT NULL,
    "authorshipStatement" TEXT NOT NULL,
    "ethicalRevision" TEXT NOT NULL,
    "humanContributionSummary" TEXT NOT NULL,
    "aiContributionSummary" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'flagged',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtCase" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "missingDetail" TEXT NOT NULL,
    "keyIssues" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourtCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtEvidenceReveal" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "revealed" BOOLEAN NOT NULL DEFAULT false,
    "revealOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourtEvidenceReveal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtVote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "phase" "VotePhase" NOT NULL,
    "vote" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourtVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtReasoning" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "stakeholders" TEXT NOT NULL,
    "accountability" TEXT NOT NULL,
    "appeal" TEXT NOT NULL,
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourtReasoning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharterProposal" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT,
    "text" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'flagged',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharterProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharterVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharterVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationFlag" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT,
    "workshopId" TEXT,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "redactedText" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ModerationFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRequestLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT,
    "kind" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AIRequestStatus" NOT NULL DEFAULT 'queued',
    "promptHash" TEXT NOT NULL,
    "tokenEstimate" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "facilitatorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_code_key" ON "Event"("code");

-- CreateIndex
CREATE INDEX "Event_code_idx" ON "Event"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EventSettings_eventId_key" ON "EventSettings"("eventId");

-- CreateIndex
CREATE INDEX "Rotation_eventId_status_idx" ON "Rotation"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Rotation_eventId_number_key" ON "Rotation"("eventId", "number");

-- CreateIndex
CREATE INDEX "RotationGroup_eventId_idx" ON "RotationGroup"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "RotationGroup_eventId_name_key" ON "RotationGroup"("eventId", "name");

-- CreateIndex
CREATE INDEX "Participant_eventId_status_idx" ON "Participant"("eventId", "status");

-- CreateIndex
CREATE INDEX "Participant_teamId_idx" ON "Participant"("teamId");

-- CreateIndex
CREATE INDEX "Participant_groupId_idx" ON "Participant"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_eventId_normalizedNickname_key" ON "Participant"("eventId", "normalizedNickname");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantSession_sessionId_key" ON "ParticipantSession"("sessionId");

-- CreateIndex
CREATE INDEX "ParticipantSession_participantId_idx" ON "ParticipantSession"("participantId");

-- CreateIndex
CREATE INDEX "ParticipantSession_connected_idx" ON "ParticipantSession"("connected");

-- CreateIndex
CREATE INDEX "Team_eventId_idx" ON "Team"("eventId");

-- CreateIndex
CREATE INDEX "Team_groupId_idx" ON "Team"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_eventId_name_key" ON "Team"("eventId", "name");

-- CreateIndex
CREATE INDEX "WorkshopProgress_workshopId_status_idx" ON "WorkshopProgress"("workshopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopProgress_participantId_workshopId_key" ON "WorkshopProgress"("participantId", "workshopId");

-- CreateIndex
CREATE INDEX "Badge_eventId_idx" ON "Badge"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantBadge_participantId_badgeId_key" ON "ParticipantBadge"("participantId", "badgeId");

-- CreateIndex
CREATE INDEX "PointTransaction_eventId_workshopId_idx" ON "PointTransaction"("eventId", "workshopId");

-- CreateIndex
CREATE INDEX "PointTransaction_participantId_idx" ON "PointTransaction"("participantId");

-- CreateIndex
CREATE INDEX "Announcement_eventId_createdAt_idx" ON "Announcement"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "WhoWhoRoom_eventId_idx" ON "WhoWhoRoom"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "WhoWhoRoom_eventId_groupId_name_key" ON "WhoWhoRoom"("eventId", "groupId", "name");

-- CreateIndex
CREATE INDEX "WhoWhoRound_roomId_stage_idx" ON "WhoWhoRound"("roomId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "WhoWhoRound_roomId_number_key" ON "WhoWhoRound"("roomId", "number");

-- CreateIndex
CREATE INDEX "WhoWhoIdentity_roomId_isAi_idx" ON "WhoWhoIdentity"("roomId", "isAi");

-- CreateIndex
CREATE UNIQUE INDEX "WhoWhoIdentity_roomId_displayName_key" ON "WhoWhoIdentity"("roomId", "displayName");

-- CreateIndex
CREATE INDEX "WhoWhoResponse_roundId_idx" ON "WhoWhoResponse"("roundId");

-- CreateIndex
CREATE INDEX "WhoWhoResponse_identityId_idx" ON "WhoWhoResponse"("identityId");

-- CreateIndex
CREATE INDEX "WhoWhoVote_roundId_idx" ON "WhoWhoVote"("roundId");

-- CreateIndex
CREATE INDEX "WhoWhoVote_participantId_idx" ON "WhoWhoVote"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "DetectiveScenario_eventId_name_key" ON "DetectiveScenario"("eventId", "name");

-- CreateIndex
CREATE INDEX "DetectiveEvidence_scenarioId_stage_idx" ON "DetectiveEvidence"("scenarioId", "stage");

-- CreateIndex
CREATE INDEX "DetectiveDiscovery_teamId_idx" ON "DetectiveDiscovery"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "DetectiveDiscovery_teamId_evidenceId_key" ON "DetectiveDiscovery"("teamId", "evidenceId");

-- CreateIndex
CREATE UNIQUE INDEX "DetectiveRecommendation_scenarioId_teamId_key" ON "DetectiveRecommendation"("scenarioId", "teamId");

-- CreateIndex
CREATE INDEX "StoryProject_teamId_idx" ON "StoryProject"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryStage_storyId_stage_key" ON "StoryStage"("storyId", "stage");

-- CreateIndex
CREATE INDEX "StoryContribution_storyId_stage_idx" ON "StoryContribution"("storyId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedStory_storyId_key" ON "PublishedStory"("storyId");

-- CreateIndex
CREATE INDEX "CourtCase_eventId_idx" ON "CourtCase"("eventId");

-- CreateIndex
CREATE INDEX "CourtEvidenceReveal_caseId_revealed_idx" ON "CourtEvidenceReveal"("caseId", "revealed");

-- CreateIndex
CREATE INDEX "CourtVote_caseId_phase_idx" ON "CourtVote"("caseId", "phase");

-- CreateIndex
CREATE INDEX "CourtVote_teamId_idx" ON "CourtVote"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "CourtVote_caseId_participantId_phase_key" ON "CourtVote"("caseId", "participantId", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "CourtReasoning_caseId_teamId_key" ON "CourtReasoning"("caseId", "teamId");

-- CreateIndex
CREATE INDEX "CharterProposal_eventId_status_idx" ON "CharterProposal"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CharterVote_proposalId_participantId_key" ON "CharterVote"("proposalId", "participantId");

-- CreateIndex
CREATE INDEX "ModerationFlag_eventId_resolved_idx" ON "ModerationFlag"("eventId", "resolved");

-- CreateIndex
CREATE INDEX "ModerationFlag_participantId_idx" ON "ModerationFlag"("participantId");

-- CreateIndex
CREATE INDEX "AIRequestLog_eventId_status_idx" ON "AIRequestLog"("eventId", "status");

-- CreateIndex
CREATE INDEX "AIRequestLog_teamId_idx" ON "AIRequestLog"("teamId");

-- CreateIndex
CREATE INDEX "AuditLog_eventId_createdAt_idx" ON "AuditLog"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_facilitatorId_idx" ON "AuditLog"("facilitatorId");

-- AddForeignKey
ALTER TABLE "EventSettings" ADD CONSTRAINT "EventSettings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rotation" ADD CONSTRAINT "Rotation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationGroup" ADD CONSTRAINT "RotationGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RotationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RotationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopProgress" ADD CONSTRAINT "WorkshopProgress_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantBadge" ADD CONSTRAINT "ParticipantBadge_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantBadge" ADD CONSTRAINT "ParticipantBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhoWhoRoom" ADD CONSTRAINT "WhoWhoRoom_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhoWhoRoom" ADD CONSTRAINT "WhoWhoRoom_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RotationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhoWhoRound" ADD CONSTRAINT "WhoWhoRound_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "WhoWhoRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhoWhoIdentity" ADD CONSTRAINT "WhoWhoIdentity_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "WhoWhoRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhoWhoResponse" ADD CONSTRAINT "WhoWhoResponse_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "WhoWhoRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhoWhoResponse" ADD CONSTRAINT "WhoWhoResponse_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "WhoWhoIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhoWhoResponse" ADD CONSTRAINT "WhoWhoResponse_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhoWhoVote" ADD CONSTRAINT "WhoWhoVote_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "WhoWhoRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhoWhoVote" ADD CONSTRAINT "WhoWhoVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhoWhoVote" ADD CONSTRAINT "WhoWhoVote_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "WhoWhoIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectiveScenario" ADD CONSTRAINT "DetectiveScenario_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectiveEvidence" ADD CONSTRAINT "DetectiveEvidence_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "DetectiveScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectiveDiscovery" ADD CONSTRAINT "DetectiveDiscovery_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "DetectiveEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectiveDiscovery" ADD CONSTRAINT "DetectiveDiscovery_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectiveDiscovery" ADD CONSTRAINT "DetectiveDiscovery_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectiveRecommendation" ADD CONSTRAINT "DetectiveRecommendation_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "DetectiveScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectiveRecommendation" ADD CONSTRAINT "DetectiveRecommendation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryProject" ADD CONSTRAINT "StoryProject_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryStage" ADD CONSTRAINT "StoryStage_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "StoryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryContribution" ADD CONSTRAINT "StoryContribution_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "StoryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryContribution" ADD CONSTRAINT "StoryContribution_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryGeneration" ADD CONSTRAINT "StoryGeneration_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "StoryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryRevision" ADD CONSTRAINT "StoryRevision_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "StoryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedStory" ADD CONSTRAINT "PublishedStory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "StoryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtCase" ADD CONSTRAINT "CourtCase_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtEvidenceReveal" ADD CONSTRAINT "CourtEvidenceReveal_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CourtCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtVote" ADD CONSTRAINT "CourtVote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CourtCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtVote" ADD CONSTRAINT "CourtVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtReasoning" ADD CONSTRAINT "CourtReasoning_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CourtCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtReasoning" ADD CONSTRAINT "CourtReasoning_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharterProposal" ADD CONSTRAINT "CharterProposal_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharterProposal" ADD CONSTRAINT "CharterProposal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharterVote" ADD CONSTRAINT "CharterVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "CharterProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharterVote" ADD CONSTRAINT "CharterVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationFlag" ADD CONSTRAINT "ModerationFlag_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationFlag" ADD CONSTRAINT "ModerationFlag_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRequestLog" ADD CONSTRAINT "AIRequestLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "Facilitator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
