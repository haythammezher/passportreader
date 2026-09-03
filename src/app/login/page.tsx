'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, ScanLine, Shield, Lock, Mail, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      toast.error('Sign in failed', { description: message });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@passportreader.com');
    setPassword('demo1234');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #071428 0%, #0B1A2E 50%, #071428 100%)' }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Glow orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.05) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(14,165,233,0.08))',
              border: '1px solid rgba(56,189,248,0.25)',
              boxShadow: '0 0 32px rgba(56,189,248,0.12)',
            }}
          >
            <ScanLine size={28} style={{ color: '#38BDF8' }} />
            <span
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
              style={{ background: '#38BDF8', boxShadow: '0 0 8px rgba(56,189,248,0.8)' }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PassportReader</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(56,189,248,0.6)', letterSpacing: '0.12em', fontSize: 10 }}>
            ✈ AVIATION CONTROL SYSTEM
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7 space-y-5"
          style={{
            background: 'linear-gradient(135deg, rgba(11,26,46,0.95), rgba(7,20,40,0.98))',
            border: '1px solid rgba(56,189,248,0.15)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.05)',
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-8 right-8 h-px rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.4), transparent)' }}
          />

          <div className="mb-1">
            <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Enter your credentials to access the system</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(168,196,224,0.8)' }}>
                Email address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pl-9"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: 'rgba(168,196,224,0.8)' }}>
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs hover:underline" style={{ color: '#38BDF8' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-9 pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{
                background: loading ? 'rgba(56,189,248,0.3)' : 'linear-gradient(135deg, #0EA5E9, #38BDF8)',
                color: '#fff',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(56,189,248,0.3)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Authenticating…
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Sign In
                  <ChevronRight size={15} className="ml-auto" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div
            className="rounded-xl p-3.5"
            style={{
              background: 'rgba(56,189,248,0.05)',
              border: '1px solid rgba(56,189,248,0.12)',
            }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(56,189,248,0.7)' }}>
              Demo credentials
            </p>
            <div className="font-mono text-xs space-y-0.5" style={{ color: 'rgba(168,196,224,0.7)' }}>
              <p>Email: demo@passportreader.com</p>
              <p>Password: demo1234</p>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className="mt-2 text-xs hover:underline flex items-center gap-1"
              style={{ color: '#38BDF8' }}
            >
              Fill demo credentials <ChevronRight size={11} />
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium hover:underline" style={{ color: '#38BDF8' }}>
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
