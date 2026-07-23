import { describe, expect, it } from "vitest";
import { ROTATION_GROUPS } from "./constants.js";
import {
  assignRotationGroup,
  awardBadges,
  calculateVoteBreakdown,
  calculateWhoWhoScore,
  currentWorkshopForGroup,
  moderateText,
  normalizeNickname,
  portalStateForWorkshop
} from "./logic.js";
import type { EventState } from "./types.js";

const settings: EventState["settings"] = {
  leaderboardEnabled: true,
  leaderboardMode: "team",
  aiEnabled: true,
  lowBandwidthMode: false,
  fallbackMode: false,
  manuallyUnlockedWorkshops: [],
  lockedWorkshops: []
};

describe("rotation logic", () => {
  it("maps groups to the requested rotation schedule", () => {
    expect(currentWorkshopForGroup("Gold", 1)).toBe("whos-who");
    expect(currentWorkshopForGroup("Black", 1)).toBe("data-detective");
    expect(currentWorkshopForGroup("Green", 4)).toBe("data-detective");
    expect(currentWorkshopForGroup("Purple", 2)).toBe("whos-who");
  });

  it("assigns participants to the least-full group", () => {
    const counts = Object.fromEntries(ROTATION_GROUPS.map((group) => [group, 20])) as Record<(typeof ROTATION_GROUPS)[number], number>;
    counts.Green = 17;
    expect(assignRotationGroup(counts)).toBe("Green");
  });

  it("keeps every workshop open unless a facilitator locks or pauses access", () => {
    expect(
      portalStateForWorkshop({
        workshopId: "storibloom",
        group: "Gold",
        currentRotation: 1,
        status: "running",
        completedWorkshops: [],
        settings
      })
    ).toBe("available");
    expect(
      portalStateForWorkshop({
        workshopId: "storibloom",
        group: "Gold",
        currentRotation: 1,
        status: "running",
        completedWorkshops: [],
        settings: { ...settings, lockedWorkshops: ["storibloom"] }
      })
    ).toBe("locked");
    expect(
      portalStateForWorkshop({
        workshopId: "storibloom",
        group: "Gold",
        currentRotation: 1,
        status: "paused",
        completedWorkshops: [],
        settings
      })
    ).toBe("paused");
  });
});

describe("participant utilities", () => {
  it("deduplicates nicknames inside an event", () => {
    expect(normalizeNickname("Nova", ["Nova", "Nova 2"])).toBe("Nova 3");
  });

  it("awards the champion badge after all workshop badges", () => {
    const badges = awardBadges(["whos-who", "data-detective", "storibloom", "kurami-court"]);
    expect(badges.map((badge) => badge.id)).toContain("responsible-ai-champion");
  });
});

describe("scoring and moderation", () => {
  it("scores correct AI selections while subtracting false accusations", () => {
    expect(
      calculateWhoWhoScore({
        correctAiSelections: 2,
        incorrectHumanAccusations: 1,
        strongEvidence: true,
        changedOpinion: true,
        unsupportedAssumptionNamed: true,
        facilitatorBonus: 75
      })
    ).toBe(265);
  });

  it("flags personal information", () => {
    expect(moderateText("email me at test@example.com").ok).toBe(false);
  });

  it("counts vote modes", () => {
    expect(calculateVoteBreakdown(["approve", "reject", "reject", "need-more-information"]).reject).toBe(2);
  });
});
