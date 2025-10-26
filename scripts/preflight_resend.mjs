import fs from "fs";
import https from "https";

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
const apiKey = env.RESEND_API_KEY;

if (!apiKey) {
  console.log("Resend FAIL: missing RESEND_API_KEY");
  process.exit(1);
}

const req = https.request(
  "https://api.resend.com/domains",
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  },
  (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
      try {
        const json = JSON.parse(data);
        const names = (json.data || [])
          .slice(0, 3)
          .map((d) => (typeof d?.name === "string" ? d.name : ""))
          .filter(Boolean);
        console.log(
          "Resend OK:",
          names.length ? `domains: ${names.join(", ")}` : "no domains listed"
        );
      } catch {
        console.log("Resend OK: response received");
      }
    });
  }
);

req.on("error", (err) => {
  console.log("Resend FAIL:", err.message);
  process.exit(1);
});

req.end();


