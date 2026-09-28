const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/layout/TopBar.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldStr = `<header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 flex-shrink-0 select-none">
        
        {/* Buscador Global ⌘K */}`;

const newStr = `<header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 flex-shrink-0 select-none">
        
        {/* Logo en Móviles */}
        <div className="md:hidden flex items-center shrink-0">
          <img src="/kiromov-logo.png" alt="Kiromov Logo" className="h-8 w-auto object-contain" />
        </div>

        {/* Buscador Global ⌘K */}`;

content = content.replace(oldStr, newStr);
fs.writeFileSync(file, content);
