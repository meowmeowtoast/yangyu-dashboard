import { kv } from "./_kv.js";
import { requireAuth, setNoCacheHeaders } from "./_auth.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 10,
};

const KEY = "yangyu-report:state:v1";
const BACKUP_LIST_KEY = "yangyu-report:state:backups:v1";
const BACKUP_PREFIX = "yangyu-report:state:backup:v1:";
const MAX_BACKUPS = 20;

type StoredState = {
  userData: any;
  analyses: Record<string, any>;
};

const coerceObject = (v: any) => (v && typeof v === "object" ? v : null);

const handleKvError = (res: any, err: unknown) => {
  console.error("KV error", err);
  res.statusCode = 503;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify({
      error: "Storage unavailable",
      hint: "Connect Vercel KV (Storage) and ensure KV_* env vars are set.",
    })
  );
};

export default async function handler(req: any, res: any) {
  setNoCacheHeaders(res);

  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {
      const state = (await kv.get(KEY)) as StoredState | null;
      res.statusCode = 200;
      res.json({
        userData: state?.userData ?? null,
        analyses: state?.analyses ?? {},
      });
      return;
    } catch (err) {
      handleKvError(res, err);
      return;
    }
  }

  if (req.method === "PUT") {
    const body = req.body ?? {};
    const partialUserData = body.userData;
    const partialAnalyses = body.analyses;

    let current: StoredState | null = null;
    try {
      // Merge update to avoid clients accidentally wiping fields.
      current = (await kv.get(KEY)) as StoredState | null;
    } catch (err) {
      handleKvError(res, err);
      return;
    }

    const next: StoredState = {
      userData: coerceObject(current?.userData) ?? {},
      analyses: (coerceObject(current?.analyses) as any) ?? {},
    };

    if (partialUserData !== undefined) {
      const obj = coerceObject(partialUserData);
      if (!obj) {
        res.statusCode = 400;
        res.json({ error: "Invalid userData" });
        return;
      }
      next.userData = obj;
    }

    if (partialAnalyses !== undefined) {
      const obj = coerceObject(partialAnalyses);
      if (!obj) {
        res.statusCode = 400;
        res.json({ error: "Invalid analyses" });
        return;
      }
      next.analyses = obj as any;
    }

    try {
      // Best-effort backup of the previous state to reduce risk of accidental wipes.
      // Only backup when there is something to backup.
      if (current) {
        const backupKey = `${BACKUP_PREFIX}${new Date().toISOString()}`;
        try {
          await kv.set(backupKey, current);
          await kv.lpush(BACKUP_LIST_KEY, backupKey);
          await kv.ltrim(BACKUP_LIST_KEY, 0, MAX_BACKUPS - 1);
        } catch (backupErr) {
          console.warn('KV backup failed (continuing):', backupErr);
        }
      }

      await kv.set(KEY, next);
      res.statusCode = 200;
      res.json({ ok: true });
      return;
    } catch (err) {
      handleKvError(res, err);
      return;
    }
  }

  if (req.method === "DELETE") {
    try {
      await kv.del(KEY);
      res.statusCode = 200;
      res.json({ ok: true });
      return;
    } catch (err) {
      handleKvError(res, err);
      return;
    }
  }

  res.statusCode = 405;
  res.end("Method Not Allowed");
}
