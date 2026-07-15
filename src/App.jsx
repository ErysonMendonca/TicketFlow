import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  ArrowRight,
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
import { canSeeTicket, colaboradoresDoSetor, podeAtribuir, isColaboradorDoSetor, leadSetorIds, leadSystemIds } from './lib/visibility';
import { io } from 'socket.io-client';

// WebSocket: em produção conecta no mesmo domínio (proxy Nginx → servidor de socket);
// em dev, aponta pro servidor local via NEXT_PUBLIC_SOCKET_URL (ex.: http://localhost:3001).
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || undefined, {
  path: '/socket.io/',
  transports: ['polling', 'websocket'],
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
    const saved = localStorage.getItem('currentUser');
    if (!saved || saved === 'undefined') return null;
    return JSON.parse(saved);
  } catch (e) {
    localStorage.removeItem('currentUser');
    return null;
  }
};

// --- Componentes Menores ---
const StatusBadge = ({ id }) => {
  const allStatus = [...(DEV_STATUS || []), ...(URGENCY_LEVELS || []), ...(OTHER_STATUS || [])];
  let config = allStatus.find(s => s.id === id);

  if (!config) {
    const devStatus = DEV_STATUS.find(s => s.userStatus === id);
    if (devStatus) {
      config = { name: devStatus.userStatusName, color: devStatus.color };
    }
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
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState(0); // 0 carregando · 1 marca · 2 reposiciona · 3 formulário

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
      const { data, error: dbError } = await api
        .from('users').select('*').eq('email', email).eq('password', password).single();
      if (dbError || !data) throw new Error('Email ou senha incorretos.');
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
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
                <motion.div className="tt-foot" variants={fadeItem}>© 2026 TynkeTech · Powered by Zaya Software</motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Tela pública de auto-registro via link (#/registro/<tipo>/<id>/<papel>) — mesma casca glass do login
function RegistroScreen({ hash }) {
  const parts = hash.replace(/^#\/?/, '').split('/'); // ['registro','setor','2','user']
  const tipo = parts[1];                 // 'setor' | 'categoria'
  const id = Number(parts[2]);
  // atende → responsavel_subsetor; senão abre chamados → funcionario. Aceita links antigos ('dev'/'user').
  const papel = (parts[3] === 'dev' || parts[3] === 'responsavel_subsetor') ? 'responsavel_subsetor' : 'funcionario';

  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState(0); // mesma intro do login: 0 carregando · 1 marca · 2 reposiciona · 3 conteúdo

  useEffect(() => {
    (async () => {
      const table = tipo === 'setor' ? 'setores' : 'systems';
      const { data } = await api.from(table).select('*').eq('id', id).single();
      setTarget(data || null);
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
      const setorId = tipo === 'setor' ? id : (target?.setor_id ?? null);
      const systemId = tipo === 'setor' ? null : id; // registro por sub-setor → vincula o usuário ao sub-setor
      const { data: inserted, error } = await api.from('users').insert([{
        name: form.name, email: form.email, password: form.password,
        role: papel, setor_id: setorId, system_id: systemId,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${form.email}`
      }]);
      if (error) throw new Error(error.message);
      // Quem atende entra como responsável (por ID) do setor/sub-setor
      const newId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;
      if (papel === 'responsavel_subsetor' && target && newId) {
        const table = tipo === 'setor' ? 'setores' : 'systems';
        const resp = Array.isArray(target.primary_responsibles) ? target.primary_responsibles : [];
        if (!resp.includes(newId)) {
          await api.from(table).update({ primary_responsibles: [...resp, newId] }).eq('id', id);
        }
      }
      setDone(true);
      playSound('success');
    } catch (err) {
      toast.error('Erro ao cadastrar: ' + (err.message?.includes('Duplicate') ? 'e-mail já cadastrado.' : err.message));
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
          {tipo === 'categoria' ? 'Sub-Setor' : 'Setor'}: <strong>{target.name}</strong> · {papel === 'responsavel_subsetor' ? 'atende os chamados' : 'abre chamados'}
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

// Modal p/ gerar/copiar o link de registro de um setor ou categoria
function RegistroLinkModal({ tipo, target, onClose }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [papel, setPapel] = useState('funcionario');
  if (!mounted) return null;
  const link = `${window.location.origin}/#/registro/${tipo}/${target.id}/${papel}`;
  const copiar = async () => {
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

        <div className="form-group">
          <label style={{ fontSize: '0.75rem' }}>Quem entrar por este link será…</label>
          <select value={papel} onChange={e => setPapel(e.target.value)}>
            <option value="funcionario">Funcionário que abre chamados</option>
            <option value="responsavel_subsetor">Membro que atende (vira responsável)</option>
          </select>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Link (envie para a pessoa)</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <input readOnly value={link} onFocus={e => e.target.select()} style={{ flex: 1, fontSize: '0.8rem', margin: 0 }} />
            <button className="btn btn-primary" style={{ flex: '0 0 auto' }} onClick={copiar}>Copiar</button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// --- Componente Principal ---
// --- App Header Horizontal ---
function AppHeader({ currentView, setView, user, theme, toggleTheme, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const role = user?.role || 'guest';
  const manageRoles = ROLES.filter(r => r !== 'funcionario'); // admin + gerente + responsáveis

  const menus = [
    { id: 'tickets', name: 'Tickets', icon: <UserIcon size={18} />, roles: ROLES },
    { id: 'kanban', name: 'Kanban', icon: <LayoutDashboard size={18} />, roles: manageRoles },
    { id: 'analytics', name: 'Analytics', icon: <BarChart3 size={18} />, roles: manageRoles },
    { id: 'users', name: 'Usuários', icon: <Users size={18} />, roles: ['admin'] },
    { id: 'setores', name: 'Setores', icon: <Layers size={18} />, roles: ['admin'] },
    { id: 'logs', name: 'Logs', icon: <Activity size={18} />, roles: ['admin'] },
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
            >
              {menu.icon}
              <span>{menu.name}</span>
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

  useEffect(() => {
    const initData = async () => {
      // Carregar Setores
      try {
        const { data: setData } = await api.from('setores').select('*').order('name');
        setSetoresList(setData || []);
      } catch(e) { setSetoresList([]); }

      // Carregar Sistemas
      try {
        const { data: sysData, error: sysErr } = await api.from('systems').select('*');
        if (!sysErr && sysData && sysData.length > 0) setSystemsList(sysData);
        else setSystemsList(PLATFORMS);
      } catch(e) { setSystemsList(PLATFORMS); }

      // Carregar Usuários
      await fetchUsersList();

      await fetchTickets();

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
      // Se for admin ou o dev responsável (ou livre), notifica
      if (isManager(user?.role)) {
        playSound('notification');
        toast.success(`🔔 Novo Ticket: #${newTicket.id} - ${newTicket.title}`, {
          duration: 8000,
          position: 'top-right',
          style: { background: 'var(--primary)', color: 'white', fontWeight: 'bold' }
        });
        
        // Tocar um som opcional (pode ser adicionado depois)
        // Recarregar a lista silenciosamente
        fetchTickets();
      }
    });

    socket.on('new_mention_alert', (data) => {
      // Toca o som de notificação para todos os Devs/Admins
      if (isManager(user?.role)) {
        playSound('notification');
        toast(`📍 @${data.mentioned} foi mencionado no Ticket #${data.ticketId}!`, {
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

    socket.on('ticket_status_refreshed', () => {
      fetchTickets();
    });

    // Membro criado/removido em outro cliente → atualiza a lista sem recarregar
    socket.on('users_refreshed', () => {
      fetchUsersList();
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
        fetchTickets();
      }
    });

    // Chat da demanda: avisa o destinatário (criador ↔ responsável) quando não está com o ticket aberto
    socket.on('new_ticket_message', (data) => {
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
      socket.off('users_refreshed');
      socket.off('new_ticket_message');
    };
  }, [user]);

  // Notificações de atribuição flexível (dependem de setores/systems p/ saber se sou colaborador do setor)
  useEffect(() => {
    const onAssigned = (data) => {
      if (data.toUserId === user?.id) {
        playSound('notification');
        toast(`📌 Você recebeu a demanda #${data.ticketId}${data.title ? ' - ' + data.title : ''}`, {
          duration: 8000, position: 'top-right',
          style: { background: 'var(--primary)', color: 'white', fontWeight: 'bold' }
        });
        fetchTickets();
      }
    };
    const onBroadcast = (data) => {
      if (data.from !== user?.name && isColaboradorDoSetor(user, data.setorId, setoresList, systemsList)) {
        playSound('notification');
        toast(`📢 Demanda #${data.ticketId} disponível no setor ${data.setorName || ''} — pode pegar!`, {
          duration: 9000, position: 'top-center', icon: '📢',
          style: { background: '#0ea5e9', color: 'white', fontWeight: '800' }
        });
        fetchTickets();
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
    const fechados = ['resolvido', 'negado', 'repassado'];
    const lembrar = () => {
      (ticketsRef.current || [])
        .filter(t => t.urgency === URGENCIA_MAXIMA && t.responsible === user.name && !fechados.includes(t.status))
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

  async function fetchTickets() {
    try {
      setLoading(true);
      const { data, error } = await api
        .from('tickets')
        .select('id, title, description, setor_id, origin_setor_id, platform, status, urgency, ticket_type, responsible, delivery_date, created_by, created_at, updated_at, dev_notes, shared_with')
        .order('created_at', { ascending: false });

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

      const { data, error } = await api
        .from('tickets')
        .insert([{
          title: formData.title,
          description: formData.description,
          setor_id: setorDestino,
          origin_setor_id: user?.setor_id || null, // setor de origem = setor de quem abriu
          platform: formData.platform || null, // id do sub-setor (só quando o setor ramifica)
          responsible: formData.responsible || null,
          attachments: uploadedAttachments,
          status: 'backlog',
          urgency: formData.urgency || 'leve',
          created_by: user?.id || null
        }])
        .select();

      if (error) throw new Error('Erro no banco: ' + error.message);

      await logAction(data[0].id, 'TICKET_CREATED', null, 'backlog');
      // Notificação inicial: e-mail automático pros responsáveis do setor de destino (a demanda é do setor)
      enviarEmail(
        emailsDosResponsaveis(data[0]),
        `Nova demanda #${data[0].id} — ${data[0].title}`,
        `<p>Uma nova demanda foi aberta para o seu setor.</p>
         <p><b>#${data[0].id} — ${data[0].title}</b></p>
         <p>${(data[0].description || '').slice(0, 500)}</p>
         <p>Aberta por: ${user?.name || '—'}</p>`
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

  // Notificação por e-mail (fire-and-forget; a rota /api/notify faz skip se não estiver configurada)
  const enviarEmail = (to, subject, html) => {
    const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
    if (recipients.length === 0) return;
    fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: recipients, subject, html }) })
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
            `<p>Sua demanda <b>#${ticketId} — ${oldTicket.title}</b> foi atualizada por ${user?.name || 'a equipe'}.</p>` +
            (updates.status !== undefined ? `<p>Status: ${DEV_STATUS.find(s => s.id === updates.status)?.name || updates.status}</p>` : '') +
            (updates.responsible !== undefined ? `<p>Responsável: ${updates.responsible || 'Sem responsável'}</p>` : '')
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
    
    // Atualização Otimista
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));

    try {
      const oldTicket = oldTickets.find(t => t.id === ticketId);
      const { error } = await api
        .from('tickets')
        .update({ status: newStatus })
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
            enviarEmail(criador.email, `Atualização na sua demanda #${ticketId}`,
              `<p>Sua demanda <b>#${ticketId} — ${oldTicket.title}</b> mudou para <b>${DEV_STATUS.find(s => s.id === newStatus)?.name || newStatus}</b> (por ${user?.name || 'a equipe'}).</p>`);
          }
        }
      }
    } catch (err) {
      setTickets(oldTickets); // Rollback
      toast.error('Erro ao atualizar status');
    }
  };

  const deleteTicket = (id) => {
    requestConfirm(
      'Excluir Ticket',
      'Tem certeza que deseja remover este ticket permanentemente?',
      async () => {
        try {
          const { error } = await api.from('tickets').delete().eq('id', id);
          if (error) throw error;
          setTickets(tickets.filter(t => t.id !== id));
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
  const openTicketDetails = async (t) => {
    const { data } = await api.from('tickets').select('attachments').eq('id', t.id).single();
    setViewingTicket({ ...t, attachments: data?.attachments || [] });
    playSound('open');
    if (isManager(user?.role)) {
      await logAction(t.id, 'TICKET_VIEWED_FIRST_TIME', null, null);
    }
  };

  // Passo 1: clique num ticket em Backlog → gate de aceite. Demais → abre os detalhes (passo 2).
  const requestOpenTicket = (t) => {
    const canManage = isManager(user?.role);
    if (!canManage) {
      // solicitante (criador), quem recebeu a demanda (responsável) ou compartilhado abre a visão de leitura + chat, sem gate de aceite
      const podeVer = t.created_by === user?.id || t.responsible === user?.name || (Array.isArray(t.shared_with) && t.shared_with.includes(user?.id));
      if (podeVer) openTicketDetails(t);
      return;
    }
    if (t.status === 'backlog') { setAcceptGate(t); return; }
    openTicketDetails(t);
  };

  // Aceite (passo 1 → 2): move pra Análise e ABRE os detalhes (onde define tipo/prazo/compartilhar)
  const aceitarDoGate = (t) => {
    const atualizado = { ...t, status: 'analise', responsible: t.responsible || user.name };
    updateTicketDetails(t.id, { status: 'analise', responsible: t.responsible || user.name });
    setAcceptGate(null);
    openTicketDetails(atualizado);
  };

  const recusarDoGate = (t) => {
    updateTicketDetails(t.id, { status: 'negado' });
    toast.success('Ticket recusado.');
    setAcceptGate(null);
  };

  // Visibilidade por hierarquia (setor/sub-setor). ponytail: regra client-side, como o resto do app.
  const visibleTickets = tickets.filter(t => canSeeTicket(t, user, setoresList, systemsList));

  const filteredTickets = visibleTickets.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toString().toLowerCase().includes(search.toLowerCase())
  );

  // No Kanban, quem só ENVIOU (criou, sem atender o escopo) não vê o card — continua vendo na aba Tickets.
  // (includeOwn=false: ignora o "abri este ticket"; admin/escopo/compartilhado seguem valendo)
  const kanbanTickets = filteredTickets.filter(t => canSeeTicket(t, user, setoresList, systemsList, false));

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
        <LoginScreen theme={theme} onLogin={async (userData) => {
          await api.from('users').update({ is_online: true }).eq('id', userData.id);
          localStorage.setItem('currentUser', JSON.stringify(userData));
          await logAction(0, 'USER_LOGIN', null, 'Acesso Autorizado');
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
      />

      <div className="app-layout">
        <main className="content-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              {view === 'tickets' ? (
                <UserDashboard
                  tickets={filteredTickets}
                  isLoading={loading}
                  onOpenModal={() => setIsModalOpen(true)}
                  search={search}
                  setSearch={setSearch}
                  onDelete={deleteTicket}
                  onTicketClick={requestOpenTicket}
                  user={user}
                  systems={systemsList}
                  setores={setoresList}
                />
              ) : view === 'users' ? (
                <UsersView user={user} onDeleteUser={handleDeleteUser} fetchUsers={fetchUsersList} allUsers={allUsers} setores={setoresList} systems={systemsList} />
              ) : view === 'setores' ? (
                <SetoresView user={user} setores={setoresList} systems={systemsList} allUsers={allUsers} onUpdate={async () => {
                  const { data: setData } = await api.from('setores').select('*').order('name');
                  setSetoresList(setData || []);
                  const { data: sysData } = await api.from('systems').select('*');
                  if (sysData) setSystemsList(sysData);
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
                <AnalyticsDashboard tickets={filteredTickets} setores={setoresList} />
              ) : view === 'logs' ? (
                <LogsView />
              ) : view === 'profile' ? (
                <ProfileView user={user} onUpdate={(updated) => { setUser(updated); localStorage.setItem('currentUser', JSON.stringify(updated)); setView('tickets'); }} />
              ) : (
                <div style={{ padding: '2rem' }}>Página não encontrada.</div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <AppFooter />
      </div>

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
        {viewingTicket && (
          <TicketDetailsModal
            ticket={viewingTicket}
            onClose={() => {
              playSound('close');
              setViewingTicket(null);
            }}
            onUpdate={updateTicketDetails}
            systems={systemsList}
            setores={setoresList}
            allUsers={allUsers}
            user={user}
          />
        )}
      </AnimatePresence>

      {/* Gates FORA do AnimatePresence: portais desmontam na hora (evita overlay preso ao trocar de modal) */}
      {acceptGate && (
        <AcceptGateModal
          ticket={acceptGate}
          onAccept={() => aceitarDoGate(acceptGate)}
          onReject={() => recusarDoGate(acceptGate)}
          onViewDetails={() => { const t = acceptGate; setAcceptGate(null); openTicketDetails(t); }}
          onClose={() => setAcceptGate(null)}
        />
      )}

      <ConfirmationModal config={confirmConfig} onClose={closeConfirm} />
    </>
  );
}

// --- Dashboard do Usuário ---
// Data de entrega (DATE do MySQL vem como ISO) → 'YYYY-MM-DD' local p/ <input type="date">
function toDateInput(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// Ticket vencido: passou da data de entrega e ainda está aberto (não resolvido/negado/repassado)
function isOverdue(ticket) {
  const fechados = ['resolvido', 'negado', 'repassado'];
  if (!ticket.delivery_date || fechados.includes(ticket.status)) return false;
  const due = new Date(ticket.delivery_date);
  due.setHours(23, 59, 59, 999); // vence só no fim do dia da entrega
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

// Urgência máxima vai pro topo da fila de visualização (ordenação estável: máxima primeiro, resto preservado)
const maximaPrimeiro = (arr) => [...(arr || [])].sort((a, b) => (b.urgency === URGENCIA_MAXIMA ? 1 : 0) - (a.urgency === URGENCIA_MAXIMA ? 1 : 0));

function UserDashboard({ tickets, onOpenModal, search, setSearch, onDelete, onTicketClick, user, systems, setores, isLoading }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
                borderLeft: isOverdue(ticket) ? '4px solid #ef4444' : (ticket.created_by !== user?.id ? '4px solid var(--primary)' : 'none')
              }}
              onClick={() => onTicketClick(ticket)}
            >
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem', display: 'block' }}>#{ticket.id}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {ticket.urgency === URGENCIA_MAXIMA && (
                      <span style={{ background: '#b91c1c', color: 'white', padding: '1px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                        🚨 Máxima
                      </span>
                    )}
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>{ticket.title}</h3>
                    {ticket.created_by !== user?.id && ticket.responsible !== user?.name && Array.isArray(ticket.shared_with) && ticket.shared_with.includes(user?.id) && (
                      <span style={{ background: 'var(--primary)', color: 'white', padding: '1px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                        Compartilhado
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="card-info-row">
                      <LayoutDashboard size={12} /> {ticketOrigem(ticket, setores) ? `${ticketOrigem(ticket, setores)} → ` : ''}{ticketDestino(ticket, setores, systems)}
                    </div>
                    <div className="card-info-row">
                      <Clock size={12} /> {new Date(ticket.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {ticket.delivery_date && (
                      <div className="card-info-row" style={{ color: isOverdue(ticket) ? '#ef4444' : undefined, fontWeight: isOverdue(ticket) ? 700 : undefined }}>
                        <Calendar size={12} /> Entrega {new Date(ticket.delivery_date).toLocaleDateString('pt-BR')}{isOverdue(ticket) ? ' • vencido' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="user-dash-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.05)', padding: '4px 10px', borderRadius: '8px', width: 'fit-content' }}>
                    <UserIcon size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: '500' }}>{ticket.responsible || 'Sem resp.'}</span>
                  </div>

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

                <div style={{ textAlign: 'right' }}>
                  <StatusBadge id={ticket.status} />
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
  if (key === 'entrega') return t.delivery_date ? new Date(t.delivery_date).toLocaleDateString('pt-BR') : 'sem prazo';
  if (key === 'chegada') return new Date(t.created_at).toLocaleDateString('pt-BR');
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
  const DRAG_STAGES = ['resolvendo', 'em_teste', 'resolvido'];

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

  const setorIdsBoard = new Set(visibleTickets.map(t => t.setor_id).filter(x => x != null));
  const systemIdsBoard = new Set(visibleTickets.map(t => String(t.platform)).filter(Boolean));
  const custom = [];
  setores.forEach(s => { if (setorIdsBoard.has(s.id) || meusSetores.some(m => m.id === s.id)) (Array.isArray(s.colunas) ? s.colunas : []).forEach(c => custom.push({ ...c, _tipo: 'setores', _ownerId: s.id })); });
  systems.forEach(s => { if (systemIdsBoard.has(String(s.id)) || meusSubsetores.some(m => m.id === s.id)) (Array.isArray(s.colunas) ? s.colunas : []).forEach(c => custom.push({ ...c, _tipo: 'systems', _ownerId: s.id })); });
  const vistos = new Set();
  const customUnicas = custom.filter(c => !vistos.has(c.id) && vistos.add(c.id));
  const idxResolvido = DEV_STATUS.findIndex(c => c.id === 'resolvido');
  const colunas = [...DEV_STATUS.slice(0, idxResolvido), ...customUnicas, ...DEV_STATUS.slice(idxResolvido)];
  const idsCustom = new Set(customUnicas.map(c => c.id));
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
    if (ticketId && draggedTicket.status !== columnId) onUpdateStatus(ticketId, columnId);
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
        <select style={{ flex: '0 0 160px', margin: 0 }} value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
          <option value="">Sub-Setores</option>
          {systems.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={{ flex: '0 0 160px', margin: 0 }} value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
          <option value="">Urgência</option>
          {URGENCY_LEVELS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select style={{ flex: '0 0 160px', margin: 0 }} value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)}>
          <option value="">Responsável</option>
          {allUsers.filter(u => isManager(u.role)).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>
        {podeGerenciarColunas && (
          <button className="btn btn-ghost" style={{ flex: '0 0 auto', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setNovaColuna({ alvo: '', nome: '', cor: '#6366f1' })} title="Criar coluna personalizada no seu setor/sub-setor">
            <PlusCircle size={16} /> Nova coluna
          </button>
        )}
      </div>

      <div className="kanban-board-container" style={{ display: 'flex', gap: '1rem', flex: 1, overflowX: 'auto', paddingBottom: '1rem' }}>
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
            const columnTickets = maximaPrimeiro(sortColumn(visibleTickets.filter(t => t.status === column.id), cs?.key, cs?.dir));
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

                <div className="hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', maxHeight: 'calc(100vh - 260px)' }}>
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
                          cursor: canDrag ? 'grab' : 'pointer',
                          borderLeft: `5px solid ${overdue ? '#ef4444' : urgencyColor}`,
                          boxShadow: overdue ? '0 0 0 2px #ef4444, 0 4px 12px rgba(239,68,68,0.15)' : (ticket.created_by !== user?.id ? '0 0 0 2px var(--primary)40, 0 4px 12px rgba(0,0,0,0.1)' : 'none'),
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px', alignItems: 'center' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: '700' }}>#{ticket.id}</span>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {ticket.urgency === URGENCIA_MAXIMA && (
                              <span style={{ background: '#b91c1c', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                🚨 Máxima
                              </span>
                            )}
                            {ticket.created_by !== user?.id && ticket.responsible !== user?.name && Array.isArray(ticket.shared_with) && ticket.shared_with.includes(user?.id) && (
                              <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                Compartilhado
                              </span>
                            )}
                            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{ticketOrigem(ticket, setores) ? `${ticketOrigem(ticket, setores)} → ` : ''}{ticketDestino(ticket, setores, systems)}</span>
                          </div>
                        </div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>{ticket.title}</h4>
                        {ticket.ticket_type && <div style={{ marginBottom: '8px' }}><TipoBadge ticket={ticket} /></div>}
                        {ticket.delivery_date && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 700, marginBottom: '8px', color: overdue ? '#ef4444' : 'var(--text-muted)' }}>
                            <Calendar size={12} /> Entrega {new Date(ticket.delivery_date).toLocaleDateString('pt-BR')}{overdue ? ' • vencido' : ''}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(ticket.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>

                          <div className="kanban-card-responsible">
                            <div className="responsible-name">{ticket.responsible || 'Sem responsável'}</div>
                            <img
                              src={responsibleUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ticket.responsible || 'guest'}`}
                              className="responsible-avatar-mini"
                              alt={ticket.responsible}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {sortModal && (
          <ColumnSortModal
            columnName={colunas.find(c => c.id === sortModal)?.name}
            tickets={visibleTickets.filter(t => t.status === sortModal)}
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
function AcceptGateModal({ ticket, onAccept, onReject, onViewDetails, onClose }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="overlay" style={{ alignItems: 'center', padding: '1rem' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass modal" style={{ width: '440px', maxWidth: '94vw', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>Aceitar ticket · #{ticket.id}</span>
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
          Você aceita atender este ticket? Ao aceitar, você verá os detalhes completos para classificar e definir o prazo.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={onAccept}>
            <CheckSquare size={16} /> Aceitar ticket
          </button>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onViewDetails}>Ver detalhes primeiro</button>
          <button className="btn btn-ghost" style={{ width: '100%', color: '#ef4444' }} onClick={onReject}>Recusar ticket</button>
        </div>
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
          <input type="date" min={hoje} value={date} onChange={e => setDate(e.target.value)} />
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
  // Destino só pode ser OUTRO setor: exclui o setor de origem (o de quem abre)
  const setoresDestino = setores.filter(s => s.id != user?.setor_id);
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
    if (!formData.title || !formData.description || !formData.setor || !formData.responsible || (precisaSistema && !formData.platform)) {
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
            <textarea rows="4" placeholder="Detalhes..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
          </div>

          <div className="form-group">
            <label>Setor</label>
            <select value={formData.setor} onChange={e => handleSetorChange(e.target.value)}>
              <option value="">Selecione o setor...</option>
              {setoresDestino.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
              <label>Responsável</label>
              <select
                value={formData.responsible}
                onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                disabled={!formData.setor || (setorSystems.length > 0 && !formData.platform)}
              >
                <option value="">Selecione...</option>
                {respOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

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

function TicketDetailsModal({ ticket, onClose, onUpdate, systems, setores = [], allUsers, user }) {
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

  // Compartilhamento: colegas do MESMO setor do responsável (aparecem no Kanban se compartilhado)
  const respUser = allUsers.find(u => u.name === ticket.responsible);
  const shareCandidates = allUsers.filter(u =>
    respUser?.setor_id != null && String(u.setor_id) === String(respUser.setor_id) &&
    u.name !== ticket.responsible && !sharedWith.includes(u.id)
  );

  // Só quem atende (gerente/responsáveis) e admin aceita e define/reagenda a entrega
  const canManage = isManager(user?.role);
  const hoje = toDateInput(new Date());
  const vencido = isOverdue(ticket);

  // --- Chat interno da demanda (bate e volta) ---
  // Postam só o solicitante (criador) e o recebedor (responsável); os demais que enxergam o ticket só leem.
  // ponytail: gate client-side, como todo o app; /api/data não valida quem posta (frente separada).
  const [messages, setMessages] = useState([]);
  const [novaMsg, setNovaMsg] = useState('');
  const canPost = user?.id === ticket.created_by || user?.name === ticket.responsible;

  const fetchMessages = async () => {
    const { data } = await api.from('ticket_messages').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
    setMessages(Array.isArray(data) ? data : []);
  };
  useEffect(() => { fetchMessages(); }, [ticket.id]);
  useEffect(() => {
    const onMsg = (d) => { if (String(d.ticketId) === String(ticket.id)) fetchMessages(); };
    socket.on('new_ticket_message', onMsg);
    return () => socket.off('new_ticket_message', onMsg);
  }, [ticket.id]);

  const enviarMsg = async () => {
    const txt = novaMsg.trim();
    if (!txt) return;
    setNovaMsg('');
    const { error } = await api.from('ticket_messages').insert([{ ticket_id: ticket.id, user_id: user.id, message: txt }]);
    if (error) { toast.error('Erro ao enviar mensagem.'); return; }
    await fetchMessages();
    // avisa o outro lado (criador ↔ responsável)
    const destino = user.id === ticket.created_by ? allUsers.find(u => u.name === ticket.responsible)?.id : ticket.created_by;
    socket.emit('ticket_message', { ticketId: ticket.id, from: user.name, toUserId: destino });
    playSound('success');
  };

  // --- Atribuição flexível da demanda ---
  const [atribuirA, setAtribuirA] = useState('');
  const canAssign = podeAtribuir(user, ticket, setores); // gerente/resp. do setor (ou admin)
  const colaboradores = colaboradoresDoSetor(ticket.setor_id, setores, systems, allUsers)
    .map(id => allUsers.find(u => u.id === id)).filter(Boolean);
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
      `Status: ${DEV_STATUS.find(s => s.id === ticket.status)?.name || ticket.status}`,
      setorDoTicket?.name ? `Setor: ${setorDoTicket.name}` : null,
      ticket.responsible ? `Responsável: ${ticket.responsible}` : 'Sem responsável',
      ticket.delivery_date ? `Entrega: ${new Date(ticket.delivery_date).toLocaleDateString('pt-BR')}` : null,
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

      {createPortal(
        <div className="overlay" style={{ padding: '2rem 1rem' }} onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="modal"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              maxWidth: '1000px',
              width: '100%',
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header Superior - Estilo Trello */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="status-badge-header" style={{ color: DEV_STATUS.find(s => s.id === ticket.status)?.color }}>
                  {DEV_STATUS.find(s => s.id === ticket.status)?.name || ticket.status}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>#{ticket.id}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={compartilharWhatsApp} title="Compartilhar no WhatsApp" style={{ background: '#25D366', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                  <Share2 size={16} /> WhatsApp
                </button>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
              </div>
            </div>

            <div className="modal-details-body">
              {/* Coluna Esquerda: Conteúdo Principal */}
              <div className="modal-details-main">
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

                {/* Anexos */}
                {ticket.attachments?.length > 0 && (
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

              {/* Coluna Direita: Sidebar */}
              <div className="modal-details-sidebar">
                <div>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>Ações de Membro</h3>

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
                          <input type="date" min={hoje} value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={{ fontSize: '0.85rem', padding: '8px' }} />
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
                            ? `Prazo de entrega: ${new Date(ticket.delivery_date).toLocaleDateString('pt-BR')}`
                            : 'Nenhum prazo de entrega definido — informe abaixo.'}
                        </div>
                        {vencido && <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '4px 0 0' }}>Entrega vencida — defina uma nova data.</p>}
                        {canManage && (rescheduling || vencido || !ticket.delivery_date) ? (
                          <div style={{ marginTop: '8px' }}>
                            <input type="date" min={hoje} value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={{ fontSize: '0.85rem', padding: '8px' }} />
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px', ...(vencido ? { background: '#ef4444', border: 'none' } : {}) }} onClick={handleReschedule}>
                              {vencido ? 'Reagendar entrega' : (ticket.delivery_date ? 'Atualizar prazo' : 'Definir prazo de entrega')}
                            </button>
                          </div>
                        ) : canManage ? (
                          <button className="btn btn-ghost" style={{ width: '100%', marginTop: '8px', fontSize: '0.8rem' }} onClick={() => setRescheduling(true)}>Alterar prazo</button>
                        ) : null}
                      </>
                    )}
                  </div>

                  {/* Tipo + Urgência lado a lado */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
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
                      placeholder="Logs técnicos e observações internas..." 
                      style={{ minHeight: '120px', fontSize: '0.85rem', padding: '10px' }}
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
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => {
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

                <div className="form-group" style={{ marginTop: 'auto', marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.75rem' }}>Responsável</label>
                  <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--glass-border)', fontSize: '0.85rem', fontWeight: 600 }}>
                    {ticket.responsible || 'Sem responsável'}
                  </div>
                </div>

                <div>
                  <div className="modal-section-title" style={{ marginBottom: '1.25rem' }}>
                    <MessageSquare size={18} /> Conversa da demanda
                  </div>

                  {/* 1ª entrada: criação do ticket (parte do histórico) */}
                  <div className="activity-item" style={{ marginBottom: '1rem' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: creator?.role === 'admin' ? 'var(--primary)' : 'var(--success)',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: '800'
                    }}>
                      {getInitials(creator?.name)}
                    </div>
                    <div className="activity-content">
                      <div className="activity-user">{creator?.name || "Usuário"}</div>
                      <div className="activity-text">{ticketOrigem(ticket, setores) ? `criou este ticket (de ${ticketOrigem(ticket, setores)}) para ` : 'criou este ticket para '}{ticketDestino(ticket, setores, systems)}</div>
                      <div className="activity-time">{new Date(ticket.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>

                  {/* Thread do bate e volta */}
                  <div className="hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', padding: '4px' }}>
                    {messages.length === 0 && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem 0' }}>
                        {canPost ? 'Sem mensagens ainda. Peça ou envie detalhes abaixo.' : 'Sem mensagens ainda. Só o solicitante e o responsável conversam aqui.'}
                      </p>
                    )}
                    {messages.map(m => {
                      const autor = allUsers.find(u => u.id === m.user_id);
                      const meu = m.user_id === user?.id;
                      return (
                        <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: meu ? 'flex-end' : 'flex-start' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                            {autor?.name || 'Usuário'} · {new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{
                            maxWidth: '85%', padding: '8px 12px', borderRadius: '12px', fontSize: '0.85rem', lineHeight: 1.4, whiteSpace: 'pre-wrap',
                            background: meu ? 'var(--primary)' : 'rgba(0,0,0,0.05)', color: meu ? 'white' : 'var(--text-main)',
                            borderTopRightRadius: meu ? '2px' : '12px', borderTopLeftRadius: meu ? '12px' : '2px'
                          }}>
                            {m.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Campo de envio — só solicitante/recebedor; demais acompanham (read-only) */}
                  {canPost ? (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <input
                        value={novaMsg}
                        onChange={e => setNovaMsg(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMsg(); } }}
                        placeholder="Escreva uma mensagem..."
                        style={{ flex: 1, margin: 0, fontSize: '0.85rem' }}
                      />
                      <button className="btn btn-primary" style={{ flex: '0 0 auto' }} onClick={enviarMsg}>Enviar</button>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '10px', textAlign: 'center' }}>
                      Você acompanha a conversa (somente leitura).
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
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
  const due = new Date(t.delivery_date); due.setHours(23, 59, 59, 999);
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
  const series = [
    { key: 'onTime', label: 'No prazo', color: '#10b981' },
    { key: 'late', label: 'Fora do prazo', color: '#ef4444' },
  ];
  if (!data || data.length === 0) {
    return <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sem entregas com prazo concluído ainda.</div>;
  }
  const totals = data.reduce((a, d) => ({ onTime: a.onTime + d.onTime, late: a.late + d.late }), { onTime: 0, late: 0 });
  const W = 480, H = 150, padL = 22, padR = 12, padT = 10, padB = 22;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = data.length;
  const yMax = Math.max(1, ...data.map(d => Math.max(d.onTime, d.late)));
  const x = (i) => padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const y = (v) => padT + innerH - (innerH * v) / yMax;
  const fmt = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const points = (key) => data.map((d, i) => `${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');
  const step = Math.max(1, Math.ceil(yMax / 3));
  const ticks = [];
  for (let v = 0; v <= yMax; v += step) ticks.push(v);
  return (
    <div>
      {/* Legenda + totais numa linha só */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        {series.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, display: 'inline-block' }} />
            {s.label} <strong style={{ color: 'var(--text-main)' }}>{totals[s.key]}</strong>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Entregas no prazo versus fora do prazo por semana">
        {ticks.map(v => (
          <g key={v}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--glass-border)" strokeWidth="1" />
            <text x={padL - 5} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)">{v}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <text key={i} x={x(i)} y={H - padB + 15} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{fmt(d.date)}</text>
        ))}
        {series.map(s => (
          <g key={s.key}>
            {n > 1 && <polyline points={points(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
            {data.map((d, i) => (
              <circle key={i} cx={x(i)} cy={y(d[s.key])} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2">
                <title>{`Semana de ${fmt(d.date)} — ${s.label}: ${d[s.key]}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
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

function AnalyticsDashboard({ tickets, setores = [] }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSetor, setSelectedSetor] = useState(''); // '' = análise geral de todos os setores
  const [selectedResp, setSelectedResp] = useState('');

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
          <BarChart3 color="var(--primary)" /> Analytics & BI
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
  const [loading, setLoading] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.setor_id = data.setor_id ? Number(data.setor_id) : null;
    data.system_id = data.system_id ? Number(data.system_id) : null;
    const { error } = await api.from('users').insert([{ ...data, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}` }]);
    if (!error) { 
      toast.success('Membro criado!'); 
      setIsNewUserModalOpen(false); 
      parentFetchUsers(); 
      playSound('success'); 
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.setor_id = data.setor_id ? Number(data.setor_id) : null;
    data.system_id = data.system_id ? Number(data.system_id) : null;
    if (!data.password) delete data.password; // em branco = mantém a senha atual
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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>Gerencie permissões e visualize o status dos membros.</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setIsNewUserModalOpen(true)}>
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
                <th style={{ padding: '1.25rem', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                {user?.role === 'admin' && <th style={{ padding: '1.25rem', textAlign: 'right' }}>Ação</th>}
              </tr>
            </thead>
            <tbody>
              {dbUsers.map(u => (
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
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: u.is_online ? '#10b981' : 'var(--text-muted)', fontWeight: '600' }}>
                        {u.is_online ? 'Disponível' : 'Ausente'}
                      </span>
                    </div>
                  </td>
                  {user?.role === 'admin' && (
                    <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="icon-btn" onClick={() => { setEditingUser(u); setIsEditUserModalOpen(true); playSound('click'); }} title="Editar Dados">
                          <Pencil size={16} />
                        </button>
                        <button className="icon-btn logout" onClick={() => handleDeleteUserInternal(u.id, u.name)} title="Excluir Usuário">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
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
              <select name="setor_id" defaultValue="">
                <option value="">Setor (nenhum)</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select name="system_id" defaultValue="">
                <option value="">Sub-setor (nenhum)</option>
                {systems.map(s => <option key={s.id} value={s.id}>{s.name}{setorNome(s.setor_id) ? ` (${setorNome(s.setor_id)})` : ''}</option>)}
              </select>
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
              <select name="setor_id" defaultValue={editingUser?.setor_id ?? ''}>
                <option value="">Setor (nenhum)</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <label style={{ fontSize: '0.75rem' }}>Sub-setor <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(funcionário/colaborador de um sub-setor)</span></label>
              <select name="system_id" defaultValue={editingUser?.system_id ?? ''}>
                <option value="">Sub-setor (nenhum)</option>
                {systems.map(s => <option key={s.id} value={s.id}>{s.name}{setorNome(s.setor_id) ? ` (${setorNome(s.setor_id)})` : ''}</option>)}
              </select>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Salvar Alterações</button>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}

function SetoresView({ user, setores = [], systems = [], allUsers = [], onUpdate }) {
  const [activeModal, setActiveModal] = useState(null); // 'edit_name' | 'manage_resps' | 'delete_confirm' | 'new_system'
  const [editingEntity, setEditingEntity] = useState(null);
  const [editingTable, setEditingTable] = useState('setores'); // 'setores' | 'systems'
  const [newParentSetorId, setNewParentSetorId] = useState(null); // setor onde o novo sistema entra
  const [selectedResps, setSelectedResps] = useState([]); // ids de usuários responsáveis
  const [linkModal, setLinkModal] = useState(null); // { tipo, target } p/ o link de registro

  const isAdmin = user?.role === 'admin';
  const entityLabel = editingTable === 'setores' ? 'Setor' : 'Sub-Setor';
  const fem = entityLabel.endsWith('a'); // concordância de gênero (Setor/Sub-Setor = masculino)
  const nomeUsuario = (id) => allUsers.find(u => u.id === id)?.name || `#${id}`;

  const openModal = (type, table, entity = null, parentSetorId = null) => {
    setEditingTable(table);
    setEditingEntity(entity);
    setNewParentSetorId(parentSetorId);
    if (type === 'manage_resps') setSelectedResps(entity?.primary_responsibles || []);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingEntity(null);
    setSelectedResps([]);
    setNewParentSetorId(null);
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

  const handleSaveResps = async () => {
    if (!editingEntity?.id) { toast.error('Registro não identificado.'); return; }
    try {
      const payload = { id: editingEntity.id, name: editingEntity.name, primary_responsibles: selectedResps };
      if (editingTable === 'systems') payload.setor_id = editingEntity.setor_id; // preserva o vínculo com o setor
      const { error } = await api.from(editingTable).upsert(payload).select();
      if (error) throw error;
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

  const toggleResp = (id) => {
    setSelectedResps(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };

  const RespChips = ({ list }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {list?.length > 0 ? list.map((r, idx) => (
        <span key={idx} style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>{nomeUsuario(r)}</span>
      )) : <span style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum responsável</span>}
    </div>
  );

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
        {setores.map(setor => {
          const sistemasDoSetor = systems.filter(sys => sys.setor_id == setor.id);
          return (
            <motion.div layout key={setor.id} className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Cabeçalho do setor */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={20} />
                  </div>
                  <h3 style={{ fontWeight: '800', fontSize: '1.2rem' }}>{setor.name}</h3>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => openModal('new_system', 'systems', null, setor.id)} className="icon-btn" title="Adicionar Sub-Setor"><Plus size={14} /></button>
                    <button onClick={() => setLinkModal({ tipo: 'setor', target: setor })} className="icon-btn" title="Link de registro"><Link2 size={14} /></button>
                    <button onClick={() => openModal('edit_name', 'setores', setor)} className="icon-btn" title="Editar Nome"><Pencil size={14} /></button>
                    <button onClick={() => openModal('manage_resps', 'setores', setor)} className="icon-btn" title="Equipe do Setor"><UserPlus size={14} /></button>
                    <button onClick={() => openModal('delete_confirm', 'setores', setor)} className="icon-btn logout" title="Excluir Setor"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>

              {/* Corpo: sistemas do setor OU equipe do setor (quando não ramifica) */}
              {sistemasDoSetor.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {sistemasDoSetor.map(sys => (
                    <div key={sys.id} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Code2 size={16} color="var(--primary)" />
                          <span style={{ fontWeight: '700' }}>{sys.name}</span>
                        </div>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button onClick={() => setLinkModal({ tipo: 'categoria', target: sys })} className="icon-btn" title="Link de registro"><Link2 size={12} /></button>
                            <button onClick={() => openModal('edit_name', 'systems', sys)} className="icon-btn" title="Editar Nome"><Pencil size={12} /></button>
                            <button onClick={() => openModal('manage_resps', 'systems', sys)} className="icon-btn" title="Responsáveis"><UserPlus size={12} /></button>
                            <button onClick={() => openModal('delete_confirm', 'systems', sys)} className="icon-btn logout" title="Excluir"><Trash2 size={12} /></button>
                          </div>
                        )}
                      </div>
                      <RespChips list={sys.primary_responsibles} />
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '8px' }}>Equipe do setor (setor sem sistemas)</div>
                  <RespChips list={setor.primary_responsibles} />
                </div>
              )}
            </motion.div>
          );
        })}
        {setores.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Nenhum setor cadastrado.</div>
        )}
      </div>

      <AnimatePresence>
        {activeModal && (
          <SystemActionModal
            type={activeModal}
            entityLabel={entityLabel}
            system={editingEntity}
            users={allUsers}
            selectedResps={selectedResps}
            onClose={closeModal}
            onSaveName={handleSaveName}
            onSaveResps={handleSaveResps}
            onConfirmDelete={handleConfirmDelete}
            onToggleResp={toggleResp}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {linkModal && (
          <RegistroLinkModal tipo={linkModal.tipo} target={linkModal.target} onClose={() => setLinkModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-componente para Modais de Sistemas (Estabilidade de Portal/Animação) ---
function SystemActionModal({ type, entityLabel = 'Sistema', system, users, selectedResps, onClose, onSaveName, onSaveResps, onConfirmDelete, onToggleResp }) {
  const [mounted, setMounted] = useState(false);
  const [busca, setBusca] = useState('');
  useEffect(() => setMounted(true), []);

  const fem = entityLabel.endsWith('a'); // concordância de gênero (ex: Categoria)
  const usuariosFiltrados = users.filter(u => (u.name || '').toLowerCase().includes(busca.toLowerCase()));

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
            {type === 'edit_name' && 'Editar Nome'}
            {type === 'new_system' && `${fem ? 'Nova' : 'Novo'} ${entityLabel}`}
            {type === 'manage_resps' && 'Gerenciar Responsáveis'}
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
              <input name="name" defaultValue={system?.name} placeholder={entityLabel === 'Setor' ? 'Ex: TI, Financeiro...' : 'Ex: Matriz, Zaploto...'} required autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Gravar Alterações</button>
          </form>
        )}

        {type === 'manage_resps' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>Responsáveis para <strong>{system?.name}</strong>:</p>
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
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {usuariosFiltrados.length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>Nenhum usuário encontrado.</p>
              )}
              {usuariosFiltrados.map(u => (
                <div
                  key={u.id}
                  onClick={() => onToggleResp(u.id)}
                  style={{
                    padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--glass-border)',
                    background: selectedResps.includes(u.id) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontWeight: '500' }}>{u.name}</span>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '4px',
                    border: `2px solid ${selectedResps.includes(u.id) ? 'var(--primary)' : 'var(--glass-border)'}`,
                    background: selectedResps.includes(u.id) ? 'var(--primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {selectedResps.includes(u.id) && <CheckSquare size={14} color="white" />}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onSaveResps} className="btn btn-primary" style={{ width: '100%' }}>Salvar Equipe</button>
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
                      <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{new Date(log.created_at).toLocaleDateString('pt-BR')}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
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
