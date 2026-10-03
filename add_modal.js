const fs = require('fs');
let content = fs.readFileSync('src/components/clinical/ClinicalRecordView.tsx', 'utf-8');

const modal = `      {abrirAssessmentModal && paciente && (
        <InitialAssessmentModal
          paciente={paciente}
          onClose={() => setAbrirAssessmentModal(false)}
          onSave={async (form: any) => {
             // For now we just console.log and close, as it's a demo
             console.log("Saving AI Assessment:", form);
             toast.success("Evaluación guardada exitosamente (IA)");
             setAbrirAssessmentModal(false);
          }}
        />
      )}`;

content = content.replace(/{\/\* Evaluación Inicial TMO \*\//, `${modal}\n\n      {/* Evaluación Inicial TMO */}`);

fs.writeFileSync('src/components/clinical/ClinicalRecordView.tsx', content);
