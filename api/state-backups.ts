import { kv } from "./_kv.js";
import { requireAuth, setNoCacheHeaders } from "./_auth.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 10,
};

const BACKUP_LIST_KEY = "yangyu-report:state:backups:v1";

export default async function handler(req: any, res: any) {
  setNoCacheHeaders(res);

  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  try {
    const keys = (await kv.lrange(BACKUP_LIST_KEY, 0, 50)) as string[];
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ backups: keys || [] }));
  } catch (err) {
    console.error("KV error", err);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Storage unavailable" }));
  }
}
