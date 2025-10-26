import fs from "fs";
import { spawnSync } from "child_process";
import path from "path";

function parseEnv(p) {
  if (!fs.existsSync(p)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(p, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.trim().startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1)];
      })
  );
}

const env = { ...process.env, ...parseEnv(".env.local") };
if (!env.DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

// 1) Generate SQL diff from empty to current schema
const outDir = path.join("prisma", "direct-sql");
fs.mkdirSync(outDir, { recursive: true });
const sqlFile = path.join(outDir, `init_auth.sql`);

{
  const r = spawnSync(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--script",
    ],
    { env, shell: process.platform === "win32", encoding: "utf8" }
  );
  if (r.status !== 0) {
    process.stderr.write(r.stderr || "migrate diff failed\n");
    process.exit(r.status ?? 1);
  }
  fs.writeFileSync(sqlFile, r.stdout, "utf8");
}

// 2) Execute SQL directly
{
  const r = spawnSync(
    "npx",
    ["prisma", "db", "execute", "--file", sqlFile, "--schema", "prisma/schema.prisma"],
    { stdio: "inherit", env, shell: process.platform === "win32" }
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("Direct SQL migration applied.");


