import { createHash } from "node:crypto";
import OpenAI from "openai";
import { createDeterministicStoryDraft, generateFallbackPersonaResponse } from "@responsible-ai-lab/shared";
import { config } from "./config.js";
import { logger } from "./logger.js";

type AIJobKind = "whos-who-persona" | "story-brainstorm" | "story-plan" | "story-draft" | "story-ethics" | "facilitator-support";

interface AIJob {
  id: string;
  teamId: string;
  kind: AIJobKind;
  prompt: string;
  run: () => Promise<string>;
}

export class AIService {
  private readonly client: OpenAI | null;
  private readonly cache = new Map<string, string>();
  private readonly queue: AIJob[] = [];
  private running = 0;
  private readonly concurrency = 2;
  private requestsThisMinute = 0;
  private minuteStartedAt = Date.now();

  constructor() {
    this.client = config.OPENAI_API_KEY ? new OpenAI({ apiKey: config.OPENAI_API_KEY, timeout: 20_000, maxRetries: 2 }) : null;
  }

  enabled() {
    return Boolean(this.client);
  }

  async personaResponse(args: { personaId: "atlas" | "nova" | "cipher"; prompt: string; seed: number }) {
    if (!this.client) return generateFallbackPersonaResponse(args.personaId, args.prompt, args.seed);
    return this.enqueue({
      id: `persona-${args.personaId}-${args.seed}`,
      teamId: "whos-who",
      kind: "whos-who-persona",
      prompt: args.prompt,
      run: () =>
        this.completeText(
          "You create one short anonymous game response for a youth Responsible AI workshop. Do not imitate a real participant. Keep it age-appropriate and under 420 characters.",
          `Persona: ${args.personaId}. Prompt: ${args.prompt}`
        )
    });
  }

  async storyDraft(args: { teamId: string; teamName: string; genre: string; setting: string; theme: string; protagonist: string; conflict: string; approvedPlan: string }) {
    if (!this.client) return createDeterministicStoryDraft(args);
    return this.enqueue({
      id: `story-${args.teamId}-${this.hash(args.approvedPlan)}`,
      teamId: args.teamId,
      kind: "story-draft",
      prompt: args.approvedPlan,
      run: () =>
        this.completeText(
          "You help a youth team draft a 250-350 word story. Use only the approved plan. Avoid stereotypes. Keep human authorship clear. Do not include private personal data.",
          `Team: ${args.teamName}
Genre: ${args.genre}
Setting: ${args.setting}
Theme: ${args.theme}
Protagonist: ${args.protagonist}
Conflict: ${args.conflict}
Approved plan:
${args.approvedPlan}`
        )
    });
  }

  queueStatus(teamId: string) {
    const position = this.queue.findIndex((job) => job.teamId === teamId);
    return {
      queued: position >= 0,
      approximatePosition: position >= 0 ? position + 1 : 0,
      running: this.running
    };
  }

  private async enqueue(job: AIJob): Promise<string> {
    const cacheKey = `${job.kind}:${this.hash(job.prompt)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    return new Promise((resolve) => {
      const wrappedJob: AIJob = {
        ...job,
        run: async () => {
          try {
            const result = await job.run();
            this.cache.set(cacheKey, result);
            resolve(result);
            return result;
          } catch (error) {
            logger.warn({ error, kind: job.kind }, "AI request failed; using fallback response.");
            const fallback = createDeterministicStoryDraft({
              teamName: "The team",
              genre: "speculative",
              setting: "a future city",
              theme: "responsibility",
              protagonist: "the protagonist",
              conflict: "a risky shortcut"
            });
            resolve(fallback);
            return fallback;
          }
        }
      };
      this.queue.push(wrappedJob);
      this.pump();
    });
  }

  private pump() {
    this.resetMinuteIfNeeded();
    while (this.running < this.concurrency && this.queue.length > 0 && this.requestsThisMinute < 20) {
      const job = this.queue.shift();
      if (!job) return;
      this.running += 1;
      this.requestsThisMinute += 1;
      job
        .run()
        .catch((error) => logger.warn({ error }, "AI job failed after fallback handling."))
        .finally(() => {
          this.running -= 1;
          this.pump();
        });
    }
  }

  private resetMinuteIfNeeded() {
    if (Date.now() - this.minuteStartedAt > 60_000) {
      this.minuteStartedAt = Date.now();
      this.requestsThisMinute = 0;
    }
  }

  private async completeText(system: string, user: string) {
    if (!this.client) throw new Error("OpenAI client is not configured.");
    const response = await this.client.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.8,
      max_tokens: 520
    });
    return response.choices[0]?.message.content?.trim() ?? "";
  }

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex").slice(0, 24);
  }
}
