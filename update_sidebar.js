const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/layout/Sidebar.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldStr = `<div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-blue-600/30 ring-1 ring-blue-400/30 group-hover:bg-blue-500 transition-all shrink-0">
            K
          </div>`;

const newStr = `<div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-md shadow-blue-600/30 ring-1 ring-blue-400/30 shrink-0 overflow-hidden">
            <img src="/kiromov-logo.png" alt="Kiromov Logo" className="w-full h-full object-contain p-1" />
          </div>`;

content = content.replace(oldStr, newStr);
fs.writeFileSync(file, content);
