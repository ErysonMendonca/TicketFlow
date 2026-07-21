import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  User as UserIcon,
  Code2,
  Search,
  X,
  Paperclip,
  Trash2,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  Lock,
  Mail,
  LayoutDashboard,
  Clock,
  Edit3,
  Calendar,
  CheckSquare,
  AlertCircle,
  PlayCircle,
  Activity,
  BarChart3,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Users,
  UserCircle,
  CheckCircle,
  Layers,
  Pencil,
  UserPlus,
  AlignLeft,
  History,
  Tag,
  MessageSquare,
  MoreHorizontal,
  RefreshCw,
  ArrowUpDown,
  Link2,
  Share2,
  Settings,
  PlusCircle,
  LogIn,
  Eye,
  EyeOff,
  Image as ImageIcon
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { api } from './lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { PLATFORMS, DEV_STATUS, URGENCY_LEVELS, URGENCIA_MAXIMA, OTHER_STATUS, MOCK_USERS, TICKET_TYPES, ROLES, ROLE_LABELS, ROLE_COLORS, isManager, BOARD_ROLES } from './constants';
import { canSeeTicket, seVePorOrigem, colaboradoresDoSetor, podeAtribuir, isColaboradorDoSetor, leadSetorIds, leadSystemIds, noSetor, afiliadosDe, responsaveisDe, userSetorIds, userSystemIds } from './lib/visibility';
import { io } from 'socket.io-client';

// WebSocket: em produção conecta no mesmo domínio (proxy Nginx → servidor de socket);
// em dev, aponta pro servidor local via NEXT_PUBLIC_SOCKET_URL (ex.: http://localhost:3001).
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || undefined, {
  path: '/socket.io/',
  transports: ['websocket', 'polling'], // WS primeiro → conecta mais rápido; cai pra polling se preciso
  upgrade: true
});

// --- Utilitários de Áudio (Premium) ---
const playSound = (type) => {
  const sounds = {
    success: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
    error: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    notification: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    open: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
    close: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'
  };
  const audio = new Audio(sounds[type]);
  audio.volume = (type === 'click' || type === 'close') ? 0.2 : 0.4;
  audio.play().catch(() => {}); // Ignora erro se o navegador bloquear autoplay
};

// --- Utilitários ---
const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

const getStorageTickets = () => {
  const saved = localStorage.getItem('tickets');
  return saved ? JSON.parse(saved) : [];
};

const saveTickets = (tickets) => {
  localStorage.setItem('tickets', JSON.stringify(tickets));
};

const getStorageTheme = () => localStorage.getItem('theme') || 'light';
const getStorageUser = () => {
  try {
    if (!localStorage.getItem('sessionToken')) return null; // sem token de sessão → precisa logar
    const saved = localStorage.getItem('currentUser');
    if (!saved || saved === 'undefined') return null;
    return JSON.parse(saved);
  } catch (e) {
    localStorage.removeItem('currentUser');
    return null;
  }
};

// --- Componentes Menores ---
// Resolve nome/cor de um status — inclui as COLUNAS PERSONALIZADAS (id 'col_...') guardadas em setores/systems.
// Sem isso, um ticket numa coluna custom mostra o id cru (ex.: col_1784162228423) no lugar do nome.
function statusInfo(id, setores = [], systems = []) {
  const base = [...DEV_STATUS, ...OTHER_STATUS].find(s => s.id === id);
  if (base) return { name: base.name, color: base.color };
  for (const owner of [...setores, ...systems]) {
    const c = (Array.isArray(owner.colunas) ? owner.colunas : []).find(col => col.id === id);
    if (c) return { name: c.name, color: c.color };
  }
  return { name: id, color: null };
}

// Enquanto o ticket está em 'backlog' (não aceito), NÃO revela quem está com a demanda — só após alguém aceitar.
function donoVisivel(t) {
  return (t && t.status && t.status !== 'backlog') ? (t.responsible || null) : null;
}

// Ícone da marca WhatsApp (lucide não tem) — SVG inline.
const WhatsAppIcon = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Tempo relativo em pt-BR: "agora", "há 3 min", "há 2 h", "há 5 dias".
function tempoRelativo(d) {
  if (!d) return null;
  const diff = Math.max(0, Date.now() - new Date(d).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  return `há ${dias} dia${dias > 1 ? 's' : ''}`;
}

const StatusBadge = ({ id, setores = [], systems = [] }) => {
  const allStatus = [...(DEV_STATUS || []), ...(URGENCY_LEVELS || []), ...(OTHER_STATUS || [])];
  let config = allStatus.find(s => s.id === id);

  if (!config) {
    const devStatus = DEV_STATUS.find(s => s.userStatus === id);
    if (devStatus) {
      config = { name: devStatus.userStatusName, color: devStatus.color };
    }
  }

  // Coluna personalizada (col_...): busca nome/cor em setores/systems
  if (!config) {
    const custom = statusInfo(id, setores, systems);
    if (custom.color) config = custom;
  }

  const bgColor = config?.color ? `${config.color}20` : 'rgba(0,0,0,0.05)';
  const textColor = config?.color || 'var(--text-muted)';
  const borderColor = config?.color ? `${config.color}40` : 'var(--glass-border)';

  return (
    <span className="badge" style={{ backgroundColor: bgColor, color: textColor, border: `1px solid ${borderColor}` }}>
      {config?.name || id || 'N/A'}
    </span>
  );
};

// --- Componente de Loading ---
const LoadingSpinner = ({ label = 'Carregando informações...' }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    gap: '1rem',
    color: 'var(--text-muted)'
  }}>
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      style={{ color: 'var(--primary)' }}
    >
      <RefreshCw size={32} />
    </motion.div>
    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{label}</span>
  </div>
);

