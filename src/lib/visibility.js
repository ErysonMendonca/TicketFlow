// Regras de visibilidade de tickets por papel (hierarquia por setor/sub-setor).
// Um usuário lidera um setor/sub-setor se: (a) está no `primary_responsibles` OU
// (b) é o GERENTE lotado nele (role+setor_id) / RESP. SUB-SETOR lotado nele (role+system_id).
// Assim o gerente do setor É o responsável (o cadastro cargo+setor já dá a liderança).
// ponytail: regra client-side, como todo o resto do app; enforcement server-side em /api/data é follow-up.

const arr = (v) => (Array.isArray(v) ? v : []);

// afiliados DIRETOS de um líder: usuários cujo responsavel_id = leaderId (os que ele cadastrou pelo link)
export function afiliadosDe(leaderId, allUsers = []) {
  if (leaderId == null) return [];
  return arr(allUsers).filter(u => u.responsavel_id != null && String(u.responsavel_id) === String(leaderId));
}

// sub-setores em que o usuário trabalha: principal (system_id) ∪ extras (system_ids)
export function userSystemIds(user) {
  if (!user) return [];
  const ids = [...arr(user.system_ids)];
  if (user.system_id != null) ids.push(user.system_id);
  return [...new Set(ids.map(String))];
}

// setores em que o usuário atua: principal (setor_id) ∪ extras (setor_ids)
export function userSetorIds(user) {
  if (!user) return [];
  const ids = [...arr(user.setor_ids)];
  if (user.setor_id != null) ids.push(user.setor_id);
  return [...new Set(ids.map(String))];
}

// setores que o usuário lidera (responsável explícito OU gerente lotado no setor)
export function leadSetorIds(user, setoresList = []) {
  if (!user) return [];
  return arr(setoresList).filter(s =>
    arr(s.primary_responsibles).includes(user.id) ||
    (user.role === 'gerente' && user.setor_id != null && String(user.setor_id) === String(s.id))
  ).map(s => s.id);
}

// sub-setores que o usuário lidera (responsável explícito OU resp. sub-setor lotado nele)
export function leadSystemIds(user, systemsList = []) {
  if (!user) return [];
  return arr(systemsList).filter(s =>
    arr(s.primary_responsibles).includes(user.id) ||
    (user.role === 'responsavel_subsetor' && user.system_id != null && String(user.system_id) === String(s.id))
  ).map(s => s.id);
}

// Pool de um setor = responsáveis do setor + responsáveis dos sub-setores
//   + (quando allUsers é passado) os FUNCIONÁRIOS vinculados a um sub-setor do setor.
// Sem allUsers → só os resolvedores (usado p/ notificar broadcast). Com allUsers → inclui funcionários (usado p/ direcionar).
export function colaboradoresDoSetor(setorId, setoresList = [], systemsList = [], allUsers = []) {
  if (setorId == null) return [];
  const setor = arr(setoresList).find(s => s.id === setorId);
  const ids = [...arr(setor?.primary_responsibles)];
  const systemsDoSetor = arr(systemsList).filter(sys => sys.setor_id === setorId);
  for (const sys of systemsDoSetor) ids.push(...arr(sys.primary_responsibles));
  const systemIds = new Set(systemsDoSetor.map(s => String(s.id)));
  for (const u of arr(allUsers)) {
    // funcionário/colaborador que atua num sub-setor do setor (principal/extra) OU no setor (principal/extra)
    const emSub = userSystemIds(u).some(sid => systemIds.has(sid));
    if (emSub || userSetorIds(u).includes(String(setorId))) ids.push(u.id);
  }
  return [...new Set(ids)];
}

// Quem pode direcionar/abrir a demanda: admin ou quem lidera o setor do ticket (gerente do setor).
export function podeAtribuir(user, ticket, setoresList = []) {
  if (!user || !ticket) return false;
  if (user.role === 'admin') return true;
  const setor = arr(setoresList).find(s => s.id === ticket.setor_id);
  if (arr(setor?.primary_responsibles).includes(user.id)) return true;
  return user.role === 'gerente' && user.setor_id != null && String(user.setor_id) === String(ticket.setor_id);
}

export function isColaboradorDoSetor(user, setorId, setoresList = [], systemsList = []) {
  return !!user && colaboradoresDoSetor(setorId, setoresList, systemsList).includes(user.id);
}

// O usuário é do setor? (atua nele — principal/extra — OU num sub-setor dele) — sem depender de allUsers.
export function noSetor(user, setorId, systemsList = []) {
  if (!user || setorId == null) return false;
  if (userSetorIds(user).includes(String(setorId))) return true;   // setor principal ou extra
  const meus = new Set(userSystemIds(user));
  return arr(systemsList).some(s => meus.has(String(s.id)) && String(s.setor_id) === String(setorId));
}

// Um ticket é visível para o usuário? (admin tudo; funcionario só próprios/compartilhados;
// gerente/resp. — dentro do escopo — veem as demandas SEM dono (a direcionar) + as atribuídas
// aos seus AFILIADOS DIRETOS; sempre + próprios/atribuídos-a-si/compartilhados.)
// includeOwn=false ignora o "abri este ticket" — usado no Kanban, onde quem só ENVIOU não vê o card.
// allUsers é necessário p/ resolver os afiliados (ticket.responsible é NOME) — sem ele, cai no escopo do setor.
export function canSeeTicket(t, user, setoresList = [], systemsList = [], includeOwn = true, allUsers = []) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (includeOwn && t.created_by === user.id) return true;       // próprios (abriu)
  if (user.name && t.responsible === user.name) return true;     // atribuído a mim (recebi a demanda)
  if (arr(t.shared_with).includes(user.id)) return true;         // compartilhados
  if (t.open_pool && noSetor(user, t.setor_id, systemsList)) return true; // demanda ABERTA ao setor → colaborador vê e pode puxar
  if (user.role === 'gerente' || user.role === 'responsavel_subsetor') {
    const inScope = user.role === 'gerente'
      ? leadSetorIds(user, setoresList).includes(t.setor_id)          // escopo do gerente = seu setor
      : leadSystemIds(user, systemsList).map(String).includes(String(t.platform)); // escopo do resp. = seu sub-setor
    if (!inScope) return false;
    if (!t.responsible) return true;                                    // demanda sem dono no escopo → precisa direcionar
    return afiliadosDe(user.id, allUsers).some(a => a.name === t.responsible); // senão, só se atribuída a um afiliado direto
  }
  return false;                                                  // funcionario: nada além de próprios/compartilhados
}
