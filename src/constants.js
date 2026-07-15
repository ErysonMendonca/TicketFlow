// Papéis do sistema (hierarquia). funcionario abre chamados; os demais atendem/gerenciam.
export const ROLES = ['admin', 'gerente', 'responsavel_setor', 'responsavel_subsetor', 'funcionario'];

export const ROLE_LABELS = {
  admin: 'Admin',
  gerente: 'Gerente',
  responsavel_setor: 'Resp. Setor',
  responsavel_subsetor: 'Resp. Sub-Setor',
  funcionario: 'Funcionário',
};

export const ROLE_COLORS = {
  admin: { bg: 'rgba(99,102,241,0.1)', fg: 'var(--primary)' },
  gerente: { bg: 'rgba(236,72,153,0.1)', fg: '#ec4899' },
  responsavel_setor: { bg: 'rgba(139,92,246,0.1)', fg: '#8b5cf6' },
  responsavel_subsetor: { bg: 'rgba(14,165,233,0.1)', fg: '#0ea5e9' },
  funcionario: { bg: 'rgba(100,116,139,0.1)', fg: 'var(--text-muted)' },
};

// Quem atende/gerencia (vê Kanban, aceita ticket, edita). funcionario só abre chamados.
export const isManager = (role) => !!role && role !== 'funcionario';

// Papéis que operam o board por padrão (caem no Kanban ao logar); admin começa em Tickets.
export const BOARD_ROLES = ['gerente', 'responsavel_setor', 'responsavel_subsetor'];

export const PLATFORMS = [
  { id: 'lotogiro', name: 'Lotogiro', primary_responsibles: ['Denner', 'Jhuan', 'Allan'] },
  { id: 'matriz', name: 'Matriz', primary_responsibles: ['Allan'] },
  { id: 'zaploto', name: 'Zaploto', primary_responsibles: ['Carlos'] },
  { id: 'inovaloto', name: 'InovaLoto', primary_responsibles: ['Allan'] },
  { id: 'mygoapp', name: 'Mygoapp', primary_responsibles: ['Jhuan'] },
  { id: 'lotopay', name: 'Lotopay', primary_responsibles: ['Allan'] },
  { id: 'infra', name: 'Infra/Outros', primary_responsibles: ['William'] },
];

export const DEV_STATUS = [
  { id: 'backlog', name: 'Pedidos', userStatus: 'aberto', userStatusName: 'Aberto', color: '#6366f1' },
  { id: 'analise', name: 'Análise', userStatus: 'pendente', userStatusName: 'Em Análise', color: '#3b82f6' },
  { id: 'resolvendo', name: 'Resolvendo', userStatus: 'pendente', userStatusName: 'Pendente', color: '#f59e0b' },
  { id: 'em_teste', name: 'Em Teste', userStatus: 'pendente', userStatusName: 'Pendente', color: '#8b5cf6' },
  { id: 'resolvido', name: 'Resolvido', userStatus: 'resolvido', userStatusName: 'Resolvido', color: '#10b981' },
];

// Tipo do ticket (definido no modal de detalhes)
export const TICKET_TYPES = [
  { id: 'demanda', name: 'Demanda', color: '#6366f1' },
  { id: 'bug', name: 'Bug', color: '#ef4444' },
  { id: 'problema', name: 'Problema', color: '#f59e0b' },
  { id: 'melhoria', name: 'Melhoria', color: '#10b981' },
];

export const OTHER_STATUS = [
  { id: 'negado', name: 'Negado', color: '#ef4444' },
  { id: 'repassado', name: 'Repassado', color: '#3b82f6' },
];

export const URGENCY_LEVELS = [
  { id: 'leve', name: 'Leve', color: '#10b981' },
  { id: 'moderado', name: 'Moderado', color: '#f59e0b' },
  { id: 'grave', name: 'Grave', color: '#ef4444' },
  { id: 'maxima', name: 'Máxima', color: '#b91c1c' }, // notifica o recebedor continuamente + vai pro topo da fila
];

export const URGENCIA_MAXIMA = 'maxima';

export const MOCK_USERS = [
  { id: 'allan', name: 'Allan', role: 'admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Allan' },
  { id: 'denner', name: 'Denner', role: 'dev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Denner' },
  { id: 'jhuan', name: 'Jhuan', role: 'dev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jhuan' },
  { id: 'operador', name: 'Operador 01', role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Op1' },
  { id: 'gestor', name: 'Gestor Matriz', role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Manager' },
];