// --- Tela de Login (sequência animada + glassmorphism dark) ---
// Sequência (~2.5s): logo girando com pingos d'água → nome surge → conjunto sobe/encolhe → form desliza → botão fade.
// Só transform/opacity nas animações (60fps, sem reflow).
// Tela pública de redefinição de senha (via link do e-mail: #/reset/<token>)
function ResetScreen({ hash }) {
  const token = hash.replace(/^#\/?reset\//, '').split('/')[0];
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [showP, setShowP] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [erro, setErro] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const submeter = async (e) => {
    e.preventDefault();
    setErro('');
    if (senha.length < 4) { setErro('A senha deve ter pelo menos 4 caracteres.'); return; }
    if (senha !== senha2) { setErro('As senhas não conferem.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: senha }) });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || 'Não foi possível redefinir a senha.');
      setDone(true); playSound('success');
    } catch (err) { setErro(err.message); }
    finally { setSubmitting(false); }
  };

  if (!mounted) return null;
  return (
    <div className="tt-login">
      <div className="tt-card" style={{ minHeight: 440 }}>
        <div className="tt-card-glass" style={{ opacity: 1 }} />
        <div className="tt-card-inner" style={{ justifyContent: 'center' }}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <img src="/TynkeTech.png" alt="TynkeTech" style={{ width: 36, height: 36 }} />
              <span className="tt-name" style={{ fontSize: '1.3rem' }}>TynkeTech</span>
            </div>
            {done ? (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <CheckCircle size={44} color="#10b981" style={{ margin: '0 auto' }} />
                <h1 className="tt-reg-title">Senha redefinida!</h1>
                <p className="tt-reg-text">Você já pode entrar com a nova senha.</p>
                <button className="tt-submit" onClick={() => { window.location.hash = '#/login'; }}>Ir para o login</button>
              </div>
            ) : (
              <form className="tt-form" onSubmit={submeter}>
                <h1 className="tt-reg-title" style={{ textAlign: 'center' }}>Nova senha</h1>
                <div className="tt-field">
                  <label>Nova senha</label>
                  <div className="tt-pass">
                    <Lock size={18} className="tt-pass-icon" />
                    <input type={showP ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} placeholder="Crie uma senha" required />
                    <button type="button" className="tt-eye" onClick={() => setShowP(v => !v)} aria-label="Mostrar senha">{showP ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>
                <div className="tt-field">
                  <label>Confirmar senha</label>
                  <div className="tt-pass">
                    <Lock size={18} className="tt-pass-icon" />
                    <input type={showP ? 'text' : 'password'} value={senha2} onChange={e => setSenha2(e.target.value)} placeholder="Repita a senha" required />
                  </div>
                </div>
                {erro && <p className="tt-error">{erro}</p>}
                <button type="submit" className="tt-submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Redefinir senha'}</button>
                <button type="button" className="tt-ghost" onClick={() => { window.location.hash = '#/login'; }}>Voltar ao login</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState(0); // 0 carregando · 1 marca · 2 reposiciona · 3 formulário
  const [esqueceu, setEsqueceu] = useState(false);
  const [resetEnviado, setResetEnviado] = useState(false);
  const [enviandoReset, setEnviandoReset] = useState(false);

  useEffect(() => {
    // Introdução mais lenta e sentida (~2s girando → revela → sobe → form)
    const timers = [
      setTimeout(() => setPhase(1), 2000), // logo para + nome "TynkeTech" surge
      setTimeout(() => setPhase(2), 3100), // conjunto encolhe e sobe pro topo do glass
      setTimeout(() => setPhase(3), 4100), // formulário entra
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const j = await res.json();
      if (!res.ok || !j.user) throw new Error(j.error || 'E-mail ou senha incorretos.');
      localStorage.setItem('sessionToken', j.token);
      onLogin(j.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const enviarReset = async (e) => {
    e.preventDefault();
    setEnviandoReset(true);
    try {
      await fetch('/api/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      setResetEnviado(true);
    } catch (err) {
      setResetEnviado(true); // não revela se o e-mail existe
    } finally {
      setEnviandoReset(false);
    }
  };

  const easeOut = [0.22, 1, 0.36, 1];
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.22, delayChildren: 0.15 } } };
  const slideItem = { hidden: { opacity: 0, x: -34 }, show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: easeOut } } };
  const fadeItem = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.85, ease: 'easeOut' } } };

  return (
    <div className="tt-login">
      <div className="tt-card">
        {/* Camada de vidro — só fade de opacidade */}
        <motion.div className="tt-card-glass" initial={{ opacity: 0 }} animate={{ opacity: phase >= 2 ? 1 : 0 }} transition={{ duration: 1.0, ease: 'easeOut' }} />

        <div className="tt-card-inner">
          {/* Marca: começa grande e centralizada (girando) → sobe e encolhe pro topo. BRAND_Y≈150 = metade do card (tunável) */}
          <motion.div
            className="tt-brand"
            initial={{ y: 150, scale: 2.3 }}
            animate={phase < 2 ? { y: 150, scale: 2.3 } : { y: 0, scale: 1 }}
            transition={{ duration: 1.2, ease: easeOut }}
          >
            <div className="tt-logo-holder">
              <motion.img
                src="/TynkeTech.png"
                alt="TynkeTech"
                className="tt-logo"
                animate={phase === 0 ? { rotate: 360 } : { rotate: 0 }}
                transition={phase === 0 ? { repeat: Infinity, duration: 1.4, ease: 'linear' } : { duration: 0.9, ease: easeOut }}
              />
              {/* Pingos d'água saindo da logo (só na fase de carregamento) */}
              {phase === 0 && Array.from({ length: 10 }).map((_, i) => {
                const a = (i / 10) * Math.PI * 2;
                return (
                  <motion.span
                    key={i}
                    className="tt-drop"
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                    animate={{ opacity: [0, 0.9, 0], x: Math.cos(a) * 74, y: Math.sin(a) * 74, scale: [0.4, 1, 0.25] }}
                    transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.07, ease: 'easeOut' }}
                  />
                );
              })}
            </div>

            <AnimatePresence>
              {phase >= 1 && (
                <motion.span className="tt-name" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.75, ease: easeOut }}>
                  TynkeTech
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Formulário — entra escalonado; botão faz fade por último */}
          <AnimatePresence>
            {phase >= 3 && (
              esqueceu ? (
                <div className="tt-form">
                  {resetEnviado ? (
                    <>
                      <p className="tt-reg-text" style={{ textAlign: 'center', lineHeight: 1.6 }}>Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. Verifique a caixa de entrada (e o spam).</p>
                      <button type="button" className="tt-submit" onClick={() => { setEsqueceu(false); setResetEnviado(false); }}>Voltar ao login</button>
                    </>
                  ) : (
                    <form className="tt-form" onSubmit={enviarReset}>
                      <div className="tt-field">
                        <label>E-mail da conta</label>
                        <div className="tt-pass">
                          <Mail size={18} className="tt-pass-icon" />
                          <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                      </div>
                      <button type="submit" className="tt-submit" disabled={enviandoReset}>{enviandoReset ? 'Enviando…' : 'Enviar link de recuperação'}</button>
                      <button type="button" className="tt-ghost" onClick={() => setEsqueceu(false)}>Voltar ao login</button>
                    </form>
                  )}
                </div>
              ) : (
              <motion.form className="tt-form" onSubmit={handleLogin} variants={stagger} initial="hidden" animate="show">
                <motion.div className="tt-field" variants={slideItem}>
                  <label>E-mail</label>
                  <div className="tt-pass">
                    <Mail size={18} className="tt-pass-icon" />
                    <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </motion.div>
                <motion.div className="tt-field" variants={slideItem}>
                  <label>Senha</label>
                  <div className="tt-pass">
                    <Lock size={18} className="tt-pass-icon" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" className="tt-eye" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </motion.div>
                {error && <p className="tt-error">{error}</p>}
                <motion.button type="submit" className="tt-submit" variants={fadeItem} disabled={isLoading}>
                  {isLoading ? 'Autenticando…' : 'Entrar'}
                </motion.button>
                <motion.button type="button" className="tt-ghost" variants={fadeItem} onClick={() => { setError(''); setEsqueceu(true); }} style={{ marginTop: '-2px' }}>
                  Esqueceu a senha?
                </motion.button>
                <motion.div className="tt-foot" variants={fadeItem}>© 2026 TynkeTech · Powered by Zaya Software</motion.div>
              </motion.form>
              )
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Tela pública de auto-registro via link (#/registro/<tipo>/<id>/<papel>) — mesma casca glass do login
function RegistroScreen({ hash }) {
  // #/registro/<token> — o token assinado carrega tipo/id/papel/criador (não vêm da URL crua).
  const token = hash.replace(/^#\/?registro\/?/, '');
  const [tipo, setTipo] = useState(null);      // 'setor' | 'categoria' (resolvido do token pelo servidor)
  const [papel, setPapel] = useState('funcionario');
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState(0); // mesma intro do login: 0 carregando · 1 marca · 2 reposiciona · 3 conteúdo

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/register?token=${encodeURIComponent(token)}`);
        const j = await res.json();
        setTarget(j.target || null);
        if (j.tipo) setTipo(j.tipo);
        if (j.papel) setPapel(j.papel);
      } catch { setTarget(null); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 2000),
      setTimeout(() => setPhase(2), 3100),
      setTimeout(() => setPhase(3), 4100),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const irParaLogin = () => { window.location.hash = '#/login'; };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('Preencha nome, e-mail e senha.'); return; }
    setSubmitting(true);
    try {
      // Auto-registro público via rota dedicada (escrever em users pelo /api/data é só admin agora)
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, token }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || 'Falha no cadastro.');
      setDone(true);
      playSound('success');
    } catch (err) {
      toast.error('Erro ao cadastrar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const easeOut = [0.22, 1, 0.36, 1];

  // Conteúdo revelado após a intro (fase 3): form, link inválido ou sucesso
  const conteudo = () => {
    if (loading) return <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', textAlign: 'center' }}>Carregando…</p>;
    if (!target) return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
        <h1 className="tt-reg-title">Link inválido</h1>
        <p className="tt-reg-text">Este link de registro não é válido. Peça um novo ao administrador.</p>
        <button className="tt-ghost" onClick={irParaLogin}>Ir para o login</button>
      </div>
    );
    if (done) return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', width: '100%' }}>
        <CheckCircle size={44} color="#10b981" />
        <h1 className="tt-reg-title">Cadastro concluído!</h1>
        <p className="tt-reg-text">Você já pode entrar no sistema com seu e-mail e senha.</p>
        <button className="tt-submit" onClick={irParaLogin}>Ir para o login</button>
      </div>
    );
    return (
      <>
        <p className="tt-reg-sub">
          {tipo === 'categoria' ? 'Sub-Setor' : 'Setor'}: <strong>{target.name}</strong> · {papel === 'gerente' ? 'gerente do setor' : papel === 'responsavel_subsetor' ? 'responsável do sub-setor' : 'abre chamados'}
        </p>
        <form className="tt-form" onSubmit={handleSubmit}>
          <div className="tt-field">
            <label>Nome</label>
            <div className="tt-pass">
              <UserIcon size={18} className="tt-pass-icon" />
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Seu nome" required />
            </div>
          </div>
          <div className="tt-field">
            <label>E-mail</label>
            <div className="tt-pass">
              <Mail size={18} className="tt-pass-icon" />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" required />
            </div>
          </div>
          <div className="tt-field">
            <label>Senha</label>
            <div className="tt-pass">
              <Lock size={18} className="tt-pass-icon" />
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Crie uma senha" required />
              <button type="button" className="tt-eye" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="tt-submit" disabled={submitting}>{submitting ? 'Cadastrando…' : 'Cadastrar'}</button>
          <button type="button" className="tt-ghost" onClick={irParaLogin}>Já tenho conta</button>
          <div className="tt-foot">© 2026 TynkeTech · Powered by Zaya Software</div>
        </form>
      </>
    );
  };

  const semForm = loading || !target || done; // estados curtos → centralizar no espaço restante

  return (
    <div className="tt-login">
      <div className="tt-card" style={{ minHeight: 580 }}>
        <motion.div className="tt-card-glass" initial={{ opacity: 0 }} animate={{ opacity: phase >= 2 ? 1 : 0 }} transition={{ duration: 1.0, ease: 'easeOut' }} />
        <div className="tt-card-inner">
          {/* Mesma sequência do login: logo girando + pingos → nome → sobe/encolhe. BRAND_Y≈219 = metade do card (580) */}
          <motion.div
            className="tt-brand"
            initial={{ y: 219, scale: 2.3 }}
            animate={phase < 2 ? { y: 219, scale: 2.3 } : { y: 0, scale: 1 }}
            transition={{ duration: 1.2, ease: easeOut }}
          >
            <div className="tt-logo-holder">
              <motion.img
                src="/TynkeTech.png" alt="TynkeTech" className="tt-logo"
                animate={phase === 0 ? { rotate: 360 } : { rotate: 0 }}
                transition={phase === 0 ? { repeat: Infinity, duration: 1.4, ease: 'linear' } : { duration: 0.9, ease: easeOut }}
              />
              {phase === 0 && Array.from({ length: 10 }).map((_, i) => {
                const a = (i / 10) * Math.PI * 2;
                return (
                  <motion.span key={i} className="tt-drop"
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                    animate={{ opacity: [0, 0.9, 0], x: Math.cos(a) * 74, y: Math.sin(a) * 74, scale: [0.4, 1, 0.25] }}
                    transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.07, ease: 'easeOut' }}
                  />
                );
              })}
            </div>
            <AnimatePresence>
              {phase >= 1 && (
                <motion.span className="tt-name" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.75, ease: easeOut }}>
                  TynkeTech
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {phase >= 3 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
                style={{ width: '100%', flex: semForm ? 1 : 'none', display: 'flex', flexDirection: 'column', justifyContent: semForm ? 'center' : 'flex-start' }}
              >
                {conteudo()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Modal p/ gerar/copiar o link de registro de um setor ou categoria.
// `criador` = quem gera o link → vira o RESPONSÁVEL de quem se cadastrar por ele.
// Se o alvo é um setor, o gerente pode mirar o setor todo OU um sub-setor dele (destino).
function RegistroLinkModal({ tipo, target, criador, systems = [], onClose }) {
  const [mounted, setMounted] = useState(false);
  const [papel, setPapel] = useState('funcionario'); // 'gestor' | 'funcionario' (role real derivado do destino)
  const [destino, setDestino] = useState(''); // 'sub:<id>' quando o gerente mira um sub-setor
  const [link, setLink] = useState('');
  const [gerando, setGerando] = useState(false);
  useEffect(() => setMounted(true), []);

  const subsDoSetor = tipo === 'setor' ? systems.filter(s => String(s.setor_id) === String(target.id)) : [];
  // resolve tipo/id efetivos a partir do destino escolhido
  let effTipo = tipo, effId = target.id;
  if (tipo === 'setor' && destino.startsWith('sub:')) { effTipo = 'categoria'; effId = Number(destino.slice(4)); }
  // Cargo de gestão depende do destino: setor → Gerente; sub-setor → Responsável do sub-setor.
  const gestorRole = effTipo === 'setor' ? 'gerente' : 'responsavel_subsetor';
  const gestorLabel = effTipo === 'setor' ? 'Gerente' : 'Responsável do sub-setor';
  const effRole = papel === 'gestor' ? gestorRole : 'funcionario';
  const descricoes = {
    gerente: 'Ao entrar: recebe as demandas do setor, direciona para a equipe e acompanha no Kanban os funcionários que cadastrou.',
    responsavel_subsetor: 'Ao entrar: recebe e direciona as demandas do sub-setor e acompanha no Kanban os funcionários que cadastrou.',
    funcionario: 'Ao entrar: abre chamados e atende só as demandas direcionadas a ele (ou abertas ao setor para puxar).',
  };

  // O link é ASSINADO pelo servidor (o papel/alvo não podem vir da URL) — pede um token ao gerar/mudar a seleção.
  useEffect(() => {
    let cancel = false;
    (async () => {
      setGerando(true); setLink('');
      try {
        const tk = (typeof localStorage !== 'undefined') ? localStorage.getItem('sessionToken') : null;
        const res = await fetch('/api/register-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(tk ? { 'x-session-token': tk } : {}) },
          body: JSON.stringify({ tipo: effTipo, id: effId, papel: effRole }),
        });
        const j = await res.json();
        if (!cancel) setLink(res.ok && j.token ? `${window.location.origin}/#/registro/${j.token}` : '');
      } catch { if (!cancel) setLink(''); }
      finally { if (!cancel) setGerando(false); }
    })();
    return () => { cancel = true; };
  }, [effTipo, effId, effRole]);

  if (!mounted) return null;

  const copiar = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); toast.success('Link copiado!'); }
    catch { toast.error('Copie o link manualmente.'); }
  };
  return createPortal(
    <div className="overlay" style={{ alignItems: 'center', padding: '1rem' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass modal" style={{ width: '460px', maxWidth: '94vw', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>Link de registro</span>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link2 size={18} color="var(--primary)" /> {target.name}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tipo === 'categoria' ? 'Sub-Setor' : 'Setor'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {tipo === 'setor' && subsDoSetor.length > 0 && (
          <div className="form-group">
            <label style={{ fontSize: '0.75rem' }}>Cadastrar em…</label>
            <select value={destino} onChange={e => setDestino(e.target.value)}>
              <option value="">{target.name} (setor todo)</option>
              {subsDoSetor.map(s => <option key={s.id} value={`sub:${s.id}`}>Sub-setor: {s.name}</option>)}
            </select>
          </div>
        )}

        <div className="form-group">
          <label style={{ fontSize: '0.75rem' }}>Cargo de quem entrar por este link</label>
          <select value={papel} onChange={e => setPapel(e.target.value)}>
            <option value="gestor">{gestorLabel}</option>
            <option value="funcionario">Funcionário</option>
          </select>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.4 }}>
            {descricoes[effRole]}
          </p>
        </div>

        {criador?.name && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Responsável de quem se cadastrar: <strong>{criador.name}</strong>
          </p>
        )}

        <div style={{ marginTop: '1rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Link (envie para a pessoa)</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <input readOnly value={gerando ? 'Gerando link…' : link} onFocus={e => e.target.select()} style={{ flex: 1, fontSize: '0.8rem', margin: 0 }} />
            <button className="btn btn-primary" style={{ flex: '0 0 auto' }} onClick={copiar} disabled={gerando || !link}>Copiar</button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// --- Componente Principal ---
// --- App Header Horizontal ---
function AppHeader({ currentView, setView, user, theme, toggleTheme, onLogout, badges = {} }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const role = user?.role || 'guest';
  const manageRoles = ROLES.filter(r => r !== 'funcionario'); // admin + gerente + responsáveis

  const menus = [
    { id: 'tickets', name: 'Tickets', icon: <UserIcon size={18} />, roles: ROLES },
    { id: 'kanban', name: 'Kanban', icon: <LayoutDashboard size={18} />, roles: ROLES }, // todos, inclusive funcionário (atende os recebidos)
    { id: 'users', name: 'Usuários', icon: <Users size={18} />, roles: ['admin', 'gerente', 'responsavel_subsetor'] },
    { id: 'setores', name: 'Setores', icon: <Layers size={18} />, roles: ['admin', 'gerente', 'responsavel_subsetor'] },
    { id: 'analytics', name: 'Relatórios', icon: <BarChart3 size={18} />, roles: manageRoles }, // depois de Setores; gerente/resp./admin — funcionário não
    { id: 'logs', name: 'Logs', icon: <Activity size={18} />, roles: ['admin'] },
    { id: 'config', name: 'Config', icon: <Settings size={18} />, roles: ['admin'] },
  ];

  const visibleMenus = menus.filter(m => m.roles.includes(role));

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-brand">
          <img 
            src={theme === 'light' ? '/logomarca_black.png' : '/logomarca_white.png'} 
            className="brand-logo-img" 
            alt="TynkeTech" 
          />
          
          <div className="brand-actions-group" style={{ position: 'relative' }}>
            {user && (
              <>
                <div 
                  className="user-avatar-wrapper initials-avatar" 
                  onClick={() => setIsMenuOpen(!isMenuOpen)} 
                  title="Menu do Usuário"
                  style={{ 
                    cursor: 'pointer', 
                    background: 'var(--primary)', 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: '800', 
                    fontSize: '0.9rem',
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    border: isMenuOpen ? '2px solid white' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  {getInitials(user.name)}
                </div>

                <AnimatePresence>
                  {isMenuOpen && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setIsMenuOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="user-menu-dropdown glass"
                        style={{
                          position: 'absolute',
                          top: '50px',
                          right: '0',
                          width: '220px',
                          zIndex: 999,
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--glass-border)', marginBottom: '4px' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{user.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{ROLE_LABELS[user.role] || user.role}</div>
                        </div>
                        
                        <button className="menu-item" onClick={() => { setView('profile'); setIsMenuOpen(false); }}>
                          <UserCircle size={18} /> Meu Perfil
                        </button>
                        
                        <button className="menu-item" onClick={() => { toggleTheme(); playSound('click'); }}>
                          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                          {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
                        </button>
                        
                        <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }} />
                        
                        <button className="menu-item logout-item" onClick={onLogout}>
                          <LogOut size={18} /> Sair
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>

        <nav className="header-nav">
          {visibleMenus.map(menu => (
            <button
              key={menu.id}
              className={`nav-btn ${currentView === menu.id ? 'active' : ''}`}
              onClick={() => setView(menu.id)}
              style={{ position: 'relative' }}
            >
              {menu.icon}
              <span>{menu.name}</span>
              {badges[menu.id] > 0 && (
                <span title={`${badges[menu.id]} em Pedidos`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '999px', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800, marginLeft: '2px' }}>
                  {badges[menu.id]}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function UserDashboardWrapper({ children }) {
  return <div className="user-dashboard-wrapper">{children}</div>;
}

function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="footer-copyright">
        Copyright © 2026 TynkeTech. Todos os direitos reservados
      </div>
      <div className="footer-powered">
        Powered by Zaya Software
      </div>
    </footer>
  );
}

export default function App() {
  const [user, setUser] = useState(getStorageUser());
  const [theme, setTheme] = useState(getStorageTheme());
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('tickets');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hash, setHash] = useState(window.location.hash);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [acceptGate, setAcceptGate] = useState(null); // ticket aguardando aceite antes de abrir os detalhes
  const [statusView, setStatusView] = useState(null); // criador acompanha o próprio ticket (só leitura)
  const [chatTicket, setChatTicket] = useState(null); // conversa da demanda aberta como TELA cheia
  const [detalheReadOnly, setDetalheReadOnly] = useState(false); // detalhe aberto só-leitura (criador vendo o que enviou)
  const [msgMeta, setMsgMeta] = useState([]); // {ticket_id,user_id,created_at} leve (sem baixar mídia) p/ contador de não-lidas
  const [seen, setSeen] = useState({}); // ticketId -> ISO da última visualização (persistido no localStorage por usuário)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const requestConfirm = (title, message, onConfirm) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm });
  };

  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

  const [systemsList, setSystemsList] = useState([]);
  const [setoresList, setSetoresList] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const fetchUsersList = async () => {
    try {
      const { data: userData } = await api.from('users').select('*').order('name');
      if (userData) setAllUsers(userData);
    } catch(e) {}
  };

  // Recarrega setores (com origin_visibility/auto_pool) + sub-setores. Usado no boot e em tempo real
  // quando a config de um setor muda em outro cliente (evento socket users_refreshed).
  const fetchSetores = async () => {
    try {
      const { data: setData } = await api.from('setores').select('*').order('name');
      setSetoresList(setData || []);
    } catch(e) { setSetoresList([]); }
    try {
      const { data: sysData, error: sysErr } = await api.from('systems').select('*');
      if (!sysErr && sysData && sysData.length > 0) setSystemsList(sysData);
      else setSystemsList(PLATFORMS);
    } catch(e) { setSystemsList(PLATFORMS); }
  };

  useEffect(() => {
    const initData = async () => {
      await fetchSetores();

      // Carregar Usuários
      await fetchUsersList();

      await fetchTickets();
      await fetchMsgMeta();

    };
    initData();

    // Capturar erros globais do navegador (Frontend)
    const handleGlobalError = (event) => {
      const errorMsg = event.error?.message || event.message;
      const stack = event.error?.stack;
      logAction(null, 'CLIENT_ERROR', 'Runtime Error', `${errorMsg} | Stack: ${stack?.substring(0, 150)}...`);
    };

    const updatePresence = async (status) => {
      if (!user) return;
      // Atualiza o banco silenciosamente
      await api.from('users').update({ is_online: status }).eq('id', user.id);
    };

    const heartbeat = setInterval(() => {
      if (user) {
        console.log(`[Presence] Enviando sinal de vida para ${user.name}`);
        updatePresence(true); // Força online enquanto a aba estiver aberta
      }
    }, 60000); // 1 minuto

    // Disparo imediato na inicialização
    if (user) updatePresence(true);

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('beforeunload', () => updatePresence(false));
    
    // Ouvir novos tickets em tempo real
    socket.on('new_ticket_alert', (newTicket) => {
      upsertTicketLocal(newTicket); // delta: usa o payload completo, sem refetch da lista
      if (isManager(user?.role)) {
        playSound('notification');
        toast.success(`🔔 Novo Ticket: #${newTicket.id} - ${newTicket.title}`, {
          duration: 8000,
          position: 'top-right',
          style: { background: 'var(--primary)', color: 'white', fontWeight: 'bold' }
        });
      }
    });

    socket.on('new_mention_alert', (data) => {
      // Notifica a PESSOA mencionada (não mais todos os gestores)
      if (data.toUserId === user?.id) {
        playSound('notification');
        toast(`🏷️ ${data.from || 'Alguém'} mencionou você no Ticket #${data.ticketId}`, {
          duration: 10000,
          position: 'top-center',
          icon: '🏷️',
          style: {
            background: '#4f46e5',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.2)',
            fontWeight: '800'
          }
        });
      }
    });

    socket.on('ticket_status_refreshed', (data) => {
      // delta: busca só o ticket que mudou (1 linha) em vez da lista toda
      if (data?.id != null) upsertTicketById(data.id);
    });

    // Ticket excluído em outro cliente → some da lista/Kanban aqui também
    socket.on('ticket_deleted_alert', (data) => {
      if (data?.id != null) setTickets(prev => prev.filter(t => t.id !== data.id));
    });

    // Membro criado/removido OU config de setor alterada em outro cliente → atualiza sem recarregar.
    // Recarrega também os setores para refletir origin_visibility/auto_pool em tempo real (aba Enviados).
    socket.on('users_refreshed', () => {
      fetchUsersList();
      fetchSetores();
    });

    socket.on('ticket_shared_alert', (data) => {
      // Se o usuário atual for um dos que recebeu o compartilhamento
      if (data.sharedWith.includes(user?.id)) {
        playSound('notification');
        toast.success(`📂 Um ticket foi compartilhado com você: #${data.ticketId} - ${data.title}`, {
          duration: 8000,
          position: 'bottom-right',
          style: { background: '#10b981', color: 'white', fontWeight: 'bold' }
        });
      }
      upsertTicketById(data.ticketId); // delta: só o ticket compartilhado (traz o shared_with atualizado)
    });

    // Chat da demanda: avisa o destinatário (criador ↔ responsável) quando não está com o ticket aberto
    socket.on('new_ticket_message', (data) => {
      fetchMsgMeta(); // atualiza o contador de não-lidas na listagem
      if (data.toUserId === user?.id) {
        playSound('notification');
        toast(`💬 Nova mensagem no Ticket #${data.ticketId}`, {
          duration: 6000, position: 'bottom-right',
          style: { background: '#4f46e5', color: 'white', fontWeight: 'bold' }
        });
      }
    });

    // Feedback sonoro global para cliques
    const handleGlobalClick = (e) => {
      const target = e.target.closest('button, a, select, .kanban-card, .ticket-card, .sidebar-item, input[type="submit"]');
      if (target) {
        playSound('click');
      }
    };

    window.addEventListener('click', handleGlobalClick);

    // Polling de usuários para simular Tempo Real (Necessário para API MySQL local)
    const usersPolling = setInterval(() => {
      fetchUsersList();
    }, 30000); // Atualiza a cada 30 segundos para economizar recursos

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('click', handleGlobalClick);
      clearInterval(heartbeat);
      clearInterval(usersPolling);
      socket.off('new_ticket_alert');
      socket.off('ticket_status_refreshed');
      socket.off('ticket_deleted_alert');
      socket.off('users_refreshed');
      socket.off('new_ticket_message');
    };
  }, [user]);

  // Notificações de atribuição flexível (dependem de setores/systems p/ saber se sou colaborador do setor)
  useEffect(() => {
    const onAssigned = (data) => {
      upsertTicketById(data.ticketId); // delta: só o ticket direcionado
      if (data.toUserId === user?.id) {
        playSound('notification');
        toast(`📌 Você recebeu a demanda #${data.ticketId}${data.title ? ' - ' + data.title : ''}`, {
          duration: 8000, position: 'top-right',
          style: { background: 'var(--primary)', color: 'white', fontWeight: 'bold' }
        });
      }
    };
    const onBroadcast = (data) => {
      // noSetor checa a lotação do PRÓPRIO usuário (setor_id/system_id) — funciona sem allUsers,
      // ao contrário do isColaboradorDoSetor, que não reconhecia os funcionários e por isso não notificava.
      if (data.from !== user?.name && noSetor(user, data.setorId, systemsList)) {
        playSound('notification');
        toast(`📢 Demanda #${data.ticketId} disponível no setor ${data.setorName || ''} — pode pegar!`, {
          duration: 9000, position: 'top-center', icon: '📢',
          style: { background: '#0ea5e9', color: 'white', fontWeight: '800' }
        });
        upsertTicketById(data.ticketId); // delta: só a demanda aberta ao setor
      }
    };
    socket.on('ticket_assigned_alert', onAssigned);
    socket.on('ticket_broadcast_alert', onBroadcast);
    return () => { socket.off('ticket_assigned_alert', onAssigned); socket.off('ticket_broadcast_alert', onBroadcast); };
  }, [user, setoresList, systemsList]);

  // Urgência máxima: notifica o RECEBEDOR continuamente enquanto a demanda dele estiver aberta (a cada 2 min)
  const ticketsRef = React.useRef(tickets);
  useEffect(() => { ticketsRef.current = tickets; }, [tickets]);
  useEffect(() => {
    if (!user) return;
    // Só lembra enquanto a demanda ainda NÃO entrou em atendimento. Ao passar para "Resolvendo"
    // (ou qualquer etapa seguinte, coluna personalizada ou fechamento) a notificação para.
    const aindaAguardando = ['backlog', 'analise'];
    const lembrar = () => {
      (ticketsRef.current || [])
        .filter(t => t.urgency === URGENCIA_MAXIMA && t.responsible === user.name && aindaAguardando.includes(t.status))
        .forEach(t => {
          playSound('notification');
          toast(`🚨 URGÊNCIA MÁXIMA — Demanda #${t.id}: ${t.title}`, {
            duration: 7000, position: 'top-right',
            style: { background: '#b91c1c', color: 'white', fontWeight: 800 }
          });
        });
    };
    const id = setInterval(lembrar, 120000);
    return () => clearInterval(id);
  }, [user]);

  // Ao logar, quem atende (gerente/responsáveis) cai no Kanban; depois navega livremente. Admin/funcionário começam em Tickets.
  useEffect(() => {
    if (BOARD_ROLES.includes(user?.role)) setView('kanban');
  }, [user]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await api.from('system_logs').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      setSystemLogs(data || []);
    } catch (err) {
      toast.error('Gargalo ao buscar logs.');
    }
  };

  const logAction = async (ticketId, actionType, oldValue = null, newValue = null) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      const actorName = currentUser ? currentUser.name : 'Visitante';
      const actorRole = currentUser ? currentUser.role : 'ghost';

      const { error } = await api.from('system_logs').insert([{
        ticket_id: ticketId ? ticketId : null,
        action_type: actionType,
        old_value: oldValue,
        new_value: newValue,
        actor_name: actorName,
        actor_role: actorRole
      }]);

      if (error) {
        console.error('ERRO MYSQL LOGGER:', error.message || error);
      }
    } catch (err) {
      console.warn('Falha estrutural na telemetria:', err);
    }
  };

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    // Realtime removido na migração MySQL
    return () => {};
  }, []);

  // Colunas do ticket (sem attachments, que são pesados e vêm sob demanda)
  const TICKET_COLS = 'id, title, description, setor_id, origin_setor_id, origin_system_id, platform, status, urgency, ticket_type, responsible, delivery_date, created_by, created_at, updated_at, dev_notes, shared_with, open_pool, responsible_seen_at, finalized';

  async function fetchTickets() {
    try {
      setLoading(true);
      const { data, error } = await api.from('tickets').select(TICKET_COLS).order('created_at', { ascending: false });
      if (error) throw error;
      setTickets(data || []);
      if (data?.length > 0) playSound('success');
    } catch (err) {
      playSound('error');
      toast.error('Erro ao buscar tickets');
    } finally {
      setLoading(false);
    }
  }

  // Onda 1 do socket: em vez de recarregar a LISTA toda a cada evento, busca só o ticket que mudou (1 linha) e faz upsert.
  const upsertTicketById = async (id) => {
    if (id == null) return;
    const { data } = await api.from('tickets').select(TICKET_COLS).eq('id', id).single();
    if (!data) return;
    setTickets(prev => {
      const i = prev.findIndex(t => t.id === data.id);
      if (i === -1) return [data, ...prev];          // novo → adiciona no topo
      const copy = [...prev]; copy[i] = { ...copy[i], ...data }; return copy; // existente → mescla
    });
  };

  // Aplica um ticket já pronto (payload completo do socket) sem ir ao banco
  const upsertTicketLocal = (t) => {
    if (!t?.id) return;
    setTickets(prev => prev.some(x => x.id === t.id) ? prev.map(x => x.id === t.id ? { ...x, ...t } : x) : [t, ...prev]);
  };

  // Contador de mensagens não-lidas: busca só metadados (ticket_id/user_id/created_at), sem baixar mídia.
  async function fetchMsgMeta() {
    const { data } = await api.from('ticket_messages').select('ticket_id,user_id,created_at');
    setMsgMeta(Array.isArray(data) ? data : []);
  }

  // Carrega o "visto" do usuário atual do localStorage
  useEffect(() => {
    if (!user) { setSeen({}); return; }
    try { setSeen(JSON.parse(localStorage.getItem('msgSeen_' + user.id) || '{}')); } catch { setSeen({}); }
  }, [user]);

  const marcarVisto = (ticketId) => {
    if (!user || ticketId == null) return;
    setSeen(prev => {
      const next = { ...prev, [ticketId]: new Date().toISOString() };
      localStorage.setItem('msgSeen_' + user.id, JSON.stringify(next));
      return next;
    });
  };

  // Não-lidas por ticket = mensagens de OUTROS mais novas que o último "visto"
  const unreadByTicket = {};
  for (const m of msgMeta) {
    if (!user || m.user_id === user.id) continue;
    const s = seen[m.ticket_id];
    if (!s || new Date(m.created_at) > new Date(s)) unreadByTicket[m.ticket_id] = (unreadByTicket[m.ticket_id] || 0) + 1;
  }

  // Última atividade por ticket → ordena a lista de conversas (msg mais recente no topo) + detecta chats com mensagens.
  const lastMsgByTicket = {};
  for (const m of msgMeta) {
    const cur = lastMsgByTicket[m.ticket_id];
    if (!cur || new Date(m.created_at) > new Date(cur)) lastMsgByTicket[m.ticket_id] = m.created_at;
  }
  // Sou participante da conversa? (criador, responsável ou compartilhado)
  const souParticipanteChat = (t) => !!t.responsible && (t.created_by === user?.id || t.responsible === user?.name || (Array.isArray(t.shared_with) && t.shared_with.includes(user?.id)));
  // Conversas do inbox. Admin visualiza TODOS os chats registrados (qualquer ticket com conversa/mensagens),
  // em modo leitura; os demais veem só onde participam.
  const ehAdminChat = user?.role === 'admin';
  const chatConversas = tickets.filter(t => ehAdminChat ? (t.responsible || lastMsgByTicket[t.id]) : souParticipanteChat(t));
  // Badge da bolha: mesmo o admin conta não-lidas só das conversas em que participa (não infla com o sistema todo).
  const totalUnreadChat = chatConversas.reduce((s, t) => s + ((ehAdminChat && !souParticipanteChat(t)) ? 0 : (unreadByTicket[t.id] || 0)), 0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [user]);

  useEffect(() => {
    if (user && hash === '#/login') {
      window.location.hash = '';
    }
  }, [user, hash]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const handleLogout = async () => {
    if (user) {
      await api.from('users').update({ is_online: false }).eq('id', user.id);
    }
    await logAction(0, 'USER_LOGOUT', null, 'Saída do Sistema');
    // apaga a sessão no servidor + o token local
    try {
      const token = localStorage.getItem('sessionToken');
      await fetch('/api/logout', { method: 'POST', headers: { 'x-session-token': token || '' } });
    } catch (e) {}
    localStorage.removeItem('sessionToken');
    setUser(null);
    setView('tickets');
    window.location.hash = '#/login';
    toast.success('Sessão encerrada');
  };

  const addTicket = async (formData) => {
    const uploadAndInsert = async () => {
      const uploadedAttachments = [];
      if (formData.files && formData.files.length > 0) {
        for (const file of formData.files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${fileName}`;

          const fileToBase64 = (f) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(f);
            reader.onload = () => resolve(reader.result);
            reader.onerror = e => reject(e);
          });

          // Upload alternativo: converte para Base64 para salvar direto no JSON do MySQL local
          const publicUrl = await fileToBase64(file);

          uploadedAttachments.push({
            url: publicUrl,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            name: file.name
          });
        }
      }

      // Rede de segurança: se não veio setor explícito mas veio sub-setor, deriva o setor do sub-setor
      // (garante que nenhum ticket nasça sem setor_id quando há platform — mantém o banco redondo).
      const subSetorEscolhido = formData.platform
        ? systemsList.find(s => String(s.id) === String(formData.platform))
        : null;
      const setorDestino = formData.setor ? Number(formData.setor) : (subSetorEscolhido?.setor_id ?? null);

      // Permissão de destino (a ORIGEM define os destinos): não-admin só abre chamado para os setores
      // liberados no SEU setor de origem. Sem config = não pode abrir para ninguém. Admin sempre pode.
      if (user?.role !== 'admin') {
        const org = setoresList.find(s => String(s.id) === String(user?.setor_id));
        const permitidos = (Array.isArray(org?.destinos_permitidos) ? org.destinos_permitidos : []).map(String);
        if (!permitidos.includes(String(setorDestino))) {
          throw new Error('Seu setor não tem permissão para abrir chamado para o setor selecionado.');
        }
      }

      // Quem RECEBE direto = gerente do setor de destino (ou responsável do sub-setor). O criador NÃO escolhe;
      // o gerente é quem depois designa quem vai atender.
      const gerenteDoDestino = () => {
        if (formData.platform) {
          const r = allUsers.find(u => String(u.system_id) === String(formData.platform) && u.role === 'responsavel_subsetor');
          if (r) return r.name;
        }
        const g = allUsers.find(u => String(u.setor_id) === String(setorDestino) && u.role === 'gerente');
        if (g) return g.name;
        // fallback legado: primary_responsibles do sub-setor/setor
        const ids = (subSetorEscolhido?.primary_responsibles?.length ? subSetorEscolhido.primary_responsibles
          : (setoresList.find(s => String(s.id) === String(setorDestino))?.primary_responsibles || []));
        return allUsers.find(u => u.id === ids[0])?.name || null;
      };

      // Config "time pega a demanda": lê o auto_pool FRESCO do banco (a config pode ter mudado em outra sessão,
      // então não dá pra confiar no setoresList local). Se o setor OU o sub-setor de destino estiver ligado,
      // a demanda já nasce ABERTA AO TIME (open_pool, sem dono) e notifica os funcionários.
      const setorObj = setoresList.find(s => String(s.id) === String(setorDestino));
      const setorAuto = setorDestino != null ? await api.from('setores').select('auto_pool').eq('id', setorDestino).single() : null;
      const subAuto = formData.platform ? await api.from('systems').select('auto_pool').eq('id', formData.platform).single() : null;
      const autoPool = !!setorAuto?.data?.auto_pool || !!subAuto?.data?.auto_pool;

      const { data, error } = await api
        .from('tickets')
        .insert([{
          title: formData.title,
          description: formData.description,
          setor_id: setorDestino,
          origin_setor_id: user?.setor_id || null, // setor de origem = setor de quem abriu
          origin_system_id: user?.system_id || null, // sub-setor de origem = sub-setor de quem abriu (visibilidade de origem 'subsetor')
          platform: formData.platform || null, // id do sub-setor (só quando o setor ramifica)
          responsible: autoPool ? null : gerenteDoDestino(),
          open_pool: autoPool ? 1 : 0,
          attachments: uploadedAttachments,
          status: 'backlog',
          urgency: formData.urgency || 'leve',
          created_by: user?.id || null
        }])
        .select();

      if (error) throw new Error('Erro no banco: ' + error.message);

      // Aberta ao time → avisa os colaboradores do setor pra puxarem (mesmo evento do "abrir ao setor")
      if (autoPool) {
        socket.emit('ticket_broadcast', { ticketId: data[0].id, setorId: setorDestino, setorName: setorObj?.name, from: user?.name, title: data[0].title });
      }

      await logAction(data[0].id, 'TICKET_CREATED', null, 'backlog');
      // Notificação inicial: e-mail automático pros responsáveis do setor de destino (a demanda é do setor)
      enviarEmail(
        emailsDosResponsaveis(data[0]),
        `Nova demanda #${data[0].id} — ${data[0].title}`,
        {
          cabecalho: 'Notificação de Ticket', icone: '✉️', ticketId: data[0].id,
          titulo: `#${data[0].id} — ${data[0].title}`,
          descricao: (data[0].description || '—').slice(0, 500),
          situacao: 'Aberto', situacaoCor: '#6366f1',
          assinatura: `Aberto por ${user?.name || '—'}`,
        },
        'ticket_criado'
      );
      return data[0];
    };

    // Retornamos a promessa para que o modal possa controlar o estado de 'loading'
    return toast.promise(uploadAndInsert(), {
      loading: 'Criando ticket...',
      success: (newTicket) => {
        setTickets([newTicket, ...tickets]);
        setIsModalOpen(false);
        // Notificar via WebSocket
        socket.emit('ticket_created', newTicket);
        playSound('success');
        return `Ticket #${newTicket.id} criado!`;
      },
      error: (err) => {
        playSound('error');
        return `Erro: ${err.message}`;
      }
    });
  };

  // Notificação por e-mail (fire-and-forget; template branded renderizado no servidor a partir do `email` estruturado)
  const enviarEmail = (to, subject, email, evento) => {
    const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
    if (recipients.length === 0) return;
    fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: recipients, subject, email, evento }) })
      .catch(e => console.warn('Falha ao notificar por e-mail:', e));
  };

  // E-mails dos responsáveis do setor de destino (+ do sub-setor, se houver) — a demanda é do setor, não de um indivíduo
  const emailsDosResponsaveis = (ticket) => {
    const ids = new Set();
    const setor = setoresList.find(s => s.id === ticket.setor_id);
    (Array.isArray(setor?.primary_responsibles) ? setor.primary_responsibles : []).forEach(id => ids.add(id));
    const sys = systemsList.find(s => String(s.id) === String(ticket.platform));
    (Array.isArray(sys?.primary_responsibles) ? sys.primary_responsibles : []).forEach(id => ids.add(id));
    return [...ids].map(id => allUsers.find(u => u.id === id)?.email).filter(Boolean);
  };

  const updateTicketDetails = async (ticketIdRaw, updates) => {
    const ticketId = Number(ticketIdRaw);
    const oldTickets = [...tickets];
    
    // Atualização Otimista
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t));

    const atualizar = async () => {
      const oldTicket = oldTickets.find(t => t.id === ticketId);
      const { error } = await api
        .from('tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw new Error(error.message);

      if (oldTicket && updates.responsible !== undefined && oldTicket.responsible !== updates.responsible) {
        await logAction(ticketId, 'RESPONSIBLE_ASSIGNED', oldTicket.responsible || 'Sem atribuição', updates.responsible || 'Sem atribuição');
        // Notificar mudança de responsável
        socket.emit('status_updated', { id: ticketId, ...updates });
      }

      // Histórico do prazo de entrega (aceite e reagendamento após vencer)
      if (oldTicket && updates.delivery_date !== undefined && toDateInput(oldTicket.delivery_date) !== updates.delivery_date) {
        const venceu = isOverdue(oldTicket);
        const oldFmt = oldTicket.delivery_date ? toDateInput(oldTicket.delivery_date) : null;
        if (venceu) await logAction(ticketId, 'DELIVERY_OVERDUE', oldFmt, `Entrega vencida (era ${oldFmt})`);
        await logAction(ticketId, oldFmt ? 'DELIVERY_DATE_CHANGED' : 'DELIVERY_DATE_SET', oldFmt, updates.delivery_date);
      }

      if (oldTicket && updates.status !== undefined && oldTicket.status !== updates.status) {
        await logAction(ticketId, 'STATUS_CHANGED', oldTicket.status, updates.status);
        socket.emit('status_updated', { id: ticketId, status: updates.status });
      }

      if (oldTicket && updates.shared_with !== undefined) {
        const newShares = updates.shared_with.filter(id => !oldTicket.shared_with?.includes(id));
        if (newShares.length > 0) {
          socket.emit('ticket_shared', { ticketId, sharedWith: newShares, title: oldTicket.title });
        }
      }

      // Notificação de alteração: o remetente (criador) é avisado por e-mail quando OUTRO altera a demanda
      if (oldTicket && user?.id !== oldTicket.created_by) {
        const criador = allUsers.find(u => u.id === oldTicket.created_by);
        if (criador?.email) {
          enviarEmail(
            criador.email,
            `Atualização na sua demanda #${ticketId}`,
            (() => {
              const sid = updates.status !== undefined ? updates.status : oldTicket.status;
              const si = statusInfo(sid, setoresList, systemsList);
              return {
                cabecalho: 'Atualização de Ticket', icone: '🔄', ticketId,
                titulo: `#${ticketId} — ${oldTicket.title}`,
                descricao: updates.responsible !== undefined ? `Responsável: ${updates.responsible || 'Sem responsável'}` : undefined,
                situacao: si.name, situacaoCor: si.color || '#0ea5e9',
                assinatura: `Atualizado por ${user?.name || 'a equipe'}`,
              };
            })(),
            'ticket_alterado'
          );
        }
      }
    };

    toast.promise(atualizar(), {
      loading: 'Salvando alterações...',
      success: 'Ticket atualizado!',
      error: (err) => {
        setTickets(oldTickets); // Rollback
        return 'Falha ao atualizar: ' + err.message;
      }
    });
  };

  const updateTicketStatus = async (ticketIdRaw, newStatus) => {
    const ticketId = Number(ticketIdRaw);
    const oldTickets = [...tickets];
    
    // Sair de "Resolvido" (ex.: arrastar de volta) zera a finalização
    const patch = newStatus !== 'resolvido' ? { status: newStatus, finalized: 0 } : { status: newStatus };

    // Atualização Otimista
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...patch } : t));

    try {
      const oldTicket = oldTickets.find(t => t.id === ticketId);
      const { error } = await api
        .from('tickets')
        .update(patch)
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Status atualizado');
      playSound('success');
      
      // Notificar outros sobre a mudança de status
      socket.emit('status_updated', { id: ticketId, status: newStatus });

      if (oldTicket && oldTicket.status !== newStatus) {
        await logAction(ticketId, 'STATUS_CHANGED', oldTicket.status, newStatus);
        // Notificação de alteração: avisa o remetente (criador) por e-mail, se quem moveu não for ele
        if (user?.id !== oldTicket.created_by) {
          const criador = allUsers.find(u => u.id === oldTicket.created_by);
          if (criador?.email) {
            enviarEmail(criador.email, `Atualização na sua demanda #${ticketId}`, {
              cabecalho: 'Atualização de Ticket', icone: '🔄', ticketId,
              titulo: `#${ticketId} — ${oldTicket.title}`,
              situacao: statusInfo(newStatus, setoresList, systemsList).name,
              situacaoCor: statusInfo(newStatus, setoresList, systemsList).color || '#0ea5e9',
              assinatura: `Atualizado por ${user?.name || 'a equipe'}`,
            }, 'ticket_alterado');
          }
        }
      }
    } catch (err) {
      setTickets(oldTickets); // Rollback
      toast.error('Erro ao atualizar status');
    }
  };

  // Criador confirma que a demanda foi de fato resolvida → finaliza (fica opaca em "Resolvido")
  const finalizarTicket = async (ticket) => {
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, finalized: 1 } : t));
    const { error } = await api.from('tickets').update({ finalized: 1 }).eq('id', ticket.id);
    if (error) { setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, finalized: 0 } : t)); toast.error('Erro ao finalizar.'); return; }
    socket.emit('status_updated', { id: ticket.id, status: 'resolvido' }); // outros refazem o fetch e veem opaco
    logAction(ticket.id, 'STATUS_CHANGED', 'resolvido', 'finalizado');
    toast.success('Demanda finalizada'); playSound('success');
  };

  // Criador diz que NÃO foi resolvido → observação vai pro chat de quem aceitou e o ticket volta p/ Análise
  const reabrirTicket = async (ticket, motivo) => {
    const txt = (motivo || '').trim();
    if (!txt) { toast.error('Descreva o que ainda falta.'); return; }
    const msg = `❌ Não resolvido — ${txt}`;
    const { error } = await api.from('ticket_messages').insert([{ ticket_id: ticket.id, user_id: user.id, message: msg, attachments: [] }]);
    if (error) { toast.error('Erro ao enviar a observação.'); return; }
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: 'analise', finalized: 0 } : t));
    await api.from('tickets').update({ status: 'analise', finalized: 0 }).eq('id', ticket.id);
    logAction(ticket.id, 'STATUS_CHANGED', 'resolvido', 'analise');
    socket.emit('status_updated', { id: ticket.id, status: 'analise' });
    const destino = allUsers.find(u => u.name === ticket.responsible)?.id;
    socket.emit('ticket_message', { ticketId: ticket.id, from: user.name, toUserId: destino }); // some no chat de quem aceitou (+ contador)
    toast.success('Observação enviada ao responsável'); playSound('success');
  };

  const deleteTicket = (id) => {
    requestConfirm(
      'Excluir Ticket',
      'Tem certeza que deseja remover este ticket permanentemente?',
      async () => {
        try {
          const { error } = await api.from('tickets').delete().eq('id', id);
          if (error) throw error;
          setTickets(prev => prev.filter(t => t.id !== id)); // update funcional (evita closure stale)
          socket.emit('ticket_deleted', { id }); // avisa os outros clientes (some do Kanban/lista deles)
          toast.success('Ticket excluído');
        } catch (err) {
          toast.error('Erro ao excluir: ' + err.message);
        }
      }
    );
  };

  const handleDeleteUser = (uId, uName) => {
    if (uId === user.id) {
      toast.error("Não é possível remover a si mesmo.");
      return;
    }
    requestConfirm(
      'Remover Membro',
      `Deseja remover ${uName} da equipe? Esta ação não pode ser desfeita.`,
      async () => {
        const { error } = await api.from('users').delete().eq('id', uId);
        if (!error) {
          toast.success('Usuário removido');
          fetchUsersList();                 // atualiza a lista na hora, sem recarregar a página
          socket.emit('users_changed');     // avisa os outros clientes conectados
        } else {
          toast.error('Erro ao remover usuário.');
        }
      }
    );
  };

  // Abre o modal de detalhes completo (busca anexos sob demanda)
  const openTicketDetails = async (t, readOnly = false) => {
    setDetalheReadOnly(readOnly);
    // "visto" (não-lidas) agora é marcado só ao ABRIR O CHAT (página separada), não ao abrir os detalhes.
    // Mas registra a última visualização do RESPONSÁVEL (read receipt p/ o criador).
    if (user?.name === t.responsible) {
      const iso = new Date().toISOString();
      const mysqlFmt = iso.slice(0, 19).replace('T', ' '); // 'YYYY-MM-DD HH:MM:SS' em UTC p/ o DATETIME
      api.from('tickets').update({ responsible_seen_at: mysqlFmt }).eq('id', t.id).then(undefined, () => {}); // o builder é thenable, não tem .catch
      setTickets(prev => prev.map(x => x.id === t.id ? { ...x, responsible_seen_at: iso } : x)); // local em ISO (UTC) p/ o tempo relativo
    }
    // Abre a página JÁ (attachments = null → skeleton) e busca os anexos (base64 pesado) em 2º plano.
    setViewingTicket({ ...t, attachments: null });
    playSound('open');
    if (isManager(user?.role)) logAction(t.id, 'TICKET_VIEWED_FIRST_TIME', null, null);
    api.from('tickets').select('attachments').eq('id', t.id).single().then(
      ({ data }) => setViewingTicket(prev => (prev && prev.id === t.id) ? { ...prev, attachments: data?.attachments || [] } : prev),
      () => setViewingTicket(prev => (prev && prev.id === t.id) ? { ...prev, attachments: [] } : prev)
    );
  };

  // Passo 1: clique num ticket em Backlog → gate de aceite. Demais → abre os detalhes (passo 2).
  const requestOpenTicket = (t) => {
    // Quem CRIOU o ticket não aceita/recusa/edita: abre só o acompanhamento (fase, aceite, direcionamento).
    if (t.created_by === user?.id) { setStatusView(t); return; }
    const canManage = isManager(user?.role);
    if (!canManage) {
      // solicitante (criador), quem recebeu a demanda (responsável) ou compartilhado abre a visão de leitura + chat, sem gate de aceite
      const podeVer = t.created_by === user?.id || t.responsible === user?.name || (Array.isArray(t.shared_with) && t.shared_with.includes(user?.id));
      if (podeVer) { openTicketDetails(t); return; }
      // demanda ABERTA ao setor → funcionário do setor pode PUXAR (aceitar)
      if (t.open_pool && t.status === 'backlog' && noSetor(user, t.setor_id, systemsList)) { setAcceptGate(t); return; }
      return;
    }
    if (t.status === 'backlog') { setAcceptGate(t); return; }
    openTicketDetails(t);
  };

  // Aceite (passo 1 → 2): move pra Análise, vira responsável e fecha o "aberto ao setor" (open_pool)
  const aceitarDoGate = (t) => {
    const upd = { status: 'analise', responsible: t.responsible || user.name, open_pool: 0 };
    updateTicketDetails(t.id, upd);
    setAcceptGate(null);
    openTicketDetails({ ...t, ...upd });
  };

  const recusarDoGate = (t) => {
    updateTicketDetails(t.id, { status: 'negado' });
    toast.success('Ticket recusado.');
    setAcceptGate(null);
  };

  // Encaminhar: direciona a demanda a um colaborador do setor (ele passa a ser o responsável) e sai do backlog.
  const encaminharDoGate = (t, nome) => {
    if (!nome) return;
    updateTicketDetails(t.id, { responsible: nome, status: 'analise' });
    const alvo = allUsers.find(u => u.name === nome);
    socket.emit('ticket_assigned', { ticketId: t.id, toUserId: alvo?.id, from: user.name, title: t.title });
    toast.success(`Encaminhado para ${nome}.`);
    setAcceptGate(null);
  };

  // Abrir para o setor: marca open_pool → os colaboradores do setor VEEM e podem PUXAR (aceitar). Segue no backlog, sem dono.
  const abrirSetorDoGate = (t) => {
    updateTicketDetails(t.id, { open_pool: 1, responsible: null });
    const setor = setoresList.find(s => s.id === t.setor_id);
    socket.emit('ticket_broadcast', { ticketId: t.id, setorId: t.setor_id, setorName: setor?.name, from: user.name, title: t.title });
    toast.success('Aberto ao setor — colaboradores disponíveis podem puxar a demanda.');
    setAcceptGate(null);
  };

  // Deep-link do e-mail: #/ticket/<id> → abre o ticket quando logado e os tickets já carregaram
  useEffect(() => {
    const m = hash.match(/^#\/ticket\/(\d+)/);
    if (!m || !user || tickets.length === 0) return;
    const t = tickets.find(x => x.id === Number(m[1]));
    if (t) { requestOpenTicket(t); window.location.hash = ''; }
  }, [hash, user, tickets]);

  // Visibilidade por hierarquia (setor/sub-setor + afiliados diretos). ponytail: regra client-side, como o resto do app.
  const visibleTickets = tickets.filter(t => canSeeTicket(t, user, setoresList, systemsList, true, allUsers));

  const filteredTickets = visibleTickets.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toString().toLowerCase().includes(search.toLowerCase())
  );

  // No Kanban, quem só ENVIOU (criou, sem atender o escopo) não vê o card — continua vendo na aba Tickets.
  // (includeOwn=false: ignora o "abri este ticket"; admin/escopo/compartilhado seguem valendo)
  const kanbanTickets = filteredTickets.filter(t => canSeeTicket(t, user, setoresList, systemsList, false, allUsers));
  const pedidosCount = kanbanTickets.filter(t => t.status === 'backlog').length; // acumulado na coluna Pedidos (badge no menu Kanban)

  // Aba "Ticket": admin vê TODOS; os demais veem os que ENVIARAM (criaram) + os que o SETOR/SUB-SETOR de
  // origem enviou (conforme a política origin_visibility do setor). Recebidos ficam no Kanban.
  const enviadosTickets = user?.role === 'admin'
    ? filteredTickets
    : filteredTickets.filter(t => t.created_by === user?.id || seVePorOrigem(t, user, setoresList, systemsList));

  // Rota pública de redefinição de senha (link do e-mail)
  if (hash.startsWith('#/reset/')) {
    return <ResetScreen hash={hash} theme={theme} />;
  }

  // Rota pública de auto-registro por link (escapa do login obrigatório)
  if (!user && hash.startsWith('#/registro/')) {
    return <RegistroScreen hash={hash} theme={theme} />;
  }

  // Auth Screen centralizada — login OBRIGATÓRIO: sem sessão, ninguém entra nem cria ticket
  if (!user) {
    return (
      <div data-theme={theme} className="login-page">
        <div style={{ position: 'fixed', top: '2rem', right: '2rem' }}>
          <button className="btn btn-ghost" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
          </button>
        </div>
        <LoginScreen theme={theme} onLogin={(userData) => {
          // /api/login já marcou is_online + registrou o log com IP; aqui só guarda a sessão
          localStorage.setItem('currentUser', JSON.stringify(userData));
          setUser(userData);
          window.location.hash = '';
        }} />
        <AppFooter />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' } }} />

      {/* Esconde a navbar em telas de detalhamento (detalhe do ticket / chat) — foco total; volta pelo botão Voltar */}
      {!(chatTicket || viewingTicket) && (
        <AppHeader
          currentView={view}
          setView={(v) => {
            playSound('open');
            setView(v);
          }}
          user={user}
          theme={theme}
          toggleTheme={toggleTheme}
          onLogout={handleLogout}
          badges={{ kanban: pedidosCount }}
        />
      )}

      <div className="app-layout">
        <main className="content-area">
          {chatTicket ? (
            <TicketChatPage ticket={chatTicket} user={user} allUsers={allUsers} setores={setoresList} systems={systemsList} onBack={() => setChatTicket(null)} />
          ) : viewingTicket ? (
            <TicketDetailsModal
              asPage
              readOnly={detalheReadOnly}
              ticket={viewingTicket}
              unread={unreadByTicket[viewingTicket.id] || 0}
              onOpenChat={() => { marcarVisto(viewingTicket.id); setChatTicket(viewingTicket); }}
              onClose={() => { playSound('close'); setViewingTicket(null); setDetalheReadOnly(false); }}
              onUpdate={updateTicketDetails}
              systems={systemsList}
              setores={setoresList}
              allUsers={allUsers}
              user={user}
            />
          ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              {view === 'chat' ? (
                <ChatInboxPage
                  conversas={chatConversas}
                  user={user}
                  allUsers={allUsers}
                  setores={setoresList}
                  systems={systemsList}
                  unreadByTicket={unreadByTicket}
                  lastMsgByTicket={lastMsgByTicket}
                  onVisto={marcarVisto}
                  onSair={() => setView('tickets')}
                />
              ) : view === 'tickets' ? (
                <UserDashboard
                  tickets={enviadosTickets}
                  isLoading={loading}
                  onOpenModal={() => setIsModalOpen(true)}
                  search={search}
                  setSearch={setSearch}
                  onDelete={deleteTicket}
                  onTicketClick={requestOpenTicket}
                  user={user}
                  systems={systemsList}
                  setores={setoresList}
                  unread={unreadByTicket}
                  allUsers={allUsers}
                />
              ) : view === 'users' ? (
                <UsersView user={user} onDeleteUser={handleDeleteUser} fetchUsers={fetchUsersList} allUsers={allUsers} setores={setoresList} systems={systemsList} />
              ) : view === 'setores' ? (
                <SetoresView user={user} setores={setoresList} systems={systemsList} allUsers={allUsers} onUpdate={async () => {
                  await fetchSetores();
                  await fetchUsersList(); // equipe (cargo/lotação) mudou → recarrega usuários
                  socket.emit('users_changed'); // propaga config do setor (origin_visibility/auto_pool/equipe) em tempo real
                }} />
              ) : view === 'kanban' ? (
                <DevKanban
                  tickets={kanbanTickets}
                  isLoading={loading}
                  onUpdateStatus={updateTicketStatus}
                  onUpdateUrgency={(tid, urg) => updateTicketDetails(tid, { urgency: urg })}
                  user={user}
                  allUsers={allUsers}
                  systems={systemsList}
                  setores={setoresList}
                  onOpenModal={() => setIsModalOpen(true)}
                  onTicketClick={requestOpenTicket}
                  onEstruturaChange={async () => {
                    const { data: setData } = await api.from('setores').select('*').order('name');
                    setSetoresList(setData || []);
                    const { data: sysData } = await api.from('systems').select('*');
                    if (sysData) setSystemsList(sysData);
                  }}
                />
              ) : view === 'analytics' ? (
                <AnalyticsDashboard tickets={filteredTickets} setores={setoresList} user={user} />
              ) : view === 'logs' ? (
                <LogsView />
              ) : view === 'config' ? (
                <ConfigView />
              ) : view === 'profile' ? (
                <ProfileView user={user} onUpdate={(updated) => { setUser(updated); localStorage.setItem('currentUser', JSON.stringify(updated)); setView('tickets'); }} />
              ) : (
                <div style={{ padding: '2rem' }}>Página não encontrada.</div>
              )}
            </motion.div>
          </AnimatePresence>
          )}
        </main>
        <AppFooter />
      </div>

      {/* Bolha de conversas: em todas as telas, some quando a inbox (view 'chat') está aberta */}
      {user && view !== 'chat' && (
        <button
          onClick={() => { setChatTicket(null); setViewingTicket(null); setView('chat'); playSound('open'); }}
          title="Conversas"
          style={{ position: 'fixed', right: '1.5rem', bottom: '1.5rem', zIndex: 1200, width: '58px', height: '58px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--primary)', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <MessageSquare size={24} />
          {totalUnreadChat > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', minWidth: '22px', height: '22px', padding: '0 6px', borderRadius: '999px', background: '#ef4444', color: '#fff', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>
              {totalUnreadChat > 99 ? '99+' : totalUnreadChat}
            </span>
          )}
        </button>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <TicketModal
            onClose={() => {
              playSound('close');
              setIsModalOpen(false);
            }}
            onSubmit={addTicket}
            systems={systemsList}
            setores={setoresList}
            user={user}
            allUsers={allUsers}
          />
        )}
        {/* Detalhes do ticket agora abrem como TELA (content-area), não como modal — ver acima */}
      </AnimatePresence>

      {/* Gates FORA do AnimatePresence: portais desmontam na hora (evita overlay preso ao trocar de modal) */}
      {acceptGate && (
        <AcceptGateModal
          ticket={acceptGate}
          puxar={!isManager(user?.role)}
          colaboradores={(user?.role === 'admin'
            ? colaboradoresDoSetor(acceptGate.setor_id, setoresList, systemsList, allUsers).map(id => allUsers.find(u => u.id === id))
            : afiliadosDe(user?.id, allUsers)               // gerente/resp: só direciona p/ seus afiliados diretos
          ).map(u => u?.name).filter(n => n && n !== user?.name)}
          onAccept={() => aceitarDoGate(acceptGate)}
          onEncaminhar={(nome) => encaminharDoGate(acceptGate, nome)}
          onAbrirSetor={() => abrirSetorDoGate(acceptGate)}
          onReject={() => recusarDoGate(acceptGate)}
          onClose={() => setAcceptGate(null)}
        />
      )}

      {statusView && (
        <TicketStatusModal
          ticket={tickets.find(t => t.id === statusView.id) || statusView}
          setores={setoresList}
          systems={systemsList}
          user={user}
          allUsers={allUsers}
          onClose={() => setStatusView(null)}
          onOpenChat={(t) => { marcarVisto(t.id); setStatusView(null); setChatTicket(t); }}
          onDelete={(t) => { setStatusView(null); deleteTicket(t.id); }}
          onVerEnvio={(t) => { setStatusView(null); openTicketDetails(t, true); }}
          onFinalize={(t) => { setStatusView(null); finalizarTicket(t); }}
          onReopen={(t, motivo) => { setStatusView(null); reabrirTicket(t, motivo); }}
        />
      )}

      <ConfirmationModal config={confirmConfig} onClose={closeConfirm} />
    </>
  );
}

// --- Dashboard do Usuário ---
// Data de entrega (DATE do MySQL vem como ISO) → 'YYYY-MM-DD' local p/ <input type="date">
// Fuso oficial do sistema: tudo é EXIBIDO em São Paulo (-03), independentemente de onde o usuário está.
const TZ_SP = 'America/Sao_Paulo';
const fmtDataSP = (d, opts) => new Date(d).toLocaleDateString('pt-BR', { timeZone: TZ_SP, ...opts });
const fmtHoraSP = (d, opts = { hour: '2-digit', minute: '2-digit' }) => new Date(d).toLocaleTimeString('pt-BR', { timeZone: TZ_SP, ...opts });
const fmtDataHoraSP = (d, opts) => new Date(d).toLocaleString('pt-BR', { timeZone: TZ_SP, ...opts });
// delivery_date é data-calendário ('YYYY-MM-DD', sem hora) — mostra o dia gravado, sem deslocar por fuso.
const fmtDataPura = (d) => { const s = String(d).slice(0, 10).split('-'); return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : String(d); };

function toDateInput(d) {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10); // DATE já vem 'YYYY-MM-DD'
  return new Date(d).toLocaleDateString('en-CA', { timeZone: TZ_SP }); // Date real (ex.: hoje) → data de hoje em SP (YYYY-MM-DD)
}

