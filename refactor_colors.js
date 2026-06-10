const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

const replacements = [
  // Backgrounds
  { regex: /bg-\[#0a0a0a\]/g, replace: 'bg-surface' },
  { regex: /bg-\[#111\]/g, replace: 'bg-surface-card' },
  { regex: /bg-\[#1a1a1a\]/g, replace: 'bg-surface-border' },
  { regex: /bg-\[#222\]/g, replace: 'bg-surface-hover' },
  
  // Hover backgrounds
  { regex: /hover:bg-\[#111\]/g, replace: 'hover:bg-surface-card' },
  { regex: /hover:bg-\[#222\]/g, replace: 'hover:bg-surface-hover' },
  { regex: /hover:bg-\[#333\]/g, replace: 'hover:bg-surface-border' },

  // Borders
  { regex: /border-\[#1a1a1a\]/g, replace: 'border-surface-border' },
  { regex: /border-\[#222\]/g, replace: 'border-surface-border' },
  { regex: /border-\[#333\]/g, replace: 'border-surface-border' },
  
  // Hover borders
  { regex: /hover:border-\[#333\]/g, replace: 'hover:border-surface-muted' },
  { regex: /hover:border-\[#444\]/g, replace: 'hover:border-surface-muted' },

  // Text
  { regex: /text-white/g, replace: 'text-primary' },
  { regex: /text-slate-300/g, replace: 'text-primary' },
  
  // Divide
  { regex: /divide-\[#1a1a1a\]/g, replace: 'divide-surface-border' },
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const { regex, replace } of replacements) {
        content = content.replace(regex, replace);
      }
      
      // Specifically target "bg-surface border border-surface-border rounded-lg" and upgrade to "card" for glassmorphism
      content = content.replace(/bg-surface border border-surface-border rounded-lg/g, 'card');
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Refactoring complete.');
