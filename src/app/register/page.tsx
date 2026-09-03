'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserPlus, Eye, EyeOff, Loader2, ScanLine, MailCheck } from 'lucide-react';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const data = await signUp(email, password, { fullName });
      // If identities is empty, email confirmation is required
      if (data?.user && !data.user.email_confirmed_at) {
        setVerificationSent(true);
      } else {
        toast.success('Account created! You are now signed in.');
        window.location.href = '/';
      }
    } catch (err: any) {
      toast.error('Registration failed', { description: err?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-3">
              <ScanLine size={24} className="text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">PassportReader</h1>
          </div>
          <div className="card-surface p-8 flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <MailCheck size={32} className="text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Verify your email</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                We sent a confirmation link to{' '}
                <span className="font-medium text-foreground">{email}</span>.
                <br />
                Click the link in that email to activate your account.
              </p>
            </div>
            <div className="w-full border border-border rounded-lg p-3 bg-primary/5 text-left">
              <p className="text-xs text-muted-foreground font-medium mb-1">Didn&apos;t receive it?</p>
              <p className="text-xs text-muted-foreground">Check your spam/junk folder. The link expires in 24 hours.</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Already confirmed?{' '}
              <Link href="/login" className="text-accent hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-3">
            <ScanLine size={24} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">PassportReader</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your account</p>
        </div>

        {/* Card */}
        <div className="card-surface p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
                placeholder="Ahmed Al-Omari"
                autoComplete="name"
                disabled={loading}
              />
            </div>
            <div>
              <label className="form-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-10"
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
