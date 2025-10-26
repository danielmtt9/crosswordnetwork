import fs from "fs";
import mariadb from "mariadb";

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

const env = parseEnv(".env.local");
const url = env.DATABASE_URL;

async function main() {
  try {
    if (!url) throw new Error("Missing DATABASE_URL");
    const m = url.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
    if (!m) throw new Error("DATABASE_URL format invalid");
    const [, user, password, host, port, database] = m;
    const pool = mariadb.createPool({
      host,
      port: Number(port),
      user,
      password,
      database,
      compress: true,
      ssl: false,
      connectionLimit: 2,
    });
    const conn = await pool.getConnection();
    await conn.query("SELECT 1");
    conn.release();
    await pool.end();
    console.log("DB OK: connection successful");
  } catch (e) {
    console.log("DB FAIL:", e?.message || String(e));
    process.exit(1);
  }
}

main();


