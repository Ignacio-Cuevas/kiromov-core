'use client';

import React from 'react';
import { PaymentCheckoutModal } from './PaymentCheckoutModal';

export interface CobrarSesionSimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteId: string;
  categoriaTarifa: string | null;
  citaId?: string;
  onSuccess: () => void;
}

export function CobrarSesionSimpleModal({
  isOpen,
  onClose,
  pacienteId,
  categoriaTarifa,
  citaId,
  onSuccess
}: CobrarSesionSimpleModalProps) {
  return (
    <PaymentCheckoutModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      initialMode="sesion"
      pacienteId={pacienteId}
      categoriaTarifa={categoriaTarifa}
      cita={citaId ? { id: citaId, paciente_id: pacienteId } : null}
    />
  );
}

export default CobrarSesionSimpleModal;
