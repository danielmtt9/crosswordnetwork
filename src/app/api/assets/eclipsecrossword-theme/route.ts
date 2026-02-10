import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const cssPath = path.join(
      process.cwd(),
      "src",
      "lib",
      "puzzleRenderers",
      "styles",
      "eclipsecrossword-theme.css"
    );
    const cssText = await fs.readFile(cssPath, "utf8");

    return new NextResponse(cssText, {
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": process.env.NODE_ENV === "development" ? "no-store" : "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to read theme CSS:", error);
    // Return empty CSS instead of JSON to avoid parsing errors
    return new NextResponse("/* Theme CSS not found */", {
      headers: {
        "Content-Type": "text/css; charset=utf-8",
      },
      status: 500,
    });
  }
}