'use client';

import React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody } from '@/components/ui/dialog';
import { SoapEvolutionForm } from '@/components/patients/SoapEvolutionForm';
import { EvolucionSOAP } from '@/types/database';

interface SOAPModalProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteId: string;
  pacienteNombre: string;
  onEvolutionSaved?: (newEvolution: EvolucionSOAP) => void;
}

export function SOAPModal({ isOpen, onClose, pacienteId, pacienteNombre, onEvolutionSaved }: SOAPModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>Nueva Evolución Clínica (SOAP)</DialogTitle>
        <DialogDescription>Registra el progreso y tratamiento para {pacienteNombre}</DialogDescription>
      </DialogHeader>
      <DialogBody className="max-h-[80vh] overflow-y-auto">
        <SoapEvolutionForm
          pacienteId={pacienteId}
          pacienteNombre={pacienteNombre}
          onEvolutionSaved={(evo) => {
            if (onEvolutionSaved) onEvolutionSaved(evo);
            onClose();
          }}
        />
      </DialogBody>
    </Dialog>
  );
}
