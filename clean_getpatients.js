const fs = require('fs');
let content = fs.readFileSync('src/actions/patients.ts', 'utf-8');

// Find the start of fallback
const fallbackStart = content.indexOf('// 4. Fallback a tabla patients');
if (fallbackStart !== -1) {
  const catchIndex = content.indexOf('} catch (err: any) {', fallbackStart);
  if (catchIndex !== -1) {
    const replacement = 'return [];\n    ';
    content = content.substring(0, fallbackStart) + replacement + content.substring(catchIndex);
  }
}

fs.writeFileSync('src/actions/patients.ts', content);
