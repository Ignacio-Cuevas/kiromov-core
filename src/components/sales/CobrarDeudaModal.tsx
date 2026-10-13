'use client';

import React from 'react';
import { PaymentCheckoutModal } from './PaymentCheckoutModal';

export type DeudaItem = {
  tipo: 'cita' | 'plan';
  id: string;
  paciente_id: string;
  paciente_nombre?: string;
  concepto: string;
  deuda: number;
  fecha?: string;
};

export interface CobrarDeudaModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DeudaItem | null;
  onSuccess: () => void;
}

export function CobrarDeudaModal({
  isOpen,
  onClose,
  item,
  onSuccess
}: CobrarDeudaModalProps) {
  return (
    <PaymentCheckoutModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      initialMode="deuda"
      pacienteId={item?.paciente_id}
      deudaInfo={item ? {
        tipo: item.tipo,
        id: item.id,
        plan_id: item.tipo === 'plan' ? item.id : undefined,
        cita_id: item.tipo === 'cita' ? item.id : undefined,
        concepto: item.concepto,
        deudaTotal: item.deuda,
        fecha: item.fecha
      } : null}
    />
  );
}

export default CobrarDeudaModal;
