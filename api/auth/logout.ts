import { clearSessionCookie, setNoCacheHeaders } from "../_auth.js";

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

  clearSessionCookie(res);
  res.statusCode = 200;
  res.json({ ok: true });
}