// Ticket vencido: passou da data de entrega e ainda está aberto (não resolvido/negado/repassado)
function isOverdue(ticket) {
  const fechados = ['resolvido', 'negado', 'repassado'];
  if (!ticket.delivery_date || fechados.includes(ticket.status)) return false;
  const due = new Date(`${String(ticket.delivery_date).slice(0, 10)}T23:59:59-03:00`); // fim do dia da entrega em SP
  return new Date() > due;
}

// Setor de origem do ticket (de quem abriu)
function ticketOrigem(ticket, setores = []) {
  return setores.find(s => s.id == ticket.origin_setor_id)?.name || '';
}

// Rótulo de destino do ticket: "Setor" (setor sem categorias) ou "Setor › Categoria"
function ticketDestino(ticket, setores = [], systems = []) {
  const setor = setores.find(s => s.id == ticket.setor_id);
  const sistema = ticket.platform ? systems.find(p => p.id == ticket.platform) : null;
  const setorNome = setor?.name || (ticket.setor_id ? `#${ticket.setor_id}` : '');
  const sistemaNome = sistema?.name || (ticket.platform || '');
  if (setorNome && sistemaNome) return `${setorNome} › ${sistemaNome}`;
  return setorNome || sistemaNome || '—';
}

// Badge do tipo do ticket (definido na Análise): Bug / Melhoria
function TipoBadge({ ticket, size = '0.6rem' }) {
  const tt = TICKET_TYPES.find(x => x.id === ticket.ticket_type);
  if (!tt) return null;
  return (
    <span style={{ fontSize: size, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '2px 7px', borderRadius: '5px', background: `${tt.color}22`, color: tt.color, border: `1px solid ${tt.color}55`, whiteSpace: 'nowrap' }}>
      {tt.name}
    </span>
  );
}

// --- Skeletons (pré-visualização com shimmer enquanto carrega) ---
function Skeleton({ w = '100%', h = 14, r = 8, style }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />;
}
function SkeletonTicketRow() {
  return (
    <div className="glass ticket-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          <Skeleton w={34} h={12} /><Skeleton w={44} h={10} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <Skeleton w={210} h={16} /><Skeleton w={150} h={11} />
        </div>
      </div>
      <Skeleton w={120} h={30} r={8} />
    </div>
  );
}
function SkeletonKanbanCard() {
  return (
    <div className="glass kanban-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '9px' }}>
      <Skeleton w={40} h={10} /><Skeleton w="85%" h={14} /><Skeleton w="55%" h={10} />
    </div>
  );
}

// Ordena por URGÊNCIA (máxima → grave → moderado → leve) — quanto mais urgente, mais acima.
// Estável: dentro da mesma urgência preserva a ordem de entrada (created_at). Padrão em todas as colunas/listas.
const RANK_URGENCIA = { maxima: 4, grave: 3, moderado: 2, leve: 1 };
const maximaPrimeiro = (arr) => [...(arr || [])].sort((a, b) => (RANK_URGENCIA[b.urgency] || 0) - (RANK_URGENCIA[a.urgency] || 0));

