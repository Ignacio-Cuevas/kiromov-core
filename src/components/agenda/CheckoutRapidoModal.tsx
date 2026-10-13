'use client';

import React from 'react';
import { PaymentCheckoutModal } from '@/components/sales/PaymentCheckoutModal';

export interface CheckoutRapidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cita: any;
  onSuccess: () => void;
}

export function CheckoutRapidoModal({
  isOpen,
  onClose,
  cita,
  onSuccess
}: CheckoutRapidoModalProps) {
  return (
    <PaymentCheckoutModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      initialMode="sesion"
      cita={cita}
      paciente={cita?.pacientes || cita?.paciente}
      pacienteId={cita?.paciente_id}
    />
  );
}

export default CheckoutRapidoModal;
