import { kv } from "./_kv.js";
import { requireAuth, setNoCacheHeaders } from "./_auth.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 10,
};

const KEY = "yangyu-report:state:v1";

type StoredState = {
  userData: any;
  analyses: Record<string, any>;
};

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

  if (req.method !== "PUT") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const { key, data } = req.body ?? {};
  if (typeof key !== "string" || !key.trim()) {
    res.statusCode = 400;
    res.json({ error: "Missing key" });
    return;
  }

  if (data === undefined || data === null || typeof data !== "object") {
    res.statusCode = 400;
    res.json({ error: "Missing data" });
    return;
  }

  try {
    const current = (await kv.get(KEY)) as StoredState | null;
    const next: StoredState = {
      userData: current?.userData ?? {},
      analyses: { ...(current?.analyses ?? {}) },
    };

    next.analyses[key] = data;
    await kv.set(KEY, next);

    res.statusCode = 200;
    res.json({ ok: true });
  } catch (err) {
    handleKvError(res, err);
  }
}
