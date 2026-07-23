import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [
  path.resolve(configDir, "../../../.env"),
  path.resolve(configDir, "../.env"),
  path.resolve(process.cwd(), ".env")
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath, override: false });
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes("localhost") || trimmed.startsWith("127.") || trimmed.startsWith("0.0.0.0")) return `http://${trimmed}`;
  return `https://${trimmed}`;
}

const booleanEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off", ""].includes(normalized)) return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.preprocess(normalizeUrl, z.string().url()).default("http://localhost:5173"),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  FACILITATOR_PIN: z.string().default("2468"),
  GOLD_FACILITATOR_PIN: z.string().optional(),
  BLACK_FACILITATOR_PIN: z.string().optional(),
  GREEN_FACILITATOR_PIN: z.string().optional(),
  PURPLE_FACILITATOR_PIN: z.string().optional(),
  SESSION_SECRET: z.string().min(12).default("development-session-secret"),
  EVENT_CODE: z.string().default("ETHICS2026"),
  LOW_BANDWIDTH_DEFAULT: booleanEnv.default(false),
  DEMO_MODE: booleanEnv.optional()
});

const parsedConfig = envSchema.parse(process.env);

export const config = {
  ...parsedConfig,
  DEMO_MODE: parsedConfig.DEMO_MODE ?? parsedConfig.NODE_ENV !== "production"
};
export type AppConfig = typeof config;

function isLocalUrl(value: string) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
  } catch {
    return true;
  }
}

function isPlaceholderSecret(value: string) {
  return value === "development-session-secret" || value.includes("replace-with") || value.includes("change-me");
}

const productionIssues: string[] = [];
const productionWarnings: string[] = [];

if (config.NODE_ENV === "production") {
  if (!config.DATABASE_URL) productionIssues.push("DATABASE_URL is required in production.");
  if (!config.REDIS_URL) productionIssues.push("REDIS_URL is required in production.");
  if (isLocalUrl(config.APP_URL)) productionIssues.push("APP_URL must point to the deployed web app, not localhost.");
  if (config.DEMO_MODE) productionIssues.push("DEMO_MODE must be false in production.");
  if (config.FACILITATOR_PIN === "2468" || config.FACILITATOR_PIN.length < 6) productionIssues.push("FACILITATOR_PIN must be changed from the local development PIN and be at least 6 characters.");
  const roomPins = [
    ["GOLD_FACILITATOR_PIN", config.GOLD_FACILITATOR_PIN],
    ["BLACK_FACILITATOR_PIN", config.BLACK_FACILITATOR_PIN],
    ["GREEN_FACILITATOR_PIN", config.GREEN_FACILITATOR_PIN],
    ["PURPLE_FACILITATOR_PIN", config.PURPLE_FACILITATOR_PIN]
  ] as const;
  for (const [name, value] of roomPins) {
    if (!value || value.length < 6) productionIssues.push(`${name} is required in production and must be at least 6 characters.`);
    if (value && value === config.FACILITATOR_PIN) productionIssues.push(`${name} must be different from FACILITATOR_PIN so room facilitators cannot choose Lead access.`);
  }
  const configuredRoomPins = roomPins.map(([, value]) => value).filter(Boolean);
  if (new Set(configuredRoomPins).size !== configuredRoomPins.length) productionIssues.push("Room facilitator PINs must be unique per room.");
  if (isPlaceholderSecret(config.SESSION_SECRET) || config.SESSION_SECRET.length < 32) productionIssues.push("SESSION_SECRET must be a non-placeholder value with at least 32 characters.");
  if (config.EVENT_CODE === "ETHICS2026") productionWarnings.push("EVENT_CODE is still the public demo code ETHICS2026; replace it for private events.");
  if (!config.OPENAI_API_KEY) productionWarnings.push("OPENAI_API_KEY is not set; AI generation will use deterministic fallbacks.");
}

export const productionReadiness = {
  environment: config.NODE_ENV,
  demoMode: config.DEMO_MODE,
  issues: productionIssues,
  warnings: productionWarnings
};

if (productionIssues.length > 0) {
  throw new Error(`Production configuration is not ready:\n- ${productionIssues.join("\n- ")}`);
}
