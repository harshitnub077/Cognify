const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

// These MUST be run in specific order because some overlap
const replacements = [
  // Card
  { regex: /\bcard\b/g, replace: 'bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg' },
  
  // Divide
  { regex: /divide-surface-border/g, replace: 'divide-[#1a1a1a]' },
  
  // Hover borders
  { regex: /hover:border-surface-muted/g, replace: 'hover:border-[#333]' },
  
  // Hover backgrounds
  { regex: /hover:bg-surface-card/g, replace: 'hover:bg-[#111]' },
  { regex: /hover:bg-surface-hover/g, replace: 'hover:bg-[#222]' },
  { regex: /hover:bg-surface-border/g, replace: 'hover:bg-[#333]' },

  // Borders
  { regex: /border-surface-border/g, replace: 'border-[#1a1a1a]' },
  
  // Backgrounds
  { regex: /bg-surface-card/g, replace: 'bg-[#111]' },
  { regex: /bg-surface-hover/g, replace: 'bg-[#222]' },
  { regex: /bg-surface-border/g, replace: 'bg-[#1a1a1a]' },
  { regex: /bg-surface/g, replace: 'bg-[#0a0a0a]' },

  // Text
  { regex: /text-primary/g, replace: 'text-white' },
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
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Reverted ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Undo complete.');
