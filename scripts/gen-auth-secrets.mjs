import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const password = process.env.YY_REPORT_PASSWORD;

if (!password) {
  console.error(
    "Missing YY_REPORT_PASSWORD.\n\n" +
      "Run (bash/zsh):\n" +
      "  read -s YY_REPORT_PASSWORD && export YY_REPORT_PASSWORD\n" +
      "  node scripts/gen-auth-secrets.mjs\n\n" +
      "This prints values you can paste into Vercel env vars:\n" +
      "  APP_JWT_SECRET\n" +
      "  APP_PASSWORD_HASH\n"
  );
  process.exit(1);
}

const jwtSecret = crypto.randomBytes(32).toString("base64url");
const passwordHash = await bcrypt.hash(password, 10);

process.stdout.write(`APP_JWT_SECRET=${jwtSecret}\n`);
process.stdout.write(`APP_PASSWORD_HASH=${passwordHash}\n`);
