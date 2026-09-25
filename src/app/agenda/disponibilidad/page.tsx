'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BoxScheduleView } from '@/components/agenda/BoxScheduleView';

export default function DisponibilidadPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-cloud pb-20 font-gilroy text-ink-navy">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <BoxScheduleView
          onBackToAgenda={() => router.push('/agenda')}
          onSavedSuccess={() => router.push('/agenda')}
        />
      </main>
    </div>
  );
}