function UserDashboard({ tickets, onOpenModal, search, setSearch, onDelete, onTicketClick, user, systems, setores, isLoading, unread = {}, allUsers = [] }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [, setTick] = useState(0); // re-render periódico p/ o tempo relativo ("há X min") avançar sozinho

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const id = setInterval(() => setTick(t => t + 1), 30000); // atualiza "visualizado há X" a cada 30s
    return () => { window.removeEventListener('resize', handleResize); clearInterval(id); };
  }, []);

  // Compartilhar a demanda no WhatsApp (resumo em texto → wa.me)
  const compartilharWpp = (t) => {
    const setorNome = setores.find(s => s.id == t.setor_id)?.name;
    const linhas = [
      `*Demanda #${t.id}* — ${t.title}`,
      `Status: ${statusInfo(t.status, setores, systems).name}`,
      setorNome ? `Setor: ${setorNome}` : null,
      donoVisivel(t) ? `Responsável: ${donoVisivel(t)}` : 'Aguardando aceite',
      t.delivery_date ? `Entrega: ${fmtDataPura(t.delivery_date)}` : null,
    ].filter(Boolean);
    window.open(`https://wa.me/?text=${encodeURIComponent(linhas.join('\n'))}`, '_blank');
  };

  return (
    <div className="user-dashboard-view">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar tickets..."
            style={{ paddingLeft: '40px', marginTop: 0 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => {
          playSound('open');
          onOpenModal();
        }}>
          <Plus size={18} /> Novo Ticket
        </button>
      </div>

      <div className="tickets-list-container">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonTicketRow key={i} />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhum ticket encontrado.
          </div>
        ) : (
          maximaPrimeiro(tickets).map(ticket => (
            <motion.div
              layout
              key={ticket.id}
              className="glass ticket-card"
              style={{ 
                padding: '1.25rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                cursor: (isManager(user?.role) || ticket.created_by === user?.id || (Array.isArray(ticket.shared_with) && ticket.shared_with.includes(user?.id))) ? 'pointer' : 'default',
                borderLeft: isOverdue(ticket) ? '4px solid #ef4444' : (ticket.created_by !== user?.id ? '4px solid var(--primary)' : 'none'),
                opacity: ticket.finalized ? 0.6 : 1 // finalizado → aspecto opaco
              }}
              onClick={() => onTicketClick(ticket)}
            >
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem', display: 'block' }}>#{ticket.id}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{fmtDataSP(ticket.created_at)}</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {ticket.urgency === URGENCIA_MAXIMA && (
                      <span style={{ background: '#b91c1c', color: 'white', padding: '1px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                        🚨 Máxima
                      </span>
                    )}
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>{ticket.title}</h3>
                    {unread[ticket.id] > 0 && (
                      <span title={`${unread[ticket.id]} mensagem(ns) não lida(s)`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#4f46e5', color: 'white', padding: '2px 8px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: '800' }}>
                        <MessageSquare size={11} /> {unread[ticket.id]}
                      </span>
                    )}
                    {ticket.created_by !== user?.id && ticket.responsible !== user?.name && Array.isArray(ticket.shared_with) && ticket.shared_with.includes(user?.id) && (
                      <span style={{ background: 'var(--primary)', color: 'white', padding: '1px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                        Compartilhado
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', rowGap: '4px' }}>
                    <div className="card-info-row">
                      <LayoutDashboard size={12} /> {ticketDestino(ticket, setores, systems)}
                    </div>
                    <div className="card-info-row" title="Quem abriu o chamado">
                      <UserPlus size={12} /> enviado por {allUsers.find(u => u.id === ticket.created_by)?.name || '—'}
                    </div>
                    <div className="card-info-row">
                      <UserIcon size={12} /> {ticket.responsible_seen_at ? `visualizado ${tempoRelativo(ticket.responsible_seen_at)}` : 'não visualizado'}
                    </div>
                    {ticket.delivery_date && (
                      <div className="card-info-row" style={{ color: isOverdue(ticket) ? '#ef4444' : undefined, fontWeight: isOverdue(ticket) ? 700 : undefined }}>
                        <Calendar size={12} /> Entrega {fmtDataPura(ticket.delivery_date)}{isOverdue(ticket) ? ' • vencido' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="user-dash-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.05)', padding: '4px 10px', borderRadius: '8px', width: 'fit-content' }}>
                    <UserIcon size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: '500' }}>{donoVisivel(ticket) || 'Aguardando aceite'}</span>
                    {donoVisivel(ticket) && (() => {
                      const ru = allUsers.find(u => u.name === ticket.responsible);
                      return <span title={ru?.is_online ? 'Online' : 'Offline'} style={{ width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0, background: ru?.is_online ? '#10b981' : '#ef4444' }} />;
                    })()}
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); compartilharWpp(ticket); }} title="Compartilhar no WhatsApp"
                    style={{ background: 'none', border: 'none', color: '#25D366', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                    <WhatsAppIcon size={18} />
                  </button>

                  {user && user.role === 'admin' && (
                    <button
                      className="btn-trash-mini"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(ticket.id);
                      }}
                      title="Excluir Ticket"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {!!ticket.finalized && (
                    <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      ✓ Finalizado
                    </span>
                  )}
                  {(() => {
                    // Coluna personalizada → mesma dupla do detalhe: base "Resolvendo" + "Etapa: <nome>"
                    const fixos = [...DEV_STATUS, ...OTHER_STATUS].map(s => s.id);
                    const ehCustom = ticket.status && !fixos.includes(ticket.status);
                    if (!ehCustom) return <StatusBadge id={ticket.status} setores={setores} systems={systems} />;
                    const et = statusInfo(ticket.status, setores, systems);
                    return (
                      <>
                        <StatusBadge id="resolvendo" setores={setores} systems={systems} />
                        <span className="badge" style={{ backgroundColor: (et.color || '#6366f1') + '20', color: et.color || '#6366f1', border: `1px solid ${(et.color || '#6366f1')}40` }}>
                          Etapa: {et.name}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// Ordenação por coluna do Kanban
const SORT_OPTIONS = [
  { key: 'chegada', label: 'Data de chegada' },
  { key: 'entrega', label: 'Data de entrega' },
  { key: 'alfabetica', label: 'Alfabética (título)' },
  { key: 'urgencia', label: 'Urgência' },
];

function sortColumn(arr, key, dir = 'asc') {
  if (!key) return arr; // sem ordenação → mantém a ordem padrão (mais recente)
  const sign = dir === 'desc' ? -1 : 1;
  const a = [...arr];
  a.sort((x, y) => {
    if (key === 'entrega') {
      const nx = !x.delivery_date, ny = !y.delivery_date;
      if (nx && ny) return 0;
      if (nx) return 1;   // sem prazo sempre por último, em qualquer direção
      if (ny) return -1;
      return sign * (new Date(x.delivery_date) - new Date(y.delivery_date));
    }
    if (key === 'chegada') return sign * (new Date(x.created_at) - new Date(y.created_at));
    if (key === 'alfabetica') return sign * (x.title || '').localeCompare(y.title || '');
    if (key === 'urgencia') { const r = { leve: 1, moderado: 2, grave: 3, maxima: 4 }; return sign * ((r[x.urgency] ?? 0) - (r[y.urgency] ?? 0)); }
    return 0;
  });
  return a;
}

// Dica secundária por tipo de ordenação (usada na prévia em texto)
function sortHint(t, key) {
  if (key === 'entrega') return t.delivery_date ? fmtDataPura(t.delivery_date) : 'sem prazo';
  if (key === 'chegada') return fmtDataSP(t.created_at);
  if (key === 'urgencia') return URGENCY_LEVELS.find(u => u.id === t.urgency)?.name || t.urgency;
  return '';
}

function ColumnSortModal({ columnName, tickets, initialKey, initialDir, onApply, onClose }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [key, setKey] = useState(initialKey || 'chegada');
  const [dir, setDir] = useState(initialDir || 'asc');
  if (!mounted) return null;
  const ordered = sortColumn(tickets, key, dir);
  const preview = ordered.slice(0, 6);
  return createPortal(
    <div className="overlay" style={{ alignItems: 'center', padding: '1rem' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass modal" style={{ width: '440px', maxWidth: '94vw', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
        {/* Topo: qual coluna está sendo ordenada */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>Ordenar coluna</span>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowUpDown size={18} color="var(--primary)" /> {columnName}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Selects: tipo de ordem + direção */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Ordenar por</label>
            <select value={key} onChange={e => setKey(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Direção</label>
            <select value={dir} onChange={e => setDir(e.target.value)}>
              <option value="asc">Crescente</option>
              <option value="desc">Decrescente</option>
            </select>
          </div>
        </div>

        {/* Prévia em texto de como a coluna vai ficar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>Prévia da coluna</div>
          {preview.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem tickets nesta coluna.</div>
          ) : (
            <ol style={{ margin: 0, paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
              {preview.map(t => (
                <li key={t.id}>
                  <span style={{ fontWeight: 600 }}>{t.title}</span>
                  {sortHint(t, key) && <span style={{ color: 'var(--text-muted)' }}> — {sortHint(t, key)}</span>}
                </li>
              ))}
              {ordered.length > preview.length && <li style={{ listStyle: 'none', marginLeft: '-1.4rem', color: 'var(--text-muted)' }}>… +{ordered.length - preview.length} outros</li>}
            </ol>
          )}
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onApply(key, dir)}>Aplicar ordenação</button>
      </motion.div>
    </div>,
    document.body
  );
}

// Corpo da coluna: preenche toda a altura da coluna e rola verticalmente (scroll invisível) quando há muitos cards.
function ColunaScroll({ children }) {
  return (
    <div className="hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
      {children}
    </div>
  );
}

// --- Kanban do Desenvolvedor ---
function DevKanban({ tickets, onUpdateStatus, onUpdateUrgency, user, onTicketClick, systems, setores, allUsers, isLoading, onOpenModal, onEstruturaChange }) {
  const [sortModal, setSortModal] = useState(null);   // id da coluna com modal de ordenação aberto
  const [columnSort, setColumnSort] = useState({});   // { [columnId]: sortKey }
  const [filterSearch, setFilterSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const [novaColuna, setNovaColuna] = useState(null); // { alvo:'setores:1'|'systems:2', nome, cor } | null

  // Drag-and-drop nas etapas finais (Pedidos/Análise seguem o fluxo por passos) + colunas customizadas
  const DRAG_STAGES = ['resolvendo', 'resolvido'];

  const hexToRgb = (hex) => {
    if (!hex) return '0,0,0';
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0,0,0';
  };

  let visibleTickets = tickets;
  if (filterSearch) {
    const s = filterSearch.toLowerCase();
    visibleTickets = visibleTickets.filter(t => t.title.toLowerCase().includes(s) || t.id.toString().includes(s));
  }
  if (filterPlatform) {
    visibleTickets = visibleTickets.filter(t => t.platform === filterPlatform);
  }
  if (filterUrgency) {
    visibleTickets = visibleTickets.filter(t => t.urgency === filterUrgency);
  }
  if (filterResponsible) {
    visibleTickets = visibleTickets.filter(t => t.responsible === filterResponsible);
  }

  // --- Colunas customizadas (Caminho 1: base + extras antes de "Resolvido"), por setor e por sub-setor ---
  const ehAdmin = user?.role === 'admin';
  const meusSetores = ehAdmin ? setores : setores.filter(s => leadSetorIds(user, setores).includes(s.id));
  const meusSubsetores = ehAdmin ? systems : systems.filter(s => leadSystemIds(user, systems).includes(s.id));
  const podeGerenciarColunas = ehAdmin || meusSetores.length > 0 || meusSubsetores.length > 0;

  // --- Escopo dos filtros do Kanban por papel ---
  const ehFunc = user?.role === 'funcionario';
  const meuSetorIds = meusSetores.map(s => s.id);   // setores que ele lidera (admin = todos)
  const meuSubIds = meusSubsetores.map(s => s.id);  // sub-setores que ele lidera
  // Sub-setores no filtro: admin = todos; funcionário = só os que ele tem acesso; gerente/resp = só do seu escopo.
  const subsFiltro = ehAdmin ? systems
    : ehFunc ? systems.filter(sy => userSystemIds(user).includes(String(sy.id)))
    : systems.filter(sy => meuSetorIds.includes(sy.setor_id) || meuSubIds.includes(sy.id));
  const subIdsEscopo = new Set(subsFiltro.map(s => String(s.id)));
  // Com um único sub-setor no escopo, já o seleciona (mostra qual está visualizando e carrega as colunas dele).
  useEffect(() => {
    if (subsFiltro.length === 1 && !filterPlatform) setFilterPlatform(String(subsFiltro[0].id));
  }, [subsFiltro.length, filterPlatform]);
  // Responsáveis no filtro: funcionário não vê; admin = todos; gerente/resp = só os do seu escopo.
  const respsFiltro = ehAdmin ? allUsers.filter(u => isManager(u.role))
    : allUsers.filter(u => isManager(u.role) && (
        (u.role === 'gerente' && meuSetorIds.includes(u.setor_id)) ||
        (u.role === 'responsavel_subsetor' && subIdsEscopo.has(String(u.system_id)))
      ));

  // Regras das colunas custom no board:
  //  - Sub-setor selecionado → colunas do sub-setor + do setor pai.
  //  - Nenhum sub-setor no escopo (setor sem sub-setores) → colunas personalizadas do próprio setor.
  //  - Há sub-setores mas nenhum selecionado → só as 4 fixas (evita bagunça); tickets em coluna custom colapsam em "Resolvendo".
  const subSelecionado = filterPlatform ? systems.find(s => String(s.id) === String(filterPlatform)) : null;
  let customBrutas = [];
  if (subSelecionado) {
    const setorPai = setores.find(s => String(s.id) === String(subSelecionado.setor_id));
    const doSub = (Array.isArray(subSelecionado.colunas) ? subSelecionado.colunas : []).map(c => ({ ...c, _tipo: 'systems', _ownerId: subSelecionado.id }));
    const doSetor = (Array.isArray(setorPai?.colunas) ? setorPai.colunas : []).map(c => ({ ...c, _tipo: 'setores', _ownerId: setorPai.id }));
    customBrutas = [...doSub, ...doSetor];
  } else if (subsFiltro.length === 0) {
    // Setor sem sub-setores: mostra as colunas do(s) setor(es) do usuário (com ticket visível ou que ele lidera).
    const setorIdsBoard = new Set(visibleTickets.map(t => t.setor_id).filter(x => x != null).map(String));
    setores.forEach(s => {
      if (setorIdsBoard.has(String(s.id)) || meusSetores.some(m => m.id === s.id)) {
        (Array.isArray(s.colunas) ? s.colunas : []).forEach(c => customBrutas.push({ ...c, _tipo: 'setores', _ownerId: s.id }));
      }
    });
  }
  const vistos = new Set();
  const customUnicas = customBrutas.filter(c => !vistos.has(c.id) && vistos.add(c.id));
  const idxResolvido = DEV_STATUS.findIndex(c => c.id === 'resolvido');
  const colunas = [...DEV_STATUS.slice(0, idxResolvido), ...customUnicas, ...DEV_STATUS.slice(idxResolvido)];
  const idsCustom = new Set(customUnicas.map(c => c.id));
  const idsVisiveis = new Set(colunas.map(c => c.id));
  const FIXED_STATUS_IDS = new Set([...DEV_STATUS.map(s => s.id), ...OTHER_STATUS.map(s => s.id)]);
  const isCustomStatus = (st) => !!st && !FIXED_STATUS_IDS.has(st);
  // Etapa colapsada: ticket numa coluna custom que NÃO está visível agora → é exibido em "Resolvendo".
  const ehEtapaColapsada = (t) => isCustomStatus(t.status) && !idsVisiveis.has(t.status);
  const colunaVisualDoTicket = (t) => ehEtapaColapsada(t) ? 'resolvendo' : t.status;
  const podeArrastar = (id) => DRAG_STAGES.includes(id) || idsCustom.has(id);

  const handleDragStart = (e, ticket) => {
    if (!podeArrastar(ticket.status)) { e.preventDefault(); return; }
    setDraggedTicket(ticket);
    e.dataTransfer.setData('ticketId', ticket.id);
  };
  const handleDragOver = (e, columnId) => {
    if (!draggedTicket || !podeArrastar(columnId)) return;
    e.preventDefault();
    setDropTarget(columnId);
  };
  const handleDrop = (e, columnId) => {
    if (!draggedTicket || !podeArrastar(columnId)) return;
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('ticketId');
    if (ticketId && colunaVisualDoTicket(draggedTicket) !== columnId) onUpdateStatus(ticketId, columnId);
    setDraggedTicket(null);
    setDropTarget(null);
  };

  const salvarColuna = async () => {
    const [tipo, idStr] = (novaColuna.alvo || '').split(':');
    const ownerId = Number(idStr);
    const nome = (novaColuna.nome || '').trim();
    if (!tipo || !ownerId || !nome) { toast.error('Escolha o setor/sub-setor e dê um nome à coluna.'); return; }
    const owner = (tipo === 'setores' ? setores : systems).find(x => x.id === ownerId);
    const atual = Array.isArray(owner?.colunas) ? owner.colunas : [];
    const nova = { id: 'col_' + Date.now(), name: nome, color: novaColuna.cor || '#6366f1' };
    const { error } = await api.from(tipo).update({ colunas: [...atual, nova] }).eq('id', ownerId);
    if (error) { toast.error('Erro ao criar coluna.'); return; }
    toast.success('Coluna criada!'); playSound('success');
    setNovaColuna(null);
    onEstruturaChange && onEstruturaChange();
  };

  const excluirColuna = async (column) => {
    if (visibleTickets.some(t => t.status === column.id)) { toast.error('Mova os tickets desta coluna antes de excluir.'); return; }
    const owner = (column._tipo === 'setores' ? setores : systems).find(x => x.id === column._ownerId);
    const restantes = (Array.isArray(owner?.colunas) ? owner.colunas : []).filter(c => c.id !== column.id);
    const { error } = await api.from(column._tipo).update({ colunas: restantes }).eq('id', column._ownerId);
    if (error) { toast.error('Erro ao excluir coluna.'); return; }
    toast.success('Coluna excluída.');
    onEstruturaChange && onEstruturaChange();
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div className="glass" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar no Kanban..."
            style={{ paddingLeft: '36px', marginTop: 0 }}
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
        </div>
        {subsFiltro.length > 0 && (
          <select style={{ flex: '0 0 160px', margin: 0 }} value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
            {subsFiltro.length > 1 && <option value="">Sub-Setores</option>}
            {subsFiltro.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select style={{ flex: '0 0 160px', margin: 0 }} value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
          <option value="">Urgência</option>
          {URGENCY_LEVELS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {!ehFunc && (
          <select style={{ flex: '0 0 160px', margin: 0 }} value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)}>
            <option value="">Responsável</option>
            {respsFiltro.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
        )}
        {podeGerenciarColunas && (
          <button className="btn btn-ghost" style={{ flex: '0 0 auto', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setNovaColuna({ alvo: '', nome: '', cor: '#6366f1' })} title="Criar coluna personalizada no seu setor/sub-setor">
            <PlusCircle size={16} /> Nova coluna
          </button>
        )}
      </div>

      <div className="kanban-board-container" style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden', paddingBottom: '1rem', alignItems: 'stretch' }}>
        {isLoading ? (
          DEV_STATUS.map(column => (
            <div key={column.id} className="kanban-column" style={{ minWidth: '300px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <Skeleton w={90} h={12} /><Skeleton w={18} h={12} r={6} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <SkeletonKanbanCard /><SkeletonKanbanCard />
              </div>
            </div>
          ))
        ) : (
          colunas.map(column => {
            const cs = columnSort[column.id];
            const columnTickets = maximaPrimeiro(sortColumn(visibleTickets.filter(t => colunaVisualDoTicket(t) === column.id), cs?.key, cs?.dir));
            const isTarget = dropTarget === column.id;
            const ehCustom = idsCustom.has(column.id);
            const souDono = ehAdmin || (column._tipo === 'setores' ? meusSetores.some(m => m.id === column._ownerId) : meusSubsetores.some(m => m.id === column._ownerId));

            return (
              <div
                key={column.id}
                className={`kanban-column ${isTarget ? 'drop-active' : ''}`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                style={{ minWidth: '300px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column' }}
              >
                <h3 style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    {ehCustom && <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: column.color || '#6366f1', flex: '0 0 auto' }} />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{column.name}</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{columnTickets.length}</span>
                    <button
                      className="icon-btn"
                      title="Ordenar coluna"
                      onClick={(e) => { e.stopPropagation(); playSound('click'); setSortModal(column.id); }}
                      style={{ display: 'flex', alignItems: 'center', padding: '2px', color: columnSort[column.id] ? 'var(--primary)' : 'var(--text-muted)' }}
                    >
                      <ArrowUpDown size={14} />
                    </button>
                    {ehCustom && souDono && (
                      <button className="icon-btn logout" title="Excluir coluna"
                        onClick={(e) => { e.stopPropagation(); excluirColuna(column); }}
                        style={{ display: 'flex', alignItems: 'center', padding: '2px' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </h3>

                <ColunaScroll>
                  {columnTickets.map(ticket => {
                    const urgencyColor = URGENCY_LEVELS.find(u => u.id === ticket.urgency)?.color || 'transparent';
                    const responsibleUser = allUsers.find(u => u.name === ticket.responsible);
                    const overdue = isOverdue(ticket);
                    const canDrag = podeArrastar(ticket.status);

                    return (
                      <motion.div
                        layout
                        key={ticket.id}
                        draggable={canDrag}
                        onDragStart={(e) => handleDragStart(e, ticket)}
                        onClick={() => onTicketClick(ticket)}
                        className={`glass kanban-card ${ticket.created_by !== user?.id && Array.isArray(ticket.shared_with) && ticket.shared_with.includes(user?.id) ? 'shared-card' : ''}`}
                        style={{
                          padding: '1rem',
                          flexShrink: 0,
                          cursor: canDrag ? 'grab' : 'pointer',
                          borderLeft: `5px solid ${overdue ? '#ef4444' : urgencyColor}`,
                          // tom de fundo decorrente da urgência (mais forte na máxima), some no "leve"
                          background: ticket.urgency && ticket.urgency !== 'leve'
                            ? `color-mix(in srgb, ${overdue ? '#ef4444' : urgencyColor} ${ticket.urgency === 'maxima' ? 16 : ticket.urgency === 'grave' ? 11 : 7}%, var(--surface))`
                            : undefined,
                          boxShadow: overdue ? '0 0 0 2px #ef4444, 0 4px 12px rgba(239,68,68,0.15)' : (ticket.created_by !== user?.id ? '0 0 0 2px var(--primary)40, 0 4px 12px rgba(0,0,0,0.1)' : 'none'),
                          position: 'relative',
                          opacity: ticket.finalized ? 0.55 : 1 // finalizado → aspecto opaco
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px', alignItems: 'center', flexWrap: 'nowrap', height: '20px' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: '700', flexShrink: 0 }}>#{ticket.id}</span>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {!!ticket.finalized && (
                              <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                ✓ Finalizado
                              </span>
                            )}
                            {ticket.created_by !== user?.id && ticket.responsible !== user?.name && Array.isArray(ticket.shared_with) && ticket.shared_with.includes(user?.id) && (
                              <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                Compartilhado
                              </span>
                            )}
                            {(() => {
                              const urg = URGENCY_LEVELS.find(u => u.id === ticket.urgency);
                              return urg ? (
                                <span style={{ background: urg.color + '22', color: urg.color, padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                  {ticket.urgency === URGENCIA_MAXIMA ? '🚨 ' : ''}{urg.name}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>
                        {/* Título fixo em 2 linhas → mesma altura com título curto ou longo */}
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2em', minHeight: '2.4em' }}>{ticket.title}</h4>
                        {ehEtapaColapsada(ticket) && (() => {
                          const et = statusInfo(ticket.status, setores, systems);
                          return (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '8px', padding: '2px 8px', borderRadius: '999px', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', background: (et.color || '#6366f1') + '22', color: et.color || '#6366f1' }} title="Etapa do sub-setor (selecione o sub-setor para gerenciar)">
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: et.color || '#6366f1' }} /> Etapa: {et.name}
                            </div>
                          );
                        })()}
                        {/* Tipo e Prazo SEMPRE presentes com ALTURA FIXA (placeholder quando vazio) → todos os cards idênticos */}
                        <div style={{ display: 'flex', alignItems: 'center', height: '22px', marginBottom: '8px', overflow: 'hidden' }}>
                          {ticket.ticket_type ? <TipoBadge ticket={ticket} /> : <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem tipo</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 700, height: '16px', marginBottom: '8px', overflow: 'hidden', color: overdue ? '#ef4444' : 'var(--text-muted)' }}>
                          <Calendar size={12} /> {ticket.delivery_date ? `Entrega ${fmtDataPura(ticket.delivery_date)}${overdue ? ' • vencido' : ''}` : 'Sem prazo definido'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            <span>{fmtDataHoraSP(ticket.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            <span title="Quem abriu o chamado" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><UserPlus size={10} /> {allUsers.find(u => u.id === ticket.created_by)?.name || '—'}</span>
                          </span>

                          <div className="kanban-card-responsible">
                            <div className="responsible-name">{donoVisivel(ticket) || 'Aguardando aceite'}</div>
                            <img
                              src={donoVisivel(ticket) ? (responsibleUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ticket.responsible}`) : 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'}
                              className="responsible-avatar-mini"
                              alt={donoVisivel(ticket) || 'Aguardando aceite'}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </ColunaScroll>
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {sortModal && (
          <ColumnSortModal
            columnName={colunas.find(c => c.id === sortModal)?.name}
            tickets={visibleTickets.filter(t => colunaVisualDoTicket(t) === sortModal)}
            initialKey={columnSort[sortModal]?.key}
            initialDir={columnSort[sortModal]?.dir}
            onApply={(key, dir) => { setColumnSort(prev => ({ ...prev, [sortModal]: { key, dir } })); setSortModal(null); playSound('success'); }}
            onClose={() => setSortModal(null)}
          />
        )}
      </AnimatePresence>

      {novaColuna && createPortal(
          <div className="overlay" style={{ alignItems: 'center', padding: '1rem' }} onClick={() => setNovaColuna(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass modal" style={{ width: '440px', maxWidth: '94vw', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Nova coluna personalizada</h3>
                <button onClick={() => setNovaColuna(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem' }}>Onde a coluna entra (setor ou sub-setor que você gerencia)</label>
                <select value={novaColuna.alvo} onChange={e => setNovaColuna({ ...novaColuna, alvo: e.target.value })}>
                  <option value="">Selecione...</option>
                  {meusSetores.map(s => <option key={`s${s.id}`} value={`setores:${s.id}`}>Setor: {s.name}</option>)}
                  {meusSubsetores.map(s => <option key={`y${s.id}`} value={`systems:${s.id}`}>Sub-setor: {s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem' }}>Nome da coluna</label>
                <input value={novaColuna.nome} onChange={e => setNovaColuna({ ...novaColuna, nome: e.target.value })} placeholder="Ex: Aguardando Deploy" autoFocus />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '0.75rem', margin: 0 }}>Cor</label>
                <input type="color" value={novaColuna.cor} onChange={e => setNovaColuna({ ...novaColuna, cor: e.target.value })} style={{ width: '48px', height: '32px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={salvarColuna}>Criar coluna</button>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
}

// --- Modal de Criação ---
// --- Gate de aceite: pergunta se aceita ANTES de abrir os detalhes (aceite → Análise) ---
function AcceptGateModal({ ticket, puxar = false, colaboradores = [], onAccept, onEncaminhar, onAbrirSetor, onReject, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [modoEncaminhar, setModoEncaminhar] = useState(false);
  const [escolhido, setEscolhido] = useState('');
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="overlay" style={{ alignItems: 'center', padding: '1rem' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass modal" style={{ width: '440px', maxWidth: '94vw', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>{puxar ? 'Pegar demanda' : 'Aceitar ticket'} · #{ticket.id}</span>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 800 }}>{ticket.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {ticket.description && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '0 0 1rem', lineHeight: 1.5, background: 'rgba(0,0,0,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '10px 12px' }}>
            {ticket.description.length > 160 ? ticket.description.slice(0, 160) + '…' : ticket.description}
          </p>
        )}
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
          {puxar
            ? 'Esta demanda foi aberta ao setor. Ao pegá-la, você passa a ser o responsável.'
            : 'Você aceita atender este ticket? Ao aceitar, você verá os detalhes completos para classificar e definir o prazo.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={onAccept}>
            <CheckSquare size={16} /> {puxar ? 'Pegar esta demanda' : 'Aceitar ticket'}
          </button>

          {/* Ações de gerente (encaminhar / abrir setor / recusar) — não aparecem no modo "puxar" do funcionário */}
          {!puxar && (
            <>
              {!modoEncaminhar ? (
                <button className="btn btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => setModoEncaminhar(true)}>
                  <UserPlus size={16} /> Encaminhar ticket
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'rgba(0,0,0,0.02)' }}>
                  <select value={escolhido} onChange={e => setEscolhido(e.target.value)} style={{ margin: 0, fontSize: '0.85rem', padding: '8px' }} autoFocus>
                    <option value="">Escolher colaborador do setor...</option>
                    {colaboradores.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  {colaboradores.length === 0 && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum colaborador neste setor.</span>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setModoEncaminhar(false); setEscolhido(''); }}>Cancelar</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} disabled={!escolhido} onClick={() => onEncaminhar(escolhido)}>Direcionar</button>
                  </div>
                </div>
              )}
              <button className="btn btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={onAbrirSetor}>
                📢 Abrir para o setor puxar
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', color: '#ef4444' }} onClick={onReject}>Recusar ticket</button>
            </>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// --- Chat da demanda (bate e volta): só solicitante e responsável postam; os demais leem. Reusado no detalhe e no acompanhamento. ---
// ponytail: gate client-side, como todo o app; /api/data não valida quem posta (frente separada).
function TicketChat({ ticket, user, allUsers = [], fill = false }) {
  const [messages, setMessages] = useState([]);
  const [novaMsg, setNovaMsg] = useState('');
  const [anexos, setAnexos] = useState([]); // pendentes: {url(base64),type,name}
  const [enviando, setEnviando] = useState(false);
  const [preparandoAnexos, setPreparandoAnexos] = useState(false); // convertendo arquivo(s) → base64
  const [preview, setPreview] = useState(null); // mídia aberta em tela cheia
  const [loadedAnexos, setLoadedAnexos] = useState({}); // {msgId: [{url,type,name}]} carregados sob demanda
  const [carregandoAnx, setCarregandoAnx] = useState({}); // {msgId: true} enquanto busca a mídia
  const [mencaoQuery, setMencaoQuery] = useState(null); // texto após o "@" (autocomplete); null = fechado

  // Participantes da conversa = criador + responsável + compartilhados (shared_with)
  const shared = Array.isArray(ticket.shared_with) ? ticket.shared_with : [];
  const respId = allUsers.find(u => u.name === ticket.responsible)?.id;
  const participantesIds = [...new Set([ticket.created_by, respId, ...shared].filter(v => v != null))];
  const participantes = participantesIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean);
  const canPost = participantesIds.includes(user?.id);
  // sugestões da @menção (participantes, menos eu, casando o texto após @)
  const mencaoSugestoes = mencaoQuery == null ? []
    : participantes.filter(u => u.id !== user?.id && u.name.toLowerCase().includes(mencaoQuery.toLowerCase())).slice(0, 6);
  const onChangeMsg = (e) => {
    const v = e.target.value; setNovaMsg(v);
    const m = v.match(/@([\wÀ-ÿ]{0,24})$/); // "@token" no fim do texto → abre o autocomplete
    setMencaoQuery(m ? m[1] : null);
  };
  const escolherMencao = (u) => {
    setNovaMsg(prev => prev.replace(/@[\wÀ-ÿ]*$/, '@' + u.name + ' '));
    setMencaoQuery(null);
  };
  // Realça @Nome (de participantes) no texto da mensagem
  const nomesParticipantes = participantes.map(p => p.name);
  const renderMensagem = (txt) => {
    if (!txt || !nomesParticipantes.length) return txt;
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(@(?:' + nomesParticipantes.map(esc).join('|') + '))', 'g');
    return txt.split(re).map((part, i) =>
      part.startsWith('@') && nomesParticipantes.includes(part.slice(1))
        ? <strong key={i} style={{ color: 'var(--primary)' }}>{part}</strong>
        : <span key={i}>{part}</span>
    );
  };

  const fetchMessages = async () => {
    // NÃO puxa o base64 dos anexos aqui (um vídeo pode ter dezenas de MB e travar o chat).
    // Traz só o texto + QUANTOS anexos cada msg tem; a mídia pesada é carregada sob demanda (verAnexos).
    // Ordena por id (PK indexada) — evita filesort que estoura o sort_buffer.
    const { data } = await api.from('ticket_messages')
      .select('id,ticket_id,user_id,message,created_at,JSON_LENGTH(attachments) AS anx_count')
      .eq('ticket_id', ticket.id).order('id', { ascending: true });
    setMessages(Array.isArray(data) ? data : []);
  };

  // Carrega o base64 dos anexos de UMA mensagem só quando o usuário pede ver.
  const verAnexos = async (mid) => {
    if (carregandoAnx[mid]) return;
    setCarregandoAnx(prev => ({ ...prev, [mid]: true }));
    const { data } = await api.from('ticket_messages').select('attachments').eq('id', mid).single();
    setLoadedAnexos(prev => ({ ...prev, [mid]: Array.isArray(data?.attachments) ? data.attachments : [] }));
    setCarregandoAnx(prev => { const n = { ...prev }; delete n[mid]; return n; });
  };
  useEffect(() => { fetchMessages(); }, [ticket.id]);
  useEffect(() => {
    const onMsg = (d) => { if (String(d.ticketId) === String(ticket.id)) fetchMessages(); };
    socket.on('new_ticket_message', onMsg);
    return () => socket.off('new_ticket_message', onMsg);
  }, [ticket.id]);

  // Anexos no MESMO formato do ticket: converte para Base64 e guarda {url,type,name}.
  // ponytail: base64 em JSON como a criação de ticket já faz; vídeo grande incha a linha — trocar por storage/URL se pesar.
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setPreparandoAnexos(true);
    const toBase64 = (f) => new Promise((resolve, reject) => {
      const r = new FileReader(); r.readAsDataURL(f);
      r.onload = () => resolve(r.result); r.onerror = reject;
    });
    try {
      const novos = [];
      for (const f of files) novos.push({ url: await toBase64(f), type: f.type.startsWith('video/') ? 'video' : 'image', name: f.name });
      setAnexos(a => [...a, ...novos]);
    } finally { setPreparandoAnexos(false); }
  };

  const enviarMsg = async () => {
    const txt = novaMsg.trim();
    if (!txt && anexos.length === 0) return;
    if (enviando || preparandoAnexos) return; // não envia enquanto o anexo ainda está sendo preparado
    setEnviando(true);
    const anexosEnvio = anexos;
    setNovaMsg(''); setAnexos([]);
    const { error } = await api.from('ticket_messages').insert([{ ticket_id: ticket.id, user_id: user.id, message: txt, attachments: anexosEnvio }]);
    setEnviando(false);
    if (error) { toast.error('Erro ao enviar mensagem.'); setNovaMsg(txt); setAnexos(anexosEnvio); return; }
    await fetchMessages();
    // Notifica TODOS os outros participantes (criador + responsável + compartilhados) — socket + e-mail.
    const outros = participantes.filter(u => u.id !== user.id);
    outros.forEach(d => socket.emit('ticket_message', { ticketId: ticket.id, from: user.name, toUserId: d.id }));
    // @menções: participantes citados no texto recebem alerta direcionado
    outros.filter(u => txt.includes('@' + u.name)).forEach(u =>
      socket.emit('mention_created', { ticketId: ticket.id, mentioned: u.name, toUserId: u.id, from: user.name }));
    const emails = outros.map(u => u.email).filter(Boolean);
    if (emails.length) {
      fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        to: emails,
        subject: `Nova mensagem na demanda #${ticket.id}`,
        email: {
          cabecalho: 'Nova Mensagem', icone: '💬', ticketId: ticket.id,
          titulo: `#${ticket.id} — ${ticket.title}`,
          mensagem: txt || (anexosEnvio.length ? `[${anexosEnvio.length} anexo(s)]` : ''),
          assinatura: `De ${user.name}`,
        },
        evento: 'nova_mensagem'
      }) }).catch(() => {});
    }
    playSound('success');
  };

  const threadStyle = fill
    ? { display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px' }
    : { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', padding: '4px' };

  return (
    <>
      <MediaPreviewModal media={preview} onClose={() => setPreview(null)} />

      {/* Thread do bate e volta */}
      <div className="hide-scrollbar" style={threadStyle}>
        {messages.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem 0' }}>
            {canPost ? 'Sem mensagens ainda. Peça ou envie detalhes abaixo.' : 'Sem mensagens ainda. Conversam aqui o solicitante, o responsável e quem o ticket for compartilhado.'}
          </p>
        )}
        {messages.map(m => {
          const autor = allUsers.find(u => u.id === m.user_id);
          const meu = m.user_id === user?.id;
          const nAnexos = Number(m.anx_count) || 0;
          const anx = loadedAnexos[m.id]; // undefined = ainda não carregado; array = carregado
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: meu ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                {autor?.name || 'Usuário'} · {fmtDataHoraSP(m.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              {nAnexos > 0 && !anx && (
                carregandoAnx[m.id] ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: m.message ? '4px' : 0, padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.04)', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'flex' }}>
                      <RefreshCw size={14} />
                    </motion.div>
                    Carregando anexo{nAnexos > 1 ? 's' : ''}…
                  </div>
                ) : (
                  <button onClick={() => verAnexos(m.id)} title="Carregar mídia"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: m.message ? '4px' : 0, padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.04)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    <Paperclip size={14} /> Ver {nAnexos} anexo{nAnexos > 1 ? 's' : ''}
                  </button>
                )
              )}
              {anx && anx.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: m.message ? '4px' : 0, justifyContent: meu ? 'flex-end' : 'flex-start' }}>
                  {anx.map((file, i) => (
                    <div key={i} onClick={() => setPreview(file)} style={{ width: '140px', height: '140px', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.05)' }}>
                      {file.type === 'image'
                        ? <img src={file.url} alt={file.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PlayCircle size={32} color="var(--text-muted)" /></div>}
                    </div>
                  ))}
                </div>
              )}
              {m.message && (
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', borderRadius: '12px', fontSize: '0.85rem', lineHeight: 1.4, whiteSpace: 'pre-wrap',
                  background: meu ? 'var(--primary)' : 'rgba(0,0,0,0.05)', color: meu ? 'white' : 'var(--text-main)',
                  borderTopRightRadius: meu ? '2px' : '12px', borderTopLeftRadius: meu ? '12px' : '2px'
                }}>
                  {renderMensagem(m.message)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Campo de envio — só solicitante/recebedor; demais acompanham (read-only) */}
      {canPost ? (
        <div style={{ marginTop: '12px' }}>
          {anexos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {anexos.map((file, i) => (
                <div key={i} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.05)' }}>
                  {file.type === 'image'
                    ? <img src={file.url} alt={file.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PlayCircle size={22} color="var(--text-muted)" /></div>}
                  <button onClick={() => setAnexos(a => a.filter((_, j) => j !== i))} title="Remover"
                    style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {mencaoSugestoes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '6px', border: '1px solid var(--glass-border)', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface)' }}>
              <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, padding: '6px 10px 2px' }}>Mencionar</div>
              {mencaoSugestoes.map(u => (
                <button key={u.id} type="button" onClick={() => escolherMencao(u)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left', padding: '7px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem' }}>{getInitials(u.name)}</span>
                  @{u.name}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="file" id={`chat-file-${ticket.id}`} className="hidden" multiple accept="image/*,video/*" onChange={handleFiles} />
            <label htmlFor={`chat-file-${ticket.id}`} className="icon-btn" title="Anexar imagem ou vídeo" style={{ flex: '0 0 auto', cursor: 'pointer' }}>
              <Paperclip size={18} />
            </label>
            <input
              value={novaMsg}
              onChange={onChangeMsg}
              onKeyDown={e => {
                if (e.key === 'Escape') { setMencaoQuery(null); return; }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (mencaoSugestoes.length) escolherMencao(mencaoSugestoes[0]); else enviarMsg();
                }
              }}
              placeholder="Escreva uma mensagem…  (@ para marcar alguém)"
              style={{ flex: 1, margin: 0, fontSize: '0.85rem' }}
            />
            <button className="btn btn-primary" style={{ flex: '0 0 auto' }} onClick={enviarMsg} disabled={enviando || preparandoAnexos}>
              {preparandoAnexos ? 'Carregando…' : 'Enviar'}
            </button>
          </div>
          {preparandoAnexos && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'flex' }}><RefreshCw size={12} /></motion.div>
              Preparando anexo… aguarde para enviar.
            </div>
          )}
        </div>
      ) : (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '10px', textAlign: 'center' }}>
          Você acompanha a conversa (somente leitura).
        </p>
      )}
    </>
  );
}

// --- Tela dedicada (página) de conversa da demanda: ocupa a área de conteúdo, com voltar ---
function TicketChatPage({ ticket, user, allUsers = [], setores = [], systems = [], onBack }) {
  const fase = statusInfo(ticket.status, setores, systems);
  const tipo = TICKET_TYPES.find(t => t.id === ticket.ticket_type);
  const chipStyle = (cor) => ({ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: (cor || '#6366f1') + '1f', color: cor || 'var(--text-main)', border: `1px solid ${(cor || '#6366f1')}33` });
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem', flex: '0 0 auto' }}>
        <button className="icon-btn" onClick={onBack} title="Voltar"><ArrowLeft size={20} /></button>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>Conversa da demanda · #{ticket.id}</span>
          <h2 style={{ margin: '2px 0 6px', fontSize: '1.4rem', fontWeight: 800 }}>{ticket.title}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={chipStyle(fase.color)}>{fase.name}</span>
            {tipo && <span style={chipStyle(tipo.color)}>{tipo.name}</span>}
            <span style={chipStyle(isOverdue(ticket) ? '#ef4444' : null)}>
              <Calendar size={12} /> {ticket.delivery_date ? `Entrega ${fmtDataPura(ticket.delivery_date)}` : 'Sem prazo'}{isOverdue(ticket) ? ' • vencido' : ''}
            </span>
          </div>
        </div>
      </div>
      <div className="glass" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '1.25rem', border: '1px solid var(--glass-border)' }}>
        <TicketChat ticket={ticket} user={user} allUsers={allUsers} fill />
      </div>
    </motion.div>
  );
}

// Inbox de conversas estilo WhatsApp Web: lista à esquerda, chat à direita.
// Mobile (via CSS .chat-inbox): só a lista; ao selecionar mostra o chat com seta Voltar.
function ChatInboxPage({ conversas = [], user, allUsers = [], setores = [], systems = [], unreadByTicket = {}, lastMsgByTicket = {}, onVisto, onSair }) {
  const [selId, setSelId] = useState(null);
  const [aba, setAba] = useState('ativas'); // 'ativas' | 'arquivadas' (ticket finalizado = arquivado)

  // outro participante da conversa (quem NÃO é o usuário atual)
  const outroLado = (t) => {
    // Admin observa de fora: mostra quem está atendendo (responsável) como contraparte.
    if (user?.role === 'admin' && user?.id !== t.created_by && user?.name !== t.responsible)
      return allUsers.find(u => u.name === t.responsible) || allUsers.find(u => u.id === t.created_by) || { name: t.responsible || '—' };
    if (user?.id === t.created_by) return allUsers.find(u => u.name === t.responsible) || { name: t.responsible || '—' };
    return allUsers.find(u => u.id === t.created_by) || { name: '—' };
  };
  const criadorNome = (t) => allUsers.find(u => u.id === t.created_by)?.name || '—'; // quem abriu o ticket

  // ordena por última atividade (msg mais recente primeiro; sem msg vai pelo id desc)
  const ordenadas = [...conversas].sort((a, b) => {
    const ta = lastMsgByTicket[a.id], tb = lastMsgByTicket[b.id];
    if (ta && tb) return new Date(tb) - new Date(ta);
    if (ta) return -1; if (tb) return 1;
    return b.id - a.id;
  });

  // Arquivadas = tickets finalizados; ativas = o resto.
  const ativas = ordenadas.filter(t => !t.finalized);
  const arquivadas = ordenadas.filter(t => !!t.finalized);
  const visiveis = aba === 'arquivadas' ? arquivadas : ativas;

  const sel = ordenadas.find(t => t.id === selId) || null;
  const abrir = (t) => { setSelId(t.id); onVisto && onVisto(t.id); };
  const tabStyle = (on) => ({ flex: 1, padding: '6px 8px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', border: `1px solid ${on ? 'var(--primary)' : 'var(--glass-border)'}`, background: on ? 'rgba(99,102,241,0.12)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text-muted)' });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', flex: '0 0 auto' }}>
        <button className="icon-btn" onClick={onSair} title="Fechar"><ArrowLeft size={20} /></button>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={22} color="var(--primary)" /> Conversas
        </h2>
      </div>

      <div className={`chat-inbox${sel ? ' has-selection' : ''}`} style={{ flex: 1, minHeight: 0 }}>
        {/* Lista de conversas */}
        <div className="ci-list glass" style={{ padding: '0.5rem', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <button type="button" onClick={() => setAba('ativas')} style={tabStyle(aba === 'ativas')}>Ativas{ativas.length ? ` (${ativas.length})` : ''}</button>
            <button type="button" onClick={() => setAba('arquivadas')} style={tabStyle(aba === 'arquivadas')}>Arquivadas{arquivadas.length ? ` (${arquivadas.length})` : ''}</button>
          </div>
          {visiveis.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{aba === 'arquivadas' ? 'Nenhuma conversa arquivada.' : 'Nenhuma conversa ativa.'}</div>
          )}
          {visiveis.map(t => {
            const o = outroLado(t);
            const un = unreadByTicket[t.id] || 0;
            const ativo = sel?.id === t.id;
            return (
              <button key={t.id} onClick={() => abrir(t)}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: ativo ? 'rgba(99,102,241,0.12)' : 'transparent' }}>
                <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>{getInitials(o.name)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                    {lastMsgByTicket[t.id] && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>{tempoRelativo(lastMsgByTicket[t.id])}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>#{t.id} · {o.name}</span>
                    {un > 0 && <span style={{ flexShrink: 0, minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '999px', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{un}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Chat da conversa selecionada (display/flex vem do CSS p/ o media query poder escondê-lo no mobile) */}
        <div className="ci-chat glass" style={{ padding: '1rem', border: '1px solid var(--glass-border)' }}>
          {sel ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '0.75rem', flex: '0 0 auto' }}>
                <button className="icon-btn ci-back" onClick={() => setSelId(null)} title="Voltar"><ArrowLeft size={18} /></button>
                <div style={{ width: '38px', height: '38px', flexShrink: 0, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{getInitials(sel.title)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sel.title}</span>
                    {!!sel.finalized && <span style={{ flexShrink: 0, padding: '2px 8px', borderRadius: '999px', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(100,116,139,0.15)', color: 'var(--text-muted)' }}>Arquivada</span>}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    #{sel.id} · Criado por {criadorNome(sel)}{Array.isArray(sel.shared_with) && sel.shared_with.length > 0 ? ` · +${sel.shared_with.length} no chat` : ''}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <TicketChat ticket={sel} user={user} allUsers={allUsers} fill />
              </div>
            </>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
              Selecione uma conversa à esquerda.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// --- Acompanhamento do criador: só leitura (fase, aceite e direcionamento). Sem aceitar/recusar/editar. ---
function TicketStatusModal({ ticket, setores = [], systems = [], user, allUsers = [], onClose, onOpenChat, onDelete, onVerEnvio, onFinalize, onReopen }) {
  const [mounted, setMounted] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [recusando, setRecusando] = useState(false); // criador abriu o campo "não foi resolvido"
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const podeExcluir = ticket.status === 'backlog' && ticket.created_by === user?.id; // só o criador, e só enquanto não aceito
  // Criador precisa confirmar se a demanda entregue foi mesmo resolvida (só enquanto não finalizada)
  const precisaConfirmar = ticket.status === 'resolvido' && !ticket.finalized && ticket.created_by === user?.id;

  const fase = statusInfo(ticket.status, setores, systems);
  const setorDestino = setores.find(s => s.id == ticket.setor_id);
  const aceite = ticket.status === 'backlog' ? { txt: 'Aguardando aceite', cor: '#f59e0b' }
    : ticket.status === 'negado' ? { txt: 'Recusado', cor: '#ef4444' }
    : ticket.status === 'repassado' ? { txt: 'Repassado', cor: '#3b82f6' }
    : { txt: 'Aceito', cor: '#10b981' };

  const Linha = ({ label, children }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'right' }}>{children}</span>
    </div>
  );

  return createPortal(
    <div className="overlay" style={{ alignItems: 'center', padding: '1rem' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass modal" style={{ width: '440px', maxWidth: '94vw', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>Acompanhamento · #{ticket.id}</span>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 800 }}>{ticket.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <Linha label="Fase atual">
          <span className="badge" style={{ background: (fase.color || '#6366f1') + '22', color: fase.color || '#6366f1', padding: '4px 10px' }}>{fase.name}</span>
        </Linha>
        <Linha label="Situação">
          {ticket.finalized
            ? <span style={{ color: '#10b981' }}>✓ Finalizado</span>
            : <span style={{ color: aceite.cor }}>{aceite.txt}</span>}
        </Linha>
        <Linha label="Direcionado para">
          {donoVisivel(ticket) ? donoVisivel(ticket) : <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{ticket.status === 'backlog' ? 'Aguardando aceite' : 'Ainda não direcionado'}</span>}
        </Linha>
        {setorDestino && <Linha label="Setor de destino">{setorDestino.name}</Linha>}
        {ticket.delivery_date && <Linha label="Prazo de entrega">{fmtDataPura(ticket.delivery_date)}</Linha>}

        {/* Confirmação do criador: a demanda foi resolvida de fato? (aparece quando chega em Resolvido) */}
        {precisaConfirmar && (
          <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.06)' }}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color="#10b981" /> A demanda foi resolvida de fato?
            </p>
            {!recusando ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => onFinalize && onFinalize(ticket)}>
                  <CheckCircle size={15} /> Sim, finalizar
                </button>
                <button className="btn btn-ghost" style={{ flex: 1, color: '#ef4444' }} onClick={() => setRecusando(true)}>Não foi resolvido</button>
              </div>
            ) : (
              <div>
                <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} autoFocus
                  placeholder="O que ainda falta? A observação vai pro chat de quem aceitou e a demanda volta para Análise."
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.85rem' }} />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button className="btn btn-ghost" style={{ flex: '0 0 auto' }} onClick={() => { setRecusando(false); setMotivo(''); }}>Voltar</button>
                  <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => { if (!motivo.trim()) { toast.error('Descreva o que ainda falta.'); return; } onReopen && onReopen(ticket, motivo); }}>
                    <ArrowRight size={15} /> Enviar e reabrir
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ver o que foi enviado → abre a tela de detalhes em modo leitura (sem painel de ações) */}
        <button className="btn btn-ghost" style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => onVerEnvio && onVerEnvio(ticket)}>
          <AlignLeft size={16} /> Ver o que foi enviado
        </button>

        {/* A conversa agora vive na bolha de Conversas (canto inferior direito), não mais aqui no ticket. */}

        {podeExcluir && (
          <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => onDelete && onDelete(ticket)}>
            <Trash2 size={16} /> Excluir demanda
          </button>
        )}

        <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.75rem' }} onClick={onClose}>Fechar</button>
      </motion.div>
    </div>,
    document.body
  );
}

// --- Gate de análise: define tipo (Bug/Melhoria) + prazo e envia pra Resolvendo ---
function AnaliseGateModal({ ticket, onConfirm, onViewDetails, onClose }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [tipo, setTipo] = useState(ticket.ticket_type || '');
  const [date, setDate] = useState(toDateInput(ticket.delivery_date));
  const hoje = toDateInput(new Date());
  if (!mounted) return null;
  return createPortal(
    <div className="overlay" style={{ alignItems: 'center', padding: '1rem' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass modal" style={{ width: '440px', maxWidth: '94vw', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>Análise · #{ticket.id}</span>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 800 }}>{ticket.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
          Classifique o ticket e defina o prazo de resolução para enviá-lo a <strong style={{ color: 'var(--text-main)' }}>Resolvendo</strong>.
        </p>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.75rem' }}>Tipo do ticket</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)} autoFocus>
            <option value="">Selecione...</option>
            {TICKET_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Prazo de resolução</label>
          <input type="date" min={hoje} value={date} onChange={e => setDate(e.target.value)} onClick={e => e.target.showPicker?.()} onFocus={e => e.target.showPicker?.()} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => {
            if (!tipo) { toast.error('Selecione o tipo do ticket.'); return; }
            if (!date) { toast.error('Informe o prazo de resolução.'); return; }
            onConfirm(tipo, date);
          }}>
            <ArrowRight size={16} /> Enviar para Resolvendo
          </button>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onViewDetails}>Ver detalhes</button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// --- Modal de Criação ---
function TicketModal({ onClose, onSubmit, systems, setores = [], user, allUsers = [] }) {
  // Destino permitido: admin abre para qualquer setor; os demais só para os destinos configurados
  // no SEU setor de origem (sem config = nenhum destino disponível).
  const ehAdminTicket = user?.role === 'admin';
  const setorOrigem = setores.find(s => String(s.id) === String(user?.setor_id));
  const destinosPermitidos = (Array.isArray(setorOrigem?.destinos_permitidos) ? setorOrigem.destinos_permitidos : []).map(String);
  const setoresDestino = ehAdminTicket ? setores : setores.filter(s => destinosPermitidos.includes(String(s.id)));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    setor: '',
    platform: '',
    responsible: '',
    urgency: 'leve', // o solicitante define a urgência (inclui "Máxima")
    files: []
  });
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sistemas do setor escolhido (ramificações). Vazio = setor sem sistemas (ex: Financeiro).
  const setorSystems = formData.setor ? systems.filter(s => s.setor_id == formData.setor) : [];
  const setorAtual = setores.find(s => s.id == formData.setor);
  // Responsáveis disponíveis: do sistema (se o setor ramifica) ou da equipe do setor.
  // primary_responsibles agora são IDs → resolver p/ nome (aceita nome legado também)
  const nomeResp = (v) => (typeof v === 'number' ? (allUsers.find(u => u.id === v)?.name || '') : (v || ''));
  const respIds = formData.platform
    ? (systems.find(p => p.id == formData.platform)?.primary_responsibles || [])
    : (setorSystems.length === 0 ? (setorAtual?.primary_responsibles || []) : []);
  const respOptions = respIds.map(nomeResp).filter(Boolean);

  const handleSetorChange = (setorId) => {
    const proximosSistemas = systems.filter(s => s.setor_id == setorId);
    const setor = setores.find(s => s.id == setorId);
    setFormData({
      ...formData,
      setor: setorId,
      platform: '',
      // setor sem sistemas: já sugere o 1º da equipe; com sistemas: espera escolher o sistema
      responsible: proximosSistemas.length === 0 ? nomeResp(setor?.primary_responsibles?.[0]) : ''
    });
  };

  const handlePlatformChange = (pId) => {
    const platform = systems.find(p => p.id == pId);
    setFormData({
      ...formData,
      platform: pId,
      responsible: nomeResp(platform?.primary_responsibles?.[0])
    });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Limite de 20MB por arquivo para evitar erro 413 do Nginx/Server
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const oversizedFile = selectedFiles.find(f => f.size > MAX_FILE_SIZE);
    
    if (oversizedFile) {
      toast.error(`O arquivo "${oversizedFile.name}" é muito grande! O limite é 20MB.`);
      e.target.value = ''; // Reseta o input
      return;
    }

    const newPreviews = selectedFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image'
    }));
    setFormData({ ...formData, files: [...formData.files, ...selectedFiles] });
    setPreviews([...previews, ...newPreviews]);
  };

  const removePreview = (index) => {
    const updatedFiles = [...formData.files];
    updatedFiles.splice(index, 1);
    const updatedPreviews = [...previews];
    URL.revokeObjectURL(updatedPreviews[index].url);
    updatedPreviews.splice(index, 1);
    setFormData({ ...formData, files: updatedFiles });
    setPreviews(updatedPreviews);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const precisaSistema = setorSystems.length > 0;
    if (!formData.title || !formData.description || !formData.setor || (precisaSistema && !formData.platform)) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    setIsSubmitting(true);
    onSubmit(formData).finally(() => setIsSubmitting(false));
  };

  if (!mounted) return null;

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="modal" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: '16px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2>Novo Ticket</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Título</label>
            <input type="text" placeholder="Ex: Problema no login" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="form-group">
            <label>Descrição</label>
            <textarea rows="6" placeholder="Detalhes..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
          </div>

          <div className="form-group">
            <label>Setor</label>
            <select value={formData.setor} onChange={e => handleSetorChange(e.target.value)}>
              <option value="">Selecione o setor...</option>
              {setoresDestino.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {!ehAdminTicket && setoresDestino.length === 0 ? (
              <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <UserPlus size={13} /> Seu setor ainda não tem permissão para abrir chamado para nenhum setor. Fale com o administrador.
              </p>
            ) : (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserPlus size={13} /> A demanda vai direto para o <b>gerente do setor</b>, que designa quem vai atender.
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: setorSystems.length > 0 ? '1fr 1fr' : '1fr', gap: '1rem' }}>
            {setorSystems.length > 0 && (
              <div className="form-group">
                <label>Sub-Setor</label>
                <select value={formData.platform} onChange={e => handlePlatformChange(e.target.value)}>
                  <option value="">Selecione...</option>
                  {setorSystems.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Urgência</label>
              <select value={formData.urgency} onChange={e => setFormData({ ...formData, urgency: e.target.value })}>
                {URGENCY_LEVELS.map(u => <option key={u.id} value={u.id}>{u.name}{u.id === URGENCIA_MAXIMA ? ' 🚨' : ''}</option>)}
              </select>
              {formData.urgency === URGENCIA_MAXIMA && (
                <p style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 700, marginTop: '4px' }}>
                  Urgência máxima: o responsável é notificado continuamente e a demanda vai pro topo da fila.
                </p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Anexos</label>
            <input type="file" id="file-upload" className="hidden" multiple accept="image/*,video/*" onChange={handleFileChange} disabled={isSubmitting} />
            <label htmlFor="file-upload" className={`btn btn-ghost ${isSubmitting ? 'disabled' : ''}`} style={{ width: '100%', justifyContent: 'center', cursor: isSubmitting ? 'not-allowed' : 'pointer', borderStyle: 'dashed', opacity: isSubmitting ? 0.6 : 1 }}>
              <Plus size={18} /> {isSubmitting ? 'Processando arquivos...' : 'Adicionar Mídia'}
            </label>
          </div>

          {previews.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {previews.map((preview, idx) => (
                <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                  {preview.type === 'image' ? <img src={preview.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <video src={preview.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />}
                  <button type="button" onClick={() => removePreview(idx)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  style={{ display: 'flex' }}
                >
                  <RefreshCw size={18} />
                </motion.div>
                <span>Enviando...</span>
              </>
            ) : 'Criar Ticket'}
          </button>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}

function TicketDetailsModal({ ticket, onClose, onUpdate, systems, setores = [], allUsers, user, asPage = false, unread = 0, onOpenChat, readOnly = false }) {
  const [urgency, setUrgency] = useState(ticket.urgency || '');
  const [tipo, setTipo] = useState(ticket.ticket_type || '');
  const [statusSel, setStatusSel] = useState(ticket.status);
  const [responsible, setResponsible] = useState(ticket.responsible || '');
  const [isCustomResp, setIsCustomResp] = useState(false);
  const [devNotes, setDevNotes] = useState(ticket.dev_notes || '');
  const [sharedWith, setSharedWith] = useState(Array.isArray(ticket.shared_with) ? ticket.shared_with : []);
  const [shareOn, setShareOn] = useState(Array.isArray(ticket.shared_with) && ticket.shared_with.length > 0);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState(toDateInput(ticket.delivery_date));
  // Ticket vencido já abre pedindo nova data (requisito: "solicitar outra data ao vencer")
  const [rescheduling, setRescheduling] = useState(isOverdue(ticket));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const platform = systems.find(p => p.id == ticket.platform);
  const setorDoTicket = setores.find(s => s.id == ticket.setor_id);
  // Responsáveis candidatos: do sistema (setor ramificado) ou da equipe do setor.
  const availableDevs = platform?.primary_responsibles || setorDoTicket?.primary_responsibles || [];

  const creator = allUsers.find(u => u.id === ticket.created_by);

  // Compartilhamento: colegas do MESMO setor do responsável (aparecem no Kanban se compartilhado).
  // Se quem compartilha é FUNCIONÁRIO, mostra só outros FUNCIONÁRIOS (esconde o gerente).
  const respUser = allUsers.find(u => u.name === ticket.responsible);
  const shareCandidates = allUsers.filter(u =>
    respUser?.setor_id != null && String(u.setor_id) === String(respUser.setor_id) &&
    u.name !== ticket.responsible && !sharedWith.includes(u.id) &&
    (user?.role !== 'funcionario' || u.role === 'funcionario')
  );

  // Só quem atende (gerente/responsáveis) e admin aceita e define/reagenda a entrega
  const canManage = isManager(user?.role);
  const podeEditarPrazo = canManage || user?.name === ticket.responsible; // o RESPONSÁVEL (mesmo funcionário) informa/altera o prazo
  const hoje = toDateInput(new Date());
  const vencido = isOverdue(ticket);

  // Chat da demanda extraído em <TicketChat> (reusado também no acompanhamento do criador).

  // --- Atribuição flexível da demanda ---
  const [atribuirA, setAtribuirA] = useState('');
  const canAssign = podeAtribuir(user, ticket, setores); // gerente/resp. do setor (ou admin)
  // Direciona só para os AFILIADOS diretos (admin dá pra qualquer colaborador do setor)
  const colaboradores = (user?.role === 'admin'
    ? colaboradoresDoSetor(ticket.setor_id, setores, systems, allUsers).map(id => allUsers.find(u => u.id === id)).filter(Boolean)
    : afiliadosDe(user?.id, allUsers));
  // resolvedor no escopo pega demanda sem dono; o líder do setor tem o botão dedicado no bloco de direcionamento
  const podePegar = !ticket.responsible && isManager(user?.role) && !podeAtribuir(user, ticket, setores);

  const atribuir = () => {
    if (!atribuirA) return;
    onUpdate(ticket.id, { responsible: atribuirA });
    const alvo = allUsers.find(u => u.name === atribuirA);
    socket.emit('ticket_assigned', { ticketId: ticket.id, toUserId: alvo?.id, from: user.name, title: ticket.title });
    playSound('success');
    onClose();
  };
  const abrirParaSetor = () => {
    socket.emit('ticket_broadcast', { ticketId: ticket.id, setorId: ticket.setor_id, setorName: setorDoTicket?.name, from: user.name, title: ticket.title });
    toast.success('Setor notificado — colaboradores disponíveis podem pegar a demanda.');
    playSound('notification');
  };
  const pegarDemanda = () => {
    onUpdate(ticket.id, { responsible: user.name });
    toast.success('Demanda atribuída a você!');
    playSound('success');
    onClose();
  };

  // Compartilhamento externo rápido: abre o WhatsApp com o resumo da demanda + status (destinatário escolhido no app)
  const compartilharWhatsApp = () => {
    const linhas = [
      `*Demanda #${ticket.id}* — ${ticket.title}`,
      `Status: ${statusInfo(ticket.status, setores, systems).name}`,
      setorDoTicket?.name ? `Setor: ${setorDoTicket.name}` : null,
      donoVisivel(ticket) ? `Responsável: ${donoVisivel(ticket)}` : 'Aguardando aceite',
      ticket.delivery_date ? `Entrega: ${fmtDataPura(ticket.delivery_date)}` : null,
    ].filter(Boolean);
    window.open(`https://wa.me/?text=${encodeURIComponent(linhas.join('\n'))}`, '_blank');
  };

  const handleAccept = () => {
    if (!deliveryDate) { toast.error('Informe a data de entrega para aceitar.'); return; }
    onUpdate(ticket.id, {
      status: 'resolvendo',
      responsible: responsible || user.name,
      delivery_date: deliveryDate
    });
    playSound('success');
    onClose();
  };

  const handleReschedule = () => {
    if (!deliveryDate) { toast.error('Informe a nova data de entrega.'); return; }
    onUpdate(ticket.id, { delivery_date: deliveryDate });
    playSound('success');
    onClose();
  };

  if (!mounted) return null;

  return (
    <>
      <AnimatePresence>
        {viewingMedia && (
          <MediaPreviewModal
            media={viewingMedia}
            onClose={() => setViewingMedia(null)}
          />
        )}
      </AnimatePresence>

      {(() => {
        const inner = (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="modal"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              maxWidth: asPage ? '1500px' : '1000px',
              width: '100%',
              margin: undefined,
              maxHeight: asPage ? '88vh' : undefined, // card centralizado (não ocupa a altura toda)
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={asPage ? undefined : e => e.stopPropagation()}
          >
            {/* Header Superior - Estilo Trello */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {asPage && <button className="icon-btn" onClick={onClose} title="Voltar"><ArrowLeft size={20} /></button>}
                {(() => {
                  const fixos = [...DEV_STATUS, ...OTHER_STATUS].map(s => s.id);
                  const ehCustom = ticket.status && !fixos.includes(ticket.status);
                  const base = ehCustom ? DEV_STATUS.find(s => s.id === 'resolvendo') : statusInfo(ticket.status, setores, systems);
                  const et = ehCustom ? statusInfo(ticket.status, setores, systems) : null;
                  return (
                    <>
                      <div className="status-badge-header" style={{ color: base.color }}>{base.name}</div>
                      {ehCustom && (
                        <div className="status-badge-header" style={{ color: et.color, background: (et.color || '#6366f1') + '18' }}>
                          Etapa: {et.name}
                        </div>
                      )}
                    </>
                  );
                })()}
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }}>#{ticket.id}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  criado por <b style={{ color: 'var(--text-main)' }}>{creator?.name || 'Usuário'}</b> em {fmtDataHoraSP(ticket.created_at, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Responsável */}
                <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Responsável</span>
                  <b style={{ color: 'var(--text-main)' }}>{donoVisivel(ticket) || 'Aguardando aceite'}</b>
                </span>
                {/* barrinha vertical entre o nome e o ícone */}
                <span style={{ width: '1px', height: '20px', background: 'var(--glass-border)' }} />
                {/* WhatsApp só ícone */}
                <button onClick={compartilharWhatsApp} title="Compartilhar no WhatsApp" style={{ background: 'none', border: 'none', color: '#25D366', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                  <WhatsAppIcon size={20} />
                </button>
              </div>
            </div>

            <div className="modal-details-body" style={asPage ? { maxHeight: 'none', minHeight: 0, flex: 1 } : undefined}>
              {/* Coluna Esquerda: Conteúdo Principal */}
              <div className="modal-details-main" style={asPage ? { flex: readOnly ? '1 1 100%' : '1 1 50%', minWidth: 0 } : undefined}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: '800', lineHeight: '1.3', marginBottom: '8px' }}>{ticket.title}</h2>
                </div>

                {/* Descrição */}
                <div style={{ marginTop: '0.5rem' }}>
                  <div className="modal-section-title">
                    <AlignLeft size={20} /> Descrição
                  </div>
                  <div>
                    <p style={{ whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.015)', padding: '1.25rem', borderRadius: '12px', fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-main)', minHeight: '100px', border: '1px solid var(--glass-border)' }}>
                      {ticket.description || "Sem descrição."}
                    </p>
                  </div>
                </div>

                {/* Anexos — null = ainda carregando (skeleton); [] = sem anexos */}
                {ticket.attachments === null ? (
                  <div style={{ marginTop: '1rem' }}>
                    <div className="modal-section-title"><Paperclip size={20} /> Anexos</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '12px' }} />
                      ))}
                    </div>
                  </div>
                ) : ticket.attachments?.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <div className="modal-section-title">
                      <Paperclip size={20} /> Anexos
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                      {ticket.attachments.map((file, idx) => (
                        <div key={idx} className="kanban-card-annex" onClick={() => setViewingMedia(file)} style={{ padding: '0', overflow: 'hidden', height: '120px' }}>
                          {file.type === 'image' ? <img src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.05)' }}>
                              <PlayCircle size={32} color="var(--text-muted)" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Coluna Direita: Painel de Ações — oculto no modo leitura (criador vendo o que enviou) */}
              {!readOnly && (
              <div className="modal-details-sidebar" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(asPage ? { width: 'auto', flex: '1 1 50%', maxWidth: 'none', minWidth: 0 } : {}) }}>
                {/* Área rolável das ações */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingRight: '2px' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>Ações de Membro</h3>

                  {/* Pegar demanda: resolvedor no escopo puxa um ticket sem responsável */}
                  {podePegar && (
                    <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={pegarDemanda}>
                      <CheckSquare size={16} /> Pegar esta demanda
                    </button>
                  )}

                  {/* Atribuição flexível: gerente/resp. do setor direciona OU abre para o setor puxar */}
                  {canAssign && (
                    <div className="form-group" style={{ marginBottom: '1.5rem', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <UserPlus size={14} /> Atendimento da demanda
                      </label>
                      {/* O líder do setor decide: atende ele mesmo OU direciona a alguém do time */}
                      <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={pegarDemanda}>
                        <CheckSquare size={16} /> {ticket.responsible === user?.name ? 'Você está atendendo' : 'Atender eu mesmo'}
                      </button>
                      <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', margin: '10px 0 6px' }}>— ou direcione a alguém —</div>
                      <select value={atribuirA} onChange={e => setAtribuirA(e.target.value)} style={{ padding: '8px', fontSize: '0.85rem', margin: 0 }}>
                        <option value="">Escolher colaborador...</option>
                        {colaboradores.filter(u => u.id !== user?.id).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} onClick={atribuir} disabled={!atribuirA}>Atribuir</button>
                      <button className="btn btn-ghost" style={{ width: '100%', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }} onClick={abrirParaSetor}>
                        📢 Abrir para o setor puxar
                      </button>
                      {colaboradores.length === 0 && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '8px', textAlign: 'center' }}>Nenhum colaborador cadastrado neste setor ainda.</p>
                      )}
                    </div>
                  )}

                  {/* Prazo de Entrega — aceite (backlog) / prazo + reagendamento ao vencer */}
                  <div className="form-group" style={{ marginBottom: '1.5rem', padding: '12px', borderRadius: '12px', border: `1px solid ${vencido ? '#ef4444' : 'var(--glass-border)'}`, background: vencido ? 'rgba(239,68,68,0.06)' : 'rgba(0,0,0,0.02)' }}>
                    <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', color: vencido ? '#ef4444' : 'var(--text-main)', fontWeight: 700, marginBottom: '8px' }}>
                      <Calendar size={14} /> Data de Entrega
                      {vencido && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800 }}>Vencido</span>}
                    </label>

                    {ticket.status === 'backlog' ? (
                      canManage ? (
                        <>
                          <input type="date" min={hoje} value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} onClick={e => e.target.showPicker?.()} onFocus={e => e.target.showPicker?.()} style={{ fontSize: '0.85rem', padding: '8px' }} />
                          <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handleAccept}>
                            <CheckSquare size={16} /> Aceitar ticket
                          </button>
                        </>
                      ) : (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Aguardando aceite do responsável.</p>
                      )
                    ) : (
                      <>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: vencido ? '#ef4444' : (ticket.delivery_date ? 'var(--text-main)' : 'var(--text-muted)') }}>
                          {ticket.delivery_date
                            ? `Prazo de entrega: ${fmtDataPura(ticket.delivery_date)}`
                            : 'Nenhum prazo de entrega definido — informe abaixo.'}
                        </div>
                        {vencido && <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '4px 0 0' }}>Entrega vencida — defina uma nova data.</p>}
                        {podeEditarPrazo && (rescheduling || vencido || !ticket.delivery_date) ? (
                          <div style={{ marginTop: '8px' }}>
                            <input type="date" min={hoje} value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} onClick={e => e.target.showPicker?.()} onFocus={e => e.target.showPicker?.()} style={{ fontSize: '0.85rem', padding: '8px' }} />
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px', ...(vencido ? { background: '#ef4444', border: 'none' } : {}) }} onClick={handleReschedule}>
                              {vencido ? 'Reagendar entrega' : (ticket.delivery_date ? 'Atualizar prazo' : 'Definir prazo de entrega')}
                            </button>
                          </div>
                        ) : podeEditarPrazo ? (
                          <button className="btn btn-ghost" style={{ width: '100%', marginTop: '8px', fontSize: '0.8rem' }} onClick={() => setRescheduling(true)}>Alterar prazo</button>
                        ) : null}
                      </>
                    )}
                  </div>

                  {/* Classificação: tipo + urgência lado a lado */}
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Classificação</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', marginTop: '4px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Tipo do ticket</label>
                      <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '8px', fontSize: '0.85rem' }}>
                        <option value="">Selecione...</option>
                        {TICKET_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Urgência</label>
                      <select value={urgency} onChange={e => setUrgency(e.target.value)} style={{ padding: '8px', fontSize: '0.85rem' }}>
                        {URGENCY_LEVELS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Status (passo) — só o administrador altera */}
                  {user?.role === 'admin' && (
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.75rem' }}>Status (passo do ticket)</label>
                      <select value={statusSel} onChange={e => setStatusSel(e.target.value)} style={{ padding: '8px', fontSize: '0.85rem' }}>
                        {DEV_STATUS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        {OTHER_STATUS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.75rem' }}>Notas Técnicas</label>
                    <textarea
                      value={devNotes}
                      onChange={e => setDevNotes(e.target.value)}
                      placeholder="Anotações rápidas..."
                      rows={2}
                      style={{ minHeight: '44px', fontSize: '0.85rem', padding: '8px 10px', resize: 'vertical' }}
                    ></textarea>
                  </div>

                  {/* Compartilhar — toggle; ao ligar, escolhe colegas do MESMO setor do responsável */}
                  {(user?.id === ticket.created_by || user?.name === ticket.responsible) && (
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> Compartilhar ticket</span>
                        <button type="button" onClick={() => setShareOn(v => !v)} aria-pressed={shareOn} style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', position: 'relative', background: shareOn ? 'var(--primary)' : 'var(--glass-border)', transition: 'background 0.2s', flexShrink: 0 }}>
                          <span style={{ position: 'absolute', top: '2px', left: shareOn ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </button>
                      </label>
                      {shareOn && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '12px', border: '1px solid var(--glass-border)', marginTop: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Quem mais vê no Kanban (colegas do setor do responsável):</span>
                          <select className="sharing-select" style={{ margin: 0, padding: '6px', fontSize: '0.8rem' }} onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val && !sharedWith.includes(val)) setSharedWith([...sharedWith, val]);
                            e.target.value = '';
                          }}>
                            <option value="">Selecionar colega...</option>
                            {shareCandidates.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                          </select>
                          {shareCandidates.length === 0 && sharedWith.length === 0 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum colega no mesmo setor do responsável.</span>
                          )}
                          {sharedWith.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                              {sharedWith.map(uId => {
                                const u = allUsers.find(userObj => userObj.id === uId);
                                return (
                                  <div key={uId} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '600' }}>
                                    {u?.name || 'User'}
                                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSharedWith(sharedWith.filter(id => id !== uId))} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Indicador para usuários compartilhados */}
                  {user?.id !== ticket.created_by && sharedWith.includes(user?.id) && (
                    <div style={{ padding: '10px', background: 'var(--primary)15', borderRadius: '12px', border: '1px solid var(--primary)30', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={16} color="var(--primary)" />
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--primary)' }}>Você tem acesso compartilhado a este ticket.</span>
                    </div>
                  )}
                </div>

                {/* Rodapé fixo: ação primária (o chat foi p/ a bolha de Conversas). */}
                <div style={{ flexShrink: 0, paddingTop: '1rem', marginTop: '0.75rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {
                    // Definiu tipo + prazo enquanto em Backlog/Análise → avança para Resolvendo
                    let finalStatus = statusSel;
                    if (tipo && deliveryDate && (finalStatus === 'analise' || finalStatus === 'backlog')) finalStatus = 'resolvendo';
                    const updates = { responsible, urgency, dev_notes: devNotes, ticket_type: tipo || null, status: finalStatus, delivery_date: deliveryDate || null };
                    if (user?.id === ticket.created_by || user?.name === ticket.responsible) {
                      updates.shared_with = shareOn ? sharedWith : [];
                    }
                    onUpdate(ticket.id, updates);
                    playSound('success');
                    onClose();
                  }}>Salvar Alterações</button>
                </div>
              </div>
              )}
            </div>
          </motion.div>
        );
        return asPage
          ? <div className="animate-in" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>{inner}</div>
          : createPortal(<div className="overlay" style={{ padding: '2rem 1rem' }} onClick={onClose}>{inner}</div>, document.body);
      })()}
    </>
  );
}

// --- Modal de Visualização de Mídia (Premium) ---
function MediaPreviewModal({ media, onClose }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !media) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="media-modal-overlay"
      onClick={onClose}
    >
      <button className="media-close-btn" onClick={onClose} title="Fechar (Esc)">
        <X size={28} />
      </button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="media-modal-content"
        onClick={e => e.stopPropagation()}
      >
        {media.type === 'video' ? (
          <video src={media.url} controls autoPlay className="premium-shadow" />
        ) : (
          <img src={media.url} alt={media.name || 'Preview'} className="premium-shadow" />
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}


// Classifica um ticket com prazo: 'onTime' (resolvido ≤ prazo), 'late' (resolvido depois OU vencido sem resolver), null (pendente no prazo)
function classifyDelivery(t, logs) {
  if (!t.delivery_date) return null;
  const due = new Date(`${String(t.delivery_date).slice(0, 10)}T23:59:59-03:00`); // fim do dia da entrega em SP
  const resLog = logs
    .filter(l => String(l.ticket_id) === String(t.id) && l.action_type === 'STATUS_CHANGED' && l.new_value === 'resolvido')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const resolvedAt = resLog ? new Date(resLog.created_at) : (t.status === 'resolvido' ? new Date(t.updated_at) : null);
  if (resolvedAt) return resolvedAt <= due ? 'onTime' : 'late';
  if (new Date() > due) return 'late';
  return null;
}

// Gráfico de linha compacto (SVG inline): entregas no prazo x fora do prazo por semana
function ProdutividadeChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sem entregas com prazo concluído ainda.</div>;
  }
  const totals = data.reduce((a, d) => ({ onTime: a.onTime + d.onTime, late: a.late + d.late }), { onTime: 0, late: 0 });
  const geral = totals.onTime + totals.late;
  const pctGeral = geral ? Math.round((totals.onTime / geral) * 100) : 0;
  const max = Math.max(1, ...data.map(d => d.onTime + d.late));
  const fmt = (d) => fmtDataSP(d, { day: '2-digit', month: '2-digit' });
  return (
    <div>
      {/* Legenda + totais + % geral */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981', display: 'inline-block' }} /> No prazo <strong style={{ color: 'var(--text-main)' }}>{totals.onTime}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#ef4444', display: 'inline-block' }} /> Fora do prazo <strong style={{ color: 'var(--text-main)' }}>{totals.late}</strong>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 800, color: pctGeral >= 70 ? '#10b981' : pctGeral >= 40 ? '#f59e0b' : '#ef4444' }}>{pctGeral}% no prazo</div>
      </div>
      {/* Barras empilhadas por semana (verde = no prazo embaixo, vermelho = fora em cima) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '150px' }}>
        {data.map((d, i) => {
          const tot = d.onTime + d.late;
          const pct = tot ? Math.round((d.onTime / tot) * 100) : 0;
          return (
            <div key={i} title={`Semana de ${fmt(d.date)} — no prazo ${d.onTime}, fora ${d.late} (${pct}% no prazo)`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>{tot}</span>
              <div style={{ width: '100%', maxWidth: '40px', height: `${(tot / max) * 100}%`, minHeight: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: '6px 6px 0 0', overflow: 'hidden', background: '#ef4444' }}>
                <div style={{ height: `${pct}%`, background: '#10b981' }} />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{fmt(d.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Ranking compacto por pessoa: quem entrega no prazo x fora do prazo
function RankingPessoas({ people }) {
  if (!people || people.length === 0) {
    return <div style={{ padding: '1.25rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Sem entregas atribuídas ainda.</div>;
  }
  const cor = (r) => r >= 0.7 ? '#10b981' : r >= 0.4 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {people.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ flex: '0 0 88px', fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>{p.name}</span>
          <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(239,68,68,0.55)', overflow: 'hidden' }} title={`${p.onTime} no prazo · ${p.late} fora`}>
            <div style={{ width: `${Math.round(p.rate * 100)}%`, height: '100%', background: '#10b981' }} />
          </div>
          <strong style={{ flex: '0 0 34px', textAlign: 'right', fontSize: '0.8rem', color: cor(p.rate) }}>{Math.round(p.rate * 100)}%</strong>
          <span style={{ flex: '0 0 auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.onTime}/{p.total}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsDashboard({ tickets, setores = [], user }) {
  const isAdmin = user?.role === 'admin';
  const setorFixo = !isAdmin && user?.setor_id != null ? String(user.setor_id) : null; // gerente/resp: fixo no próprio setor
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSetor, setSelectedSetor] = useState(setorFixo || ''); // '' = geral (só admin); não-admin já vem no setor dele
  const [selectedResp, setSelectedResp] = useState('');
  const [periodo, setPeriodo] = useState(30); // dias; 0 = tudo

  useEffect(() => {
    const fetchAllLogs = async () => {
      const { data } = await api.from('system_logs').select('*');
      setLogs(data || []);
      setLoading(false);
    };
    fetchAllLogs();
  }, []);

  // Lista de usuários do filtro depende do setor selecionado
  const responsibleList = React.useMemo(() => {
    const base = selectedSetor ? tickets.filter(t => String(t.setor_id) === String(selectedSetor)) : tickets;
    return Array.from(new Set(base.map(t => t.responsible).filter(Boolean))).sort();
  }, [tickets, selectedSetor]);

  // Produtividade: entregas no prazo x fora do prazo, por semana da data de entrega
  const deliveryTrend = React.useMemo(() => {
    const base = tickets.filter(t =>
      (!selectedSetor || String(t.setor_id) === String(selectedSetor)) &&
      (!selectedResp || t.responsible === selectedResp) &&
      t.delivery_date
    );
    // segunda-feira da semana da data de entrega
    const weekStart = (d) => {
      const dt = new Date(d); dt.setHours(0, 0, 0, 0);
      dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
      return dt;
    };
    const buckets = new Map();
    base.forEach(t => {
      const outcome = classifyDelivery(t, logs);
      if (!outcome) return; // pendente e ainda no prazo → não conta
      const wk = weekStart(t.delivery_date);
      const key = wk.getTime();
      if (!buckets.has(key)) buckets.set(key, { date: wk, onTime: 0, late: 0 });
      buckets.get(key)[outcome]++;
    });
    return Array.from(buckets.values()).sort((a, b) => a.date - b.date);
  }, [logs, tickets, selectedSetor, selectedResp]);

  // Quem entrega no prazo x fora do prazo (ranking por pessoa; escopo = setor selecionado)
  const deliveryByPerson = React.useMemo(() => {
    const base = selectedSetor ? tickets.filter(t => String(t.setor_id) === String(selectedSetor)) : tickets;
    const map = new Map();
    base.filter(t => t.delivery_date && t.responsible).forEach(t => {
      const outcome = classifyDelivery(t, logs);
      if (!outcome) return;
      if (!map.has(t.responsible)) map.set(t.responsible, { name: t.responsible, onTime: 0, late: 0 });
      map.get(t.responsible)[outcome]++;
    });
    return Array.from(map.values())
      .map(p => ({ ...p, total: p.onTime + p.late, rate: (p.onTime + p.late) ? p.onTime / (p.onTime + p.late) : 0 }))
      .sort((a, b) => b.rate - a.rate || b.total - a.total);
  }, [logs, tickets, selectedSetor]);

  // --- ONDA 1: período + KPIs + status + matriz origem→destino ---
  const periodBase = React.useMemo(() => {
    if (!periodo) return tickets;
    const limite = Date.now() - periodo * 86400000;
    return tickets.filter(t => new Date(t.created_at).getTime() >= limite);
  }, [tickets, periodo]);

  const scoped = React.useMemo(() => periodBase.filter(t =>
    (!selectedSetor || String(t.setor_id) === String(selectedSetor)) &&
    (!selectedResp || t.responsible === selectedResp)
  ), [periodBase, selectedSetor, selectedResp]);

  const kpis = React.useMemo(() => {
    const total = scoped.length;
    const abertas = scoped.filter(t => ['backlog', 'analise', 'resolvendo'].includes(t.status)).length;
    const resolvidas = scoped.filter(t => t.status === 'resolvido').length;
    const aguardando = scoped.filter(t => t.status === 'backlog').length;
    const vencidas = scoped.filter(t => isOverdue(t)).length;
    let onTime = 0, late = 0;
    scoped.filter(t => t.delivery_date).forEach(t => { const o = classifyDelivery(t, logs); if (o === 'onTime') onTime++; else if (o === 'late') late++; });
    const noPrazo = (onTime + late) ? Math.round((onTime / (onTime + late)) * 100) : null;
    return { total, abertas, resolvidas, aguardando, vencidas, noPrazo };
  }, [scoped, logs]);

  const statusDist = React.useMemo(() => {
    const all = [...DEV_STATUS, ...OTHER_STATUS];
    const max = Math.max(1, ...all.map(s => scoped.filter(t => t.status === s.id).length));
    return all.map(s => ({ id: s.id, name: s.name, color: s.color, count: scoped.filter(t => t.status === s.id).length, max })).filter(s => s.count > 0);
  }, [scoped]);

  const matriz = React.useMemo(() => {
    const nome = (id) => setores.find(s => s.id == id)?.name || (id == null ? '—' : `#${id}`);
    const pares = new Map();
    periodBase.forEach(t => { const k = nome(t.origin_setor_id) + ' → ' + nome(t.setor_id); pares.set(k, (pares.get(k) || 0) + 1); });
    return [...pares.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  }, [periodBase, setores]);

  // --- ONDA 2: tempos médios + taxa de recusa + tendência de volume ---
  const tempos = React.useMemo(() => {
    const h = (ms) => ms / 3600000;
    const fmt = (horas) => horas == null ? '—' : (horas < 24 ? `${horas.toFixed(1)}h` : `${(horas / 24).toFixed(1)}d`);
    const logsDo = (id, novo) => logs.filter(l => String(l.ticket_id) === String(id) && l.action_type === 'STATUS_CHANGED' && l.new_value === novo);
    let aceS = 0, aceN = 0, resS = 0, resN = 0, seenS = 0, seenN = 0;
    scoped.forEach(t => {
      // aceite: 1º STATUS_CHANGED que sai do backlog (analise)
      const ace = logs.filter(l => String(l.ticket_id) === String(t.id) && l.action_type === 'STATUS_CHANGED' && l.new_value && l.new_value !== 'backlog')
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
      if (ace) { aceS += h(new Date(ace.created_at) - new Date(t.created_at)); aceN++; }
      // resolução: log resolvido, senão updated_at
      if (t.status === 'resolvido') {
        const rl = logsDo(t.id, 'resolvido').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        const resAt = rl ? new Date(rl.created_at) : (t.updated_at ? new Date(t.updated_at) : null);
        if (resAt) { resS += h(resAt - new Date(t.created_at)); resN++; }
      }
      // responsividade: 1ª visualização do responsável
      if (t.responsible_seen_at) { seenS += h(new Date(t.responsible_seen_at) - new Date(t.created_at)); seenN++; }
    });
    return { aceite: aceN ? fmt(aceS / aceN) : '—', resolucao: resN ? fmt(resS / resN) : '—', responsividade: seenN ? fmt(seenS / seenN) : '—' };
  }, [scoped, logs]);

  const recusa = React.useMemo(() => {
    const total = scoped.length, neg = scoped.filter(t => t.status === 'negado').length;
    return total ? Math.round((neg / total) * 100) : null;
  }, [scoped]);

  const volume = React.useMemo(() => {
    // Agrupa por DIA DA SEMANA (fuso SP): total de criadas em cada segunda, terça, etc.
    const ordem = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const mapEn = { Mon: 'Seg', Tue: 'Ter', Wed: 'Qua', Thu: 'Qui', Fri: 'Sex', Sat: 'Sáb', Sun: 'Dom' };
    const fmtWd = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' });
    const counts = Object.fromEntries(ordem.map(d => [d, 0]));
    scoped.forEach(t => { const pt = mapEn[fmtWd.format(new Date(t.created_at))]; if (pt) counts[pt]++; });
    const arr = ordem.map(dia => ({ dia, n: counts[dia] }));
    const max = Math.max(1, ...arr.map(x => x.n));
    return { arr, max };
  }, [scoped]);

  // Exporta as demandas do escopo atual em CSV (Excel-friendly, ;)
  const exportarCSV = () => {
    const nome = (id) => setores.find(s => s.id == id)?.name || '';
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = [['id', 'titulo', 'origem', 'destino', 'status', 'urgencia', 'tipo', 'responsavel', 'criado_em', 'entrega']];
    scoped.forEach(t => linhas.push([t.id, esc(t.title), nome(t.origin_setor_id), nome(t.setor_id), t.status, t.urgency, t.ticket_type || '', esc(t.responsible), fmtDataHoraSP(t.created_at), t.delivery_date ? fmtDataPura(t.delivery_date) : '']));
    const csv = linhas.map(l => l.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'relatorio-tickets.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="animate-in">
      <Skeleton w={200} h={26} r={8} style={{ marginBottom: '2rem' }} />
      <div className="glass" style={{ padding: '1.5rem' }}>
        <Skeleton w={280} h={16} style={{ marginBottom: '1.25rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem' }}>
          <Skeleton w="100%" h={150} r={12} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} w="100%" h={14} />)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 color="var(--primary)" /> Relatórios
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Admin escolhe o setor; gerente/resp. já vem fixo no próprio setor (dropdown oculto) */}
          {isAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <Layers size={16} style={{ color: 'var(--text-muted)' }} />
              <select
                value={selectedSetor}
                onChange={e => { setSelectedSetor(e.target.value); setSelectedResp(''); }}
                className="analytics-select"
                style={{ border: 'none', margin: 0, padding: '4px', fontSize: '0.85rem', fontWeight: '600', width: 'auto', color: 'inherit', background: 'none', cursor: 'pointer' }}
              >
                <option value="">Todos os setores</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          ) : setorFixo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <Layers size={16} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{setores.find(s => String(s.id) === setorFixo)?.name || 'Meu setor'}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <Users size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              value={selectedResp}
              onChange={e => setSelectedResp(e.target.value)}
              className="analytics-select"
              style={{ border: 'none', margin: 0, padding: '4px', fontSize: '0.85rem', fontWeight: '600', width: 'auto', color: 'inherit', background: 'none', cursor: 'pointer' }}
            >
              <option value="">Todos os usuários</option>
              {responsibleList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {/* Filtro de período */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            {[{ v: 7, l: '7d' }, { v: 30, l: '30d' }, { v: 90, l: '90d' }, { v: 0, l: 'Tudo' }].map(o => (
              <button key={o.v} onClick={() => setPeriodo(o.v)}
                style={{ padding: '4px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, background: periodo === o.v ? 'var(--primary)' : 'transparent', color: periodo === o.v ? '#fff' : 'var(--text-muted)' }}>{o.l}</button>
            ))}
          </div>
          <button onClick={exportarCSV} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px' }} title="Exportar as demandas do escopo atual em CSV">
            <RefreshCw size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total de demandas', valor: kpis.total, cor: 'var(--primary)' },
          { label: 'Abertas', valor: kpis.abertas, cor: '#3b82f6' },
          { label: 'Resolvidas', valor: kpis.resolvidas, cor: '#10b981' },
          { label: 'Aguardando aceite', valor: kpis.aguardando, cor: '#f59e0b' },
          { label: 'Vencidas', valor: kpis.vencidas, cor: '#ef4444' },
          { label: '% no prazo', valor: kpis.noPrazo == null ? '—' : `${kpis.noPrazo}%`, cor: '#8b5cf6' },
        ].map((k, i) => (
          <div key={i} className="glass" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 700 }}>{k.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: k.cor, marginTop: '4px' }}>{k.valor}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Distribuição por status */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800 }}>
            <LayoutDashboard size={16} color="var(--primary)" /> Distribuição por status
          </h3>
          {statusDist.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem demandas no período.</div>
          ) : statusDist.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, width: '90px', flexShrink: 0 }}>{s.name}</span>
              <div style={{ flex: 1, height: '10px', borderRadius: '999px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ width: `${(s.count / s.max) * 100}%`, height: '100%', background: s.color, borderRadius: '999px' }} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, width: '32px', textAlign: 'right' }}>{s.count}</span>
            </div>
          ))}
        </div>

        {/* Matriz origem → destino */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800 }}>
            <Layers size={16} color="var(--primary)" /> Demandas entre setores (origem → destino)
          </h3>
          {matriz.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem demandas no período.</div>
          ) : (
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }} className="hide-scrollbar">
              {matriz.map(m => (
                <div key={m.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.k}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, background: 'var(--primary)', color: '#fff', padding: '2px 10px', borderRadius: '999px', flexShrink: 0 }}>{m.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tempos médios + taxa de recusa */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Tempo médio de aceite', valor: tempos.aceite, cor: '#3b82f6' },
          { label: 'Tempo médio de resolução', valor: tempos.resolucao, cor: '#10b981' },
          { label: 'Responsividade (1ª visualização)', valor: tempos.responsividade, cor: '#8b5cf6' },
          { label: 'Taxa de recusa', valor: recusa == null ? '—' : `${recusa}%`, cor: '#ef4444' },
        ].map((k, i) => (
          <div key={i} className="glass" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 700 }}>{k.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: k.cor, marginTop: '4px' }}>{k.valor}</div>
          </div>
        ))}
      </div>

      {/* Volume de demandas criadas por dia da semana */}
      <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800 }}>
          <BarChart3 size={16} color="var(--primary)" /> Volume de demandas por dia da semana
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '160px' }}>
          {volume.arr.map(d => (
            <div key={d.dia} title={`${d.dia}: ${d.n} demanda(s)`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: '6px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{d.n}</span>
              <div style={{ width: '100%', maxWidth: '48px', height: `${(d.n / volume.max) * 100}%`, minHeight: '4px', background: d.n === volume.max ? 'var(--primary)' : 'rgba(99,102,241,0.5)', borderRadius: '6px 6px 0 0', transition: 'height 0.3s' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>{d.dia}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800 }}>
          <Calendar size={16} color="var(--primary)" /> Produtividade — entregas no prazo x fora do prazo
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem', alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>Tendência · {selectedSetor ? (setores.find(s => String(s.id) === String(selectedSetor))?.name || 'setor') : 'todos os setores'}{selectedResp ? ` · ${selectedResp}` : ''}</div>
            <ProdutividadeChart data={deliveryTrend} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '10px' }}>Quem entrega no prazo</div>
            <RankingPessoas people={deliveryByPerson} />
          </div>
        </div>
      </div>

    </div>
  );
}

// --- Views Administrativas ---
function UsersView({ user, onDeleteUser, fetchUsers: parentFetchUsers, allUsers, setores = [], systems = [] }) {
  const setorNome = (id) => setores.find(s => s.id == id)?.name || '';
  const subSetorNome = (id) => systems.find(s => s.id == id)?.name || '';
  const dbUsers = allUsers || [];
  const respNome = (id) => (dbUsers.find(u => u.id == id)?.name) || '';
  const isAdmin = user?.role === 'admin';

  // --- Minha equipe (gerente/responsável): funcionários que ELE cadastrou (responsavel_id = ele) ---
  const meusSetorIds = leadSetorIds(user, setores);
  const meusSystemIds = leadSystemIds(user, systems);
  const minhaEquipe = dbUsers.filter(u => responsaveisDe(u).includes(String(user?.id)));
  // setores que o líder pode atribuir ao membro: os que ele lidera + os que contêm um sub-setor dele
  const setoresAtribuiveis = setores.filter(s => meusSetorIds.includes(s.id) || systems.some(sy => sy.setor_id === s.id && meusSystemIds.includes(sy.id)));
  // sub-setores atribuíveis (só o gerente coloca o membro em sub-setores do seu setor)
  const subsAtribuiveis = systems.filter(sy => meusSetorIds.includes(sy.setor_id) || meusSystemIds.includes(sy.id));
  const linhas = isAdmin ? dbUsers : minhaEquipe; // admin vê todos; gerente/resp vê só a equipe dele
  const [membroEdit, setMembroEdit] = useState(null); // membro sendo editado pelo líder (cargo/setores/senha)

  const toggleBloqueio = async (u) => {
    try {
      const { error } = await api.from('users').update({ blocked: u.blocked ? 0 : 1 }).eq('id', u.id);
      if (error) throw error;
      toast.success(u.blocked ? 'Acesso liberado.' : 'Acesso bloqueado.');
      parentFetchUsers();
    } catch (e) { toast.error('Erro ao atualizar acesso: ' + (e.message || '')); }
  };
  // Salva cargo + setores/sub-setores em que atua + (opcional) senha do membro liderado
  const salvarMembro = async ({ role, setorIds, systemIds, password }) => {
    const setor_ids = (setorIds || []).map(Number);
    const payload = { role, setor_ids, setor_id: setor_ids[0] ?? null };
    if (systemIds) { // só quando o modal ofereceu sub-setores (líder gerente)
      const system_ids = systemIds.map(Number);
      payload.system_ids = system_ids;
      payload.system_id = system_ids[0] ?? null;
    }
    if (password) payload.password = password;
    try {
      const { error } = await api.from('users').update(payload).eq('id', membroEdit.id);
      if (error) throw error;
      toast.success('Membro atualizado!');
      setMembroEdit(null);
      parentFetchUsers();
    } catch (e) { toast.error('Erro ao salvar: ' + (e.message || '')); }
  };

  const [loading, setLoading] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [novoSetorId, setNovoSetorId] = useState(''); // setor escolhido no modal Novo Membro (controla o dropdown de sub-setor)
  const [editSetorId, setEditSetorId] = useState(''); // idem no modal Editar Membro
  const [editResps, setEditResps] = useState([]); // responsáveis do usuário em edição (admin) — principal + extras
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ao abrir o modal de edição, carrega os responsáveis atuais (principal ∪ extras)
  useEffect(() => {
    if (editingUser) setEditResps(responsaveisDe(editingUser).map(Number));
  }, [editingUser]);

  // Candidatos a responsável: líderes (gerente/resp. sub-setor/admin), menos o próprio usuário
  const responsavelCandidatos = dbUsers.filter(u =>
    ['admin', 'gerente', 'responsavel_subsetor'].includes(u.role) && u.id !== editingUser?.id
  );

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.setor_id = data.setor_id ? Number(data.setor_id) : null;
    data.system_id = data.system_id ? Number(data.system_id) : null;
    const emailNorm = String(data.email || '').toLowerCase().trim();
    const jaExiste = dbUsers.find(u => String(u.email || '').toLowerCase().trim() === emailNorm);
    if (jaExiste) { toast.error(`Já existe uma conta com este e-mail (${jaExiste.name}).`); playSound('error'); return; }
    const { error } = await api.from('users').insert([{ ...data, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}` }]);
    if (!error) {
      toast.success('Membro criado!');
      setIsNewUserModalOpen(false);
      parentFetchUsers();
      playSound('success');
    } else {
      toast.error(/duplicate/i.test(error.message || '') ? 'E-mail já cadastrado.' : (error.message || 'Não foi possível criar o membro.'));
      playSound('error');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.setor_id = data.setor_id ? Number(data.setor_id) : null;
    data.system_id = data.system_id ? Number(data.system_id) : null;
    if (!data.password) delete data.password; // em branco = mantém a senha atual
    // Responsáveis (só admin edita): 1º = principal (responsavel_id), demais = extras (responsavel_ids)
    const resps = [...new Set(editResps.map(Number))];
    data.responsavel_id = resps[0] ?? null;
    data.responsavel_ids = resps.slice(1);
    const { error } = await api.from('users').update(data).eq('id', editingUser.id);
    if (!error) { 
      toast.success('Dados atualizados!'); 
      setIsEditUserModalOpen(false); 
      parentFetchUsers(); 
      playSound('success'); 
    }
  };

  const handleDeleteUserInternal = (uId, uName) => {
    onDeleteUser(uId, uName);
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Carregando...</div>;

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.75rem', fontWeight: '800' }}>
            <Users color="var(--primary)" size={28} /> Gestão de Equipe
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{isAdmin ? 'Gerencie permissões e visualize o status dos membros.' : 'Gerencie os funcionários que você cadastrou: cargo, setores e acesso.'}</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => { setNovoSetorId(''); setIsNewUserModalOpen(true); }}>
            <Plus size={18} /> Adicionar Membro
          </button>
        )}
      </div>

      <div className="glass" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.015)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '1.25rem', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Membro</th>
                <th style={{ padding: '1.25rem', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Cargo</th>
                <th style={{ padding: '1.25rem', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Responsável</th>
                <th style={{ padding: '1.25rem', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '1.25rem', textAlign: 'right' }}>{isAdmin ? 'Ação' : 'Gerenciar'}</th>
              </tr>
            </thead>
            <tbody>
              {!isAdmin && linhas.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Você ainda não cadastrou nenhum funcionário. Gere um <strong>link de registro</strong> no menu <strong>Setores</strong>.
                </td></tr>
              )}
              {linhas.map(u => (
                <tr key={u.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ 
                          width: '42px', height: '42px', borderRadius: '12px', 
                          background: u.role === 'admin' ? 'var(--primary)' : 'var(--success)', 
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '800', fontSize: '1rem', border: '2px solid var(--surface)', 
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
                        }}>
                          {getInitials(u.name)}
                        </div>
                        <span style={{ 
                          position: 'absolute', 
                          bottom: '-2px', 
                          right: '-2px', 
                          width: '14px', 
                          height: '14px', 
                          background: u.is_online ? '#10b981' : '#ef4444', 
                          borderRadius: '50%', 
                          border: '2px solid var(--surface)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} title={u.is_online ? 'Disponível' : 'Offline'}></span>
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{u.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        {u.setor_id && <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, marginTop: '2px' }}>Setor: {setorNome(u.setor_id)}{u.system_id ? ` › ${subSetorNome(u.system_id)}` : ''}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <span className="badge" style={{
                      background: (ROLE_COLORS[u.role] || ROLE_COLORS.funcionario).bg,
                      color: (ROLE_COLORS[u.role] || ROLE_COLORS.funcionario).fg,
                      fontWeight: '700', textTransform: 'uppercase', fontSize: '0.65rem', padding: '4px 10px'
                    }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem', fontSize: '0.85rem' }}>
                    {(() => {
                      const nomes = responsaveisDe(u).map(id => respNome(id)).filter(Boolean);
                      return nomes.length
                        ? <span style={{ fontWeight: 600 }}>{nomes.join(', ')}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>;
                    })()}
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: u.is_online ? '#10b981' : 'var(--text-muted)', fontWeight: '600' }}>
                        {u.is_online ? 'Disponível' : 'Ausente'}
                      </span>
                      {u.blocked ? <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Bloqueado</span> : null}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                    {isAdmin ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="icon-btn" onClick={() => { setEditingUser(u); setEditSetorId(u.setor_id ?? ''); setIsEditUserModalOpen(true); playSound('click'); }} title="Editar Dados">
                          <Pencil size={16} />
                        </button>
                        <button className="icon-btn logout" onClick={() => handleDeleteUserInternal(u.id, u.name)} title="Excluir Usuário">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button className="icon-btn" onClick={() => setMembroEdit(u)} title="Editar cargo / setores / senha"><Pencil size={16} /></button>
                        <button className="icon-btn" type="button" onClick={() => toggleBloqueio(u)} title={u.blocked ? 'Bloqueado — clique para liberar' : 'Bloquear acesso'}
                          style={{ color: u.blocked ? '#ef4444' : 'var(--text-muted)' }}>
                          <Lock size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {mounted && isNewUserModalOpen && createPortal(
        <div className="overlay" onClick={() => setIsNewUserModalOpen(false)}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass modal" style={{ width: '400px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Novo Membro</h3>
              <input name="name" placeholder="Nome" required />
              <input name="email" type="email" placeholder="E-mail" required />
              <input name="password" type="password" placeholder="Senha" required />
              <select name="role" defaultValue="funcionario">
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <select name="setor_id" value={novoSetorId} onChange={e => setNovoSetorId(e.target.value)}>
                <option value="">Setor (nenhum)</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {/* Sub-setor só aparece se o setor escolhido tiver sub-setores */}
              {(() => {
                const subs = systems.filter(s => String(s.setor_id) === String(novoSetorId));
                return novoSetorId && subs.length > 0 ? (
                  <select name="system_id" defaultValue="">
                    <option value="">Sub-setor (nenhum)</option>
                    {subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : null;
              })()}
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Cadastrar</button>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
      {mounted && isEditUserModalOpen && createPortal(
        <div className="overlay" onClick={() => setIsEditUserModalOpen(false)}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass modal" style={{ width: '400px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Editar Membro</h3>
                <button type="button" onClick={() => setIsEditUserModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <label style={{ fontSize: '0.75rem' }}>Nome Completo</label>
              <input name="name" defaultValue={editingUser?.name} placeholder="Nome" required />
              <label style={{ fontSize: '0.75rem' }}>E-mail de Acesso</label>
              <input name="email" type="email" defaultValue={editingUser?.email} placeholder="E-mail" required />
              <label style={{ fontSize: '0.75rem' }}>Nova Senha <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(deixe em branco para manter)</span></label>
              <input name="password" type="text" placeholder="Definir nova senha" autoComplete="new-password" />
              <label style={{ fontSize: '0.75rem' }}>Cargo / Permissão</label>
              <select name="role" defaultValue={editingUser?.role}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <label style={{ fontSize: '0.75rem' }}>Setor</label>
              <select name="setor_id" value={editSetorId} onChange={e => setEditSetorId(e.target.value)}>
                <option value="">Setor (nenhum)</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {/* Sub-setor só aparece se o setor selecionado tiver sub-setores */}
              {(() => {
                const subs = systems.filter(s => String(s.setor_id) === String(editSetorId));
                if (!editSetorId || subs.length === 0) return null;
                const defSub = subs.some(s => String(s.id) === String(editingUser?.system_id)) ? editingUser.system_id : '';
                return (
                  <>
                    <label style={{ fontSize: '0.75rem' }}>Sub-setor <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(funcionário/colaborador de um sub-setor)</span></label>
                    <select name="system_id" key={editSetorId} defaultValue={defSub}>
                      <option value="">Sub-setor (nenhum)</option>
                      {subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </>
                );
              })()}
              <label style={{ fontSize: '0.75rem' }}>Responsáveis <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(quem lidera este usuário; pode ter mais de um)</span></label>
              <select value="" onChange={e => {
                const id = Number(e.target.value);
                if (id && !editResps.includes(id)) setEditResps([...editResps, id]);
                e.target.value = '';
              }}>
                <option value="">Adicionar responsável...</option>
                {responsavelCandidatos.filter(u => !editResps.includes(u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role] || u.role})</option>
                ))}
              </select>
              {editResps.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                  {editResps.map((id, idx) => (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--primary)', color: 'white', padding: '3px 9px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600 }}>
                      {idx === 0 && <span title="Responsável principal" style={{ fontSize: '0.62rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 800 }}>principal</span>}
                      {respNome(id) || `#${id}`}
                      <X size={12} style={{ cursor: 'pointer' }} onClick={() => setEditResps(editResps.filter(x => x !== id))} />
                    </div>
                  ))}
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Salvar Alterações</button>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
      {membroEdit && (
        <MembroEditModal member={membroEdit} setoresAtribuiveis={setoresAtribuiveis} subsAtribuiveis={user?.role === 'gerente' ? subsAtribuiveis : null} onClose={() => setMembroEdit(null)} onSave={salvarMembro} />
      )}
    </div>
  );
}

// Modal do líder p/ editar um membro da equipe: cargo, setores (e sub-setores, se o líder é gerente) e senha.
function MembroEditModal({ member, setoresAtribuiveis = [], subsAtribuiveis = null, onClose, onSave }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const iniciais = [member.setor_id, ...(Array.isArray(member.setor_ids) ? member.setor_ids : [])].filter(v => v != null).map(String);
  const iniciaisSub = [member.system_id, ...(Array.isArray(member.system_ids) ? member.system_ids : [])].filter(v => v != null).map(String);
  const [role, setRole] = useState(member.role || 'funcionario');
  const [setorIds, setSetorIds] = useState(new Set(iniciais));
  const [systemIds, setSystemIds] = useState(new Set(iniciaisSub));
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  if (!mounted) return null;
  const toggle = (id) => setSetorIds(prev => { const n = new Set(prev); n.has(String(id)) ? n.delete(String(id)) : n.add(String(id)); return n; });
  const toggleSub = (id) => setSystemIds(prev => { const n = new Set(prev); n.has(String(id)) ? n.delete(String(id)) : n.add(String(id)); return n; });
  const cargos = ['funcionario', 'gerente', 'responsavel_subsetor'];
  return createPortal(
    <div className="overlay" style={{ alignItems: 'center', padding: '1rem' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass modal" style={{ width: '440px', maxWidth: '94vw', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>Editar membro</span>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 800 }}>{member.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div className="form-group">
          <label style={{ fontSize: '0.75rem' }}>Cargo</label>
          <select value={role} onChange={e => setRole(e.target.value)}>
            {cargos.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label style={{ fontSize: '0.75rem' }}>Setores em que atua</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {setoresAtribuiveis.length === 0 && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum setor disponível.</span>}
            {setoresAtribuiveis.map(s => {
              const on = setorIds.has(String(s.id));
              return (
                <button key={s.id} type="button" onClick={() => toggle(s.id)}
                  style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--primary)' : 'var(--glass-border)'}`,
                    background: on ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: on ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {on ? '✓ ' : ''}{s.name}
                </button>
              );
            })}
          </div>
        </div>

        {Array.isArray(subsAtribuiveis) && subsAtribuiveis.length > 0 && (
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label style={{ fontSize: '0.75rem' }}>Sub-setores em que atua</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {subsAtribuiveis.map(s => {
                const on = systemIds.has(String(s.id));
                return (
                  <button key={s.id} type="button" onClick={() => toggleSub(s.id)}
                    style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      border: `1px solid ${on ? 'var(--primary)' : 'var(--glass-border)'}`,
                      background: on ? 'rgba(99,102,241,0.12)' : 'transparent',
                      color: on ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {on ? '✓ ' : ''}{s.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label style={{ fontSize: '0.75rem' }}>Nova senha <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(deixe em branco para manter)</span></label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ flex: 1, margin: 0 }} />
            <button type="button" className="btn btn-ghost" style={{ flex: '0 0 auto' }} onClick={() => setShowPass(v => !v)}>{showPass ? 'Ocultar' : 'Mostrar'}</button>
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => onSave({ role, setorIds: [...setorIds], systemIds: Array.isArray(subsAtribuiveis) ? [...systemIds] : undefined, password: password.trim() })}>
          Salvar
        </button>
      </motion.div>
    </div>,
    document.body
  );
}

function SetoresView({ user, setores = [], systems = [], allUsers = [], onUpdate }) {
  const [activeModal, setActiveModal] = useState(null); // 'edit_name' | 'manage_resps' | 'delete_confirm' | 'new_system'
  const [editingEntity, setEditingEntity] = useState(null);
  const [editingTable, setEditingTable] = useState('setores'); // 'setores' | 'systems'
  const [newParentSetorId, setNewParentSetorId] = useState(null); // setor onde o novo sistema entra
  const [teamAssign, setTeamAssign] = useState({}); // { userId: 'gerente' | 'funcionario' } — equipe do setor/sub-setor
  const [linkModal, setLinkModal] = useState(null); // { tipo, target } p/ o link de registro

  const isAdmin = user?.role === 'admin';
  const entityLabel = editingTable === 'setores' ? 'Setor' : 'Sub-Setor';
  const fem = entityLabel.endsWith('a'); // concordância de gênero (Setor/Sub-Setor = masculino)
  const nomeUsuario = (id) => allUsers.find(u => u.id === id)?.name || `#${id}`;

  // Quem CONFIGURA (auto_pool): admin, o gerente do setor, ou o responsável do sub-setor
  const meusSetorIds = leadSetorIds(user, setores);
  const meusSystemIds = leadSystemIds(user, systems);
  const podeConfigSetor = (s) => isAdmin || meusSetorIds.includes(s.id);
  const podeConfigSub = (sys) => isAdmin || meusSystemIds.includes(sys.id);

  // Não-admin vê só os setores que lidera OU que contêm um sub-setor que ele lidera
  const setoresVisiveis = isAdmin ? setores : setores.filter(s =>
    meusSetorIds.includes(s.id) || systems.some(sy => sy.setor_id === s.id && meusSystemIds.includes(sy.id))
  );

  // Liga/desliga "time pega a demanda" (auto_pool) de um setor/sub-setor
  const toggleAutoPool = async (table, entity) => {
    try {
      const { error } = await api.from(table).update({ auto_pool: entity.auto_pool ? 0 : 1 }).eq('id', entity.id);
      if (error) throw error;
      toast.success(entity.auto_pool ? 'Auto: desligado.' : 'Auto: time pega a demanda ligado.');
      onUpdate();
    } catch (e) { toast.error('Erro ao salvar a configuração.'); }
  };

  // Altera a visibilidade de origem do setor (quem dos colegas de origem vê os chamados enviados por ele)
  const setOriginVisibility = async (setor, modo) => {
    try {
      const { error } = await api.from('setores').update({ origin_visibility: modo }).eq('id', setor.id);
      if (error) throw error;
      toast.success('Visibilidade dos envios atualizada.');
      onUpdate();
    } catch (e) { toast.error('Erro ao salvar a configuração.'); }
  };

  // Liga/desliga auto_pool com valor explícito (usado pelo modal Editar Setor).
  const setAutoPool = async (setor, val) => {
    try {
      const { error } = await api.from('setores').update({ auto_pool: val ? 1 : 0 }).eq('id', setor.id);
      if (error) throw error;
      onUpdate();
    } catch (e) { toast.error('Erro ao salvar a configuração.'); }
  };

  // Destinos permitidos: setores para os quais ESTE setor pode abrir chamado (só admin configura).
  const setDestinos = async (setor, ids) => {
    try {
      const { error } = await api.from('setores').update({ destinos_permitidos: ids }).eq('id', setor.id);
      if (error) throw error;
      toast.success('Destinos permitidos atualizados.');
      onUpdate();
    } catch (e) { toast.error('Erro ao salvar os destinos.'); }
  };

  // Botão/indicador do auto_pool. canEdit → clicável (gerente/resp/admin); senão → só mostra quando ligado.
  const AutoPoolBtn = ({ table, entity, canEdit }) => {
    const on = !!entity.auto_pool;
    if (!canEdit && !on) return null;
    const style = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${on ? '#10b981' : 'var(--glass-border)'}`, background: on ? 'rgba(16,185,129,0.12)' : 'transparent', color: on ? '#10b981' : 'var(--text-muted)', cursor: canEdit ? 'pointer' : 'default' };
    const label = <><Users size={12} /> Time pega a demanda: {on ? 'ON' : 'OFF'}</>;
    return canEdit
      ? <button type="button" onClick={() => toggleAutoPool(table, entity)} title="Toda demanda que chega já fica disponível pro time pegar (notifica os funcionários)" style={style}>{label}</button>
      : <span style={style}>{label}</span>;
  };

  // usuário pertence a esta entidade? (setor: setor_id direto sem sub-setor / sub-setor: system_id)
  const pertence = (u, table, entity) => table === 'setores'
    ? (userSetorIds(u).includes(String(entity?.id)) && userSystemIds(u).length === 0)
    : userSystemIds(u).includes(String(entity?.id));

  const openModal = (type, table, entity = null, parentSetorId = null) => {
    setEditingTable(table);
    setEditingEntity(entity);
    setNewParentSetorId(parentSetorId);
    if (type === 'manage_resps') {
      const gerRole = table === 'setores' ? 'gerente' : 'responsavel_subsetor';
      const init = {};
      allUsers.forEach(u => {
        if (pertence(u, table, entity)) init[u.id] = u.role === gerRole ? 'gerente' : 'funcionario';
      });
      setTeamAssign(init);
    }
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingEntity(null);
    setTeamAssign({});
    setNewParentSetorId(null);
  };

  const setAssign = (userId, papel) => {
    setTeamAssign(prev => {
      const next = { ...prev };
      if (!papel) delete next[userId]; else next[userId] = papel;
      return next;
    });
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    const name = new FormData(e.target).get('name');
    try {
      if (activeModal === 'new_system') {
        const payload = editingTable === 'systems'
          ? { name, primary_responsibles: [], setor_id: newParentSetorId }
          : { name, primary_responsibles: [] };
        const { error } = await api.from(editingTable).insert([payload]);
        if (error) throw error;
        toast.success(`${entityLabel} criad${fem ? 'a' : 'o'}!`);
      } else {
        const { error } = await api.from(editingTable).update({ name }).eq('id', editingEntity.id);
        if (error) throw error;
        toast.success('Nome atualizado!');
      }
      closeModal();
      onUpdate();
    } catch (err) {
      toast.error('Erro ao salvar.');
    }
  };

  // Salva a equipe: grava CARGO + LOTAÇÃO de cada usuário conforme escolhido no modal.
  const handleSaveTeam = async () => {
    if (!editingEntity?.id) { toast.error('Registro não identificado.'); return; }
    const table = editingTable, entity = editingEntity;
    const gerRole = table === 'setores' ? 'gerente' : 'responsavel_subsetor';
    const isSub = table === 'systems';
    const parentSetor = isSub ? entity.setor_id : entity.id;
    try {
      for (const u of allUsers) {
        const alvo = teamAssign[u.id]; // 'gerente' | 'funcionario' | undefined
        const estava = pertence(u, table, entity);
        if (!alvo && !estava) continue;

        // Lotação como UNIÃO: um funcionário pode atuar em vários setores/sub-setores sem perder os demais.
        const subs = new Set(userSystemIds(u));  // ids (string) dos sub-setores onde já atua
        const setrs = new Set(userSetorIds(u));  // ids (string) dos setores onde já atua
        if (isSub) {
          if (alvo) { subs.add(String(entity.id)); setrs.add(String(parentSetor)); }
          else subs.delete(String(entity.id));
        } else {
          if (alvo) setrs.add(String(entity.id));
          else setrs.delete(String(entity.id));
        }

        const system_ids = [...subs].map(Number);
        const setor_ids = [...setrs].map(Number);
        const system_id = system_ids[0] ?? null; // primário = 1º da lista (mesmo padrão de "Minha equipe")
        const setor_id = setor_ids[0] ?? null;
        const role = alvo ? (alvo === 'gerente' ? gerRole : 'funcionario') : u.role; // remoção mantém o cargo global

        await api.from('users').update({ role, setor_id, setor_ids, system_id, system_ids }).eq('id', u.id);
      }
      toast.success('Equipe salva!');
      closeModal();
      onUpdate();
    } catch (err) {
      toast.error(`Erro ao salvar: ${err.message || 'Falha no banco'}`);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const { error } = await api.from(editingTable).delete().eq('id', editingEntity.id);
      if (error) throw error;
      toast.success(`${entityLabel} excluíd${fem ? 'a' : 'o'}.`);
      closeModal();
      onUpdate();
    } catch (err) {
      toast.error('Erro ao excluir: ' + (err.message || err));
    }
  };

  // (Gestão da equipe — "Minha equipe" — foi movida para o menu Usuários.)

  const RespChips = ({ list }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {list?.length > 0 ? list.map((r, idx) => (
        <span key={idx} style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>{nomeUsuario(r)}</span>
      )) : <span style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum responsável</span>}
    </div>
  );

  // Chip de membro com o cargo (cor por cargo) — usado no setor e sub-setor
  const ChipMembro = ({ m }) => {
    const c = ROLE_COLORS[m.role] || ROLE_COLORS.funcionario;
    return (
      <span title={ROLE_LABELS[m.role]} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: c.bg, color: c.fg, border: `1px solid ${c.fg}22` }}>
        {m.name} · {ROLE_LABELS[m.role]}
      </span>
    );
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.75rem', fontWeight: '800' }}>
            <Layers color="var(--primary)" size={28} /> Setores
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>Gerencie os setores, seus sistemas e as equipes responsáveis.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => openModal('new_system', 'setores')}>
            <Plus size={18} /> Novo Setor
          </button>
        )}
      </div>


      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {setoresVisiveis.map(setor => {
          const sistemasDoSetor = systems.filter(sys => sys.setor_id == setor.id);
          // Membros do setor (vinculados ao setor OU a um sub-setor dele), separados por cargo
          const subIds = new Set(sistemasDoSetor.map(s => String(s.id)));
          // Membro do setor = atua no setor (principal/extra) OU num sub-setor dele (principal/extra) — considera setor_ids/system_ids
          const membros = allUsers.filter(u => userSetorIds(u).includes(String(setor.id)) || userSystemIds(u).some(sid => subIds.has(sid)));
          const gerentesSetor = membros.filter(u => u.role === 'gerente');
          // "Funcionários do setor" = lotados DIRETO no setor (os de sub-setor aparecem no card do sub-setor)
          const funcsSetor = membros.filter(u => u.role === 'funcionario' && !userSystemIds(u).some(sid => subIds.has(sid)));
          return (
            <motion.div layout key={setor.id} className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Cabeçalho do setor: nome + GERENTE(s) à direita */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={20} />
                  </div>
                  <h3 style={{ fontWeight: '800', fontSize: '1.2rem' }}>{setor.name}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end' }}>
                    {gerentesSetor.length > 0
                      ? gerentesSetor.map(m => <ChipMembro key={m.id} m={m} />)
                      : <span style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sem gerente no setor</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {podeConfigSetor(setor) && <button onClick={() => openModal('new_system', 'systems', null, setor.id)} className="icon-btn" title="Adicionar Sub-Setor"><Plus size={14} /></button>}
                    {podeConfigSetor(setor) && <button onClick={() => setLinkModal({ tipo: 'setor', target: setor })} className="icon-btn" title="Link de registro"><Link2 size={14} /></button>}
                    {podeConfigSetor(setor) && <button onClick={() => openModal('manage_resps', 'setores', setor)} className="icon-btn" title="Equipe do Setor — adicionar/remover seus funcionários"><UserPlus size={14} /></button>}
                    {podeConfigSetor(setor) && <button onClick={() => openModal('edit_name', 'setores', setor)} className="icon-btn" title="Editar Setor (nome e configurações)"><Pencil size={14} /></button>}
                    {isAdmin && <button onClick={() => openModal('delete_confirm', 'setores', setor)} className="icon-btn logout" title="Excluir Setor"><Trash2 size={14} /></button>}
                  </div>
                </div>
              </div>

              {/* Indicador (só leitura) de "time pega a demanda" ligado; a configuração vive em Editar Setor */}
              {!!setor.auto_pool && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #10b981', background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                    <Users size={12} /> Time pega a demanda: ON
                  </span>
                </div>
              )}

              {/* Funcionários do setor */}
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '8px' }}>Funcionários do setor</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {funcsSetor.length > 0
                    ? funcsSetor.map(m => <ChipMembro key={m.id} m={m} />)
                    : <span style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum funcionário no setor</span>}
                </div>
              </div>

              {/* Sub-setores do setor (cada um com seus responsáveis ao lado do nome) */}
              {sistemasDoSetor.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {sistemasDoSetor.map(sys => {
                    // Responsáveis do sub-setor = resp. sub-setor que atua nele (principal/extra) + primary_responsibles
                    const idsResp = new Set(Array.isArray(sys.primary_responsibles) ? sys.primary_responsibles : []);
                    allUsers.forEach(u => { if (u.role === 'responsavel_subsetor' && userSystemIds(u).includes(String(sys.id))) idsResp.add(u.id); });
                    const respsSub = [...idsResp].map(id => allUsers.find(u => u.id === id)).filter(Boolean);
                    // Funcionários que atuam neste sub-setor (principal/extra)
                    const funcsSub = allUsers.filter(u => u.role === 'funcionario' && userSystemIds(u).includes(String(sys.id)));
                    return (
                    <div key={sys.id} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <Code2 size={16} color="var(--primary)" />
                          <span style={{ fontWeight: '700' }}>{sys.name}</span>
                          {/* Responsável(is) do sub-setor ao lado do nome */}
                          {respsSub.length > 0
                            ? respsSub.map(m => <ChipMembro key={m.id} m={m} />)
                            : (gerentesSetor.length > 0
                                ? <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>via gerente do setor</span>
                                : <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem responsável</span>)}
                        </div>
                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                          {(podeConfigSetor(setor) || podeConfigSub(sys)) && <button onClick={() => setLinkModal({ tipo: 'categoria', target: sys })} className="icon-btn" title="Link de registro"><Link2 size={12} /></button>}
                          {(podeConfigSetor(setor) || podeConfigSub(sys)) && <button onClick={() => openModal('edit_name', 'systems', sys)} className="icon-btn" title="Editar Nome (renomear sub-setor)"><Pencil size={12} /></button>}
                          {(podeConfigSetor(setor) || podeConfigSub(sys)) && <button onClick={() => openModal('manage_resps', 'systems', sys)} className="icon-btn" title="Equipe do sub-setor — adicionar/remover seus funcionários"><UserPlus size={12} /></button>}
                          {isAdmin && <button onClick={() => openModal('delete_confirm', 'systems', sys)} className="icon-btn logout" title="Excluir"><Trash2 size={12} /></button>}
                        </div>
                      </div>
                      {/* Config do sub-setor: time pega a demanda */}
                      {(podeConfigSub(sys) || !!sys.auto_pool) && (
                        <AutoPoolBtn table="systems" entity={sys} canEdit={podeConfigSub(sys)} />
                      )}
                      {/* Funcionários do sub-setor */}
                      <div>
                        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>Funcionários</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {funcsSub.length > 0
                            ? funcsSub.map(m => <ChipMembro key={m.id} m={m} />)
                            : <span style={{ fontStyle: 'italic', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Nenhum</span>}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}
        {setoresVisiveis.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Nenhum setor cadastrado.</div>
        )}
      </div>

      <AnimatePresence>
        {activeModal && (
          <SystemActionModal
            type={activeModal}
            entityLabel={entityLabel}
            table={editingTable}
            system={editingEntity}
            users={allUsers}
            restrictToLeaderId={isAdmin ? null : user?.id}
            teamAssign={teamAssign}
            onSetAssign={setAssign}
            onClose={closeModal}
            onSaveName={handleSaveName}
            onSaveTeam={handleSaveTeam}
            onConfirmDelete={handleConfirmDelete}
            setores={setores}
            isAdmin={isAdmin}
            canConfigSetor={editingEntity ? podeConfigSetor(editingEntity) : false}
            onSetAutoPool={setAutoPool}
            onSetOriginVisibility={setOriginVisibility}
            onSetDestinos={setDestinos}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {linkModal && (
          <RegistroLinkModal tipo={linkModal.tipo} target={linkModal.target} criador={user} systems={systems} onClose={() => setLinkModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-componente para Modais de Sistemas (Estabilidade de Portal/Animação) ---
function SystemActionModal({ type, entityLabel = 'Sistema', table = 'setores', system, users, restrictToLeaderId = null, teamAssign = {}, onSetAssign, onClose, onSaveName, onSaveTeam, onConfirmDelete,
  setores = [], isAdmin = false, canConfigSetor = false, onSetAutoPool, onSetOriginVisibility, onSetDestinos }) {
  const [mounted, setMounted] = useState(false);
  const [busca, setBusca] = useState('');
  // Config do setor (estado local p/ feedback imediato; cada mudança persiste na hora via handler do pai)
  const [cfgAuto, setCfgAuto] = useState(!!system?.auto_pool);
  const [cfgVis, setCfgVis] = useState(system?.origin_visibility || 'own');
  const [cfgDest, setCfgDest] = useState((Array.isArray(system?.destinos_permitidos) ? system.destinos_permitidos : []).map(String));
  useEffect(() => setMounted(true), []);

  const fem = entityLabel.endsWith('a'); // concordância de gênero (ex: Categoria)
  // Não-admin (gerente/responsável): só enxerga os funcionários sob sua responsabilidade + os que já são membros (p/ remover).
  const podeGerir = (u) => !restrictToLeaderId || responsaveisDe(u).includes(String(restrictToLeaderId)) || teamAssign[u.id];
  const usuariosFiltrados = users.filter(u => u.role !== 'admin' && podeGerir(u) && (u.name || '').toLowerCase().includes(busca.toLowerCase())); // admin não entra em equipe (vê tudo)
  const gerLabel = table === 'setores' ? 'Gerente' : 'Responsável'; // no sub-setor o "gerente" é o responsável

  if (!mounted) return null;

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="glass modal"
        style={{ width: type === 'manage_resps' ? '550px' : '450px', padding: '2.5rem' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>
            {type === 'edit_name' && (table === 'setores' ? 'Editar Setor' : 'Editar Nome')}
            {type === 'new_system' && `${fem ? 'Nova' : 'Novo'} ${entityLabel}`}
            {type === 'manage_resps' && `Gerenciar Equipe · ${entityLabel}`}
            {type === 'delete_confirm' && 'Confirmar Exclusão'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
            <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>

        {(type === 'edit_name' || type === 'new_system') && (
          <form onSubmit={onSaveName} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label>Nome d{fem ? 'a' : 'o'} {entityLabel}</label>
              <input name="name" defaultValue={system?.name} placeholder={entityLabel === 'Setor' ? 'Ex: TI, Financeiro...' : 'Ex: Matriz, Zaploto...'} required autoFocus readOnly={type === 'edit_name' && table === 'setores' && !isAdmin} />
              {type === 'edit_name' && table === 'setores' && !isAdmin && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Só o administrador pode renomear o setor.</p>
              )}
            </div>

            {/* Configurações do setor (movidas do card para cá) */}
            {type === 'edit_name' && table === 'setores' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>Configurações do setor</div>

                {canConfigSetor && (
                  <button type="button"
                    onClick={() => { const v = !cfgAuto; setCfgAuto(v); onSetAutoPool && onSetAutoPool(system, v); }}
                    title="Toda demanda que chega já fica disponível pro time pegar (notifica os funcionários)"
                    style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: `1px solid ${cfgAuto ? '#10b981' : 'var(--glass-border)'}`, background: cfgAuto ? 'rgba(16,185,129,0.12)' : 'transparent', color: cfgAuto ? '#10b981' : 'var(--text-muted)' }}>
                    <Users size={13} /> Time pega a demanda: {cfgAuto ? 'ON' : 'OFF'}
                  </button>
                )}

                {canConfigSetor && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Quem vê os envios do setor (colegas de origem):
                    <select value={cfgVis} onChange={e => { setCfgVis(e.target.value); onSetOriginVisibility && onSetOriginVisibility(system, e.target.value); }} style={{ margin: 0, padding: '8px', fontSize: '0.8rem' }}>
                      <option value="own">Só o autor</option>
                      <option value="subsetor">Mesmo sub-setor de origem</option>
                      <option value="setor">Todo o setor de origem</option>
                    </select>
                  </label>
                )}

                {isAdmin && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      title="Setores de destino para os quais este setor pode abrir chamado. Vazio = não pode abrir para nenhum. Admin sempre pode.">
                      <Share2 size={13} /> Pode abrir chamado para:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {setores.length === 0 && <span style={{ fontSize: '0.72rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>Nenhum setor.</span>}
                      {setores.map(alvo => {
                        const on = cfgDest.includes(String(alvo.id));
                        const proprio = String(alvo.id) === String(system?.id);
                        return (
                          <button key={alvo.id} type="button"
                            onClick={() => { const novo = on ? cfgDest.filter(x => x !== String(alvo.id)) : [...cfgDest, String(alvo.id)]; setCfgDest(novo); onSetDestinos && onSetDestinos(system, novo); }}
                            style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', border: `1px solid ${on ? 'var(--primary)' : 'var(--glass-border)'}`, background: on ? 'rgba(99,102,241,0.12)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text-muted)' }}>
                            {on ? '✓ ' : ''}{alvo.name}{proprio ? ' (próprio)' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Gravar Alterações</button>
          </form>
        )}

        {type === 'manage_resps' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              Equipe de <strong>{system?.name}</strong> — defina <strong>{gerLabel.toLowerCase()}(s)</strong> e <strong>funcionários</strong>. O papel escolhido grava o cargo e a lotação da pessoa.
            </p>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar usuário pelo nome..."
                style={{ margin: 0, paddingLeft: '38px' }}
                autoFocus
              />
            </div>
            <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {usuariosFiltrados.length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>Nenhum usuário encontrado.</p>
              )}
              {usuariosFiltrados.map(u => {
                const papel = teamAssign[u.id]; // 'gerente' | 'funcionario' | undefined
                const Opt = ({ val, label, cor }) => (
                  <button type="button" onClick={() => onSetAssign(u.id, papel === val ? null : val)}
                    style={{
                      padding: '5px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                      border: `1px solid ${papel === val ? cor : 'var(--glass-border)'}`,
                      background: papel === val ? cor : 'transparent',
                      color: papel === val ? '#fff' : 'var(--text-muted)'
                    }}>{label}</button>
                );
                return (
                  <div key={u.id} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: papel ? 'rgba(99,102,241,0.05)' : 'transparent' }}>
                    <span style={{ fontWeight: '500', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <Opt val="gerente" label={gerLabel} cor="#ec4899" />
                      <Opt val="funcionario" label="Funcionário" cor="#64748b" />
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={onSaveTeam} className="btn btn-primary" style={{ width: '100%' }}>Salvar Equipe</button>
          </div>
        )}

        {type === 'delete_confirm' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <AlertTriangle size={32} />
            </div>
            <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
              Excluir {fem ? 'a' : 'o'} {entityLabel.toLowerCase()} <strong>{system?.name}</strong>?<br />
              <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Esta ação é irreversível.</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button onClick={onClose} className="btn btn-ghost" style={{ width: '100%' }}>Cancelar</button>
              <button onClick={onConfirmDelete} className="btn btn-primary" style={{ width: '100%', background: '#ef4444', border: 'none' }}>Excluir Agora</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
}

// --- Configurações do sistema (admin): credenciais de e-mail (Resend) ---
function ConfigView() {
  const [status, setStatus] = useState({ emailConfigured: false, emailFrom: null });
  const [apiKey, setApiKey] = useState('');
  const [from, setFrom] = useState('');
  const [saving, setSaving] = useState(false);
  const [testeEmail, setTesteEmail] = useState('');
  const [testando, setTestando] = useState(false);
  const [notif, setNotif] = useState({ ticket_criado: true, ticket_alterado: true, nova_mensagem: true });
  const [limpando, setLimpando] = useState(false);
  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false);

  const limparBanco = async () => {
    if (!confirmarLimpeza) { setConfirmarLimpeza(true); setTimeout(() => setConfirmarLimpeza(false), 5000); return; }
    setConfirmarLimpeza(false);
    setLimpando(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const r = await (await fetch('/api/limpar-banco', { method: 'POST', headers: { 'x-session-token': token || '' } })).json();
      if (r.ok) { toast.success(`Banco limpo — só os admins ficaram. ${r.usuariosRemovidos} usuário(s) removido(s).`); playSound('success'); setTimeout(() => window.location.reload(), 1500); }
      else toast.error('Erro ao limpar: ' + (r.error || ''));
    } catch { toast.error('Falha ao limpar o banco.'); }
    finally { setLimpando(false); }
  };

  const carregar = async () => {
    try { const r = await (await fetch('/api/config')).json(); setStatus(r); setFrom(r.emailFrom || ''); if (r.notif) setNotif(r.notif); } catch {}
  };
  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    setSaving(true);
    try {
      const r = await (await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resendApiKey: apiKey || undefined, emailFrom: from || undefined, notif }) })).json();
      if (r.ok) { toast.success('Configuração salva!'); setApiKey(''); playSound('success'); carregar(); }
      else toast.error('Erro ao salvar: ' + (r.error || ''));
    } catch { toast.error('Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const enviarTeste = async () => {
    if (!testeEmail) { toast.error('Informe um e-mail para o teste.'); return; }
    setTestando(true);
    try {
      const r = await (await fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: [testeEmail], subject: 'TicketFlow — teste de e-mail', email: { cabecalho: 'Notificação de Ticket', icone: '✉️', titulo: 'E-mail de teste', descricao: 'Se você recebeu este e-mail, a integração de notificações do TicketFlow está funcionando ✅', assinatura: 'TicketFlow' } }) })).json();
      if (r.ok) toast.success('E-mail de teste enviado!');
      else if (r.skipped) toast.error('E-mail não configurado ainda.');
      else toast.error('Falha no envio: ' + (r.error || ''));
    } catch { toast.error('Falha no envio.'); }
    finally { setTestando(false); }
  };

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.75rem', fontWeight: '800' }}>
          <Settings color="var(--primary)" size={28} /> Configurações
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>Credenciais de integração do sistema.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
      <div className="glass" style={{ padding: '1.75rem', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Notificações por e-mail (Resend)</h3>
          <span className="badge" style={{ background: status.emailConfigured ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: status.emailConfigured ? '#10b981' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', padding: '4px 10px' }}>
            {status.emailConfigured ? 'Configurado ✓' : 'Não configurado'}
          </span>
        </div>

        <div className="form-group">
          <label style={{ fontSize: '0.75rem' }}>API Key do Resend <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(em branco = mantém a atual)</span></label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="re_..." autoComplete="new-password" />
        </div>
        <div className="form-group">
          <label style={{ fontSize: '0.75rem' }}>Remetente (From)</label>
          <input value={from} onChange={e => setFrom(e.target.value)} placeholder="TicketFlow &lt;chamados@seudominio.com&gt;" />
        </div>

        <div style={{ height: '1px', background: 'var(--glass-border)', margin: '1.25rem 0' }} />
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 800 }}>Quando enviar e-mail</h4>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>Escolha quais eventos disparam notificação por e-mail.</p>
        {[
          ['ticket_criado', 'Ao criar uma demanda', 'avisa os responsáveis do setor de destino'],
          ['ticket_alterado', 'Em qualquer alteração da demanda', 'avisa o solicitante (criador)'],
          ['nova_mensagem', 'Ao chegar nova mensagem no chat', 'avisa o outro lado da conversa'],
        ].map(([k, titulo, sub]) => (
          <label key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!notif[k]} onChange={e => setNotif({ ...notif, [k]: e.target.checked })} style={{ width: 'auto', margin: '3px 0 0' }} />
            <span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block' }}>{titulo}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sub}</span>
            </span>
          </label>
        ))}

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={salvar} disabled={saving}>{saving ? 'Salvando…' : 'Salvar configuração'}</button>

        <div style={{ height: '1px', background: 'var(--glass-border)', margin: '1.5rem 0' }} />

        <div className="form-group">
          <label style={{ fontSize: '0.75rem' }}>Enviar e-mail de teste para</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="email" value={testeEmail} onChange={e => setTesteEmail(e.target.value)} placeholder="seu@email.com" style={{ flex: 1, margin: 0 }} />
            <button className="btn btn-ghost" style={{ flex: '0 0 auto' }} onClick={enviarTeste} disabled={testando}>{testando ? 'Enviando…' : 'Testar'}</button>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Em modo teste (remetente <code>onboarding@resend.dev</code>) o Resend só entrega para o e-mail da conta. Para enviar aos responsáveis dos setores, verifique um domínio no Resend e use um remetente dele.
          </p>
        </div>
      </div>

      {/* Manual de configuração do Resend */}
      <div className="glass" style={{ padding: '1.75rem', border: '1px solid var(--glass-border)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800 }}>Como configurar o e-mail (Resend)</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1.25rem' }}>Passo a passo para o sistema enviar e-mails aos responsáveis dos setores.</p>
        <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
          <li><b>Crie uma conta</b> em <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>resend.com</a> (plano gratuito basta).</li>
          <li><b>Verifique o seu domínio:</b> no painel do Resend → <i>Domains</i> → <i>Add Domain</i> → informe seu domínio (ex.: <code>tynketech.com</code>). O Resend mostrará registros <b>SPF</b> e <b>DKIM</b> — adicione-os no DNS do domínio (onde ele foi registrado) e aguarde a verificação ficar verde. <span style={{ color: 'var(--text-muted)' }}>Sem domínio verificado, os e-mails só chegam ao dono da conta (modo teste).</span></li>
          <li><b>Gere a API Key:</b> painel → <i>API Keys</i> → <i>Create API Key</i> → copie o valor que começa com <code>re_</code>.</li>
          <li><b>Preencha aqui em cima:</b> cole a <b>API Key</b> no campo acima e defina o <b>Remetente</b> com um endereço do seu domínio, no formato <code>TicketFlow &lt;chamados@seudominio.com&gt;</code>. Clique em <b>Salvar configuração</b>.</li>
          <li><b>Teste:</b> use o campo <i>“Enviar e-mail de teste”</i> acima com um endereço qualquer — se chegar, está tudo certo.</li>
          <li><b>Escolha os eventos:</b> em <i>“Quando enviar e-mail”</i> ligue/desligue as notificações de criação, alteração e mensagens do chat.</li>
        </ol>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
          A chave fica guardada apenas no servidor (banco), nunca é exibida de volta nem enviada ao navegador. Para trocar depois, basta colar uma nova aqui.
        </p>
      </div>

      {/* Zona de perigo — limpar banco */}
      <div className="glass" style={{ padding: '1.75rem', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.03)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} /> Zona de perigo
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
          Limpar o banco apaga <b>todos os tickets, mensagens, setores, sub-setores e usuários</b> — mantém <b>apenas os usuários admin</b>. Ação <b>irreversível</b>.
        </p>
        <button onClick={limparBanco} disabled={limpando}
          className="btn" style={{ background: confirmarLimpeza ? '#b91c1c' : '#ef4444', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', opacity: limpando ? 0.6 : 1 }}>
          <Trash2 size={16} /> {limpando ? 'Limpando…' : confirmarLimpeza ? 'Clique de novo para CONFIRMAR' : 'Limpar banco de dados'}
        </button>
      </div>
      </div>
    </div>
  );
}

function LogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterActor, setFilterActor] = useState('');

  const actors = React.useMemo(() => {
    return Array.from(new Set(logs.map(l => l.actor_name).filter(Boolean))).sort();
  }, [logs]);

  const filteredLogs = filterActor
    ? logs.filter(l => l.actor_name === filterActor)
    : logs;

  useEffect(() => {
    const fetchLogsData = async () => {
      const { data } = await api.from('system_logs').select('*').order('created_at', { ascending: false }).limit(200);
      setLogs(data || []);
      setLoading(false);
    };
    fetchLogsData();
  }, []);

  const getLogDetails = (log) => {
    const defaultStyle = { icon: <Activity size={14} />, label: log.action_type, color: 'var(--text-muted)', bg: 'rgba(0,0,0,0.05)' };

    const types = {
      'STATUS_CHANGED': {
        icon: <RefreshCw size={14} />,
        label: 'Mudança de Status',
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.1)',
        desc: <>De <span style={{ fontWeight: 700 }}>"{log.old_value}"</span> para <span style={{ fontWeight: 700 }}>"{log.new_value}"</span></>
      },
      'TICKET_CREATED': {
        icon: <PlusCircle size={14} />,
        label: 'Abertura de Ticket',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.1)',
        desc: `Novo ticket ID: #${log.ticket_id}`
      },
      'TICKET_DELETED': {
        icon: <Trash2 size={14} />,
        label: 'Exclusão de Ticket',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.1)',
        desc: `Ticket removido do banco (ID: ${log.ticket_id})`
      },
      'USER_LOGIN': {
        icon: <LogIn size={14} />,
        label: 'Acesso Autorizado',
        color: '#6366f1',
        bg: 'rgba(99,102,241,0.1)',
        desc: 'Sessão iniciada no terminal'
      },
      'TICKET_VIEWED_FIRST_TIME': {
        icon: <Eye size={14} />,
        label: 'Primeira Visualização',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.1)',
        desc: `Ticket #${log.ticket_id} foi aberto pelo responsável`
      },
      'SYSTEM_ERROR': {
        icon: <AlertCircle size={14} />,
        label: 'Erro de Sistema',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.2)',
        desc: <span style={{ color: '#b91c1c', fontWeight: '500' }}>{log.new_value}</span>
      },
      'CLIENT_ERROR': {
        icon: <AlertTriangle size={14} />,
        label: 'Erro de Interface (UI)',
        color: '#f97316',
        bg: 'rgba(249,115,22,0.1)',
        desc: log.new_value
      }
    };

    return types[log.action_type] || defaultStyle;
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Carregando Auditoria...</div>;

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <Activity color="var(--primary)" size={28} /> Auditoria de Telemetria
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Histórico completo de interações e alterações no sistema.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <Users size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            value={filterActor}
            onChange={e => setFilterActor(e.target.value)}
            className="analytics-select"
            style={{ border: 'none', margin: 0, padding: '4px', fontSize: '0.85rem', fontWeight: '600', width: 'auto', color: 'inherit', background: 'none', cursor: 'pointer' }}
          >
            <option value="">Filtro por Operador</option>
            {actors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="glass" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
        <div style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10, borderBottom: '1px solid var(--glass-border)' }}>
              <tr>
                <th style={{ padding: '1.25rem', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Evento / Detalhe</th>
                <th style={{ padding: '1.25rem', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Operador</th>
                <th style={{ padding: '1.25rem', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>Carimbo de Data/Hora</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const info = getLogDetails(log);
                return (
                  <tr key={log.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ padding: '8px', borderRadius: '8px', background: info.bg, color: info.color, display: 'flex' }}>
                          {info.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>{info.label}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {info.desc || log.new_value || log.details}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '800' }}>
                          {log.actor_name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{log.actor_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{fmtDataSP(log.created_at)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{fmtHoraSP(log.created_at, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConfirmationModal({ config, onClose }) {
  if (!config.isOpen) return null;
  return createPortal(
    <div className="overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass modal"
        style={{ width: '400px', padding: '2.5rem', textAlign: 'center', maxWidth: '90vw' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          background: 'rgba(239, 68, 68, 0.1)', 
          color: '#ef4444', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 1.5rem' 
        }}>
          <AlertTriangle size={32} />
        </div>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.4rem', fontWeight: '700' }}>{config.title}</h2>
        <p style={{ marginBottom: '2rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
          {config.message}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ width: '100%' }}>Cancelar</button>
          <button 
            onClick={() => { config.onConfirm(); onClose(); }} 
            className="btn btn-primary" 
            style={{ width: '100%', background: '#ef4444', border: 'none', color: 'white' }}
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// --- Perfil do Usuário ---
function ProfileView({ user, onUpdate }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState(user.password);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await api.from('users').update({ name, email, password }).eq('id', user.id);
      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
      onUpdate({ ...user, name, email, password });
      playSound('success');
    } catch (err) {
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ 
          width: '100px', height: '100px', borderRadius: '30px', 
          background: 'var(--primary)', color: 'white', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', 
          fontWeight: '800', margin: '0 auto 1.5rem', boxShadow: '0 20px 40px -10px rgba(99,102,241,0.5)'
        }}>
          {getInitials(name)}
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>Configurações de Perfil</h2>
        <p style={{ color: 'var(--text-muted)' }}>Mantenha seus dados de acesso sempre atualizados.</p>
      </div>

      <div className="glass" style={{ padding: '2.5rem' }}>
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Nome Completo</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" required />
          </div>
          <div className="form-group">
            <label>E-mail (Login)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div className="form-group">
            <label>Nova Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '50px', fontSize: '1rem' }} disabled={loading}>
            {loading ? 'Salvando...' : 'Atualizar Dados'}
          </button>
        </form>
      </div>
    </div>
  );
}
