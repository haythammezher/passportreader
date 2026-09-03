import React from 'react';
import AppLayout from '@/components/AppLayout';
import RegistryContent from './components/RegistryContent';

export const metadata = { title: 'Passport Registry' };

export default function RegistryPage() {
  return (
    <AppLayout>
      <RegistryContent />
    </AppLayout>
  );
}
