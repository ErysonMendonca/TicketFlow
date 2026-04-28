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
  PlusCircle,
  LogIn,
  Eye,
  Image as ImageIcon
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { api } from './lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { PLATFORMS, DEV_STATUS, URGENCY_LEVELS, OTHER_STATUS, MOCK_USERS } from './constants';
import { io } from 'socket.io-client';

// Configuração do WebSocket (Conecta no mesmo domínio via Proxy do Nginx)
const socket = io({
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

// --- Tela de Login ---
function LoginScreen({ onLogin, theme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: dbError } = await api
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (dbError || !data) {
        throw new Error('Email ou senha incorretos.');
      }

      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass login-card"
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src={theme === 'dark' ? '/logomarca_white.png' : '/logomarca_black.png'} 
            className="login-logo" 
            alt="TynkeTech" 
          />
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Acesso ao Sistema</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Entre com suas credenciais</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Senha de Acesso</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-20%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// --- Componente Principal ---
// --- App Header Horizontal ---
function AppHeader({ currentView, setView, user, theme, toggleTheme, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const menus = [
    { id: 'tickets', name: 'Tickets', icon: <UserIcon size={18} />, roles: ['user', 'admin'] },
    { id: 'users', name: 'Usuários', icon: <Users size={18} />, roles: ['admin'] },
    { id: 'systems', name: 'Sistemas', icon: <Layers size={18} />, roles: ['admin'] },
    { id: 'kanban', name: 'Kanban', icon: <LayoutDashboard size={18} />, roles: ['admin'] },
    { id: 'analytics', name: 'Analytics', icon: <BarChart3 size={18} />, roles: ['admin'] },
    { id: 'logs', name: 'Logs', icon: <Activity size={18} />, roles: ['admin'] },
  ];

  const role = user?.role || 'guest';
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
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{user.role}</div>
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const requestConfirm = (title, message, onConfirm) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm });
  };

  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

  const [systemsList, setSystemsList] = useState([]);
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
      if (user?.role === 'admin' || user?.role === 'dev') {
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
      if (user?.role === 'admin' || user?.role === 'dev') {
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
    };
  }, [user]);

  // Forçar visualização correta baseado no cargo
  useEffect(() => {
    if (user?.role === 'dev' && view !== 'kanban') {
      setView('kanban');
    }
  }, [user, view]);

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
        .select('id, title, description, platform, status, urgency, responsible, created_by, created_at, updated_at, dev_notes, shared_with')
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

      const ticketToInsert = { ...formData };
      delete ticketToInsert.files;
      ticketToInsert.attachments = uploadedAttachments;

      const { data, error } = await api
        .from('tickets')
        .insert([{
          ...ticketToInsert,
          status: 'backlog',
          urgency: 'leve',
          created_by: user?.id || null
        }])
        .select();

      if (error) throw new Error('Erro no banco: ' + error.message);

      await logAction(data[0].id, 'TICKET_CREATED', null, 'backlog');
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

      if (oldTicket && updates.shared_with !== undefined) {
        const newShares = updates.shared_with.filter(id => !oldTicket.shared_with?.includes(id));
        if (newShares.length > 0) {
          socket.emit('ticket_shared', { ticketId, sharedWith: newShares, title: oldTicket.title });
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
          // Atualiza a lista de usuários se necessário ou recarrega
          window.location.reload(); // Simples recarregamento para atualizar a view
        } else { 
          toast.error('Erro ao remover usuário.'); 
        }
      }
    );
  };

  const visibleTickets = (user?.role === 'dev')
    ? tickets.filter(t => 
        t.responsible === user.name || 
        t.created_by === user.id ||
        (Array.isArray(t.shared_with) && t.shared_with.includes(user.id))
      )
    : tickets;

  const filteredTickets = visibleTickets.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toString().toLowerCase().includes(search.toLowerCase())
  );

  // Auth Screen centralizada
  if (!user && hash === '#/login') {
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
                  onTicketClick={async (t) => {
                    // Apenas DEVs e ADMINs podem ver detalhes e anexos
                    if (user?.role === 'dev' || user?.role === 'admin') {
                      const { data } = await api.from('tickets').select('attachments').eq('id', t.id).single();
                      setViewingTicket({ ...t, attachments: data?.attachments || [] });
                    }
                  }}
                  user={user}
                  systems={systemsList}
                />
              ) : view === 'users' ? (
                <UsersView user={user} onDeleteUser={handleDeleteUser} fetchUsers={fetchUsersList} allUsers={allUsers} />
              ) : view === 'systems' ? (
                <SystemsView user={user} systems={systemsList} onUpdate={async () => {
                  const { data } = await api.from('systems').select('*');
                  if (data) setSystemsList(data);
                }} />
              ) : view === 'kanban' ? (
                <DevKanban
                  tickets={filteredTickets}
                  isLoading={loading}
                  onUpdateStatus={updateTicketStatus}
                  onUpdateUrgency={(tid, urg) => updateTicketDetails(tid, { urgency: urg })}
                  user={user}
                  allUsers={allUsers}
                  systems={systemsList}
                  onTicketClick={async (t) => {
                    // Busca os anexos pesados apenas sob demanda
                    const { data } = await api.from('tickets').select('attachments').eq('id', t.id).single();
                    const fullTicket = { ...t, attachments: data?.attachments || [] };
                    
                    setViewingTicket(fullTicket);
                    playSound('open');
                    if (user && (user.role === 'dev' || user.role === 'admin')) {
                      await logAction(t.id, 'TICKET_VIEWED_FIRST_TIME', null, null);
                    }
                  }}
                />
              ) : view === 'analytics' ? (
                <AnalyticsDashboard tickets={filteredTickets} />
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
            allUsers={allUsers}
            user={user}
          />
        )}
      </AnimatePresence>

      <ConfirmationModal config={confirmConfig} onClose={closeConfirm} />
    </>
  );
}

