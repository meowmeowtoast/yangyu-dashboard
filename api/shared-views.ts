import { kv } from "./_kv.js";
import { requireAuth, setNoCacheHeaders } from "./_auth.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 10,
};

const PUBLIC_KEY_PREFIX = "yangyu-report:shared-view:v1:";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const INDEX_KEY = "yangyu-report:shared-views:index:v1";

type SharedViewIndexItem = {
  id: string;
  label: string;
  clientId?: string;
  clientName?: string;
  createdAt: string; // ISO
  expiresAt: string; // ISO
};

const json = (res: any, statusCode: number, body: any) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};

const loadIndex = async (): Promise<SharedViewIndexItem[]> => {
  const raw = await kv.get(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? (parsed as SharedViewIndexItem[]) : [];
  } catch {
    return [];
  }
};

const saveIndex = async (items: SharedViewIndexItem[]) => {
  // Keep a bit more than needed; UI can paginate later if needed.
  const trimmed = items.slice(0, 200);
  await kv.set(INDEX_KEY, JSON.stringify(trimmed));
};

export default async function handler(req: any, res: any) {
  setNoCacheHeaders(res);

  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    try {
      const items = await loadIndex();
      const now = Date.now();

      const kept: SharedViewIndexItem[] = [];
      const visible: SharedViewIndexItem[] = [];

      for (const item of items) {
        if (!item?.id || typeof item.id !== "string") continue;

        const expiresAtMs = Date.parse(item.expiresAt);
        if (Number.isFinite(expiresAtMs) && expiresAtMs <= now) {
          // expired
          continue;
        }

        const exists = await kv.get(`${PUBLIC_KEY_PREFIX}${item.id}`);
        if (!exists) {
          // missing / already deleted
          continue;
        }

        kept.push(item);
        visible.push(item);
      }

      // Best-effort cleanup
      if (kept.length !== items.length) {
        await saveIndex(kept);
      }

      return json(res, 200, { items: visible });
    } catch (err) {
      console.error("KV error", err);
      return json(res, 503, { error: "Storage unavailable" });
    }
  }

  if (req.method === "POST") {
    const { id, label, clientId, clientName } = req.body ?? {};
    if (typeof id !== "string" || !id.trim()) {
      return json(res, 400, { error: "Missing id" });
    }

    // Ensure the target exists in public store before recording.
    try {
      const exists = await kv.get(`${PUBLIC_KEY_PREFIX}${id}`);
      if (!exists) return json(res, 404, { error: "Shared view not found" });

      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + TTL_SECONDS * 1000);

      const item: SharedViewIndexItem = {
        id,
        label: typeof label === "string" && label.trim() ? label.trim() : `分享檢視 ${createdAt.toISOString()}`,
        clientId: typeof clientId === "string" ? clientId : undefined,
        clientName: typeof clientName === "string" ? clientName : undefined,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      const items = await loadIndex();
      // Remove duplicates, then unshift newest
      const next = [item, ...items.filter((x) => x?.id !== id)];
      await saveIndex(next);

      return json(res, 200, { ok: true, item });
    } catch (err) {
      console.error("KV error", err);
      return json(res, 503, { error: "Storage unavailable" });
    }
  }

  if (req.method === "PATCH") {
    const { id, label } = req.body ?? {};
    if (typeof id !== "string" || !id.trim()) {
      return json(res, 400, { error: "Missing id" });
    }
    if (typeof label !== "string" || !label.trim()) {
      return json(res, 400, { error: "Missing label" });
    }

    try {
      const items = await loadIndex();
      const next = items.map((x) => (x?.id === id ? { ...x, label: label.trim() } : x));
      await saveIndex(next);
      return json(res, 200, { ok: true });
    } catch (err) {
      console.error("KV error", err);
      return json(res, 503, { error: "Storage unavailable" });
    }
  }

  if (req.method === "DELETE") {
    const id = typeof req.query?.id === "string" ? req.query.id : "";
    if (!id) return json(res, 400, { error: "Missing id" });

    try {
      await kv.del(`${PUBLIC_KEY_PREFIX}${id}`);

      const items = await loadIndex();
      const next = items.filter((x) => x?.id !== id);
      if (next.length !== items.length) await saveIndex(next);

      return json(res, 200, { ok: true });
    } catch (err) {
      console.error("KV error", err);
      return json(res, 503, { error: "Storage unavailable" });
    }
  }

  res.statusCode = 405;
  res.end("Method Not Allowed");
}
