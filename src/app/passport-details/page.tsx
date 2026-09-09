import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import PassportDetailsContent from './components/PassportDetailsContent';

export default function PassportDetailsPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
        <PassportDetailsContent />
      </Suspense>
    </AppLayout>
  );
}