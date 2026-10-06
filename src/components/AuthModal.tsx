import React, { useState } from 'react';
import { X, Lock, Mail, Key, ShieldCheck, Cloud, LogOut, CheckCircle, AlertTriangle, ArrowRight, Database, Terminal } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sound } from '../utils/audio';
import { User } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSyncLocalToCloud: () => Promise<void>;
  onShowToast: (msg: string) => void;
  localProjectsCount: number;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onSyncLocalToCloud,
  onShowToast,
  localProjectsCount,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage('Supabase ainda não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      return;
    }

    if (!email || !password) {
      setErrorMessage('Por favor, preencha e-mail e senha.');
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
        onShowToast(`Autenticado com sucesso: ${data.user?.email}`);
        onClose();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        sound.playCommand();
        if (data.session) {
          onShowToast(`Conta criada e autenticada com sucesso!`);
          onClose();
        } else {
          onShowToast(`Conta criada! Verifique o e-mail de confirmação.`);
          setTab('login');
        }
      }
    } catch (err: any) {
      sound.playClick(300);
      setErrorMessage(err.message || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase.auth.signOut();
      sound.playClick(500);
      onShowToast('Sessão encerrada. Operando em modo Local.');
      onClose();
    } catch (err: any) {
      onShowToast('Erro ao encerrar sessão.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage('Supabase ainda não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
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
      setErrorMessage(err.message || 'Falha ao autenticar com o Google.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-xs font-mono text-xs text-[#86efac]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#040a05] border border-[#22c55e] shadow-[0_0_35px_rgba(0,255,102,0.25)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#08180c] border-b border-[#14351a] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e]"></span>
            <span className="font-bold text-[#22c55e] tracking-wider text-xs">
              OPERATOR // CONTROLE DE ACESSO & NUVEM
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#15803d] hover:text-[#22c55e] p-1"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {user ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="bg-[#061509] border border-[#14351a] p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-[#0f2a13] pb-1.5 text-[11px] text-[#22c55e] font-bold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    <span>SESSÃO AUTENTICADA</span>
                  </span>
                  <span className="text-[10px] text-[#16a34a]">ONLINE</span>
                </div>
                <div className="text-xs text-[#86efac] truncate pt-1">
                  Operador: <strong className="text-white">{user.email}</strong>
                </div>
                <div className="text-[10px] text-[#15803d]">
                  Seus projetos estão sendo sincronizados no banco de dados Supabase na nuvem.
                </div>
              </div>

              {/* Sync button */}
              <div className="bg-[#030804] border border-[#0e2513] p-3 space-y-2">
                <div className="text-[11px] font-bold text-[#22c55e] flex items-center gap-1.5">
                  <Cloud size={13} />
                  <span>Sincronização de Dados</span>
                </div>
                <p className="text-[10px] text-[#15803d] leading-relaxed">
                  Tens {localProjectsCount} projeto(s) carregados localmente. Deseja forçar o envio de todos para a sua conta na nuvem?
                </p>
                <button
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="w-full py-2 px-3 bg-[#0a2310] hover:bg-[#0e2f16] border border-[#22c55e] text-xs font-bold text-[#22c55e] hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Database size={13} />
                  <span>{syncing ? 'SINCRONIZANDO...' : 'ENVIAR PROJETOS PARA SUPABASE'}</span>
                </button>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full py-2 px-3 bg-[#130707] hover:bg-[#200c0c] border border-red-800 text-xs font-bold text-red-400 hover:text-red-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>ENCERRAR SESSÃO (MODO LOCAL)</span>
              </button>
            </div>
          ) : (
            /* Logged out state */
            <div className="space-y-4">
              {!isSupabaseConfigured && (
                <div className="bg-[#120904] border border-amber-800/80 p-3 text-[11px] text-amber-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <AlertTriangle size={13} />
                    <span>CHAVES DO SUPABASE PENDENTES</span>
                  </div>
                  <p className="text-[10px] text-amber-200/80 leading-relaxed">
                    Para habilitar o login e o banco de dados na nuvem, adicione <code className="text-amber-300">VITE_SUPABASE_URL</code> e <code className="text-amber-300">VITE_SUPABASE_ANON_KEY</code> no seu arquivo <code>.env</code> ou nas variáveis de ambiente do seu <strong>Netlify</strong>.
                  </p>
                  <p className="text-[10px] text-[#22c55e] font-bold">
                    O aplicativo continua funcionando 100% no Modo Local (offline) normalmente!
                  </p>
                </div>
              )}

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-2.5 px-3 bg-[#030d05] hover:bg-[#071c0c] border border-[#1b6b33] hover:border-[#22c55e] text-xs font-bold text-[#86efac] hover:text-white flex items-center justify-center gap-2.5 transition-all shadow-[0_0_10px_rgba(34,197,94,0.15)] cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current text-[#22c55e]" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
                </svg>
                <span>CONTINUAR COM GOOGLE (OAUTH)</span>
              </button>

              <div className="flex items-center gap-2 text-[10px] text-[#15803d]">
                <div className="flex-1 h-px bg-[#14351a]"></div>
                <span>OU ACESSO DIRETO VIA TERMINAL</span>
                <div className="flex-1 h-px bg-[#14351a]"></div>
              </div>

              {/* Login / Register tabs */}
              <div className="flex border border-[#14351a] bg-[#020603]">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMessage(null);
                    sound.playClick(600);
                  }}
                  className={`flex-1 py-1.5 text-center text-xs font-bold transition-colors ${
                    tab === 'login'
                      ? 'bg-[#0b2411] text-[#22c55e] border-b-2 border-[#22c55e]'
                      : 'text-[#15803d] hover:text-[#86efac]'
                  }`}
                >
                  [ ENTRAR / LOGIN ]
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
                      ? 'bg-[#0b2411] text-[#22c55e] border-b-2 border-[#22c55e]'
                      : 'text-[#15803d] hover:text-[#86efac]'
                  }`}
                >
                  [ CRIAR CONTA ]
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAuth} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#15803d] uppercase tracking-wider flex items-center gap-1">
                    <Mail size={11} />
                    <span>E-mail do Operador</span>
                  </label>
                  <div className="flex items-center gap-2 bg-[#020502] border border-[#14351a] px-2.5 py-1.5 focus-within:border-[#22c55e]">
                    <span className="text-[#15803d]">&gt;</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@dominio.com"
                      required
                      className="w-full bg-transparent text-xs font-mono text-[#86efac] placeholder-[#15803d] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#15803d] uppercase tracking-wider flex items-center gap-1">
                    <Key size={11} />
                    <span>Chave de Acesso / Senha</span>
                  </label>
                  <div className="flex items-center gap-2 bg-[#020502] border border-[#14351a] px-2.5 py-1.5 focus-within:border-[#22c55e]">
                    <span className="text-[#15803d]">&gt;</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      minLength={6}
                      className="w-full bg-transparent text-xs font-mono text-[#86efac] placeholder-[#15803d] focus:outline-hidden"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-2 bg-[#170808] border border-red-800 text-red-400 text-[11px] leading-tight">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-3 bg-[#0a2612] hover:bg-[#0e3318] border border-[#22c55e] text-xs font-bold text-[#22c55e] hover:text-white flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(34,197,94,0.2)] transition-all cursor-pointer"
                >
                  <Terminal size={13} />
                  <span>
                    {loading
                      ? 'PROCESSANDO...'
                      : tab === 'login'
                      ? 'AUTENTICAR NO TERMINAL'
                      : 'REGISTRAR NOVO OPERADOR'}
                  </span>
                </button>
              </form>

              <div className="pt-2 border-t border-[#0e2513] text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[11px] text-[#15803d] hover:text-[#86efac] transition-colors"
                >
                  [ Continuar no Modo Local / Offline ]
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#020502] border-t border-[#14351a] flex items-center justify-between text-[10px] text-[#15803d] shrink-0">
          <span>OPERATOR AUTH // SUPABASE POSTGRES</span>
          <button
            onClick={onClose}
            className="text-[#22c55e] hover:underline"
          >
            [FECHAR]
          </button>
        </div>
      </div>
    </div>
  );
};
