'use client';

import React from 'react';
import { PaymentCheckoutModal } from './PaymentCheckoutModal';

export interface SaleModalProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  initialPatient?: any | null;
  selectedPatient?: any | null;
  onSaleCompleted?: (sale: any) => void;
  onSuccess?: () => void;
}

export function SaleModal({
  open,
  isOpen,
  onOpenChange,
  onClose,
  initialPatient,
  selectedPatient,
  onSaleCompleted,
  onSuccess,
}: SaleModalProps) {
  const isModalOpen = isOpen ?? open ?? false;

  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  const handleSuccess = () => {
    onSuccess?.();
    onSaleCompleted?.({});
    handleClose();
  };

  return (
    <PaymentCheckoutModal
      isOpen={isModalOpen}
      onClose={handleClose}
      onSuccess={handleSuccess}
      initialMode="plan"
      paciente={selectedPatient || initialPatient}
    />
  );
}

export default SaleModal;
