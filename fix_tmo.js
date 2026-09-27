const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/clinical/ClinicalRecordView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// We have the mess starting from line 1234. Let's find it.
// The old block was `{evaluacionInicialTMO ? ( <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">` ...
// Let's just find where the mess starts: `              </div>\n\n                      ) : (`
// And replace all the trailing garbage until `              </div>\n            ) : (`

const regex = /<\/div>\s*<\/div>\s*<\/div>\s*\) : \(\s*<span className="text-emerald-700 font-medium">[\s\S]*?<\/div>\s*\) : \(\s*<div className="bg-slate-50 flex flex-col items-center justify-center/g;

// Instead of complex regex, let's just find the exact string to replace.

const marker1 = '              </div>\n\n                      ) : (\n                        <span className="text-emerald-700 font-medium">✓ Sin banderas rojas reportadas</span>';

const index1 = content.indexOf('              </div>\n\n                      ) : (\n                        <span className="text-emerald-700 font-medium">✓ Sin banderas rojas reportadas</span>');

if (index1 !== -1) {
    const nextRealElse = content.indexOf(') : (\n              <div className="bg-slate-50 flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-slate-300 text-center">', index1);
    if (nextRealElse !== -1) {
        content = content.substring(0, index1) + '              </div>\n            ' + content.substring(nextRealElse);
        fs.writeFileSync(filePath, content);
        console.log("Fixed!");
    } else {
        console.log("Could not find nextRealElse");
    }
} else {
    console.log("Could not find marker1");
}
