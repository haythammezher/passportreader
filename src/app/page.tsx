import React from 'react';
import AppLayout from '@/components/AppLayout';
import PassportScannerContent from './components/PassportScannerContent';

export default function PassportScannerPage() {
  return (
    <AppLayout>
      <PassportScannerContent />
    </AppLayout>
  );
}