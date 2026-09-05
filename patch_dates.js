const fs = require('fs');

const files = [
  "src/app/finanzas/page.tsx",
  "src/components/sales/PostSessionModal.tsx",
  "src/components/sales/AssignTreatmentModal.tsx",
  "src/components/sales/SettlePaymentModal.tsx",
  "src/components/finanzas/RegisterSaleDialog.tsx",
  "src/components/clinical/ReimbursementCertificate.tsx",
  "src/components/clinical/ClinicalBoxSuite.tsx",
  "src/components/patients/SoapEvolutionForm.tsx",
  "src/components/patients/RenewPlanDialog.tsx",
  "src/components/finanzas/CreateExpenseDialog.tsx"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const target1 = "new Date().toISOString().split('T')[0]";
  const target2 = 'new Date().toISOString().split("T")[0]';

  if (content.includes(target1) || content.includes(target2)) {
    content = content.replaceAll(target1, 'getChileanDate()');
    content = content.replaceAll(target2, 'getChileanDate()');
    
    // Auto import
    if (!content.includes('getChileanDate')) {
        console.error("Failed to inject import in " + file + ", it lacks the function call, or something else is wrong.");
    }
    
    // Check if '@/lib/utils' is imported
    if (content.includes("@/lib/utils")) {
      content = content.replace(/import \{(.*?)\} from ["']@\/lib\/utils["'];/, (match, p1) => {
        if (!p1.includes('getChileanDate')) {
          return `import {${p1}, getChileanDate } from '@/lib/utils';`;
        }
        return match;
      });
    } else {
      // Find the last import and append
      const lines = content.split('\n');
      const lastImportIdx = lines.findLastIndex(l => l.startsWith('import '));
      if (lastImportIdx !== -1) {
        lines.splice(lastImportIdx + 1, 0, "import { getChileanDate } from '@/lib/utils';");
        content = lines.join('\n');
      }
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log("Patched " + file);
  }
}
