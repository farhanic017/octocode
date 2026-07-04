#!/usr/bin/env node
/**
 * rename-octocode-to-octocode-phase8.mjs
 * 
 * Phase 8: Final comprehensive rename of all remaining octocode references.
 * Handles plugin names, file names, and other specific contexts.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, renameSync } from 'fs';
import { join, extname, basename, dirname } from 'path';

const ROOT = process.argv[2] || 'C:\\Users\\Farhan\\Desktop\\octo code';
const DRY_RUN = process.argv.includes('--dry-run');

const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  '.turbo',
  '.next',
  'coverage',
  'graphify-out',
  '.understand-anything',
];

const EXCLUDE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4',
  '.pdf', '.zip', '.tar', '.gz', '.lock', '.wasm', '.binary',
];

// Phase 8: Comprehensive rename
const RENAMES = [
  // Plugin names
  { from: 'OctocodePlugin', to: 'OctocodePlugin' },
  { from: 'OctocodeProvider', to: 'OctocodeProvider' },
  
  // File names (for renaming files)
  { from: 'provider-octocode.ts', to: 'provider-octocode.ts' },
  { from: 'provider-octocode.test.ts', to: 'provider-octocode.test.ts' },
  
  // Remaining lowercase octocode in identifiers
  { from: /octocode/g, to: 'octocode' },
  { from: /OctoCode/g, to: 'OctoCode' },
  { from: /OCTOCODE/g, to: 'OCTOCODE' },
];

let stats = {
  filesScanned: 0,
  filesModified: 0,
  filesRenamed: 0,
  totalReplacements: 0,
  errors: [],
};

function shouldExcludeFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  return EXCLUDE_EXTENSIONS.includes(ext);
}

function shouldExcludeDir(dirName) {
  return EXCLUDE_DIRS.includes(dirName);
}

function processFile(filePath) {
  stats.filesScanned++;
  
  if (shouldExcludeFile(filePath)) return;
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    let originalContent = content;
    let replacements = 0;
    
    for (const { from, to } of RENAMES) {
      let regex;
      if (from instanceof RegExp) {
        regex = from;
      } else {
        regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      }
      
      const newContent = content.replace(regex, to);
      if (newContent !== content) {
        const matches = content.match(regex);
        if (matches) replacements += matches.length;
        content = newContent;
      }
    }
    
    if (content !== originalContent) {
      stats.filesModified++;
      stats.totalReplacements += replacements;
      
      if (!DRY_RUN) {
        writeFileSync(filePath, content, 'utf-8');
      }
      
      console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Modified: ${filePath} (${replacements} replacements)`);
    }
  } catch (err) {
    stats.errors.push({ file: filePath, error: err.message });
  }
}

function renameFile(filePath) {
  const fileName = basename(filePath);
  const dirName = dirname(filePath);
  
  // Check if file needs renaming
  if (fileName.includes('octocode')) {
    const newFileName = fileName.replace(/octocode/g, 'octocode');
    const newFilePath = join(dirName, newFileName);
    
    if (!DRY_RUN) {
      renameSync(filePath, newFilePath);
      console.log(`Renamed: ${filePath} -> ${newFilePath}`);
    } else {
      console.log(`[DRY RUN] Would rename: ${filePath} -> ${newFilePath}`);
    }
    
    stats.filesRenamed++;
    return newFilePath;
  }
  
  return filePath;
}

function walkDir(dir) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!shouldExcludeDir(entry.name)) {
          walkDir(fullPath);
        }
      } else if (entry.isFile()) {
        // First rename the file if needed
        const renamedPath = renameFile(fullPath);
        // Then process the content
        processFile(renamedPath);
      }
    }
  } catch (err) {
    stats.errors.push({ file: dir, error: err.message });
  }
}

console.log(`Starting Phase 8 rename: octocode -> octocode`);
console.log(`Root: ${ROOT}`);
console.log(`Dry run: ${DRY_RUN}`);
console.log('---');

walkDir(ROOT);

console.log('---');
console.log(`Files scanned: ${stats.filesScanned}`);
console.log(`Files modified: ${stats.filesModified}`);
console.log(`Files renamed: ${stats.filesRenamed}`);
console.log(`Total replacements: ${stats.totalReplacements}`);

if (stats.errors.length > 0) {
  console.log(`\nErrors (${stats.errors.length}):`);
  stats.errors.forEach(({ file, error }) => {
    console.log(`  ${file}: ${error}`);
  });
}

if (DRY_RUN) {
  console.log('\n[DRY RUN] No files were actually modified. Run without --dry-run to apply changes.');
}
