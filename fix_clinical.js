const fs = require('fs');
let content = fs.readFileSync('src/components/clinical/ClinicalRecordView.tsx', 'utf-8');

// Fix the patientName leftover in SettlePaymentModal
content = content.replace(/patientName=\{paciente\?\.nombre_completo\}\n\s*/g, '');

// Revert the planEnUso back to plan for CancelPlanModal
content = content.replace(/<CancelPlanModal\s*isOpen=\{abrirCancelModal\}\s*planEnUso=\{planActivo\}/, '<CancelPlanModal\n          isOpen={abrirCancelModal}\n          plan={planActivo}');

fs.writeFileSync('src/components/clinical/ClinicalRecordView.tsx', content);
