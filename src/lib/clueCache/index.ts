/**
 * Clue Cache Module
 * 
 * Database-first clue loading system with hash-based versioning
 */

// Repository
export { 
  clueRepository,
  ClueRepository,
  type ClueResult,
  type ClueSourceInfo,
  type CacheStats,
} from './clueRepository';

// Parser
export {
  parseCluesFromHTML,
  parseCluesFromFile,
  validateClues,
  normalizeClueText,
  serializeClues,
  deserializeClues,
  convertToBridgeFormat,
  type ParsedClue,
  type ParsedClues,
  type ParseResult,
} from './clueParser';

// File Hash
export {
  generateFileHash,
  generateContentHash,
  generateWordlistHash,
  generatePuzzleFileHash,
  generatePuzzleWordlistHash,
  compareHashes,
  getPuzzleFilePath,
  fileExists,
  getFileModTime,
  generateMultipleFileHashes,
  generateFileHashWithMetadata,
  verifyFileHash,
  type HashWithMetadata,
} from './fileHash';

// Background Sync
export {
  backgroundSync,
  BackgroundSyncService,
  scheduleSync,
  type SyncResult,
  type SyncOptions,
} from './backgroundSync';
