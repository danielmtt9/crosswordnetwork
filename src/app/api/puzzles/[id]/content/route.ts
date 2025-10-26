import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const puzzleId = parseInt(id);
    
    if (isNaN(puzzleId)) {
      return NextResponse.json(
        { error: "Invalid puzzle ID" },
        { status: 400 }
      );
    }

    const puzzle = await prisma.puzzle.findUnique({
      where: {
        id: puzzleId,
        is_active: true,
      },
      select: {
        id: true,
        file_path: true,
        filename: true,
      },
    });

    if (!puzzle) {
      return NextResponse.json(
        { error: "Puzzle not found" },
        { status: 404 }
      );
    }

    // Read the puzzle file content
    try {
      const filePath = path.join(process.cwd(), puzzle.file_path);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check if this is an iframe request
      const url = new URL(request.url);
      const mode = url.searchParams.get('mode');
      
      if (mode === 'iframe') {
        // Return raw HTML content for iframe
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'text/html',
            'X-Frame-Options': 'SAMEORIGIN',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
        });
      } else {
        // Return JSON response with content for regular API calls
        return NextResponse.json({
          content: content,
          metadata: {
            filename: puzzle.filename,
            filePath: puzzle.file_path
          }
        });
      }
    } catch (fileError) {
      console.error('Error reading puzzle file:', fileError);
      return NextResponse.json(
        { error: "Puzzle content not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error fetching puzzle content:", error);
    return NextResponse.json(
      { error: "Failed to fetch puzzle content" },
      { status: 500 }
    );
  }
}
