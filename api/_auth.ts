import { createSecretKey, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { parse as parseCookie, serialize as serializeCookie } from "cookie";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "yy_report_session";

const getSessionSecret = () => {
  const secret = process.env.APP_JWT_SECRET || process.env.APP_SESSION_SECRET;
  if (!secret) throw new Error("Missing APP_JWT_SECRET or APP_SESSION_SECRET");
  return secret;
};

const getKey = () => createSecretKey(Buffer.from(getSessionSecret()));

const getPasswordConfig = () => {
  return {
    password: process.env.APP_PASSWORD,
    passwordHash: process.env.APP_PASSWORD_HASH,
  };
};

export const getCookieName = () => COOKIE_NAME;

export const setNoCacheHeaders = (res: any) => {
  res.setHeader("Cache-Control", "no-store");
};

export const getSessionFromRequest = async (req: any) => {
  const header = req.headers?.cookie;
  if (!header) return null;
  const cookies = parseCookie(header);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getKey());
    return payload as any;
  } catch {
    return null;
  }
};

export const requireAuth = async (req: any, res: any) => {
  const session = await getSessionFromRequest(req);
  if (!session?.sub) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return null;
  }
  return session;
};

export const issueSessionCookie = async (res: any) => {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("user")
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getKey());

  const cookie = serializeCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  res.setHeader("Set-Cookie", cookie);
};

export const clearSessionCookie = (res: any) => {
  const cookie = serializeCookie(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.setHeader("Set-Cookie", cookie);
};

const constantTimeEqual = (a: string, b: string) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
};

export const verifyPassword = async (password: string) => {
  const { password: plain, passwordHash } = getPasswordConfig();

  if (passwordHash) {
    return bcrypt.compare(password, passwordHash);
  }

  if (plain) {
    return constantTimeEqual(password, plain);
  }

  throw new Error("Missing APP_PASSWORD or APP_PASSWORD_HASH");
};
