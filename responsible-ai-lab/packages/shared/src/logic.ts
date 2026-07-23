import { BADGES, POINT_RULES, ROTATION_GROUPS, ROTATION_SCHEDULE, WHOS_WHO_PERSONAS, WORKSHOPS } from "./constants.js";
import type {
  BadgeDefinition,
  EventState,
  ModerationResult,
  ParticipantSummary,
  PortalState,
  RotationGroupName,
  TimerSnapshot,
  VoteBreakdown,
  WorkshopId
} from "./types.js";

const profanity = ["damn", "hell"];
const severePatterns: Array<{ reason: string; pattern: RegExp }> = [
  { reason: "Possible phone number", pattern: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/ },
  { reason: "Possible email address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { reason: "Prompt extraction attempt", pattern: /\b(system prompt|ignore previous instructions|developer message)\b/i },
  { reason: "Threatening language", pattern: /\b(kill|hurt|attack)\s+(you|them|her|him|someone)\b/i },
  { reason: "Hate or harassment", pattern: /\b(slur|racial insult)\b/i }
];

export function currentWorkshopForGroup(group: RotationGroupName, rotation: EventState["currentRotation"]): WorkshopId {
  const schedule = ROTATION_SCHEDULE[group];
  const firstWorkshop = schedule[0];
  if (!firstWorkshop) throw new Error(`Rotation schedule is empty for ${group}.`);
  if (rotation <= 0) {
    return firstWorkshop;
  }
  return schedule[rotation - 1] ?? firstWorkshop;
}

export function completedWorkshopsForGroup(group: RotationGroupName, rotation: EventState["currentRotation"]): WorkshopId[] {
  if (rotation <= 1) {
    return [];
  }
  return ROTATION_SCHEDULE[group].slice(0, Math.min(rotation - 1, 4));
}

export function portalStateForWorkshop(args: {
  workshopId: WorkshopId;
  group: RotationGroupName;
  currentRotation: EventState["currentRotation"];
  status: EventState["status"];
  completedWorkshops: WorkshopId[];
  settings: EventState["settings"];
}): PortalState {
  if (args.settings.lockedWorkshops.includes(args.workshopId)) {
    return "locked";
  }
  if (args.status === "paused") {
    return "paused";
  }
  if (args.completedWorkshops.includes(args.workshopId)) {
    return "completed";
  }
  return "available";
}

export function assignRotationGroup(groupCounts: Record<RotationGroupName, number>): RotationGroupName {
  const firstGroup = ROTATION_GROUPS[0];
  if (!firstGroup) throw new Error("No rotation groups configured.");
  return ROTATION_GROUPS.reduce((leastFull, group) => (groupCounts[group] < groupCounts[leastFull] ? group : leastFull), firstGroup);
}

export function normalizeNickname(requestedNickname: string, existingNicknames: readonly string[]): string {
  const base = requestedNickname.trim().replace(/\s+/g, " ").slice(0, 24);
  const lowerExisting = new Set(existingNicknames.map((nickname) => nickname.toLowerCase()));
  if (!lowerExisting.has(base.toLowerCase())) {
    return base;
  }

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base} ${suffix}`.slice(0, 24);
    if (!lowerExisting.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return `${base.slice(0, 18)} ${Date.now().toString().slice(-4)}`;
}

export function assignTeam(group: RotationGroupName, teams: Array<{ id: string; group: RotationGroupName; memberCount: number }>): string {
  const groupTeams = teams.filter((team) => team.group === group);
  if (groupTeams.length === 0) {
    return `${group.toLowerCase()}-team-1`;
  }
  const firstTeam = groupTeams[0];
  if (!firstTeam) return `${group.toLowerCase()}-team-1`;
  return groupTeams.reduce((leastFull, team) => (team.memberCount < leastFull.memberCount ? team : leastFull), firstTeam).id;
}

export function calculateWhoWhoScore(args: {
  correctAiSelections: number;
  incorrectHumanAccusations: number;
  strongEvidence: boolean;
  changedOpinion: boolean;
  unsupportedAssumptionNamed: boolean;
  facilitatorBonus?: number;
}): number {
  const rule = (id: string) => POINT_RULES.find((item) => item.id === id)?.points ?? 0;
  return (
    args.correctAiSelections * rule("correct-ai") +
    args.incorrectHumanAccusations * rule("false-accusation") +
    (args.strongEvidence ? rule("evidence-explanation") : 0) +
    (args.changedOpinion ? rule("changed-opinion") : 0) +
    (args.unsupportedAssumptionNamed ? rule("unsupported-assumption") : 0) +
    Math.min(Math.max(args.facilitatorBonus ?? 0, 0), 50)
  );
}

export function calculateVoteBreakdown(votes: readonly string[]): VoteBreakdown {
  return votes.reduce<VoteBreakdown>(
    (breakdown, vote) => {
      if (vote === "approve") breakdown.approve += 1;
      if (vote === "approve-with-restrictions") breakdown.approveWithRestrictions += 1;
      if (vote === "reject") breakdown.reject += 1;
      if (vote === "need-more-information") breakdown.needMoreInformation += 1;
      breakdown.total += 1;
      return breakdown;
    },
    { approve: 0, approveWithRestrictions: 0, reject: 0, needMoreInformation: 0, total: 0 }
  );
}

export function awardBadges(completedWorkshops: readonly WorkshopId[]): BadgeDefinition[] {
  const earned = BADGES.filter((badge) => badge.workshopId && completedWorkshops.includes(badge.workshopId));
  const workshopBadgeCount = earned.length;
  if (workshopBadgeCount === 4) {
    const champion = BADGES.find((badge) => badge.id === "responsible-ai-champion");
    if (champion) earned.push(champion);
  }
  return earned;
}

export function moderateText(text: string): ModerationResult {
  const reasons: string[] = [];
  let severity: ModerationResult["severity"];
  let redactedText = text;

  for (const item of severePatterns) {
    if (item.pattern.test(text)) {
      reasons.push(item.reason);
      severity = "high";
      redactedText = redactedText.replace(item.pattern, "[redacted]");
    }
  }

  for (const word of profanity) {
    const wordPattern = new RegExp(`\\b${word}\\b`, "gi");
    if (wordPattern.test(text)) {
      reasons.push("Profanity");
      severity = severity ?? "low";
      redactedText = redactedText.replace(wordPattern, "[flagged]");
    }
  }

  return {
    ok: reasons.length === 0,
    severity,
    reasons,
    redactedText
  };
}

export function timerSnapshot(eventState: EventState, now = new Date()): TimerSnapshot {
  if (!eventState.rotationEndsAt) {
    return {
      status: eventState.status,
      currentRotation: eventState.currentRotation,
      secondsRemaining: eventState.timerSecondsRemaining,
      endsAt: null
    };
  }

  const secondsRemaining = Math.max(0, Math.floor((new Date(eventState.rotationEndsAt).getTime() - now.getTime()) / 1000));
  return {
    status: eventState.status,
    currentRotation: eventState.currentRotation,
    secondsRemaining,
    endsAt: eventState.rotationEndsAt
  };
}

export function generateFallbackPersonaResponse(personaId: (typeof WHOS_WHO_PERSONAS)[number]["id"], promptText: string, seed: number): string {
  const fallbackPersona = WHOS_WHO_PERSONAS[0];
  if (!fallbackPersona) throw new Error("Who's Who AI persona bank is empty.");
  const persona = WHOS_WHO_PERSONAS.find((item) => item.id === personaId) ?? fallbackPersona;
  const response = persona.fallbackResponses[seed % persona.fallbackResponses.length];
  return `${response} (${promptText.length > 50 ? "I tried to stay on the prompt without overthinking it." : "That is my answer."})`;
}

export function createDeterministicStoryDraft(args: {
  teamName: string;
  genre: string;
  setting: string;
  theme: string;
  protagonist: string;
  conflict: string;
}): string {
  const protagonist = args.protagonist.trim() || "the main character";
  const conflict = args.conflict.trim() || "a choice nobody else wanted to make";
  return `${args.teamName} shaped a ${args.genre.toLowerCase()} story set in ${args.setting}. ${protagonist} begins with a clear goal but runs into ${conflict}. At first, the world feels too loud for one person to change anything, so the protagonist listens, tests what is true, and asks who might be harmed by the easiest answer. A friend challenges them to stop treating courage like a speech and start treating it like a practice. In the turning point, the protagonist notices a detail everyone else ignored: the solution only works if the people most affected can question it. They redesign the plan with the community instead of for the community. By the end, the conflict is not magically erased, but the characters have a fairer process, a stronger promise, and a reason to trust each other. The story should now be edited by the team with at least three human sentence changes, a sharper title, and one distinctive detail only the team would invent. Theme: ${args.theme}.`;
}

export function workshopPortalLabel(state: PortalState): string {
  if (state === "available") return "Available now";
  if (state === "completed") return "Completed";
  if (state === "paused") return "Facilitator paused";
  if (state === "rejoin") return "Rejoin activity";
  return "Locked";
}

export function listWorkshopRoutes(): string[] {
  return Object.values(WORKSHOPS).map((workshop) => workshop.route);
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

export function completionPercent(participant: ParticipantSummary): number {
  return Math.round((participant.completedWorkshops.length / 4) * 100);
}
