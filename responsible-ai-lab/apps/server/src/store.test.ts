import { describe, expect, it, vi } from "vitest";
import { currentWorkshopForGroup, type WorkshopId } from "@responsible-ai-lab/shared";
import { EventStore } from "./store.js";

function range(length: number) {
  return Array.from({ length }, (_, index) => index);
}

type TestWhoWhoRoom = {
  id: string;
  roundId: string;
  identities: Array<{ id: string; displayName: string; isAi: boolean; participantId?: string; role?: string; alive: boolean }>;
  abilityUses: unknown[];
  gameEvents: Array<{ message: string }>;
};

function internalWhoWhoRoom(store: EventStore, roomId = "gold-alpha") {
  const rooms = (store as unknown as { rooms: Map<string, TestWhoWhoRoom> }).rooms;
  const room = rooms.get(roomId);
  if (!room) throw new Error(`Missing test room ${roomId}.`);
  return room;
}

function stableIndex(seed: string, length: number) {
  if (length <= 0) return 0;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % length;
}

describe("EventStore demo mode", () => {
  it("fills a solo student team with AI classmates and starts Who's Who with 13 seats", () => {
    const store = new EventStore({ eventCode: "DEMO", demoMode: true });

    const result = store.join({
      eventCode: "DEMO",
      nickname: "Solo Student",
      acceptedResponsibleUse: true
    });

    const participants = store.listParticipants();
    const team = store.getState().teams.find((item) => item.id === result.participant.teamId);
    const whoWhoState = store.getWorkshopState("whos-who", result.participant.id) as {
      room: {
        id: string;
        game: { seatsFilled: number; seatCount: number };
      };
    };
    store.joinDetectiveRoom({ participantId: result.participant.id, roomId: "venture-north" });
    const detectiveState = store.getWorkshopState("data-detective", result.participant.id) as {
      roomIds: string[];
      activeRoom: { id: string };
      discoveries: Array<{ roomId: string }>;
    };
    const courtState = store.getWorkshopState("kurami-court", result.participant.id) as {
      results: {
        initial: { total: number };
      };
    };

    expect(participants.map((participant) => participant.nickname)).toEqual(expect.arrayContaining(["Solo Student", "AI Atlas", "AI Nova", "AI Cipher"]));
    expect(team?.memberCount).toBe(4);
    expect(store.getState().participantsOnline).toBe(1);
    expect(whoWhoState.room.game.seatsFilled).toBe(4);
    const startedRoom = store.controlWhoWhoGame({ roomId: whoWhoState.room.id, action: "start" }) as {
      game: { seatsFilled: number; seatCount: number; aiRemaining?: number };
      chat: unknown[];
    };
    expect(startedRoom.game.seatsFilled).toBe(13);
    expect(startedRoom.game.seatCount).toBe(13);
    expect(startedRoom.game.aiRemaining).toBeGreaterThanOrEqual(9);
    expect(startedRoom.chat.length).toBeGreaterThan(0);
    expect(detectiveState.roomIds).toEqual(["venture-north", "venture-south", "venture-east", "venture-west", "venture-ne", "venture-nw", "venture-se", "venture-sw"]);
    expect(detectiveState.activeRoom.id).toBe("venture-north");
    expect(detectiveState.discoveries.filter((item) => item.roomId === "venture-north").length).toBeGreaterThanOrEqual(1);
    expect(courtState.results.initial.total).toBeGreaterThanOrEqual(3);
  });

  it("does not add AI classmates outside demo mode", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });

    const result = store.join({
      eventCode: "LIVE",
      nickname: "Live Student",
      acceptedResponsibleUse: true
    });

    const team = store.getState().teams.find((item) => item.id === result.participant.teamId);

    expect(store.listParticipants()).toHaveLength(1);
    expect(team?.memberCount).toBe(1);
  });

  it("runs Data-Detective as a room-based investor scavenger hunt", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });
    const result = store.join({
      eventCode: "LIVE",
      nickname: "Investor One",
      acceptedResponsibleUse: true
    });

    store.joinDetectiveRoom({ participantId: result.participant.id, roomId: "venture-south" });
    store.submitDetectiveChat({
      participantId: result.participant.id,
      roomId: "venture-south",
      text: "I am checking whether no-show prediction improves access or just shifts risk onto patients."
    });
    store.submitDiscovery({
      participantId: result.participant.id,
      roomId: "venture-south",
      documentId: "careroute-risk-note",
      claim: "CareRoute needs stronger guardrails before funding.",
      finding: "The risk note shows the clinic deprioritized some high-risk patients, which could reduce access for people already facing barriers.",
      sourceTitle: "CareRoute risk note",
      evidenceType: "company-document",
      stance: "supports-reject",
      category: "Accountability",
      severity: "high",
      confidence: 4,
      nextStep: "Find outside evidence on patient no-show causes and access barriers."
    });
    store.submitRecommendation({
      participantId: result.participant.id,
      roomId: "venture-south",
      decision: "reject",
      finalClaim: "Reject funding until CareRoute proves it improves access for high-barrier patients instead of reducing their appointment options.",
      strongestEvidence: "The pilot configuration made it easy to deprioritize high-risk patients.",
      conditions: "Require equity outcome reporting, patient notices, and human review before a new funding decision.",
      openQuestions: "What patient groups were affected most?"
    });
    store.submitDetectiveVote({
      participantId: result.participant.id,
      roomId: "venture-south",
      vote: "reject",
      reason: "The current product design makes harmful clinic rules too easy to deploy."
    });

    const detectiveState = store.getWorkshopState("data-detective", result.participant.id) as {
      activeRoom: {
        id: string;
        claims: unknown[];
        chat: unknown[];
        finalClaims: unknown[];
        voteSummary: { reject: number; total: number };
      };
    };

    expect(detectiveState.activeRoom.id).toBe("venture-south");
    expect(detectiveState.activeRoom.chat).toHaveLength(1);
    expect(detectiveState.activeRoom.claims).toHaveLength(1);
    expect(detectiveState.activeRoom.finalClaims).toHaveLength(1);
    expect(detectiveState.activeRoom.voteSummary.reject).toBe(1);
    expect(detectiveState.activeRoom.voteSummary.total).toBe(1);
  });

  it("runs Storibloom as an 8-room collaborative story boardroom", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });
    const result = store.join({
      eventCode: "LIVE",
      nickname: "Story Creator",
      acceptedResponsibleUse: true
    });

    store.joinStoryRoom({ participantId: result.participant.id, roomId: "bloom-alpha" });
    const startedRoom = store.controlStoryRoom({ roomId: "bloom-alpha", action: "start" }) as {
      status: string;
      activeStage: number;
      workshopSecondsRemaining?: number;
    };
    expect(startedRoom.status).toBe("running");
    expect(startedRoom.activeStage).toBe(1);
    expect(startedRoom.workshopSecondsRemaining).toBeGreaterThan(0);

    store.submitStoryRoomChat({
      participantId: result.participant.id,
      roomId: "bloom-alpha",
      text: "What if the city library remembers every story people almost deleted?"
    });
    const proposal = store.submitStoryRoomProposal({
      participantId: result.participant.id,
      roomId: "bloom-alpha",
      kind: "seed",
      text: "A future library asks students to decide which AI-generated memories should be kept."
    }) as { id: string };
    store.voteStoryRoomProposal({
      participantId: result.participant.id,
      roomId: "bloom-alpha",
      proposalId: proposal.id,
      vote: "approve"
    });
    store.askStoryRoomGuide({
      participantId: result.participant.id,
      roomId: "bloom-alpha",
      prompt: "Help us make the human choice clearer.",
      scope: "room"
    });
    const draftedRoom = store.generateStoryRoomDraft("bloom-alpha", result.participant.id) as {
      finalText: string;
      approvedIdeas: unknown[];
      guideMessages: unknown[];
    };
    expect(draftedRoom.finalText.length).toBeGreaterThan(120);
    expect(draftedRoom.approvedIdeas).toHaveLength(1);
    expect(draftedRoom.guideMessages.length).toBeGreaterThanOrEqual(2);

    store.saveStoryRoom({
      participantId: result.participant.id,
      roomId: "bloom-alpha",
      title: "The Library That Asked Back",
      finalText: `${draftedRoom.finalText}\n\nHuman revision: the room added the library memory detail and chose the ending together.`,
      authorshipNote: "Students proposed, voted, revised, and made the final story choices. Kurami Guide helped with questions and structure."
    });
    const storyState = store.getWorkshopState("storibloom", result.participant.id) as {
      roomIds: string[];
      activeRoom: { id: string; title: string; finalText: string; status: string; memberCount: number };
      stories: Array<{ id: string; title: string; status: string }>;
    };

    expect(storyState.roomIds).toEqual(["bloom-alpha", "bloom-bravo", "bloom-charlie", "bloom-delta", "bloom-echo", "bloom-foxtrot", "bloom-golf", "bloom-hotel"]);
    expect(storyState.activeRoom.id).toBe("bloom-alpha");
    expect(storyState.activeRoom.memberCount).toBe(1);
    expect(storyState.activeRoom.title).toBe("The Library That Asked Back");
    expect(storyState.activeRoom.finalText).toMatch(/Human revision/);
    expect(storyState.stories.find((story) => story.id === "story-bloom-alpha")?.status).toBe("published");
  });

  it("runs Kurami Court as a 4-room AI judge debate", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });
    const result = store.join({
      eventCode: "LIVE",
      nickname: "Court Advocate",
      acceptedResponsibleUse: true
    });

    const joinedRoom = store.joinCourtRoom({ participantId: result.participant.id, roomId: "Court Alpha" }) as {
      id: string;
      status: string;
      memberCount: number;
    };
    const startedRoom = store.controlCourtRoom({ roomId: "court-alpha", action: "start" }) as {
      status: string;
      activeRound: number;
      workshopSecondsRemaining?: number;
      judgeMessages: unknown[];
    };

    expect(joinedRoom.id).toBe("court-alpha");
    expect(joinedRoom.memberCount).toBe(1);
    expect(startedRoom.status).toBe("debate");
    expect(startedRoom.activeRound).toBe(1);
    expect(startedRoom.workshopSecondsRemaining).toBeGreaterThan(0);

    const arguedRoom = store.submitCourtRoomArgument({
      participantId: result.participant.id,
      roomId: "court-alpha",
      stance: "approve-with-restrictions",
      stakeholder: "Students who need counseling support",
      evidence: "The system needs consent, human review, and a fast appeal path.",
      text: "I would only approve this if private student data is limited, counselors review every high-impact decision, and families can appeal."
    }) as {
      arguments: unknown[];
      judgeMessages: Array<{ text: string }>;
    };

    expect(arguedRoom.arguments).toHaveLength(1);
    expect(arguedRoom.judgeMessages.some((message) => message.text.includes("Judge Kurami heard Court Advocate"))).toBe(true);

    const roundTwo = store.controlCourtRoom({ roomId: "court-alpha", action: "next-round" }) as {
      activeRound: number;
      roundTitle: string;
    };
    expect(roundTwo.activeRound).toBe(2);
    expect(roundTwo.roundTitle).toBe("Stakeholder Harm");

    const finalVoteRoom = store.controlCourtRoom({ roomId: "court-alpha", action: "final-vote" }) as {
      status: string;
    };
    expect(finalVoteRoom.status).toBe("final-vote");

    const votedRoom = store.submitCourtRoomFinalVote({
      participantId: result.participant.id,
      roomId: "court-alpha",
      vote: "approve-with-restrictions",
      reason: "Approve only with consent, human oversight, and an appeal path."
    }) as {
      voteSummary: { approveWithRestrictions: number; total: number };
      participantVote?: { vote: string };
    };
    const courtState = store.getWorkshopState("kurami-court", result.participant.id) as {
      roomIds: string[];
      activeRoom: { id: string; voteSummary: { approveWithRestrictions: number; total: number } };
    };

    expect(votedRoom.voteSummary.approveWithRestrictions).toBe(1);
    expect(votedRoom.voteSummary.total).toBe(1);
    expect(votedRoom.participantVote?.vote).toBe("approve-with-restrictions");
    expect(courtState.roomIds).toEqual(["court-alpha", "court-bravo", "court-charlie", "court-delta"]);
    expect(courtState.activeRoom.id).toBe("court-alpha");
    expect(courtState.activeRoom.voteSummary.total).toBe(1);
  });

  it("normalizes Who's Who room IDs and reports expired student sessions clearly", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });
    const result = store.join({
      eventCode: "LIVE",
      nickname: "Room Code Tester",
      acceptedResponsibleUse: true
    });

    const joinedRoom = store.joinWhoWhoRoom({ participantId: result.participant.id, roomId: "Gold Alpha" }) as {
      id: string;
      currentPlayer: { displayName: string };
    };

    expect(joinedRoom.id).toBe("gold-alpha");
    expect(joinedRoom.currentPlayer.displayName).toBeTruthy();
    expect(() => store.joinWhoWhoRoom({ participantId: "missing-student", roomId: "gold-alpha" })).toThrow(/session expired/i);
  });

  it("holds live workshop submissions until the team seats are filled", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });
    const result = store.join({
      eventCode: "LIVE",
      nickname: "Waiting Student",
      acceptedResponsibleUse: true
    });
    const whoWhoState = store.getWorkshopState("whos-who", result.participant.id) as {
      room: {
        id: string;
        roundId: string;
        promptId: string;
      };
    };

    expect(() =>
      store.submitWhoWhoResponse({
        participantId: result.participant.id,
        roomId: whoWhoState.room.id,
        roundId: whoWhoState.room.roundId,
        promptId: whoWhoState.room.promptId,
        text: "I am ready once my team is full."
      })
    ).toThrow(/Waiting for 4 teammates/);
  });

  it("runs the Who's Who room game with AI fill, chat, accusations, and elimination", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });
    const result = store.join({
      eventCode: "LIVE",
      nickname: "Detective Student",
      acceptedResponsibleUse: true
    });

    const joinedRoom = store.joinWhoWhoRoom({ participantId: result.participant.id, roomId: "gold-alpha" }) as {
      currentPlayer: { id: string; alive: boolean; displayName: string };
      game: { seatsFilled: number; seatCount: number; phase: string };
    };
    expect(joinedRoom.currentPlayer.displayName).toBeTruthy();
    expect(joinedRoom.game.seatsFilled).toBe(1);

    const startedRoom = store.controlWhoWhoGame({ roomId: "gold-alpha", action: "start" }) as {
      identities: Array<{ id: string; isAi?: boolean; alive: boolean }>;
      game: { seatsFilled: number; seatCount: number; phase: string; phaseName: string; phaseSecondsRemaining?: number; workshopSecondsRemaining?: number };
      chat: unknown[];
    };
    const aiTarget = startedRoom.identities.find((identity) => identity.isAi);
    expect(startedRoom.game.seatsFilled).toBe(13);
    expect(startedRoom.game.phase).toBe("chat");
    expect(startedRoom.game.phaseName).toBe("Day");
    expect(startedRoom.game.phaseSecondsRemaining).toBeGreaterThan(0);
    expect(startedRoom.game.workshopSecondsRemaining).toBeGreaterThan(0);
    expect(startedRoom.chat.length).toBeGreaterThan(0);
    expect(aiTarget).toBeTruthy();

    const chatRoom = store.submitWhoWhoChat({
      participantId: result.participant.id,
      roomId: "gold-alpha",
      text: "I think the polished helper tone is a clue."
    }) as { chat: unknown[] };
    expect(chatRoom.chat.length).toBeGreaterThan(startedRoom.chat.length);

    expect(() =>
      store.submitWhoWhoAccusation({
        participantId: result.participant.id,
        roomId: "gold-alpha",
        identityId: aiTarget?.id ?? "",
        reason: "Trying to accuse before Night should be blocked."
      })
    ).toThrow(/Accusations open during Night/);

    const nightRoom = store.controlWhoWhoGame({ roomId: "gold-alpha", action: "force-vote" }) as {
      game: { phase: string; phaseName: string };
    };
    expect(nightRoom.game.phase).toBe("vote");
    expect(nightRoom.game.phaseName).toBe("Night");

    const votedRoom = store.submitWhoWhoAccusation({
      participantId: result.participant.id,
      roomId: "gold-alpha",
      identityId: aiTarget?.id ?? "",
      reason: "Their answer was helpful but avoided any messy personal detail."
    }) as { votesByIdentity: Array<{ identityId: string; votes: number }> };
    expect(votedRoom.votesByIdentity.find((vote) => vote.identityId === aiTarget?.id)?.votes).toBe(1);

    const resolvedRoom = store.controlWhoWhoGame({ roomId: "gold-alpha", action: "resolve" }) as {
      identities: Array<{ id: string; alive: boolean; eliminatedReason?: string }>;
      game: { phase: string; winner?: string };
    };
    expect(resolvedRoom.identities.find((identity) => identity.id === aiTarget?.id)?.alive).toBe(false);
    expect(resolvedRoom.identities.find((identity) => identity.id === joinedRoom.currentPlayer.id)?.alive).toBe(false);
    expect(resolvedRoom.game.phase).toBe("ended");
    expect(resolvedRoom.game.winner).toBe("ai");
  });

  it("lets the facilitator force a vote and move the room to the next round", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });
    const result = store.join({
      eventCode: "LIVE",
      nickname: "Round Runner",
      acceptedResponsibleUse: true
    });

    store.joinWhoWhoRoom({ participantId: result.participant.id, roomId: "gold-alpha" });
    store.controlWhoWhoGame({ roomId: "gold-alpha", action: "start" });

    const forcedVote = store.controlWhoWhoGame({ roomId: "gold-alpha", action: "force-vote" }) as {
      game: { phase: string; phaseName: string; roundNumber: number; phaseSecondsRemaining?: number; roundRule: string; winRule: string; facilitatorControl: string };
      gameEvents: Array<{ message: string }>;
    };
    expect(forcedVote.game.phase).toBe("vote");
    expect(forcedVote.game.phaseName).toBe("Night");
    expect(forcedVote.game.roundNumber).toBe(1);
    expect(forcedVote.game.phaseSecondsRemaining).toBeGreaterThan(0);
    expect(forcedVote.game.roundRule).toMatch(/top-accused/i);
    expect(forcedVote.game.winRule).toMatch(/humans win/i);
    expect(forcedVote.game.facilitatorControl).toMatch(/force Night/i);
    expect(forcedVote.gameEvents.some((event) => event.message.includes("forced Round 1 into Night"))).toBe(true);

    const nextRound = store.controlWhoWhoGame({ roomId: "gold-alpha", action: "next-round" }) as {
      game: { phase: string; phaseName: string; roundNumber: number; phaseSecondsRemaining?: number };
      roundId: string;
      gameEvents: Array<{ message: string }>;
    };
    expect(nextRound.game.phase).toBe("chat");
    expect(nextRound.game.phaseName).toBe("Day");
    expect(nextRound.game.roundNumber).toBe(2);
    expect(nextRound.game.phaseSecondsRemaining).toBeGreaterThan(0);
    expect(nextRound.roundId).toBe("gold-alpha-round-2");
    expect(nextRound.gameEvents.some((event) => event.message.includes("Day 2"))).toBe(true);
  });

  it("lets student roles change accusation pressure once per round", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });
    let strategistParticipantId = "";

    for (const index of range(12)) {
      const result = store.join({
        eventCode: "LIVE",
        nickname: `Role Student ${index + 1}`,
        acceptedResponsibleUse: true
      });
      const joinedRoom = store.joinWhoWhoRoom({ participantId: result.participant.id, roomId: "gold-alpha" }) as {
        currentPlayer: { role?: string };
      };
      if (joinedRoom.currentPlayer.role === "Strategist") strategistParticipantId = result.participant.id;
    }

    if (!strategistParticipantId) {
      const room = internalWhoWhoRoom(store);
      const fallbackStrategist = room.identities.find((identity) => identity.participantId);
      if (!fallbackStrategist?.participantId) throw new Error("Test setup failed: no human player available for Strategist role.");
      fallbackStrategist.role = "Strategist";
      strategistParticipantId = fallbackStrategist.participantId;
    }

    expect(strategistParticipantId).toBeTruthy();

    const startedRoom = store.controlWhoWhoGame({ roomId: "gold-alpha", action: "start" }) as {
      identities: Array<{ id: string; isAi?: boolean; alive: boolean }>;
    };
    const aiTarget = startedRoom.identities.find((identity) => identity.isAi);
    expect(aiTarget).toBeTruthy();
    const liveRoom = internalWhoWhoRoom(store);
    const strategistIdentity = liveRoom.identities.find((identity) => identity.participantId === strategistParticipantId);
    if (!strategistIdentity) throw new Error("Test setup failed: Strategist participant lost their room identity.");
    strategistIdentity.role = "Strategist";

    store.controlWhoWhoGame({ roomId: "gold-alpha", action: "force-vote" });
    const abilityRoom = store.useWhoWhoRoleAbility({
      participantId: strategistParticipantId,
      roomId: "gold-alpha",
      targetIdentityId: aiTarget?.id ?? ""
    }) as {
      abilityUses: Array<{ abilityName: string; targetIdentityId: string; voteModifier?: number; isPublic: boolean }>;
      votesByIdentity: Array<{ identityId: string; votes: number }>;
    };

    expect(abilityRoom.abilityUses.some((use) => use.abilityName === "Rally Pressure" && use.targetIdentityId === aiTarget?.id && use.voteModifier === 1 && use.isPublic)).toBe(true);
    expect(abilityRoom.votesByIdentity.find((vote) => vote.identityId === aiTarget?.id)?.votes).toBe(1);
    expect(() =>
      store.useWhoWhoRoleAbility({
        participantId: strategistParticipantId,
        roomId: "gold-alpha",
        targetIdentityId: aiTarget?.id ?? ""
      })
    ).toThrow(/already used/i);

    const resolvedRoom = store.controlWhoWhoGame({ roomId: "gold-alpha", action: "resolve" }) as {
      identities: Array<{ id: string; alive: boolean }>;
      game: { winner?: string };
    };
    expect(resolvedRoom.identities.find((identity) => identity.id === aiTarget?.id)?.alive).toBe(false);
    expect(resolvedRoom.game.winner).toBe("humans");
  });

  it("automatically moves Day to Night to Resolve as the room timers expire", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      const store = new EventStore({ eventCode: "LIVE", demoMode: false });
      const result = store.join({
        eventCode: "LIVE",
        nickname: "Timer Student",
        acceptedResponsibleUse: true
      });

      store.joinWhoWhoRoom({ participantId: result.participant.id, roomId: "gold-alpha" });
      const startedRoom = store.controlWhoWhoGame({ roomId: "gold-alpha", action: "start" }) as {
        game: { phase: string; phaseName: string; phaseSecondsRemaining?: number; workshopSecondsRemaining?: number };
      };
      expect(startedRoom.game.phase).toBe("chat");
      expect(startedRoom.game.phaseName).toBe("Day");
      expect(startedRoom.game.phaseSecondsRemaining).toBe(300);
      expect(startedRoom.game.workshopSecondsRemaining).toBe(2700);

      vi.advanceTimersByTime(301_000);
      const nightRoom = store.getWhoWhoRoom("gold-alpha") as {
        game: { phase: string; phaseName: string; phaseSecondsRemaining?: number };
        gameEvents: Array<{ message: string }>;
      };
      expect(nightRoom.game.phase).toBe("vote");
      expect(nightRoom.game.phaseName).toBe("Night");
      expect(nightRoom.game.phaseSecondsRemaining).toBe(120);
      expect(nightRoom.gameEvents.some((event) => event.message.includes("Day 1 ended"))).toBe(true);

      vi.advanceTimersByTime(121_000);
      const resolveRoom = store.getWhoWhoRoom("gold-alpha") as {
        game: { phase: string; phaseName: string; phaseSecondsRemaining?: number };
        gameEvents: Array<{ message: string }>;
      };
      expect(resolveRoom.game.phase).toBe("resolve");
      expect(resolveRoom.game.phaseName).toBe("Resolve");
      expect(resolveRoom.game.phaseSecondsRemaining).toBeUndefined();
      expect(resolveRoom.gameEvents.some((event) => event.message.includes("Night accusations are locked"))).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("runs a protected full Who's Who loop with private clues, resolve, reveal, and reset", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });
    const protector = store.join({
      eventCode: "LIVE",
      nickname: "Protector Student",
      acceptedResponsibleUse: true
    });
    const investigator = store.join({
      eventCode: "LIVE",
      nickname: "Investigator Student",
      acceptedResponsibleUse: true
    });

    store.joinWhoWhoRoom({ participantId: protector.participant.id, roomId: "gold-alpha" });
    store.joinWhoWhoRoom({ participantId: investigator.participant.id, roomId: "gold-alpha" });
    store.controlWhoWhoGame({ roomId: "gold-alpha", action: "start" });

    const room = internalWhoWhoRoom(store);
    const protectorIdentity = room.identities.find((identity) => identity.participantId === protector.participant.id);
    const investigatorIdentity = room.identities.find((identity) => identity.participantId === investigator.participant.id);
    const aiTargets = room.identities.filter((identity) => identity.isAi && identity.alive);
    const firstAiTarget = aiTargets[0];
    const secondAiTarget = aiTargets[1];
    if (!protectorIdentity || !investigatorIdentity || !firstAiTarget || !secondAiTarget) throw new Error("Test setup failed.");
    protectorIdentity.role = "Protector";
    investigatorIdentity.role = "Investigator";

    const clueRoom = store.useWhoWhoRoleAbility({
      participantId: investigator.participant.id,
      roomId: "gold-alpha",
      targetIdentityId: firstAiTarget.id
    }) as {
      abilityUses: Array<{ actorIdentityId: string; isPublic: boolean; result: string }>;
    };
    expect(clueRoom.abilityUses.some((use) => use.actorIdentityId === investigatorIdentity.id && !use.isPublic && use.result.includes("strong AI signal"))).toBe(true);

    const protectorView = store.getWhoWhoRoom("gold-alpha", { participantId: protector.participant.id }) as {
      abilityUses: Array<{ actorIdentityId: string }>;
    };
    expect(protectorView.abilityUses.some((use) => use.actorIdentityId === investigatorIdentity.id)).toBe(false);

    store.submitWhoWhoChat({
      participantId: protector.participant.id,
      roomId: "gold-alpha",
      text: "I am watching for generic answers and missing personal detail."
    });
    store.controlWhoWhoGame({ roomId: "gold-alpha", action: "force-vote" });

    const liveRoom = internalWhoWhoRoom(store);
    const aliveHumans = liveRoom.identities.filter((identity) => !identity.isAi && identity.participantId && identity.alive);
    const predictedVictim = aliveHumans[stableIndex(`${liveRoom.id ?? "gold-alpha"}-${liveRoom.roundId}-strike`, aliveHumans.length)];
    if (!predictedVictim) throw new Error("No predicted AI counterstrike victim.");

    const guardRoom = store.useWhoWhoRoleAbility({
      participantId: protector.participant.id,
      roomId: "gold-alpha",
      targetIdentityId: predictedVictim.id
    }) as {
      abilityUses: Array<{ abilityName: string; targetIdentityId: string; protects?: boolean }>;
    };
    expect(guardRoom.abilityUses.some((use) => use.abilityName === "Guard" && use.targetIdentityId === predictedVictim.id && use.protects)).toBe(true);

    store.submitWhoWhoAccusation({
      participantId: investigator.participant.id,
      roomId: "gold-alpha",
      identityId: firstAiTarget.id,
      reason: "The language is polished and avoids lived specifics."
    });
    const resolvedRoom = store.controlWhoWhoGame({ roomId: "gold-alpha", action: "resolve" }) as {
      identities: Array<{ id: string; alive: boolean }>;
      game: { phase: string; phaseName: string; roundNumber: number; winner?: string };
      gameEvents: Array<{ message: string }>;
    };
    expect(resolvedRoom.identities.find((identity) => identity.id === firstAiTarget.id)?.alive).toBe(false);
    expect(resolvedRoom.identities.find((identity) => identity.id === predictedVictim.id)?.alive).toBe(true);
    expect(resolvedRoom.game.phase).toBe("chat");
    expect(resolvedRoom.game.phaseName).toBe("Day");
    expect(resolvedRoom.game.roundNumber).toBe(2);
    expect(resolvedRoom.game.winner).toBeUndefined();
    expect(resolvedRoom.gameEvents.some((event) => event.message.includes("counterstrike was blocked"))).toBe(true);

    const secondClue = store.useWhoWhoRoleAbility({
      participantId: investigator.participant.id,
      roomId: "gold-alpha",
      targetIdentityId: secondAiTarget.id
    }) as {
      abilityUses: Array<{ roundId: string; actorIdentityId: string }>;
      roundId: string;
    };
    expect(secondClue.abilityUses.some((use) => use.actorIdentityId === investigatorIdentity.id && use.roundId === secondClue.roundId)).toBe(true);

    const revealedRoom = store.controlWhoWhoGame({ roomId: "gold-alpha", action: "reveal" }) as {
      identities: Array<{ id: string; isAi?: boolean }>;
      abilityUses: unknown[];
    };
    expect(revealedRoom.identities.find((identity) => identity.id === secondAiTarget.id)?.isAi).toBe(true);
    expect(revealedRoom.abilityUses.length).toBeGreaterThanOrEqual(3);

    const resetRoom = store.controlWhoWhoGame({ roomId: "gold-alpha", action: "reset" }) as {
      game: { phase: string; seatsFilled: number };
      abilityUses: unknown[];
      votes: unknown[];
      chat: unknown[];
    };
    expect(resetRoom.game.phase).toBe("lobby");
    expect(resetRoom.game.seatsFilled).toBe(2);
    expect(resetRoom.abilityUses).toHaveLength(0);
    expect(resetRoom.votes).toHaveLength(0);
    expect(resetRoom.chat).toHaveLength(0);
  });

  it("force starts incomplete teams, supports anonymous names, and exports results", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });
    const result = store.join({
      eventCode: "LIVE",
      nickname: "",
      acceptedResponsibleUse: true
    });
    const whoWhoState = store.getWorkshopState("whos-who", result.participant.id) as {
      room: {
        id: string;
        roundId: string;
        promptId: string;
      };
    };

    expect(result.participant.nickname).toBe("Student 1");
    expect(store.getState().teams.find((team) => team.id === result.participant.teamId)?.ready).toBe(false);

    const forced = store.control({ action: "force-start" });
    const forcedTeam = forced.teams.find((team) => team.id === result.participant.teamId);
    expect(forced.status).toBe("running");
    expect(forced.currentRotation).toBe(1);
    expect(forcedTeam?.memberCount).toBe(4);
    expect(forcedTeam?.ready).toBe(true);

    store.controlWhoWhoGame({ roomId: whoWhoState.room.id, action: "start" });
    store.submitWhoWhoChat({
      participantId: result.participant.id,
      roomId: whoWhoState.room.id,
      text: "I can start because the facilitator filled the room."
    });

    const dashboard = store.getDashboard();
    const progress = dashboard.progress.participants.find((participant) => participant.participantId === result.participant.id);
    const exported = store.exportResults();

    expect(progress?.status).toBe("submitted");
    expect(dashboard.activityFeed.some((item) => item.message.includes("Force Start"))).toBe(true);
    expect(exported.summary.aiClassmates).toBe(3);
    expect(exported.summary.totalSubmissions).toBeGreaterThanOrEqual(1);
    expect(exported.submissions.whosWho.some((room) => room.chat.length > 0)).toBe(true);
  });

  it("resets demo data to a fresh onboarding event", () => {
    const store = new EventStore({ eventCode: "DEMO", demoMode: true });
    const result = store.join({
      eventCode: "DEMO",
      nickname: "Reset Tester",
      acceptedResponsibleUse: true
    });
    store.getWorkshopState("data-detective", result.participant.id);
    store.getWorkshopState("kurami-court", result.participant.id);

    const resetState = store.control({ action: "reset-event" });
    const detectiveState = store.getWorkshopState("data-detective") as { discoveries: unknown[] };
    const courtState = store.getWorkshopState("kurami-court") as { results: { initial: { total: number } } };
    const storyState = store.getWorkshopState("storibloom") as { stories: Array<{ draft: string; finalText: string; status: string }> };

    expect(resetState.status).toBe("onboarding");
    expect(resetState.currentRotation).toBe(0);
    expect(resetState.settings.fallbackMode).toBe(false);
    expect(resetState.settings.lockedWorkshops).toHaveLength(0);
    expect(resetState.teams.every((team) => team.memberCount === 0)).toBe(true);
    expect(detectiveState.discoveries).toHaveLength(0);
    expect(courtState.results.initial.total).toBe(0);
    expect(storyState.stories.every((story) => story.draft === "" && story.finalText === "" && story.status === "draft")).toBe(true);

    const fresh = store.join({
      eventCode: "DEMO",
      nickname: "Fresh Student",
      acceptedResponsibleUse: true
    });
    const freshTeam = store.getState().teams.find((team) => team.id === fresh.participant.teamId);
    expect(freshTeam?.memberCount).toBe(4);
    expect(freshTeam?.ready).toBe(true);
  });

  it("limits room facilitator state to the assigned main room", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });

    for (const index of range(16)) {
      store.join({
        eventCode: "LIVE",
        nickname: `Scoped Student ${index + 1}`,
        acceptedResponsibleUse: true
      });
    }

    const dashboard = store.getDashboard("gold");
    const whoWhoState = store.getFacilitatorWorkshopState("whos-who", "gold") as {
      room: { id: string };
      rooms: Array<{ id: string }>;
    };
    const detectiveState = store.getFacilitatorWorkshopState("data-detective", "gold") as {
      roomIds: string[];
      rooms: Array<{ id: string }>;
    };
    const storyState = store.getFacilitatorWorkshopState("storibloom", "gold") as {
      roomIds: string[];
      rooms: Array<{ id: string }>;
    };
    const courtState = store.getFacilitatorWorkshopState("kurami-court", "gold") as {
      roomIds: string[];
      rooms: Array<{ id: string }>;
    };

    expect(dashboard.facilitator).toEqual({ scope: "gold", roomName: "Gold Room", isLead: false });
    expect(dashboard.participants.length).toBeGreaterThan(0);
    expect(dashboard.participants.every((participant) => participant.group === "Gold")).toBe(true);
    expect(dashboard.event.teams.every((team) => team.group === "Gold")).toBe(true);
    expect(whoWhoState.room.id).toBe("gold-alpha");
    expect(whoWhoState.rooms.map((room) => room.id)).toEqual(["gold-alpha"]);
    expect(detectiveState.roomIds).toEqual(["venture-north", "venture-south"]);
    expect(detectiveState.rooms.map((room) => room.id)).toEqual(["venture-north", "venture-south"]);
    expect(storyState.roomIds).toEqual(["bloom-alpha", "bloom-bravo"]);
    expect(storyState.rooms.map((room) => room.id)).toEqual(["bloom-alpha", "bloom-bravo"]);
    expect(courtState.roomIds).toEqual(["court-alpha"]);
    expect(courtState.rooms.map((room) => room.id)).toEqual(["court-alpha"]);
  });
});

