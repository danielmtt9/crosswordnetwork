import fs from "fs";
import { spawnSync } from "child_process";

function parseEnv(path) {
  if (!fs.existsSync(path)) return {};
  const lines = fs
    .readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.trim().startsWith("#") && l.includes("="));
  const entries = lines.map((l) => {
    const i = l.indexOf("=");
    const key = l.slice(0, i).trim();
    const value = l.slice(i + 1);
    return [key, value];
  });
  return Object.fromEntries(entries);
}

const envFile = ".env.local";
const envVars = parseEnv(envFile);
if (!envVars.DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const mergedEnv = { ...process.env, DATABASE_URL: envVars.DATABASE_URL };

// prisma generate
{
  const r = spawnSync("npx", ["prisma", "generate"], {
    stdio: "inherit",
    env: mergedEnv,
    shell: process.platform === "win32",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// create migration locally without applying (avoids shadow DB)
{
  const r = spawnSync(
    "npx",
    ["prisma", "migrate", "dev", "--name", "init_auth", "--create-only", "--skip-seed"],
    {
      stdio: "inherit",
      env: mergedEnv,
      shell: process.platform === "win32",
    }
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// deploy migrations (does not use shadow DB)
{
  const r = spawnSync(
    "npx",
    ["prisma", "migrate", "deploy"],
    {
      stdio: "inherit",
      env: mergedEnv,
      shell: process.platform === "win32",
    }
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("Prisma migrate deploy completed.");


