import { issueSessionCookie, setNoCacheHeaders, verifyPassword } from "../_auth.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  setNoCacheHeaders(res);

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  try {
    const { password } = req.body ?? {};
    if (typeof password !== "string" || !password) {
      res.statusCode = 400;
      res.json({ error: "Missing password" });
      return;
    }

    const ok = await verifyPassword(password);
    if (!ok) {
      res.statusCode = 401;
      res.json({ error: "Invalid password" });
      return;
    }

    await issueSessionCookie(res);
    res.statusCode = 200;
    res.json({ ok: true });
  } catch (err: any) {
    res.statusCode = 500;
    res.json({ error: err?.message || "Internal Server Error" });
  }
}
