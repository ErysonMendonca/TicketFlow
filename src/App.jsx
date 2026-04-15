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
import { supabase } from './lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { PLATFORMS, DEV_STATUS, URGENCY_LEVELS, OTHER_STATUS, MOCK_USERS } from './constants';

// --- Utilitários ---
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
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: dbError } = await supabase
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
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'white' }}>
            <ShieldCheck size={32} />
          </div>
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
          <div className="brand-logo">
            <ShieldCheck size={24} />
          </div>
          <span className="brand-name">TicketFlow <small style={{ opacity: 0.6, fontSize: '0.7em', fontWeight: 400, marginLeft: '4px' }}>v1.1.0</small></span>
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

        <div className="header-actions">
          <button className="icon-btn theme-toggle-header" onClick={toggleTheme} title="Alternar Tema">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {user ? (
            <div className="user-menu-wrapper">
              <div className="user-badge">
                <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} className="user-avatar-mini" alt={user.name} />
                <div className="user-text">
                  <span className="u-name">{user.name}</span>
                  <span className="u-role">{user.role}</span>
                </div>
              </div>
              <button className="icon-btn logout" onClick={onLogout} title="Sair">
                <LogOut size={18} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
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

  const [systemsList, setSystemsList] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const initData = async () => {
      // Carregar Sistemas
      const { data: sysData } = await supabase.from('systems').select('*');
      if (sysData && sysData.length > 0) setSystemsList(sysData);
      else setSystemsList(PLATFORMS); // Fallback caso tabela não exista ainda

      // Carregar Usuários
      const { data: userData } = await supabase.from('users').select('*').order('name');
      if (userData) setAllUsers(userData);

      fetchTickets();
    };
    initData();
  }, []);

  // Forçar visualização correta baseado no cargo
  useEffect(() => {
    if (user?.role === 'dev' && view !== 'kanban') {
      setView('kanban');
    }
  }, [user, view]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(200);
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

      const { error } = await supabase.from('system_logs').insert([{
        ticket_id: ticketId ? ticketId : 0,
        action_type: actionType,
        old_value: oldValue,
        new_value: newValue,
        actor_name: actorName,
        actor_role: actorRole
      }]);

      if (error) {
        console.error('ERRO SUPABASE LOGGER:', error);
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
    const channel = supabase.channel('realtime_tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTickets(prev => {
            if (prev.find(t => t.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });

          const currentUser = JSON.parse(localStorage.getItem('currentUser'));
          if (!currentUser || currentUser.id !== payload.new.created_by) {
            toast.success(`Novo Ticket #${payload.new.id} Recebido!`, { icon: '🚨' });
          }
        }
        else if (payload.eventType === 'UPDATE') {
          setTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
        }
        else if (payload.eventType === 'DELETE') {
          setTickets(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchTickets() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
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
      await supabase.from('users').update({ is_online: false }).eq('id', user.id);
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

          const { error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(filePath, file);

          if (uploadError) throw new Error('Falha no upload: ' + uploadError.message);

          const { data: publicUrlData } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(filePath);

          uploadedAttachments.push({
            url: publicUrlData.publicUrl,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            name: file.name
          });
        }
      }

      const ticketToInsert = { ...formData };
      delete ticketToInsert.files;
      ticketToInsert.attachments = uploadedAttachments;

      const { data, error } = await supabase
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

    toast.promise(uploadAndInsert(), {
      loading: 'Criando ticket...',
      success: (newTicket) => {
        setTickets([newTicket, ...tickets]);
        setIsModalOpen(false);
        return `Ticket #${newTicket.id} criado!`;
      },
      error: (err) => `Erro: ${err.message}`
    });
  };

  const updateTicketDetails = async (ticketId, updates) => {
    const atualizar = async () => {
      const oldTicket = tickets.find(t => t.id === ticketId);
      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw new Error(error.message);

      setTickets(tickets.map(t => t.id === ticketId ? { ...t, ...updates } : t));

      if (oldTicket && updates.responsible !== undefined && oldTicket.responsible !== updates.responsible) {
        await logAction(ticketId, 'RESPONSIBLE_ASSIGNED', oldTicket.responsible || 'Sem atribuição', updates.responsible || 'Sem atribuição');
      }
    };

    toast.promise(atualizar(), {
      loading: 'Salvando alterações...',
      success: 'Ticket atualizado!',
      error: 'Falha ao atualizar.'
    });
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const oldTicket = tickets.find(t => t.id === ticketId);
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      toast.success('Status atualizado');

      if (oldTicket && oldTicket.status !== newStatus) {
        await logAction(ticketId, 'STATUS_CHANGED', oldTicket.status, newStatus);
      }
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const deleteTicket = async (id) => {
    if (window.confirm('Excluir este ticket?')) {
      try {
        const { error } = await supabase.from('tickets').delete().eq('id', id);
        if (error) throw error;
        setTickets(tickets.filter(t => t.id !== id));
      } catch (err) {
        toast.error('Erro ao excluir: ' + err.message);
      }
    }
  };

  const visibleTickets = (user?.role === 'dev')
    ? tickets.filter(t => t.responsible === user.name)
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
        <LoginScreen onLogin={async (userData) => {
          await supabase.from('users').update({ is_online: true }).eq('id', userData.id);
          localStorage.setItem('currentUser', JSON.stringify(userData));
          await logAction(0, 'USER_LOGIN', null, 'Acesso Autorizado');
          setUser(userData);
          window.location.hash = '';
        }} />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' } }} />

      <AppHeader
        currentView={view}
        setView={setView}
        user={user}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      <div className="app-layout">
        <main className="content-area">
          {view === 'tickets' ? (
            <UserDashboard
              tickets={filteredTickets}
              isLoading={loading}
              onOpenModal={() => setIsModalOpen(true)}
              search={search}
              setSearch={setSearch}
              onDelete={deleteTicket}
              user={user}
              systems={systemsList}
            />
          ) : view === 'users' ? (
            <UsersView user={user} />
          ) : view === 'systems' ? (
            <SystemsView user={user} systems={systemsList} onUpdate={async () => {
              const { data } = await supabase.from('systems').select('*');
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
                setViewingTicket(t);
                if (user && (user.role === 'dev' || user.role === 'admin')) {
                  await logAction(t.id, 'TICKET_VIEWED_FIRST_TIME', null, null);
                }
              }}
            />
          ) : view === 'analytics' ? (
            <AnalyticsDashboard tickets={filteredTickets} />
          ) : view === 'logs' ? (
            <LogsView />
          ) : (
            <div style={{ padding: '2rem' }}>Página não encontrada.</div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <TicketModal
            onClose={() => setIsModalOpen(false)}
            onSubmit={addTicket}
            systems={systemsList}
          />
        )}
        {viewingTicket && (
          <TicketDetailsModal
            ticket={viewingTicket}
            onClose={() => setViewingTicket(null)}
            onUpdate={updateTicketDetails}
            systems={systemsList}
            allUsers={allUsers}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// --- Dashboard do Usuário ---
function UserDashboard({ tickets, onOpenModal, search, setSearch, onDelete, user, systems, isLoading }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
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
        <button className="btn btn-primary" onClick={onOpenModal}>
          <Plus size={18} /> Novo Ticket
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '1rem'
        }}
      >
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
              style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem', display: 'block' }}>#{ticket.id}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>{ticket.title}</h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="card-info-row">
                      <LayoutDashboard size={12} /> {systems.find(p => p.id === ticket.platform)?.name || ticket.platform}
                    </div>
                    <div className="card-info-row">
                      <Clock size={12} /> {new Date(ticket.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="user-dash-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.05)', padding: '4px 10px', borderRadius: '8px', width: 'fit-content' }}>
                  <UserIcon size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: '500' }}>{ticket.responsible || 'Sem resp.'}</span>
                </div>

                <div style={{ minWidth: '100px', textAlign: 'center' }}>
                  <StatusBadge id={ticket.status} />
                </div>

                {user && (user.role === 'admin' || user.id === ticket.created_by) && (
                  <button className="btn btn-ghost" onClick={() => onDelete(ticket.id)} style={{ padding: '8px', color: '#ef4444', border: 'none' }}>
                    <Trash2 size={18} />
                  </button>
                )}
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
                      className="glass kanban-card"
                      style={{
                        padding: '1rem',
                        cursor: 'grab',
                        borderLeft: `5px solid ${urgencyColor}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: '700' }}>#{ticket.id}</span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{systems.find(p => p.id === ticket.platform)?.name || ticket.platform}</span>
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

  const handlePlatformChange = (pId) => {
    const platform = systems.find(p => p.id === pId);
    setFormData({
      ...formData,
      platform: pId,
      responsible: platform?.primary_responsibles?.[0] || ''
    });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
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
    onSubmit(formData);
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
                {formData.platform && systems.find(p => p.id === formData.platform)?.primary_responsibles?.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Anexos</label>
            <input type="file" id="file-upload" className="hidden" multiple accept="image/*,video/*" onChange={handleFileChange} />
            <label htmlFor="file-upload" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer', borderStyle: 'dashed' }}>
              <Plus size={18} /> Adicionar Mídia
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Criar Ticket</button>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}

function TicketDetailsModal({ ticket, onClose, onUpdate, systems, allUsers }) {
  const [urgency, setUrgency] = useState(ticket.urgency || '');
  const [responsible, setResponsible] = useState(ticket.responsible || '');
  const [devNotes, setDevNotes] = useState(ticket.dev_notes || '');
  const [viewingMedia, setViewingMedia] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const platform = systems.find(p => p.id === ticket.platform);
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
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem' }}>Notas Técnicas</label>
                    <textarea value={devNotes} onChange={e => setDevNotes(e.target.value)} placeholder="Logs técnicos..." style={{ minHeight: '120px', fontSize: '0.85rem', padding: '10px' }}></textarea>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => onUpdate(ticket.id, { responsible, urgency, dev_notes: devNotes })}>Salvar Alterações</button>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <div className="modal-section-title" style={{ marginBottom: '1.5rem' }}>
                    <Activity size={18} /> Atividade
                  </div>
                  <div className="activity-feed">
                    <div className="activity-item">
                      <img src={creator?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator?.name || 'ghost'}`} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                      <div className="activity-content">
                        <div className="activity-user">{creator?.name || "Usuário"}</div>
                        <div className="activity-text">criou este ticket para o sistema {systems.find(p => p.id === ticket.platform)?.name}</div>
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
      const { data } = await supabase.from('system_logs').select('*');
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
function UsersView({ user }) {
  const [dbUsers, setDbUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchUsers();
    const ch = supabase.channel('u_p').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, fetchUsers).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('name');
    setDbUsers(data || []);
    setLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    const { error } = await supabase.from('users').insert([{ ...data, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}` }]);
    if (!error) { toast.success('Membro criado!'); setIsNewUserModalOpen(false); fetchUsers(); }
  };

  const handleDeleteUser = async (uId) => {
    if (uId === user.id) {
      toast.error("Não é possível remover a si mesmo.");
      return;
    }
    if (window.confirm('Tem certeza que deseja remover este membro da equipe?')) {
      const { error } = await supabase.from('users').delete().eq('id', uId);
      if (!error) { toast.success('Usuário removido'); fetchUsers(); }
      else { toast.error('Erro ao remover usuário.'); }
    }
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
                {user?.role === 'admin' && <th style={{ padding: '1.25rem' }}></th>}
              </tr>
            </thead>
            <tbody>
              {dbUsers.map(u => (
                <tr key={u.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ position: 'relative' }}>
                        <img src={u.avatar} style={{ width: '42px', height: '42px', borderRadius: '12px', border: '2px solid var(--surface)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                        {u.is_online && <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', border: '2px solid var(--surface)' }}></span>}
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
                      <button className="icon-btn logout" onClick={() => handleDeleteUser(u.id)} title="Excluir Usuário">
                        <Trash2 size={16} />
                      </button>
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
    const { data } = await supabase.from('users').select('name, email').order('name');
    setAllUsers(data || []);
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name');
    try {
      if (activeModal === 'new_system') {
        const { error } = await supabase.from('systems').insert([{
          id: name.toLowerCase().replace(/\s/g, '_') + '_' + Date.now(),
          name,
          primary_responsibles: []
        }]);
        if (error) throw error;
        toast.success('Sistema criado!');
      } else {
        const { error } = await supabase.from('systems').update({ name }).eq('id', editingSystem.id);
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
      const { data, error, status } = await supabase.from('systems')
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
      const { error } = await supabase.from('systems').delete().eq('id', editingSystem.id);
      if (error) throw error;
      toast.success('Sistema excluído.');
      closeModal();
      onUpdate();
    } catch (err) {
      toast.error('Erro ao excluir.');
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
      const { data } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(200);
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

