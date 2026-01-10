import { kv } from "./_kv.js";
import { requireAuth, setNoCacheHeaders } from "./_auth.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 10,
};

const KEY = "yangyu-report:state:v1";
const BACKUP_PREFIX = "yangyu-report:state:backup:v1:";

const coerceString = (v: any) => (typeof v === "string" ? v : "");

export default async function handler(req: any, res: any) {
  setNoCacheHeaders(res);

  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const body = req.body ?? {};
  const backupKey = coerceString(body.backupKey);
  if (!backupKey || !backupKey.startsWith(BACKUP_PREFIX)) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Invalid backupKey" }));
    return;
  }

  try {
    const snapshot = await kv.get(backupKey);
    if (!snapshot) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Backup not found" }));
      return;
    }

    await kv.set(KEY, snapshot);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error("KV error", err);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Storage unavailable" }));
  }
}
