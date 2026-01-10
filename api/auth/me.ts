import { getSessionFromRequest, setNoCacheHeaders } from "../_auth.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  setNoCacheHeaders(res);

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const session = await getSessionFromRequest(req);
  res.statusCode = 200;
  res.json({ authenticated: !!session?.sub });
}
