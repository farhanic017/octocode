#!/usr/bin/env node

// Postinstall script for OctoCode Desktop Extension
// Auto-installs @nut-tree-fork/nut-js if not already installed

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('OctoCode Desktop Extension - Postinstall');

// Check if nut.js is installed
try {
  require.resolve('@nut-tree-fork/nut-js');
  console.log('✓ @nut-tree-fork/nut-js already installed');
} catch {
  console.log('Installing @nut-tree-fork/nut-js...');
  try {
    execSync('npm install -g @nut-tree-fork/nut-js', { stdio: 'inherit' });
    console.log('✓ @nut-tree-fork/nut-js installed');
  } catch (e) {
    console.error('Failed to install @nut-tree-fork/nut-js:', e.message);
    console.error('Install manually: npm install -g @nut-tree-fork/nut-js');
  }
}

// Check if playwright is installed (for browser tools)
try {
  require.resolve('playwright');
  console.log('✓ playwright already installed');
} catch {
  console.log('Installing playwright (for browser tools)...');
  try {
    execSync('npm install -g playwright', { stdio: 'inherit' });
    console.log('✓ playwright installed');
  } catch (e) {
    console.error('Failed to install playwright:', e.message);
    console.error('Install manually: npm install -g playwright');
  }
}

console.log('');
console.log('OctoCode Desktop Extension ready!');
console.log('Usage: octo run "open notepad and type hello world"');
