'use client';

import React from 'react';
import { PaymentCheckoutModal } from './PaymentCheckoutModal';

export interface SettlePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planEnUso: any;
  onSuccess?: () => void;
}

export function SettlePaymentModal({
  isOpen,
  onClose,
  planEnUso,
  onSuccess
}: SettlePaymentModalProps) {
  return (
    <PaymentCheckoutModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      initialMode="deuda"
      planEnUso={planEnUso}
      pacienteId={planEnUso?.paciente_id}
      deudaInfo={planEnUso ? {
        tipo: 'plan',
        id: planEnUso.id,
        plan_id: planEnUso.id,
        concepto: planEnUso.nombre_plan,
        deudaTotal: planEnUso.saldo_pendiente ?? (planEnUso.valor_total ?? 0),
        fecha: planEnUso.fecha_compra
      } : null}
    />
  );
}

export default SettlePaymentModal;
