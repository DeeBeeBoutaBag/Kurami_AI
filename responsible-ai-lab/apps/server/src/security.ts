import { createHmac, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { FACILITATOR_ROOM_ASSIGNMENTS, FACILITATOR_ROOM_SCOPES, normalizeWhoWhoRoomId } from "@responsible-ai-lab/shared";
import { config } from "./config.js";

export type FacilitatorScope = (typeof FACILITATOR_ROOM_SCOPES)[number];

export interface FacilitatorContext {
  scope: FacilitatorScope;
  isLead: boolean;
}

export function hashPin(pin: string, salt = "responsible-ai-lab") {
  return `scrypt$${salt}$${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function verifyPin(pin: string, hashed = hashPin(config.FACILITATOR_PIN)) {
  const [algorithm, salt, expected] = hashed.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) {
    return false;
  }
  const actual = scryptSync(pin, salt, 32);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function pinForFacilitatorScope(scope: FacilitatorScope) {
  if (scope === "gold") return config.GOLD_FACILITATOR_PIN ?? (config.NODE_ENV === "production" ? "" : config.FACILITATOR_PIN);
  if (scope === "black") return config.BLACK_FACILITATOR_PIN ?? (config.NODE_ENV === "production" ? "" : config.FACILITATOR_PIN);
  if (scope === "green") return config.GREEN_FACILITATOR_PIN ?? (config.NODE_ENV === "production" ? "" : config.FACILITATOR_PIN);
  if (scope === "purple") return config.PURPLE_FACILITATOR_PIN ?? (config.NODE_ENV === "production" ? "" : config.FACILITATOR_PIN);
  return config.FACILITATOR_PIN;
}

export function verifyPinForScope(pin: string, scope: FacilitatorScope) {
  const expectedPin = pinForFacilitatorScope(scope);
  return expectedPin.length > 0 && verifyPin(pin, hashPin(expectedPin, `responsible-ai-lab-${scope}`));
}

export function createSessionId() {
  return randomUUID();
}

function isFacilitatorScope(value: unknown): value is FacilitatorScope {
  return typeof value === "string" && (FACILITATOR_ROOM_SCOPES as readonly string[]).includes(value);
}

function roomIdsForScope(scope: FacilitatorScope) {
  if (scope === "lead") return [];
  const assignment = FACILITATOR_ROOM_ASSIGNMENTS[scope];
  return [
    ...assignment.whoWhoRoomIds,
    ...assignment.detectiveRoomIds,
    ...assignment.storyRoomIds,
    assignment.courtRoomId
  ].map((roomId) => normalizeWhoWhoRoomId(roomId));
}

export function facilitatorCanAccessRoom(scope: FacilitatorScope, roomId: string) {
  if (scope === "lead") return true;
  return roomIdsForScope(scope).includes(normalizeWhoWhoRoomId(roomId));
}

export function signFacilitatorToken(scope: FacilitatorScope = "lead") {
  const nonce = randomUUID();
  const payload = Buffer.from(JSON.stringify({ v: 1, nonce, scope, iat: Date.now() }), "utf8").toString("base64url");
  const signature = createHmac("sha256", config.SESSION_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function getFacilitatorContextFromToken(token: string | undefined): FacilitatorContext | null {
  if (!token) return null;
  const [payloadOrNonce, signature] = token.split(".");
  if (!payloadOrNonce || !signature) return null;

  const modernExpected = createHmac("sha256", config.SESSION_SECRET).update(payloadOrNonce).digest("hex");
  const signatureBuffer = Buffer.from(signature);
  const modernExpectedBuffer = Buffer.from(modernExpected);
  if (signatureBuffer.length === modernExpectedBuffer.length && timingSafeEqual(signatureBuffer, modernExpectedBuffer)) {
    try {
      const payload = JSON.parse(Buffer.from(payloadOrNonce, "base64url").toString("utf8")) as { scope?: unknown };
      const scope = isFacilitatorScope(payload.scope) ? payload.scope : "lead";
      return { scope, isLead: scope === "lead" };
    } catch {
      return { scope: "lead", isLead: true };
    }
  }

  const legacyExpected = createHmac("sha256", config.SESSION_SECRET).update(payloadOrNonce).digest("hex");
  const legacyExpectedBuffer = Buffer.from(legacyExpected);
  if (signatureBuffer.length === legacyExpectedBuffer.length && timingSafeEqual(signatureBuffer, legacyExpectedBuffer)) {
    return { scope: "lead", isLead: true };
  }
  return null;
}

export function verifyFacilitatorToken(token: string | undefined) {
  return Boolean(getFacilitatorContextFromToken(token));
}

export function getFacilitatorContext(req: Request) {
  const cookieToken = typeof req.cookies?.facilitator_token === "string" ? req.cookies.facilitator_token : undefined;
  const header = req.header("authorization");
  const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  return getFacilitatorContextFromToken(cookieToken ?? bearerToken);
}

export function requireFacilitator(req: Request, res: Response, next: NextFunction) {
  const context = getFacilitatorContext(req);
  if (!context) {
    res.status(401).json({ error: { code: "unauthorized", message: "Facilitator login required." } });
    return;
  }
  res.locals.facilitator = context;
  next();
}

export function requireLeadFacilitator(req: Request, res: Response, next: NextFunction) {
  const context = getFacilitatorContext(req);
  if (!context) {
    res.status(401).json({ error: { code: "unauthorized", message: "Facilitator login required." } });
    return;
  }
  if (!context.isLead) {
    res.status(403).json({ error: { code: "lead_required", message: "Lead facilitator access is required for this control." } });
    return;
  }
  res.locals.facilitator = context;
  next();
}

export function requireRoomFacilitator(req: Request, res: Response, next: NextFunction) {
  const context = getFacilitatorContext(req);
  if (!context) {
    res.status(401).json({ error: { code: "unauthorized", message: "Facilitator login required." } });
    return;
  }
  const roomId = typeof req.params.roomId === "string" ? req.params.roomId : "";
  if (!facilitatorCanAccessRoom(context.scope, roomId)) {
    res.status(403).json({ error: { code: "room_scope_denied", message: "This facilitator login is limited to another room." } });
    return;
  }
  res.locals.facilitator = context;
  next();
}
