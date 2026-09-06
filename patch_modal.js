const fs = require('fs');
let code = fs.readFileSync('src/components/patients/PatientModal.tsx', 'utf8');

const startStr = "    try {\n      const isEditing = Boolean(patientToEdit?.id);\n      const patientId = patientToEdit?.id;";
const endStr = "      setIsSubmitting(false);\n    }\n  };\n";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
  const newBlock = `    try {
      const isEditing = Boolean(patientToEdit?.id);

      const actionData = {
        full_name: cleanName,
        rut: cleanRut,
        phone: telefono.trim() || null,
        email: email.trim().toLowerCase() || null,
        birth_date: fechaNacimiento || null,
        health_insurance: prevision || 'Particular',
        medical_notes: diagnosticoPrincipal.trim() || null,
        motivo_consulta: motivoConsulta.trim() || null,
        antecedentes_morbidos: antecedentesMorbidos.trim() || null,
        alertas_seguridad: alertasSeguridad.trim() || null,
        status: 'activo',
      };

      let result;
      if (isEditing && patientToEdit?.id) {
        result = await updatePatient(patientToEdit.id, actionData);
      } else {
        result = await createPatient(actionData);
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al guardar el paciente');
      }

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-bold">¡Excelente!</span>
          <span className="text-sm">
            Paciente {isEditing ? 'actualizado' : 'registrado'} correctamente.
          </span>
        </div>
      );

      if (onSuccess && result.data) {
        onSuccess(result.data);
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error('Excepción al guardar paciente:', err);
      toast.error('Error Inesperado', {
        description: err.message || 'No se pudo guardar el paciente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
`;
  
  const finalCode = code.substring(0, startIndex) + newBlock + code.substring(endIndex);
  fs.writeFileSync('src/components/patients/PatientModal.tsx', finalCode);
  console.log('Patched handleSave');
} else {
  console.error('Could not find boundaries');
}