// --- Dashboard do Usuário ---
function UserDashboard({ tickets, onOpenModal, search, setSearch, onDelete, onTicketClick, user, systems, isLoading }) {
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
          <div className="glass" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <LoadingSpinner label="Sincronizando tickets..." />
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhum ticket encontrado.
          </div>
        ) : (
          tickets.map(ticket => (
            <motion.div
              layout
              key={ticket.id}
              className="glass ticket-card"
              style={{ 
                padding: '1.25rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                cursor: (user?.role === 'admin' || user?.role === 'dev') ? 'pointer' : 'default',
                borderLeft: ticket.created_by !== user?.id ? '4px solid var(--primary)' : 'none'
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
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>{ticket.title}</h3>
                    {ticket.created_by !== user?.id && ticket.responsible !== user?.name && Array.isArray(ticket.shared_with) && ticket.shared_with.includes(user?.id) && (
                      <span style={{ background: 'var(--primary)', color: 'white', padding: '1px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                        Compartilhado
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="card-info-row">
                      <LayoutDashboard size={12} /> {systems.find(p => p.id == ticket.platform)?.name || ticket.platform}
                    </div>
                    <div className="card-info-row">
                      <Clock size={12} /> {new Date(ticket.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
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

// --- Kanban do Desenvolvedor ---
function DevKanban({ tickets, onUpdateStatus, onUpdateUrgency, user, onTicketClick, systems, allUsers, isLoading }) {
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');

  const hexToRgb = (hex) => {
    if (!hex) return '0,0,0';
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0,0,0';
  };

  const handleDragStart = (e, ticket) => {
    setDraggedTicket(ticket);
    e.dataTransfer.setData('ticketId', ticket.id);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    setDropTarget(columnId);
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('ticketId');
    if (ticketId && draggedTicket.status !== columnId) {
      onUpdateStatus(ticketId, columnId);
    }
    setDraggedTicket(null);
    setDropTarget(null);
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
          <option value="">Sistemas</option>
          {systems.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={{ flex: '0 0 160px', margin: 0 }} value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
          <option value="">Urgência</option>
          {URGENCY_LEVELS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select style={{ flex: '0 0 160px', margin: 0 }} value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)}>
          <option value="">Responsável</option>
          {allUsers.filter(u => u.role === 'dev' || u.role === 'admin').map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>
      </div>

      <div className="kanban-board-container" style={{ display: 'flex', gap: '1rem', flex: 1, overflowX: 'auto', paddingBottom: '1rem' }}>
        {isLoading ? (
          <div className="glass" style={{ width: '100%', padding: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <LoadingSpinner label="Organizando quadro..." />
          </div>
        ) : (
          DEV_STATUS.map(column => {
            const columnTickets = visibleTickets.filter(t => t.status === column.id);
            const isTarget = dropTarget === column.id;

            return (
              <div
                key={column.id}
                className={`kanban-column ${isTarget ? 'drop-active' : ''}`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                style={{ minWidth: '300px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column' }}
              >
                <h3 style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                  {column.name}
                  <span>{columnTickets.length}</span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {columnTickets.map(ticket => {
                    const urgencyColor = URGENCY_LEVELS.find(u => u.id === ticket.urgency)?.color || 'transparent';
                    const responsibleUser = allUsers.find(u => u.name === ticket.responsible);

                    return (
                      <motion.div
                        layout
                        key={ticket.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ticket)}
                        onClick={() => onTicketClick(ticket)}
                        className={`glass kanban-card ${ticket.created_by !== user?.id ? 'shared-card' : ''}`}
                        style={{
                          padding: '1rem',
                          cursor: 'grab',
                          borderLeft: `5px solid ${urgencyColor}`,
                          boxShadow: ticket.created_by !== user?.id ? '0 0 0 2px var(--primary)40, 0 4px 12px rgba(0,0,0,0.1)' : 'none',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px', alignItems: 'center' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: '700' }}>#{ticket.id}</span>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {ticket.created_by !== user?.id && ticket.responsible !== user?.name && Array.isArray(ticket.shared_with) && ticket.shared_with.includes(user?.id) && (
                              <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                Compartilhado
                              </span>
                            )}
                            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{systems.find(p => p.id == ticket.platform)?.name || ticket.platform}</span>
                          </div>
                        </div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>{ticket.title}</h4>
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
    </div>
  );
}

// --- Modal de Criação ---
function TicketModal({ onClose, onSubmit, systems }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    platform: '',
    responsible: '',
    files: []
  });
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlatformChange = (pId) => {
    const platform = systems.find(p => p.id == pId);
    setFormData({
      ...formData,
      platform: pId,
      responsible: platform?.primary_responsibles?.[0] || ''
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
    if (!formData.title || !formData.description || !formData.platform || !formData.responsible) {
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Plataforma</label>
              <select value={formData.platform} onChange={e => handlePlatformChange(e.target.value)}>
                <option value="">Selecione...</option>
                {systems.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Responsável</label>
              <select value={formData.responsible} onChange={e => setFormData({ ...formData, responsible: e.target.value })} disabled={!formData.platform}>
                <option value="">Selecione...</option>
                {formData.platform && systems.find(p => p.id == formData.platform)?.primary_responsibles?.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
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

function TicketDetailsModal({ ticket, onClose, onUpdate, systems, allUsers, user }) {
  const [urgency, setUrgency] = useState(ticket.urgency || '');
  const [responsible, setResponsible] = useState(ticket.responsible || '');
  const [isCustomResp, setIsCustomResp] = useState(false);
  const [devNotes, setDevNotes] = useState(ticket.dev_notes || '');
  const [sharedWith, setSharedWith] = useState(Array.isArray(ticket.shared_with) ? ticket.shared_with : []);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const platform = systems.find(p => p.id == ticket.platform);
  const availableDevs = platform?.primary_responsibles || [];

  const creator = allUsers.find(u => u.id === ticket.created_by);

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
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.75rem' }}>Responsável</label>
                    <select value={responsible} onChange={e => setResponsible(e.target.value)} style={{ padding: '8px', fontSize: '0.85rem' }}>
                      <option value="">Livre</option>
                      {availableDevs.map(dev => <option key={dev} value={dev}>{dev}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.75rem' }}>Urgência</label>
                    <select value={urgency} onChange={e => setUrgency(e.target.value)} style={{ padding: '8px', fontSize: '0.85rem' }}>
                      {URGENCY_LEVELS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.75rem' }}>Notas Técnicas</label>
                    <textarea 
                      value={devNotes} 
                      onChange={e => setDevNotes(e.target.value)} 
                      placeholder="Logs técnicos e observações internas..." 
                      style={{ minHeight: '120px', fontSize: '0.85rem', padding: '10px' }}
                    ></textarea>
                  </div>

                  {/* Sistema de Compartilhamento (ACL) */}
                  {(user?.id === ticket.created_by || user?.name === ticket.responsible) && (
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} /> Compartilhar Ticket
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <select 
                          className="sharing-select"
                          style={{ margin: 0, padding: '6px', fontSize: '0.8rem' }}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val && !sharedWith.includes(val)) {
                              setSharedWith([...sharedWith, val]);
                            }
                            e.target.value = "";
                          }}
                        >
                          <option value="">Selecionar usuário...</option>
                          {allUsers
                            .filter(u => u.id !== user.id && !sharedWith.includes(u.id))
                            .map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)
                          }
                        </select>
                        
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
                    const updates = { responsible, urgency, dev_notes: devNotes };
                    if (user?.id === ticket.created_by) {
                      updates.shared_with = sharedWith;
                    }
                    onUpdate(ticket.id, updates);
                    playSound('success');
                    onClose();
                  }}>Salvar Alterações</button>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <div className="modal-section-title" style={{ marginBottom: '1.5rem' }}>
                    <Activity size={18} /> Atividade
                  </div>
                  <div className="activity-feed">
                    <div className="activity-item">
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
                        <div className="activity-text">criou este ticket para o sistema {systems.find(p => p.id == ticket.platform)?.name}</div>
                        <div className="activity-time">{new Date(ticket.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  </div>
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


// --- Analytics Dashboard (Premium) ---
function AnalyticsDashboard({ tickets }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResp, setSelectedResp] = useState('');

  useEffect(() => {
    const fetchAllLogs = async () => {
      const { data } = await api.from('system_logs').select('*');
      setLogs(data || []);
      setLoading(false);
    };
    fetchAllLogs();
  }, []);

  const responsibleList = React.useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.responsible).filter(Boolean))).sort();
  }, [tickets]);

  const kpis = React.useMemo(() => {
    if (!logs.length || !tickets.length) return null;
    let totalMTTV = 0, mttvCount = 0, totalMTR = 0, mtrCount = 0, bottlenecks = [];

    const filteredTickets = selectedResp
      ? tickets.filter(t => t.responsible === selectedResp)
      : tickets;

    if (!filteredTickets.length) return { avgMttv: 0, avgMtr: 0, bottlenecks: [] };

    filteredTickets.forEach(ticket => {
      const ticketLogs = logs.filter(l => String(l.ticket_id) === String(ticket.id)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const createTime = new Date(ticket.created_at);
      const viewLog = ticketLogs.find(l => l.action_type === 'TICKET_VIEWED_FIRST_TIME');
      if (viewLog) { totalMTTV += (new Date(viewLog.created_at) - createTime) / (1000 * 60); mttvCount++; }
      else if (ticket.status !== 'resolvido') {
        const waiting = (new Date() - createTime) / (1000 * 60);
        if (waiting > 60) bottlenecks.push({ ...ticket, waitingMins: waiting });
      }
      const resLog = ticketLogs.find(l => l.action_type === 'STATUS_CHANGED' && l.new_value === 'resolvido');
      if (resLog) { totalMTR += (new Date(resLog.created_at) - createTime) / (1000 * 60 * 60); mtrCount++; }
    });

    return {
      avgMttv: mttvCount ? (totalMTTV / mttvCount).toFixed(0) : 0,
      avgMtr: mtrCount ? (totalMTR / mtrCount).toFixed(1) : 0,
      bottlenecks: bottlenecks.sort((a, b) => b.waitingMins - a.waitingMins).slice(0, 5)
    };
  }, [logs, tickets, selectedResp]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Mapeando Telemetria...</div>;

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 color="var(--primary)" /> Analytics & BI
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <Users size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            value={selectedResp}
            onChange={e => setSelectedResp(e.target.value)}
            className="analytics-select"
            style={{ border: 'none', margin: 0, padding: '4px', fontSize: '0.85rem', fontWeight: '600', width: 'auto', color: 'inherit', background: 'none', cursor: 'pointer' }}
          >
            <option value="">Equipe Geral</option>
            {responsibleList.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass" style={{ padding: '2rem', borderLeft: '4px solid #6366f1' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>TMT (RESPOSTA)</span>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '800' }}>{kpis?.avgMttv}min</h3>
        </div>
        <div className="glass" style={{ padding: '2rem', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>TMR (RESOLUÇÃO)</span>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '800' }}>{kpis?.avgMtr}h</h3>
        </div>
      </div>

      <div className="glass" style={{ padding: '2rem' }}>
        <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}><AlertTriangle size={18} /> Gargalos de SLA</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {kpis?.bottlenecks.map(b => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: '600' }}>{b.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resp: {b.responsible || 'Vazio'}</div>
              </div>
              <div style={{ fontWeight: '800', color: '#ef4444' }}>{(b.waitingMins / 60).toFixed(1)}h</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Views Administrativas ---
function UsersView({ user, onDeleteUser, fetchUsers: parentFetchUsers, allUsers }) {
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
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <span className="badge" style={{
                      background: u.role === 'admin' ? 'rgba(99,102,241,0.1)' : u.role === 'dev' ? 'rgba(139,92,246,0.1)' : 'rgba(100,116,139,0.1)',
                      color: u.role === 'admin' ? 'var(--primary)' : u.role === 'dev' ? '#8b5cf6' : 'var(--text-muted)',
                      fontWeight: '700', textTransform: 'uppercase', fontSize: '0.65rem', padding: '4px 10px'
                    }}>
                      {u.role}
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
              <select name="role">
                <option value="user">User</option>
                <option value="dev">Dev</option>
                <option value="admin">Admin</option>
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
              <label style={{ fontSize: '0.75rem' }}>Cargo / Permissão</label>
              <select name="role" defaultValue={editingUser?.role}>
                <option value="user">User</option>
                <option value="dev">Dev</option>
                <option value="admin">Admin</option>
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

function SystemsView({ user, systems, onUpdate }) {
  const [activeModal, setActiveModal] = useState(null); // 'edit_name' | 'manage_resps' | 'delete_confirm' | 'new_system'
  const [editingSystem, setEditingSystem] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedResps, setSelectedResps] = useState([]);

  useEffect(() => {
    if (activeModal === 'manage_resps') {
      fetchUsers();
    }
  }, [activeModal]);

  const fetchUsers = async () => {
    const { data } = await api.from('users').select('name, email').order('name');
    setAllUsers(data || []);
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name');
    try {
      if (activeModal === 'new_system') {
        const { error } = await api.from('systems').insert([{
          name,
          primary_responsibles: []
        }]);
        if (error) throw error;
        toast.success('Sistema criado!');
      } else {
        const { error } = await api.from('systems').update({ name }).eq('id', editingSystem.id);
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
    console.log('[DEBUG] Realizando UPSERT de responsáveis para ID:', editingSystem?.id);

    if (!editingSystem?.id) {
      toast.error('Sistema não identificado.');
      return;
    }

    try {
      // Usando upsert para criar o sistema caso ele seja apenas mockado (local)
      const { data, error, status } = await api.from('systems')
        .upsert({
          id: editingSystem.id,
          name: editingSystem.name, // Mantendo o nome original
          primary_responsibles: selectedResps
        })
        .select();

      console.log('[DEBUG] Resultado UPSERT:', { data, error, status });

      if (error) throw error;

      toast.success('Configurações persistidas com sucesso!');
      closeModal();
      onUpdate();
    } catch (err) {
      console.error('Erro ao persistir sistema:', err);
      toast.error(`Erro ao salvar: ${err.message || 'Falha no banco'}`);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const { error } = await api.from('systems').delete().eq('id', editingSystem.id);
      if (error) throw error;
      toast.success('Sistema excluído.');
      closeModal();
      onUpdate();
    } catch (err) {
      toast.error('Erro ao excluir: ' + (err.message || err));
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingSystem(null);
    setSelectedResps([]);
  };

  const toggleResp = (name) => {
    setSelectedResps(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.75rem', fontWeight: '800' }}>
            <Layers color="var(--primary)" size={28} /> Sistemas
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>Gerencie as plataformas e as equipes responsáveis.</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setActiveModal('new_system')}>
            <Plus size={18} /> Novo Sistema
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {systems.map(s => (
          <motion.div layout key={s.id} className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Code2 size={20} />
                </div>
                <h4 style={{ fontWeight: '700', fontSize: '1.1rem' }}>{s.name}</h4>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => { setEditingSystem(s); setActiveModal('edit_name'); }} className="icon-btn" title="Editar Nome"><Pencil size={14} /></button>
                <button onClick={() => { setEditingSystem(s); setSelectedResps(s.primary_responsibles || []); setActiveModal('manage_resps'); }} className="icon-btn" title="Gerenciar Responsáveis"><UserPlus size={14} /></button>
                <button onClick={() => { setEditingSystem(s); setActiveModal('delete_confirm'); }} className="icon-btn logout" title="Excluir"><Trash2 size={14} /></button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '8px' }}>Responsáveis</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {s.primary_responsibles?.length > 0 ? (
                  s.primary_responsibles.map((r, idx) => (
                    <span key={idx} style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>
                      {r}
                    </span>
                  ))
                ) : (
                  <span style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum responsável</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {activeModal && (
          <SystemActionModal
            type={activeModal}
            system={editingSystem}
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
    </div>
  );
}

// --- Sub-componente para Modais de Sistemas (Estabilidade de Portal/Animação) ---
function SystemActionModal({ type, system, users, selectedResps, onClose, onSaveName, onSaveResps, onConfirmDelete, onToggleResp }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
            {type === 'new_system' && 'Novo Sistema'}
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
              <label>Nome do Sistema</label>
              <input name="name" defaultValue={system?.name} placeholder="Ex: Matriz, Zaploto..." required autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Gravar Alterações</button>
          </form>
        )}

        {type === 'manage_resps' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Responsáveis para <strong>{system?.name}</strong>:</p>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {users.map(u => (
                <div
                  key={u.email}
                  onClick={() => onToggleResp(u.name)}
                  style={{
                    padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--glass-border)',
                    background: selectedResps.includes(u.name) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontWeight: '500' }}>{u.name}</span>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '4px',
                    border: `2px solid ${selectedResps.includes(u.name) ? 'var(--primary)' : 'var(--glass-border)'}`,
                    background: selectedResps.includes(u.name) ? 'var(--primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {selectedResps.includes(u.name) && <CheckSquare size={14} color="white" />}
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
              Excluir o sistema <strong>{system?.name}</strong>?<br />
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
