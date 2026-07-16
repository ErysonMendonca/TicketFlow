// Regras de visibilidade de tickets por papel (hierarquia por setor/sub-setor).
// Um usuário lidera um setor/sub-setor se: (a) está no `primary_responsibles` OU
// (b) é o GERENTE lotado nele (role+setor_id) / RESP. SUB-SETOR lotado nele (role+system_id).
// Assim o gerente do setor É o responsável (o cadastro cargo+setor já dá a liderança).
// ponytail: regra client-side, como todo o resto do app; enforcement server-side em /api/data é follow-up.

const arr = (v) => (Array.isArray(v) ? v : []);

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
  const systemIds = new Set(systemsDoSetor.map(s => s.id));
  for (const u of arr(allUsers)) {
    // funcionário/colaborador vinculado a um sub-setor do setor OU lotado direto no setor
    if ((u.system_id != null && systemIds.has(u.system_id)) || String(u.setor_id) === String(setorId)) ids.push(u.id);
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

// O usuário é do setor? (lotado direto no setor OU num sub-setor dele) — sem depender de allUsers.
export function noSetor(user, setorId, systemsList = []) {
  if (!user || setorId == null) return false;
  if (String(user.setor_id) === String(setorId)) return true;
  const sys = arr(systemsList).find(s => String(s.id) === String(user.system_id));
  return !!sys && String(sys.setor_id) === String(setorId);
}

// Um ticket é visível para o usuário? (admin tudo; funcionario só próprios/compartilhados;
// gerente todo o setor; resp. sub-setor só o sub-setor — sempre + próprios/compartilhados)
// includeOwn=false ignora o "abri este ticket" — usado no Kanban, onde quem só ENVIOU não vê o card.
export function canSeeTicket(t, user, setoresList = [], systemsList = [], includeOwn = true) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (includeOwn && t.created_by === user.id) return true;       // próprios (abriu)
  if (user.name && t.responsible === user.name) return true;     // atribuído a mim (recebi a demanda)
  if (arr(t.shared_with).includes(user.id)) return true;         // compartilhados
  if (t.open_pool && noSetor(user, t.setor_id, systemsList)) return true; // demanda ABERTA ao setor → colaborador vê e pode puxar
  if (user.role === 'gerente')
    return leadSetorIds(user, setoresList).includes(t.setor_id); // todo o setor
  if (user.role === 'responsavel_subsetor')                      // só o(s) sub-setor(es) que lidera
    return leadSystemIds(user, systemsList).map(String).includes(String(t.platform));
  return false;                                                  // funcionario: nada além de próprios/compartilhados
}
