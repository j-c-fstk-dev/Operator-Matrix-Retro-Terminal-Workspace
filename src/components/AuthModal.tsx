import React, { useEffect, useState } from 'react';
import { X, Lock, Mail, Key, ShieldCheck, Cloud, LogOut, CheckCircle, AlertTriangle, ArrowRight, Database, Terminal } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sound } from '../utils/audio';
import { useT } from '../i18n';
import { Rich } from '../i18n/Rich';
import { User } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSyncLocalToCloud: () => Promise<void>;
  onShowToast: (msg: string) => void;
  localProjectsCount: number;
  /** true quando a pessoa voltou pelo link de "esqueci minha senha". */
  isPasswordRecovery?: boolean;
  onPasswordRecoveryDone?: () => void;
  /** Motivo de um link de e-mail inválido ou expirado, mostrado no topo. */
  linkError?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onSyncLocalToCloud,
  onShowToast,
  localProjectsCount,
  isPasswordRecovery = false,
  onPasswordRecoveryDone,
  linkError,
}) => {
  const t = useT();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState<'form' | 'forgot'>('form');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Ao fechar, volta para o formulário de login.
  useEffect(() => {
    if (!isOpen) {
      setView('form');
      setInfoMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage(t.auth.notConfigured);
      return;
    }

    if (!email || !password) {
      setErrorMessage(t.auth.fillFields);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        sound.playCommand();
        onShowToast(t.auth.signedIn(data.user?.email ?? ''));
        onClose();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        sound.playCommand();
        if (data.session) {
          onShowToast(t.auth.created);
          onClose();
        } else {
          onShowToast(t.auth.checkEmail);
          setTab('login');
        }
      }
    } catch (err: any) {
      sound.playClick(300);
      setErrorMessage(err.message || t.auth.failed);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage(t.auth.notConfigured);
      return;
    }
    if (!email.trim()) {
      setErrorMessage(t.auth.emailRequired);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      // O link do e-mail volta para esta mesma origem; o App detecta a recuperação e reabre este modal.
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      sound.playCommand();
      setInfoMessage(t.auth.forgotSent(email.trim()));
    } catch (err: any) {
      sound.playClick(300);
      setErrorMessage(err.message || t.auth.forgotFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (newPassword.length < 6) {
      setErrorMessage(t.auth.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage(t.auth.passwordMismatch);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      sound.playCommand();
      setNewPassword('');
      setConfirmPassword('');
      onShowToast(t.auth.resetDone);
      onPasswordRecoveryDone?.();
      onClose();
    } catch (err: any) {
      sound.playClick(300);
      setErrorMessage(err.message || t.auth.resetFailed);
    } finally {
      setLoading(false);
    }
  };

  const showView = (next: 'form' | 'forgot') => {
    setView(next);
    setErrorMessage(null);
    setInfoMessage(null);
    sound.playClick(600);
  };

  const labelClass = 'text-[10px] text-[color:var(--t-21a04d)] uppercase tracking-wider flex items-center gap-1';
  const fieldClass = 'flex items-center gap-2 bg-[color:var(--t-020502)] border border-[color:var(--t-14351a)] px-2.5 py-1.5 focus-within:border-[color:var(--t-22c55e)]';
  const inputClass = 'w-full bg-transparent text-xs font-mono text-[color:var(--t-86efac)] placeholder-[color:var(--t-21a04d)] focus:outline-hidden';
  const submitClass = 'w-full py-2.5 px-3 bg-[color:var(--t-0a2612)] hover:bg-[color:var(--t-0e3318)] border border-[color:var(--t-22c55e)] text-xs font-bold text-[color:var(--t-22c55e)] hover:text-white flex items-center justify-center gap-2 shadow-[0_0_10px_color-mix(in_srgb,var(--t-22c55e)_20%,transparent)] transition-all cursor-pointer';
  const errorBox = errorMessage && (
    <div className="p-2 bg-[#170808] border border-red-800 text-red-400 text-[11px] leading-tight" role="alert">
      {errorMessage}
    </div>
  );

  const handleLogout = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase.auth.signOut();
      sound.playClick(500);
      onShowToast(t.auth.signedOut);
      onClose();
    } catch (err: any) {
      onShowToast(t.auth.signOutFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage(t.auth.notConfigured);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      sound.playClick(300);
      setErrorMessage(err.message || t.auth.googleFailed);
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await onSyncLocalToCloud();
      sound.playCommand();
    } catch {
      // Toast already shown in handler
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-xs font-mono text-xs text-[color:var(--t-86efac)]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[color:var(--t-040a05)] border border-[color:var(--t-22c55e)] shadow-[0_0_35px_color-mix(in_srgb,var(--t-00ff66)_25%,transparent)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[color:var(--t-08180c)] border-b border-[color:var(--t-14351a)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[color:var(--t-22c55e)] animate-pulse shadow-[0_0_8px_var(--t-22c55e)]"></span>
            <span className="font-bold text-[color:var(--t-22c55e)] tracking-wider text-xs">
              {t.auth.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[color:var(--t-21a04d)] hover:text-[color:var(--t-22c55e)] p-1"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {linkError && (
            <div className="p-2.5 bg-[#120803] border border-amber-600/90 text-amber-400 text-[11px] leading-snug flex items-start gap-1.5" role="alert">
              <AlertTriangle size={13} className="shrink-0 mt-px" />
              <span>{linkError}</span>
            </div>
          )}
          {user && isPasswordRecovery ? (
            /* Voltou pelo link de recuperação: define a senha nova */
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[color:var(--t-22c55e)]">
                <Lock size={13} />
                <span>{t.auth.resetTitle}</span>
              </div>
              <p className="text-[11px] text-[color:var(--t-86efac)]/80 leading-relaxed">{t.auth.resetBody}</p>
              <div className="text-[10px] text-[color:var(--t-21a04d)] truncate">
                {t.auth.operator} <strong className="text-white">{user.email}</strong>
              </div>
              <div className="space-y-1">
                <label htmlFor="auth-new-password" className={labelClass}>
                  <Key size={11} />
                  <span>{t.auth.newPasswordLabel}</span>
                </label>
                <div className={fieldClass}>
                  <span className="text-[color:var(--t-21a04d)]">&gt;</span>
                  <input
                    id="auth-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="auth-confirm-password" className={labelClass}>
                  <Key size={11} />
                  <span>{t.auth.confirmPasswordLabel}</span>
                </label>
                <div className={fieldClass}>
                  <span className="text-[color:var(--t-21a04d)]">&gt;</span>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className={inputClass}
                  />
                </div>
              </div>
              {errorBox}
              <button type="submit" disabled={loading} className={submitClass}>
                <CheckCircle size={13} />
                <span>{loading ? t.auth.processing : t.auth.resetSubmit}</span>
              </button>
            </form>
          ) : user ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="bg-[color:var(--t-061509)] border border-[color:var(--t-14351a)] p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-[color:var(--t-0f2a13)] pb-1.5 text-[11px] text-[color:var(--t-22c55e)] font-bold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    <span>{t.auth.sessionActive}</span>
                  </span>
                  <span className="text-[10px] text-[color:var(--t-16a34a)]">ONLINE</span>
                </div>
                <div className="text-xs text-[color:var(--t-86efac)] truncate pt-1">
                  {t.auth.operator} <strong className="text-white">{user.email}</strong>
                </div>
                <div className="text-[10px] text-[color:var(--t-21a04d)]">
                  {t.auth.syncingNote}
                </div>
              </div>

              {/* Sync button */}
              <div className="bg-[color:var(--t-030804)] border border-[color:var(--t-0e2513)] p-3 space-y-2">
                <div className="text-[11px] font-bold text-[color:var(--t-22c55e)] flex items-center gap-1.5">
                  <Cloud size={13} />
                  <span>{t.auth.syncTitle}</span>
                </div>
                <p className="text-[10px] text-[color:var(--t-21a04d)] leading-relaxed">
                  {t.auth.syncBody(localProjectsCount)}
                </p>
                <button
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="w-full py-2 px-3 bg-[color:var(--t-0a2310)] hover:bg-[color:var(--t-0e2f16)] border border-[color:var(--t-22c55e)] text-xs font-bold text-[color:var(--t-22c55e)] hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Database size={13} />
                  <span>{syncing ? t.auth.syncing : t.auth.syncButton}</span>
                </button>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full py-2 px-3 bg-[#130707] hover:bg-[#200c0c] border border-red-800 text-xs font-bold text-red-400 hover:text-red-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>{t.auth.signOut}</span>
              </button>
            </div>
          ) : view === 'forgot' ? (
            /* Esqueci minha senha: pede o e-mail e envia o link */
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[color:var(--t-22c55e)]">
                <Lock size={13} />
                <span>{t.auth.forgotTitle}</span>
              </div>
              <p className="text-[11px] text-[color:var(--t-86efac)]/80 leading-relaxed">{t.auth.forgotBody}</p>
              <div className="space-y-1">
                <label htmlFor="auth-forgot-email" className={labelClass}>
                  <Mail size={11} />
                  <span>{t.auth.emailLabel}</span>
                </label>
                <div className={fieldClass}>
                  <span className="text-[color:var(--t-21a04d)]">&gt;</span>
                  <input
                    id="auth-forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    required
                    autoFocus
                    className={inputClass}
                  />
                </div>
              </div>
              {errorBox}
              {infoMessage && (
                <div className="p-2 bg-[color:var(--t-061509)] border border-[color:var(--t-22c55e)] text-[color:var(--t-86efac)] text-[11px] leading-snug" role="status">
                  {infoMessage}
                </div>
              )}
              <button type="submit" disabled={loading} className={submitClass}>
                <ArrowRight size={13} />
                <span>{loading ? t.auth.processing : t.auth.forgotSubmit}</span>
              </button>
              <div className="pt-2 border-t border-[color:var(--t-0e2513)] text-center">
                <button
                  type="button"
                  onClick={() => showView('form')}
                  className="text-[11px] text-[color:var(--t-21a04d)] hover:text-[color:var(--t-86efac)] transition-colors"
                >
                  {t.auth.backToLogin}
                </button>
              </div>
            </form>
          ) : (
            /* Logged out state */
            <div className="space-y-4">
              {!isSupabaseConfigured && (
                <div className="bg-[#120904] border border-amber-800/80 p-3 text-[11px] text-amber-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <AlertTriangle size={13} />
                    <span>{t.auth.keysMissing}</span>
                  </div>
                  <p className="text-[10px] text-amber-200/80 leading-relaxed">
                    <Rich text={t.auth.keysBody} slots={{ url: <code className="text-amber-300">VITE_SUPABASE_URL</code>, key: <code className="text-amber-300">VITE_SUPABASE_ANON_KEY</code>, env: <code>.env</code> }} />
                  </p>
                  <p className="text-[10px] text-[color:var(--t-22c55e)] font-bold">
                    {t.auth.localStillWorks}
                  </p>
                </div>
              )}

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-2.5 px-3 bg-[color:var(--t-030d05)] hover:bg-[color:var(--t-071c0c)] border border-[color:var(--t-1b6b33)] hover:border-[color:var(--t-22c55e)] text-xs font-bold text-[color:var(--t-86efac)] hover:text-white flex items-center justify-center gap-2.5 transition-all shadow-[0_0_10px_color-mix(in_srgb,var(--t-22c55e)_15%,transparent)] cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current text-[color:var(--t-22c55e)]" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
                </svg>
                <span>{t.auth.google}</span>
              </button>

              <div className="flex items-center gap-2 text-[10px] text-[color:var(--t-21a04d)]">
                <div className="flex-1 h-px bg-[color:var(--t-14351a)]"></div>
                <span>{t.auth.or}</span>
                <div className="flex-1 h-px bg-[color:var(--t-14351a)]"></div>
              </div>

              {/* Login / Register tabs */}
              <div className="flex border border-[color:var(--t-14351a)] bg-[color:var(--t-020603)]">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMessage(null);
                    sound.playClick(600);
                  }}
                  className={`flex-1 py-1.5 text-center text-xs font-bold transition-colors ${
                    tab === 'login'
                      ? 'bg-[color:var(--t-0b2411)] text-[color:var(--t-22c55e)] border-b-2 border-[color:var(--t-22c55e)]'
                      : 'text-[color:var(--t-21a04d)] hover:text-[color:var(--t-86efac)]'
                  }`}
                >
                  {t.auth.tabLogin}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorMessage(null);
                    sound.playClick(600);
                  }}
                  className={`flex-1 py-1.5 text-center text-xs font-bold transition-colors ${
                    tab === 'register'
                      ? 'bg-[color:var(--t-0b2411)] text-[color:var(--t-22c55e)] border-b-2 border-[color:var(--t-22c55e)]'
                      : 'text-[color:var(--t-21a04d)] hover:text-[color:var(--t-86efac)]'
                  }`}
                >
                  {t.auth.tabRegister}
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAuth} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[color:var(--t-21a04d)] uppercase tracking-wider flex items-center gap-1">
                    <Mail size={11} />
                    <span>{t.auth.emailLabel}</span>
                  </label>
                  <div className="flex items-center gap-2 bg-[color:var(--t-020502)] border border-[color:var(--t-14351a)] px-2.5 py-1.5 focus-within:border-[color:var(--t-22c55e)]">
                    <span className="text-[color:var(--t-21a04d)]">&gt;</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.auth.emailPlaceholder}
                      required
                      className="w-full bg-transparent text-xs font-mono text-[color:var(--t-86efac)] placeholder-[color:var(--t-21a04d)] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[color:var(--t-21a04d)] uppercase tracking-wider flex items-center gap-1">
                    <Key size={11} />
                    <span>{t.auth.passwordLabel}</span>
                  </label>
                  <div className="flex items-center gap-2 bg-[color:var(--t-020502)] border border-[color:var(--t-14351a)] px-2.5 py-1.5 focus-within:border-[color:var(--t-22c55e)]">
                    <span className="text-[color:var(--t-21a04d)]">&gt;</span>
                    <input
                      type="password"
                      autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      minLength={6}
                      className="w-full bg-transparent text-xs font-mono text-[color:var(--t-86efac)] placeholder-[color:var(--t-21a04d)] focus:outline-hidden"
                    />
                  </div>
                </div>

                {tab === 'login' && (
                  <div className="text-right -mt-1">
                    <button
                      type="button"
                      onClick={() => showView('forgot')}
                      className="text-[11px] text-[color:var(--t-4ade80)] hover:text-white underline underline-offset-2"
                    >
                      {t.auth.forgotLink}
                    </button>
                  </div>
                )}

                {errorBox}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-3 bg-[color:var(--t-0a2612)] hover:bg-[color:var(--t-0e3318)] border border-[color:var(--t-22c55e)] text-xs font-bold text-[color:var(--t-22c55e)] hover:text-white flex items-center justify-center gap-2 shadow-[0_0_10px_color-mix(in_srgb,var(--t-22c55e)_20%,transparent)] transition-all cursor-pointer"
                >
                  <Terminal size={13} />
                  <span>
                    {loading ? t.auth.processing : tab === 'login' ? t.auth.submitLogin : t.auth.submitRegister}
                  </span>
                </button>
              </form>

              <div className="pt-2 border-t border-[color:var(--t-0e2513)] text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[11px] text-[color:var(--t-21a04d)] hover:text-[color:var(--t-86efac)] transition-colors"
                >
                  {t.auth.continueLocal}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[color:var(--t-020502)] border-t border-[color:var(--t-14351a)] flex items-center justify-between text-[10px] text-[color:var(--t-21a04d)] shrink-0">
          <span>OPERATOR AUTH // SUPABASE POSTGRES</span>
          <button
            onClick={onClose}
            className="text-[color:var(--t-22c55e)] hover:underline"
          >
            {t.common.closeTag}
          </button>
        </div>
      </div>
    </div>
  );
};
