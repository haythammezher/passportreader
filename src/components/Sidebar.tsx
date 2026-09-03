'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ScanLine, FileText, Database, ChevronLeft, ChevronRight, Shield, Settings, HelpCircle, Bell, LogOut, User, History, Upload, ClipboardList, Download, BarChart2, Users, BookOpen,  } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';




const navItems = [
  {
    key: 'nav-scanner',
    label: 'Passport Scanner',
    icon: ScanLine,
    href: '/',
    badge: null,
  },
  {
    key: 'nav-details',
    label: 'Passport Details',
    icon: FileText,
    href: '/passport-details',
    badge: null,
  },
  {
    key: 'nav-records',
    label: 'Passport Records',
    icon: Database,
    href: '/passport-records',
    badge: null,
  },
  {
    key: 'nav-registry',
    label: 'Registry',
    icon: BookOpen,
    href: '/registry',
    badge: null,
  },
  {
    key: 'nav-analytics',
    label: 'Analytics',
    icon: BarChart2,
    href: '/analytics',
    badge: null,
  },
  {
    key: 'nav-data-export',
    label: 'Data Export',
    icon: Download,
    href: '/data-export',
    badge: null,
  },
];

const bottomItems = [
  { key: 'nav-settings', label: 'Settings', icon: Settings, href: '/settings' },
  { key: 'nav-help', label: 'Help & Support', icon: HelpCircle, href: '#' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, userRole, isAdmin } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Sign out failed');
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className="relative flex flex-col h-screen border-r transition-all duration-300 ease-in-out flex-shrink-0"
      style={{
        width: collapsed ? 64 : 240,
        background: 'linear-gradient(180deg, #071428 0%, #0B1A2E 50%, #071428 100%)',
        borderColor: 'rgba(56, 189, 248, 0.12)',
      }}
    >
      {/* Subtle grid background */}
      <div className="absolute inset-0 avi-grid-bg pointer-events-none opacity-60" />

      {/* Top horizon accent line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.5), transparent)' }} />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-4 py-5 overflow-hidden" style={{ borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
        <div className="flex-shrink-0 relative">
          <AppLogo size={32} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-400 avi-pulse-dot" style={{ width: 6, height: 6 }} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="font-bold text-white text-base tracking-tight whitespace-nowrap block" style={{ fontFamily: 'var(--font-sans)' }}>
              PassportReader
            </span>
            <span className="text-xs whitespace-nowrap" style={{ color: 'rgba(56,189,248,0.6)', letterSpacing: '0.1em', fontSize: 9 }}>
              ✈ AVIATION CONTROL
            </span>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[68px] z-10 w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-all duration-150 hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #0E2A4A, #0A3D6B)',
          border: '1px solid rgba(56,189,248,0.3)',
        }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight size={12} style={{ color: '#38BDF8' }} />
        ) : (
          <ChevronLeft size={12} style={{ color: '#38BDF8' }} />
        )}
      </button>

      {/* Nav Section */}
      <nav className="relative flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <p className="section-header px-4 mb-2 flex items-center gap-2">
            <span style={{ color: 'rgba(56,189,248,0.4)' }}>▸</span> Flight Deck
          </p>
        )}
        <ul className="space-y-0.5 px-2">
          {navItems?.map((item) => {
            const Icon = item?.icon;
            const isActive = pathname === item?.href;
            return (
              <li key={item?.key}>
                <Link
                  href={item?.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group ${
                    isActive
                      ? '' : ''
                  }`}
                  style={isActive ? {
                    background: 'rgba(56,189,248,0.1)',
                    color: '#38BDF8',
                    borderLeft: '2px solid #38BDF8',
                    boxShadow: '0 0 12px rgba(56,189,248,0.08) inset',
                  } : {
                    color: '#4A7FA5',
                    borderLeft: '2px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.05)';
                      (e.currentTarget as HTMLElement).style.color = '#A8C4E0';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = '';
                      (e.currentTarget as HTMLElement).style.color = '#4A7FA5';
                    }
                  }}
                >
                  <Icon size={17} className="flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium whitespace-nowrap flex-1">
                      {item?.label}
                    </span>
                  )}
                  {!collapsed && item?.badge && (
                    <span className="text-xs font-semibold rounded-full px-2 py-0.5 tabular-nums" style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8' }}>
                      {item?.badge}
                    </span>
                  )}
                  {collapsed && (
                    <span className="tooltip-label">{item?.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* System Section */}
        {!collapsed && (
          <p className="section-header px-4 mt-6 mb-2 flex items-center gap-2">
            <span style={{ color: 'rgba(56,189,248,0.4)' }}>▸</span> Systems
          </p>
        )}
        <ul className="space-y-0.5 px-2 mt-2">
          <li key="nav-security">
            <Link
              href="#"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group tooltip-wrapper"
              style={{ color: '#4A7FA5', borderLeft: '2px solid transparent' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.05)';
                (e.currentTarget as HTMLElement).style.color = '#A8C4E0';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = '';
                (e.currentTarget as HTMLElement).style.color = '#4A7FA5';
              }}
            >
              <Shield size={17} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">Compliance</span>
              )}
              {collapsed && (
                <span className="tooltip-label">Compliance</span>
              )}
            </Link>
          </li>
          <li key="nav-notif-prefs">
            <Link
              href="/notification-preferences"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group tooltip-wrapper"
              style={pathname === '/notification-preferences' ? {
                background: 'rgba(56,189,248,0.1)',
                color: '#38BDF8',
                borderLeft: '2px solid #38BDF8',
              } : { color: '#4A7FA5', borderLeft: '2px solid transparent' }}
              onMouseEnter={e => {
                if (pathname !== '/notification-preferences') {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.05)';
                  (e.currentTarget as HTMLElement).style.color = '#A8C4E0';
                }
              }}
              onMouseLeave={e => {
                if (pathname !== '/notification-preferences') {
                  (e.currentTarget as HTMLElement).style.background = '';
                  (e.currentTarget as HTMLElement).style.color = '#4A7FA5';
                }
              }}
            >
              <Bell size={17} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">Notification Prefs</span>
              )}
              {collapsed && (
                <span className="tooltip-label">Notification Preferences</span>
              )}
            </Link>
          </li>
          <li key="nav-notif-history">
            <Link
              href="/notification-history"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group tooltip-wrapper"
              style={pathname === '/notification-history' ? {
                background: 'rgba(56,189,248,0.1)',
                color: '#38BDF8',
                borderLeft: '2px solid #38BDF8',
              } : { color: '#4A7FA5', borderLeft: '2px solid transparent' }}
              onMouseEnter={e => {
                if (pathname !== '/notification-history') {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.05)';
                  (e.currentTarget as HTMLElement).style.color = '#A8C4E0';
                }
              }}
              onMouseLeave={e => {
                if (pathname !== '/notification-history') {
                  (e.currentTarget as HTMLElement).style.background = '';
                  (e.currentTarget as HTMLElement).style.color = '#4A7FA5';
                }
              }}
            >
              <History size={17} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">Notification History</span>
              )}
              {collapsed && (
                <span className="tooltip-label">Notification History</span>
              )}
            </Link>
          </li>
          <li key="nav-bulk-import">
            <Link
              href="/bulk-import"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group tooltip-wrapper"
              style={pathname === '/bulk-import' ? {
                background: 'rgba(56,189,248,0.1)',
                color: '#38BDF8',
                borderLeft: '2px solid #38BDF8',
              } : { color: '#4A7FA5', borderLeft: '2px solid transparent' }}
              onMouseEnter={e => {
                if (pathname !== '/bulk-import') {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.05)';
                  (e.currentTarget as HTMLElement).style.color = '#A8C4E0';
                }
              }}
              onMouseLeave={e => {
                if (pathname !== '/bulk-import') {
                  (e.currentTarget as HTMLElement).style.background = '';
                  (e.currentTarget as HTMLElement).style.color = '#4A7FA5';
                }
              }}
            >
              <Upload size={17} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">Bulk Import</span>
              )}
              {collapsed && (
                <span className="tooltip-label">Bulk Import</span>
              )}
            </Link>
          </li>
          <li key="nav-audit">
            <Link
              href="/audit-log"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group tooltip-wrapper"
              style={pathname === '/audit-log' ? {
                background: 'rgba(56,189,248,0.1)',
                color: '#38BDF8',
                borderLeft: '2px solid #38BDF8',
              } : { color: '#4A7FA5', borderLeft: '2px solid transparent' }}
              onMouseEnter={e => {
                if (pathname !== '/audit-log') {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.05)';
                  (e.currentTarget as HTMLElement).style.color = '#A8C4E0';
                }
              }}
              onMouseLeave={e => {
                if (pathname !== '/audit-log') {
                  (e.currentTarget as HTMLElement).style.background = '';
                  (e.currentTarget as HTMLElement).style.color = '#4A7FA5';
                }
              }}
            >
              <ClipboardList size={17} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">Audit Log</span>
              )}
              {collapsed && (
                <span className="tooltip-label">Audit Log</span>
              )}
            </Link>
          </li>
          {isAdmin && (
            <li key="nav-user-mgmt">
              <Link
                href="/user-management"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group tooltip-wrapper"
                style={pathname === '/user-management' ? {
                  background: 'rgba(56,189,248,0.1)',
                  color: '#38BDF8',
                  borderLeft: '2px solid #38BDF8',
                } : { color: '#4A7FA5', borderLeft: '2px solid transparent' }}
                onMouseEnter={e => {
                  if (pathname !== '/user-management') {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.05)';
                    (e.currentTarget as HTMLElement).style.color = '#A8C4E0';
                  }
                }}
                onMouseLeave={e => {
                  if (pathname !== '/user-management') {
                    (e.currentTarget as HTMLElement).style.background = '';
                    (e.currentTarget as HTMLElement).style.color = '#4A7FA5';
                  }
                }}
              >
                <Users size={17} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">User Management</span>
                )}
                {collapsed && (
                  <span className="tooltip-label">User Management</span>
                )}
              </Link>
            </li>
          )}
        </ul>

        {/* Bottom nav items */}
        {!collapsed && (
          <div className="avi-horizon-line mx-4 mt-6 mb-4" />
        )}
        {collapsed && <div className="mt-4" />}
        <ul className="space-y-0.5 px-2">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group tooltip-wrapper"
                  style={isActive ? {
                    background: 'rgba(56,189,248,0.1)',
                    color: '#38BDF8',
                    borderLeft: '2px solid #38BDF8',
                  } : { color: '#4A7FA5', borderLeft: '2px solid transparent' }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.05)';
                      (e.currentTarget as HTMLElement).style.color = '#A8C4E0';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = '';
                      (e.currentTarget as HTMLElement).style.color = '#4A7FA5';
                    }
                  }}
                >
                  <Icon size={17} className="flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                  {collapsed && (
                    <span className="tooltip-label">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile Footer */}
      <div className="relative px-3 py-3" style={{ borderTop: '1px solid rgba(56,189,248,0.1)' }}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, #0E2A4A, #0A3D6B)',
              border: '1px solid rgba(56,189,248,0.3)',
              color: '#38BDF8',
            }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs truncate" style={{ color: '#2A5A80' }}>{displayEmail}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="flex-shrink-0 p-1.5 rounded-md transition-all duration-150"
              style={{ color: '#2A5A80' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = '#F87171';
                (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = '#2A5A80';
                (e.currentTarget as HTMLElement).style.background = '';
              }}
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.3), transparent)' }} />
    </aside>
  );
}