#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { default: chalk } = require('chalk');

// Get the data directory path
const dataDir = path.join(__dirname, '..', 'data');

function listFilesRecursively(dir, indent = '') {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const fullPath = path.join(dir, file.name);
    const stats = fs.statSync(fullPath);
    const relativePath = path.relative(dataDir, fullPath);
    
    // Format size with appropriate unit
    let sizeStr;
    if (stats.size < 1024) {
      sizeStr = `${stats.size}B`;
    } else if (stats.size < 1024 * 1024) {
      sizeStr = `${(stats.size / 1024).toFixed(1)}K`;
    } else {
      sizeStr = `${(stats.size / (1024 * 1024)).toFixed(1)}M`;
    }
    
    // Pad size string to align output
    sizeStr = sizeStr.padStart(6);
    
    // Color code by file type
    let coloredName;
    if (file.isDirectory()) {
      coloredName = chalk.blue(file.name + '/');
    } else {
      const ext = path.extname(file.name).toLowerCase();
      switch(ext) {
        case '.json':
          coloredName = chalk.green(file.name);
          break;
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
          coloredName = chalk.magenta(file.name);
          break;
        case '.mp4':
        case '.mov':
        case '.avi':
          coloredName = chalk.yellow(file.name);
          break;
        default:
          coloredName = file.name;
      }
    }
    
    console.log(`${indent}${coloredName.padEnd(30)} ${sizeStr}  ${stats.mtime.toLocaleString()}`);
    
    if (file.isDirectory()) {
      listFilesRecursively(fullPath, indent + '  ');
    }
  });
}

// Start recursive listing
console.log(chalk.bold('\nListing all files in data directory:\n'));
listFilesRecursively(dataDir); 