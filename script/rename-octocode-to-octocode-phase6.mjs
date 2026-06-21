#!/usr/bin/env node
/**
 * rename-octocode-to-octocode-phase6.mjs
 * 
 * Phase 6: Final comprehensive rename of all remaining octocode references.
 * Handles console.log messages, comments, and other specific contexts.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';

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

// Phase 6: Comprehensive rename
const RENAMES = [
  // Console.log messages
  { from: 'OctoCode server ready', to: 'OctoCode server ready' },
  { from: 'OctoCode response:', to: 'OctoCode response:' },
  { from: 'OctoCode connected', to: 'OctoCode connected' },
  { from: 'OctoCode started', to: 'OctoCode started' },
  { from: 'OctoCode stopped', to: 'OctoCode stopped' },
  
  // Comments
  { from: '// OctoCode', to: '// OctoCode' },
  { from: '/* OctoCode', to: '/* OctoCode' },
  { from: '* OctoCode', to: '* OctoCode' },
  
  // Remaining lowercase octocode in identifiers
  { from: /octocode/g, to: 'octocode' },
  { from: /OctoCode/g, to: 'OctoCode' },
  { from: /OCTOCODE/g, to: 'OCTOCODE' },
];

let stats = {
  filesScanned: 0,
  filesModified: 0,
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
        processFile(fullPath);
      }
    }
  } catch (err) {
    stats.errors.push({ file: dir, error: err.message });
  }
}

console.log(`Starting Phase 6 rename: octocode -> octocode`);
console.log(`Root: ${ROOT}`);
console.log(`Dry run: ${DRY_RUN}`);
console.log('---');

walkDir(ROOT);

console.log('---');
console.log(`Files scanned: ${stats.filesScanned}`);
console.log(`Files modified: ${stats.filesModified}`);
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
