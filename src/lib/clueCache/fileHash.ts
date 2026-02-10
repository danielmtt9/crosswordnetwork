/**
 * File Hash Utility
 * 
 * Generates consistent hashes of puzzle files for version tracking
 * and cache invalidation.
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * Generate SHA-256 hash of file contents
 */
export async function generateFileHash(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  } catch (error) {
    console.error(`[fileHash] Failed to hash file ${filePath}:`, error);
    throw new Error(`Failed to generate hash for ${filePath}`);
  }
}

/**
 * Generate hash from string content (for iframe HTML)
 */
export function generateContentHash(content: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(content, 'utf8');
  return hash.digest('hex');
}

/**
 * Generate hash specifically for puzzle wordlist section
 * This focuses on the clue data, ignoring HTML/CSS changes
 */
export function generateWordlistHash(htmlContent: string): string {
  try {
    // Extract just the wordlist data
    const wordlistMatch = htmlContent.match(/<script[^>]*>\s*var\s+g_rgWordData\s*=\s*\[([\s\S]*?)\];\s*<\/script>/i);
    
    if (!wordlistMatch) {
      // Fallback to full content hash if wordlist not found
      console.warn('[fileHash] Wordlist not found, using full content hash');
      return generateContentHash(htmlContent);
    }
    
    const wordlistData = wordlistMatch[1];
    return generateContentHash(wordlistData);
  } catch (error) {
    console.error('[fileHash] Failed to extract wordlist:', error);
    // Fallback to full content hash
    return generateContentHash(htmlContent);
  }
}

/**
 * Compare two hashes
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
}

/**
 * Get puzzle file path from database record
 */
export function getPuzzleFilePath(puzzle: { file_path: string }): string {
  // Assuming file_path is relative to public directory
  const publicDir = path.join(process.cwd(), 'public');
  return path.join(publicDir, puzzle.file_path);
}

/**
 * Generate hash for puzzle file from database record
 */
export async function generatePuzzleFileHash(puzzle: { file_path: string }): Promise<string> {
  const filePath = getPuzzleFilePath(puzzle);
  return generateFileHash(filePath);
}

/**
 * Generate wordlist hash for puzzle file from database record
 */
export async function generatePuzzleWordlistHash(puzzle: { file_path: string }): Promise<string> {
  const filePath = getPuzzleFilePath(puzzle);
  const content = await fs.readFile(filePath, 'utf8');
  return generateWordlistHash(content);
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file modification time
 */
export async function getFileModTime(filePath: string): Promise<Date> {
  const stats = await fs.stat(filePath);
  return stats.mtime;
}

/**
 * Batch hash multiple files
 */
export async function generateMultipleFileHashes(
  filePaths: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const hash = await generateFileHash(filePath);
        results.set(filePath, hash);
      } catch (error) {
        console.error(`[fileHash] Failed to hash ${filePath}:`, error);
        results.set(filePath, '');
      }
    })
  );
  
  return results;
}

/**
 * Generate hash with metadata
 */
export interface HashWithMetadata {
  hash: string;
  algorithm: string;
  generatedAt: Date;
  fileSize?: number;
  modifiedAt?: Date;
}

export async function generateFileHashWithMetadata(
  filePath: string
): Promise<HashWithMetadata> {
  const [hash, stats] = await Promise.all([
    generateFileHash(filePath),
    fs.stat(filePath),
  ]);
  
  return {
    hash,
    algorithm: 'sha256',
    generatedAt: new Date(),
    fileSize: stats.size,
    modifiedAt: stats.mtime,
  };
}

/**
 * Verify hash integrity
 */
export async function verifyFileHash(
  filePath: string,
  expectedHash: string
): Promise<boolean> {
  try {
    const actualHash = await generateFileHash(filePath);
    return compareHashes(actualHash, expectedHash);
  } catch (error) {
    console.error(`[fileHash] Verification failed for ${filePath}:`, error);
    return false;
  }
}
