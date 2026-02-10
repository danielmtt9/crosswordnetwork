import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auditLog";
import formidable from "formidable";
import fs from "fs/promises";
import path from "path";
import {
  generatePuzzleFilename,
  validatePuzzleContent,
  savePuzzleFile,
  deletePuzzleFile,
  PuzzleContent
} from "@/lib/fileProcessing";
import { extractCluesFromHTML, formatCluesForStorage } from "@/lib/serverClueExtraction";

// Disable Next.js body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  
  if (!session || (session as any).role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let file: File | null = null;
  let fileContent: string | null = null;
  let savedFilePath: string | null = null;

  try {
    // Parse the form data
    const formData = await request.formData();
    file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const difficulty = formData.get('difficulty') as string;
    const category = formData.get('category') as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.html')) {
      return NextResponse.json({ 
        error: "Only HTML files are allowed" 
      }, { status: 400 });
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ 
        error: "File size must be less than 2MB" 
      }, { status: 400 });
    }

    // Read the file content
    fileContent = await file.text();
    
    // Basic HTML validation
    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json({ 
        error: "HTML content is empty" 
      }, { status: 400 });
    }
    
    if (!fileContent.includes('<') || !fileContent.includes('>')) {
      return NextResponse.json({ 
        error: "Invalid HTML structure" 
      }, { status: 400 });
    }

    // Detect puzzle format
    const puzzleFormat = detectPuzzleFormat(fileContent);
    
    // Enhanced security validation
    const securityValidation = validateHtmlSecurity(fileContent);
    if (!securityValidation.valid) {
      return NextResponse.json({ 
        error: `Security validation failed: ${securityValidation.errors.join(', ')}` 
      }, { status: 400 });
    }

    // Generate unique filename and save file
    const filename = generatePuzzleFilename(file.name);
    savedFilePath = await savePuzzleFile(filename, fileContent);

    // Parse grid dimensions from HTML content
    let gridWidth: number | null = null;
    let gridHeight: number | null = null;
    
    try {
      const widthMatch = fileContent.match(/CrosswordWidth\s*=\s*(\d+)/);
      const heightMatch = fileContent.match(/CrosswordHeight\s*=\s*(\d+)/);
      
      if (widthMatch) gridWidth = parseInt(widthMatch[1]);
      if (heightMatch) gridHeight = parseInt(heightMatch[1]);
    } catch (error) {
      console.warn('Failed to parse grid dimensions from puzzle content:', error);
    }

    // Extract clues from HTML content
    let cluesJson: string | null = null;
    try {
      const extractedClues = extractCluesFromHTML(fileContent);
      cluesJson = formatCluesForStorage(extractedClues);
      console.log('[PuzzleUpload] Extracted clues:', {
        across: extractedClues.across.length,
        down: extractedClues.down.length
      });
    } catch (error) {
      console.warn('Failed to extract clues from puzzle content:', error);
      // Continue with upload even if clue extraction fails
    }

    // Prepare puzzle data for database
    const puzzleData = {
      title: title || 'Untitled Puzzle',
      description: description || null,
      filename: filename,
      original_filename: file.name,
      file_path: savedFilePath,
      category: category || null,
      difficulty: difficulty || 'medium',
      uploaded_by: (session as any).userId,
      is_active: true,
      grid_width: gridWidth,
      grid_height: gridHeight,
      tags: JSON.stringify([]), // Default empty tags, admin can update
      clues: cluesJson,
      play_count: 0,
      completion_rate: 0.00,
      avg_solve_time: 0.00,
      best_score: 0
    };

    // Create database record
    const puzzle = await prisma.puzzle.create({
      data: puzzleData
    });

    // Create audit log
    await createAuditLog({
      actorUserId: (session as any).userId,
      action: 'PUZZLE_UPLOAD',
      entityType: 'Puzzle',
      entityId: puzzle.id.toString(),
      after: JSON.stringify(puzzleData),
      ip: request.headers.get('x-forwarded-for') || undefined
    });

    return NextResponse.json({
      success: true,
      puzzle: {
        id: puzzle.id,
        title: puzzle.title,
        file_path: puzzle.file_path,
        difficulty: puzzle.difficulty,
        category: puzzle.category
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Puzzle upload error:", error);
    
    // Clean up file if database operation failed
    try {
      if (savedFilePath) {
        await deletePuzzleFile(savedFilePath);
      }
    } catch (cleanupError) {
      console.error("Failed to cleanup uploaded file:", cleanupError);
    }

    return NextResponse.json({
      error: "Failed to upload puzzle",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Detect puzzle format from content
function detectPuzzleFormat(content: string): string {
  // Check for EclipseCrossword markers
  const eclipseMarkers = [
    'CrosswordWidth',
    'CrosswordHeight', 
    'Words =',
    'Word = new Array',
    'Clue = new Array',
    'EclipseCrossword'
  ];
  
  if (eclipseMarkers.some(marker => content.includes(marker))) {
    return 'eclipsecrossword';
  }
  
  // Default to custom format
  return 'custom';
}

// Validate HTML content for security
function validateHtmlSecurity(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for external script sources
  const externalScriptRegex = /<script[^>]*src\s*=\s*["'](?!data:)[^"']*["'][^>]*>/gi;
  if (externalScriptRegex.test(content)) {
    errors.push('External script sources not allowed');
  }
  
  // Check for external resource references
  const externalResourceRegex = /<(?:img|link|iframe|embed|object)[^>]*(?:src|href)\s*=\s*["'](?!data:)[^"']*["'][^>]*>/gi;
  if (externalResourceRegex.test(content)) {
    errors.push('External resource references not allowed');
  }
  
  // Check for suspicious patterns (but allow EclipseCrossword-specific patterns)
  const suspiciousPatterns = [
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /outerHTML\s*=/gi
  ];
  
  // EclipseCrossword-specific patterns that are allowed
  const allowedEclipsePatterns = [
    /document\.write/gi,
    /innerHTML\s*=/gi
  ];
  
  // Check if this is an EclipseCrossword file
  const isEclipseCrossword = content.includes('EclipseCrossword') || 
                            content.includes('CrosswordWidth') || 
                            content.includes('CrosswordHeight');
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      errors.push(`Suspicious pattern detected: ${pattern.source}`);
    }
  }
  
  // Only check EclipseCrossword patterns if it's not an EclipseCrossword file
  if (!isEclipseCrossword) {
    for (const pattern of allowedEclipsePatterns) {
      if (pattern.test(content)) {
        errors.push(`Suspicious pattern detected: ${pattern.source}`);
      }
    }
  }
  
  // Check for data exfiltration attempts
  const dataExfiltrationPatterns = [
    /XMLHttpRequest/gi,
    /fetch\s*\(/gi,
    /navigator\.sendBeacon/gi,
    /window\.location/gi,
    /document\.cookie/gi,
    /localStorage/gi,
    /sessionStorage/gi
  ];
  
  for (const pattern of dataExfiltrationPatterns) {
    if (pattern.test(content)) {
      errors.push(`Potential data exfiltration pattern: ${pattern.source}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
