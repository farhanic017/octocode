#!/usr/bin/env node
/**
 * rename-octocode-to-octocode.mjs
 * 
 * Systematically renames all "octo" references to "octocode" in the codebase.
 * Handles:
 * - Package names (@octocode-ai/* -> @octocode-ai/*)
 * - CLI command names (octocode -> octo)
 * - Environment variables (OCTOCODE_* -> OCTOCODE_*)
 * - File paths and imports
 * - URLs and domains (octocode.ai -> octocode.ai)
 * - Text references in docs and comments
 * 
 * Excludes:
 * - node_modules
 * - .git
 * - dist
 * - Build artifacts
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';

const ROOT = process.argv[2] || 'C:\\Users\\Farhan\\Desktop\\octo code';
const DRY_RUN = process.argv.includes('--dry-run');

const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  '.turbo',
  '.next',
  'coverage',
  '.turbo',
  'graphify-out',
];

const EXCLUDE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp3',
  '.mp4',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.lock',
  '.wasm',
  '.binary',
];

// Renaming patterns - ordered by specificity (most specific first)
const RENAMES = [
  // Package names
  { from: '@octocode-ai/', to: '@octocode-ai/' },
  { from: '@octocode/', to: '@octocode/' },
  
  // Environment variables
  { from: 'OCTOCODE_', to: 'OCTOCODE_' },
  { from: 'OCTOCODE', to: 'OCTOCODE' },
  
  // CLI command name (octocode -> octo for the binary)
  { from: '"octo"', to: '"octo"' },
  { from: "'octo'", to: "'octo'" },
  { from: '`octo`', to: '`octo`' },
  
  // URLs and domains
  { from: 'octocode.ai', to: 'octocode.ai' },
  { from: 'github.com/anomalyco/octocode', to: 'github.com/anomalyco/octocode' },
  
  // Package references in package.json
  { from: '"name": "octo"', to: '"name": "octocode"' },
  { from: '"name": "octocode-', to: '"name": "octocode-' },
  
  // Import paths
  { from: 'from "octocode/', to: 'from "octocode/' },
  { from: "from 'octocode/", to: "from 'octocode/" },
  { from: 'from "@/octocode/', to: 'from "@/octocode/' },
  
  // Generic text references (case-insensitive for docs)
  { from: 'OctoCode', to: 'OctoCode' },
  { from: 'octo', to: 'octocode' },
  { from: 'OCTOCODE', to: 'OCTOCODE' },
];

let stats = {
  filesScanned: 0,
  filesModified: 0,
  totalReplacements: 0,
  errors: [],
};

function shouldExcludeFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (EXCLUDE_EXTENSIONS.includes(ext)) return true;
  return false;
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
      const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const newContent = content.replace(regex, to);
      if (newContent !== content) {
        replacements += (content.match(regex) || []).length;
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

console.log(`Starting rename: octocode -> octocode`);
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
