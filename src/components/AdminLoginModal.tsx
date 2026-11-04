import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2, 
  X, 
  KeyRound, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { api } from '../services/apiClient.ts';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<{
    username: string;
    hasCustomPasswordEnv: boolean;
    defaultDemoHint?: string;
  } | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Fetch configured auth status once when opened
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPassword('');
      api.getAuthStatus()
        .then((res) => {
          if (res.data) {
            setAuthStatus(res.data);
            if (res.data.username) {
              setUsername(res.data.username);
            }
          }
        })
        .catch(() => {
          // If status fetch fails, fallback to defaults
        });

      // Auto-focus password
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(username.trim(), password);
      onLoginSuccess(res.user?.username || username.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    const demoUser = authStatus?.username || 'admin';
    const demoPass = authStatus?.defaultDemoHint || 'Admin@EduPulse2026!';
    setUsername(demoUser);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div 
        className="w-full max-w-md rounded-2xl border border-[#DCE6F2] bg-white p-6 shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-auth-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#DCE6F2]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#123B73] text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="admin-auth-title" className="text-base font-bold text-[#123B73]">
                Administrator Authentication
              </h2>
              <p className="text-xs text-[#64748B]">
                EduPulse Course Analytics System
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F5F8FF] hover:text-[#172B4D] transition-colors"
            title="Close login modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-4 rounded-lg bg-[#F5F8FF] p-3 border border-[#DCE6F2] text-xs text-[#172B4D]">
          <div className="flex items-center gap-1.5 font-semibold text-[#123B73] mb-1">
            <Lock className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>Protected Administrative Access</span>
          </div>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            Administrator authentication is enforced by the backend server. Unauthenticated users cannot create courses, alter curriculum lessons, change enrolment statuses, or seed data.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-3.5 flex items-start gap-2.5 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Administrator Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder="e.g. admin"
              className="w-full rounded-lg border border-[#DCE6F2] bg-white px-3 py-2 text-xs text-[#172B4D] placeholder-[#64748B] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:bg-[#F5F8FF]"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Administrator Password
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Enter password"
                className="w-full rounded-lg border border-[#DCE6F2] bg-white px-3 py-2 pr-9 text-xs text-[#172B4D] placeholder-[#64748B] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:bg-[#F5F8FF]"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-[#172B4D]"
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Configuration Hint Banner */}
          <div className="rounded-lg border border-dashed border-[#DCE6F2] bg-[#FAFCFF] p-3 text-[11px] text-[#64748B]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#172B4D] flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5 text-[#2563EB]" />
                Password Configuration:
              </span>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] hover:underline"
              >
                <Sparkles className="h-3 w-3" />
                Fill Demo Credentials
              </button>
            </div>
            <p className="mt-1 text-[10px] text-[#64748B]">
              {authStatus?.hasCustomPasswordEnv ? (
                <span>Custom password configured via <code className="bg-[#EBF2FC] text-[#123B73] px-1 rounded">ADMIN_PASSWORD</code> environment variable.</span>
              ) : (
                <span>Default credentials: <code className="bg-[#EBF2FC] text-[#123B73] px-1 rounded font-mono font-bold">admin</code> / <code className="bg-[#EBF2FC] text-[#123B73] px-1 rounded font-mono font-bold">Admin@EduPulse2026!</code></span>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-[#DCE6F2] bg-white px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:bg-[#F5F8FF] hover:text-[#172B4D] transition-colors"
            >
              Cancel (Stay Analyst)
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#123B73] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0E2D58] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Authenticate & Unlock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
