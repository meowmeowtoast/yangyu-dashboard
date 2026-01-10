import { kv } from "./_kv.js";
import { randomUUID } from "node:crypto";
import { setNoCacheHeaders } from "./_auth.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 10,
};

const KEY_PREFIX = "yangyu-report:shared-view:v1:";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

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

const newId = () => {
  // URL-safe id
  const raw = randomUUID().replace(/-/g, "");
  return raw.slice(0, 20);
};

export default async function handler(req: any, res: any) {
  setNoCacheHeaders(res);

  if (req.method === "POST") {
    const { data } = req.body ?? {};
    if (typeof data !== "string" || !data) {
      res.statusCode = 400;
      res.json({ error: "Missing data" });
      return;
    }

    const id = newId();
    try {
      await kv.set(`${KEY_PREFIX}${id}`, data, { ex: TTL_SECONDS });
      res.statusCode = 200;
      res.json({ id });
      return;
    } catch (err) {
      handleKvError(res, err);
      return;
    }
  }

  if (req.method === "GET") {
    const id = typeof req.query?.id === "string" ? req.query.id : "";
    if (!id) {
      res.statusCode = 400;
      res.json({ error: "Missing id" });
      return;
    }

    try {
      const data = await kv.get(`${KEY_PREFIX}${id}`);
      if (!data) {
        res.statusCode = 404;
        res.json({ error: "Not found" });
        return;
      }

      res.statusCode = 200;
      res.json({ data });
      return;
    } catch (err) {
      handleKvError(res, err);
      return;
    }
  }

  res.statusCode = 405;
  res.end("Method Not Allowed");
}
