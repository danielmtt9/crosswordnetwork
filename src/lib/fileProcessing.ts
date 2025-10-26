import path from 'path';
import fs from 'fs/promises';

// HTML content is now just a string
export type PuzzleContent = string;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Generate a unique filename for puzzle storage
 */
export function generatePuzzleFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const sanitized = originalName
    .replace(/[^a-z0-9.-]/gi, '-')
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `puzzle-${timestamp}-${random}-${sanitized}.html`;
}

/**
 * Get the storage path for puzzles based on current date
 */
export function getPuzzleStoragePath(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return path.join('public', 'puzzles', year.toString(), month);
}

/**
 * Get the full file path for a puzzle
 */
export function getPuzzleFilePath(filename: string): string {
  const storagePath = getPuzzleStoragePath();
  return path.join(storagePath, filename);
}

/**
 * Ensure the storage directory exists
 */
export async function ensureStorageDirectory(): Promise<void> {
  const storagePath = getPuzzleStoragePath();
  try {
    await fs.access(storagePath);
  } catch {
    await fs.mkdir(storagePath, { recursive: true });
  }
}

/**
 * Validate HTML content
 */
export function validateHtmlContent(content: string): ValidationResult {
  const errors: string[] = [];
  
  // Check if content exists
  if (!content || content.trim().length === 0) {
    errors.push('HTML content is empty');
  }
  
  // Check for basic HTML structure
  if (!content.includes('<') || !content.includes('>')) {
    errors.push('Invalid HTML structure');
  }
  
  // Check file size (already done in API, but double-check)
  if (content.length > 2 * 1024 * 1024) {
    errors.push('HTML content too large');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Save puzzle content to file
 */
export async function savePuzzleFile(filename: string, content: PuzzleContent): Promise<string> {
  await ensureStorageDirectory();
  const filePath = getPuzzleFilePath(filename);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Delete puzzle file
 */
export async function deletePuzzleFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // File might not exist, that's okay
    console.warn(`Failed to delete puzzle file: ${filePath}`, error);
  }
}

/**
 * Read puzzle file content
 */
export async function readPuzzleFile(filePath: string): Promise<PuzzleContent> {
  const content = await fs.readFile(filePath, 'utf-8');
  return content;
}
