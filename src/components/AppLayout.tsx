import React from 'react';
import Sidebar from './Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0B1120' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative" style={{ background: 'linear-gradient(135deg, #0B1120 0%, #0D1829 100%)' }}>
        {/* Subtle aviation grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(56,189,248,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.02) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}