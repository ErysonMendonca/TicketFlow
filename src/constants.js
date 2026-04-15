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
  { id: 'backlog', name: 'Backlog', userStatus: 'aberto', userStatusName: 'Aberto', color: '#6366f1' },
  { id: 'resolvendo', name: 'Resolvendo', userStatus: 'pendente', userStatusName: 'Pendente', color: '#f59e0b' },
  { id: 'em_teste', name: 'Em Teste', userStatus: 'pendente', userStatusName: 'Pendente', color: '#8b5cf6' },
  { id: 'resolvido', name: 'Resolvido', userStatus: 'resolvido', userStatusName: 'Resolvido', color: '#10b981' },
];

export const OTHER_STATUS = [
  { id: 'negado', name: 'Negado', color: '#ef4444' },
  { id: 'repassado', name: 'Repassado', color: '#3b82f6' },
];

export const URGENCY_LEVELS = [
  { id: 'leve', name: 'Leve', color: '#10b981' },
  { id: 'moderado', name: 'Moderado', color: '#f59e0b' },
  { id: 'grave', name: 'Grave', color: '#ef4444' },
];

export const MOCK_USERS = [
  { id: 'allan', name: 'Allan', role: 'admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Allan' },
  { id: 'denner', name: 'Denner', role: 'dev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Denner' },
  { id: 'jhuan', name: 'Jhuan', role: 'dev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jhuan' },
  { id: 'operador', name: 'Operador 01', role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Op1' },
  { id: 'gestor', name: 'Gestor Matriz', role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Manager' },
];
