import { createHash, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  BADGES,
  CHARTER_EXAMPLES,
  COURT_CASES,
  DEFAULT_EVENT_CODE,
  DETECTIVE_EVIDENCE,
  EVENT_NAME,
  ROTATION_GROUPS,
  WHOS_WHO_DISPLAY_NAMES,
  WHOS_WHO_PROMPTS
} from "../packages/shared/src/index.ts";

const prisma = new PrismaClient();

function hashPin(pin: string) {
  const salt = "demo-facilitator";
  return `scrypt$${salt}$${scryptSync(pin, salt, 32).toString("hex")}`;
}

async function main() {
  const eventCode = process.env.EVENT_CODE ?? DEFAULT_EVENT_CODE;
  const facilitatorPin = process.env.FACILITATOR_PIN ?? "2468";

  await prisma.facilitator.upsert({
    where: { id: "demo-facilitator" },
    update: {
      displayName: "Lead Facilitator",
      role: "lead-facilitator",
      pinHash: hashPin(facilitatorPin)
    },
    create: {
      id: "demo-facilitator",
      displayName: "Lead Facilitator",
      role: "lead-facilitator",
      pinHash: hashPin(facilitatorPin)
    }
  });

  const event = await prisma.event.upsert({
    where: { code: eventCode },
    update: {
      name: EVENT_NAME,
      demoMode: true
    },
    create: {
      code: eventCode,
      name: EVENT_NAME,
      status: "onboarding",
      currentRotation: 0,
      demoMode: true
    }
  });

  await prisma.eventSettings.upsert({
    where: { eventId: event.id },
    update: {
      leaderboardEnabled: true,
      leaderboardMode: "team",
      aiEnabled: true,
      lowBandwidthMode: false,
      fallbackMode: false,
      manuallyUnlockedWorkshops: [],
      lockedWorkshops: []
    },
    create: {
      eventId: event.id,
      leaderboardEnabled: true,
      leaderboardMode: "team",
      aiEnabled: true
    }
  });

  for (const number of [1, 2, 3, 4]) {
    await prisma.rotation.upsert({
      where: { eventId_number: { eventId: event.id, number } },
      update: {},
      create: {
        eventId: event.id,
        number,
        status: number === 1 ? "open" : "locked"
      }
    });
  }

  const groupColor: Record<string, string> = {
    Gold: "#F6C945",
    Black: "#050507",
    Green: "#8B929D",
    Purple: "#C4C8CF"
  };

  for (const groupName of ROTATION_GROUPS) {
    const group = await prisma.rotationGroup.upsert({
      where: { eventId_name: { eventId: event.id, name: groupName } },
      update: { color: groupColor[groupName] ?? "#F6C945" },
      create: {
        eventId: event.id,
        name: groupName,
        color: groupColor[groupName] ?? "#F6C945"
      }
    });

    for (let teamNumber = 1; teamNumber <= 5; teamNumber += 1) {
      await prisma.team.upsert({
        where: { eventId_name: { eventId: event.id, name: `${groupName} Team ${teamNumber}` } },
        update: {},
        create: {
          eventId: event.id,
          groupId: group.id,
          name: `${groupName} Team ${teamNumber}`
        }
      });
    }

    for (const roomName of ["Alpha", "Beta"]) {
      const room = await prisma.whoWhoRoom.upsert({
        where: { eventId_groupId_name: { eventId: event.id, groupId: group.id, name: `${groupName} ${roomName}` } },
        update: {},
        create: {
          eventId: event.id,
          groupId: group.id,
          name: `${groupName} ${roomName}`,
          stage: "lobby",
          activePromptId: WHOS_WHO_PROMPTS[0]?.id
        }
      });

      const roomNames = WHOS_WHO_DISPLAY_NAMES.slice(0, 13);
      for (const [index, displayName] of roomNames.entries()) {
        const aiPersona = index >= 10 ? ["atlas", "nova", "cipher"][index - 10] : null;
        await prisma.whoWhoIdentity.upsert({
          where: { roomId_displayName: { roomId: room.id, displayName } },
          update: {
            isAi: aiPersona !== null,
            personaId: aiPersona
          },
          create: {
            roomId: room.id,
            displayName,
            isAi: aiPersona !== null,
            personaId: aiPersona
          }
        });
      }
    }
  }

  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { id: `${event.id}-${badge.id}` },
      update: {
        name: badge.name,
        description: badge.description,
        workshopId: badge.workshopId
      },
      create: {
        id: `${event.id}-${badge.id}`,
        eventId: event.id,
        name: badge.name,
        description: badge.description,
        workshopId: badge.workshopId
      }
    });
  }

  const detectiveScenario = await prisma.detectiveScenario.upsert({
    where: { eventId_name: { eventId: event.id, name: "FuturePath" } },
    update: {
      description: "A city AI system selects students for a paid technology internship."
    },
    create: {
      eventId: event.id,
      name: "FuturePath",
      description: "A city AI system selects students for a paid technology internship.",
      activeStage: 1
    }
  });

  for (const evidence of DETECTIVE_EVIDENCE) {
    await prisma.detectiveEvidence.upsert({
      where: { id: `${detectiveScenario.id}-${evidence.id}` },
      update: {
        stage: evidence.stage,
        title: evidence.title,
        type: evidence.type,
        summary: evidence.summary,
        body: evidence.body,
        categories: [...evidence.ethicalCategories],
        hiddenValue: evidence.hiddenValue,
        revealed: evidence.stage === 1
      },
      create: {
        id: `${detectiveScenario.id}-${evidence.id}`,
        scenarioId: detectiveScenario.id,
        stage: evidence.stage,
        title: evidence.title,
        type: evidence.type,
        summary: evidence.summary,
        body: evidence.body,
        categories: [...evidence.ethicalCategories],
        hiddenValue: evidence.hiddenValue,
        revealed: evidence.stage === 1
      }
    });
  }

  for (const [index, courtCase] of COURT_CASES.entries()) {
    await prisma.courtCase.upsert({
      where: { id: `${event.id}-${courtCase.id}` },
      update: {
        title: courtCase.title,
        scenario: courtCase.scenario,
        missingDetail: courtCase.missingDetail,
        keyIssues: courtCase.keyIssues,
        active: index === 0
      },
      create: {
        id: `${event.id}-${courtCase.id}`,
        eventId: event.id,
        title: courtCase.title,
        scenario: courtCase.scenario,
        missingDetail: courtCase.missingDetail,
        keyIssues: courtCase.keyIssues,
        active: index === 0,
        evidenceReveals: {
          create: {
            title: "New Evidence",
            body: courtCase.missingDetail,
            revealOrder: 1
          }
        }
      }
    });
  }

  for (const [index, text] of CHARTER_EXAMPLES.entries()) {
    const hash = createHash("sha256").update(text).digest("hex").slice(0, 12);
    await prisma.charterProposal.upsert({
      where: { id: `${event.id}-charter-${hash}` },
      update: {
        text,
        status: index < 3 ? "approved" : "flagged"
      },
      create: {
        id: `${event.id}-charter-${hash}`,
        eventId: event.id,
        text,
        status: index < 3 ? "approved" : "flagged"
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      eventId: event.id,
      facilitatorId: "demo-facilitator",
      action: "seed-demo-event",
      targetType: "event",
      targetId: event.id,
      metadata: { eventCode }
    }
  });

  console.log(`Seeded ${EVENT_NAME} demo event with code ${eventCode}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