describe("EventStore workshop balancing", () => {
  it("distributes students evenly across workshop tracks and teams without a seat cap", () => {
    const store = new EventStore({ eventCode: "LIVE", demoMode: false });
    store.control({ action: "start" });
    store.control({ action: "advance-rotation" });

    for (const index of range(121)) {
      store.join({
        eventCode: "LIVE",
        nickname: `Student ${index + 1}`,
        acceptedResponsibleUse: true
      });
    }

    const state = store.getState();
    const participants = store.listParticipants();
    const workshopCounts = participants.reduce<Record<WorkshopId, number>>(
      (counts, participant) => {
        const workshopId = currentWorkshopForGroup(participant.group, state.currentRotation);
        counts[workshopId] += 1;
        return counts;
      },
      { "whos-who": 0, "data-detective": 0, storibloom: 0, "kurami-court": 0 }
    );
    const workshopTotals = Object.values(workshopCounts);
    const teamCountsByWorkshop = state.teams.reduce<Record<WorkshopId, number[]>>(
      (counts, team) => {
        counts[currentWorkshopForGroup(team.group, state.currentRotation)].push(team.memberCount);
        return counts;
      },
      { "whos-who": [], "data-detective": [], storibloom: [], "kurami-court": [] }
    );

    expect(participants).toHaveLength(121);
    expect(Math.max(...workshopTotals) - Math.min(...workshopTotals)).toBeLessThanOrEqual(1);
    expect(Math.max(...state.teams.map((team) => team.memberCount))).toBeGreaterThan(5);
    for (const teamCounts of Object.values(teamCountsByWorkshop)) {
      expect(Math.max(...teamCounts) - Math.min(...teamCounts)).toBeLessThanOrEqual(1);
    }
  });
});
