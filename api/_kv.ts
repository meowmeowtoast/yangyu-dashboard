import { createClient } from "@vercel/kv";

const findEnvBySuffix = (suffix: string) => {
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    if (key === suffix || key.endsWith(suffix)) return value;
  }
  return undefined;
};

const getKvRestUrl = () =>
  process.env.KV_REST_API_URL ?? findEnvBySuffix("_KV_REST_API_URL");

const getKvRestToken = () =>
  process.env.KV_REST_API_TOKEN ?? findEnvBySuffix("_KV_REST_API_TOKEN");

export const kv = createClient({
  url: getKvRestUrl(),
  token: getKvRestToken(),
});
