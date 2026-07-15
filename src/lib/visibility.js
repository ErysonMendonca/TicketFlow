// Regras de visibilidade de tickets por papel (hierarquia por setor/sub-setor).
// Fonte da verdade do escopo: quem está em `primary_responsibles` (ids) do setor/system o lidera.
// ponytail: regra client-side, como todo o resto do app; enforcement server-side em /api/data é follow-up.

const arr = (v) => (Array.isArray(v) ? v : []);

// setores cujo primary_responsibles (ids) inclui o usuário → ele lidera o setor inteiro
export function leadSetorIds(user, setoresList = []) {
  if (!user) return [];
  return arr(setoresList).filter(s => arr(s.primary_responsibles).includes(user.id)).map(s => s.id);
}

// systems (sub-setores) cujo primary_responsibles inclui o usuário
export function leadSystemIds(user, systemsList = []) {
  if (!user) return [];
  return arr(systemsList).filter(s => arr(s.primary_responsibles).includes(user.id)).map(s => s.id);
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
    if (u.system_id != null && systemIds.has(u.system_id)) ids.push(u.id);
  }
  return [...new Set(ids)];
}

// Quem pode direcionar/abrir a demanda: admin ou quem lidera o setor do ticket (gerente/resp. de setor).
export function podeAtribuir(user, ticket, setoresList = []) {
  if (!user || !ticket) return false;
  if (user.role === 'admin') return true;
  const setor = arr(setoresList).find(s => s.id === ticket.setor_id);
  return arr(setor?.primary_responsibles).includes(user.id);
}

export function isColaboradorDoSetor(user, setorId, setoresList = [], systemsList = []) {
  return !!user && colaboradoresDoSetor(setorId, setoresList, systemsList).includes(user.id);
}

// Um ticket é visível para o usuário? (admin tudo; funcionario só próprios/compartilhados;
// resp. setor/gerente todo o setor; resp. sub-setor só o sub-setor — sempre + próprios/compartilhados)
// includeOwn=false ignora o "abri este ticket" — usado no Kanban, onde quem só ENVIOU não vê o card.
export function canSeeTicket(t, user, setoresList = [], systemsList = [], includeOwn = true) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (includeOwn && t.created_by === user.id) return true;       // próprios (abriu)
  if (user.name && t.responsible === user.name) return true;     // atribuído a mim (recebi a demanda)
  if (arr(t.shared_with).includes(user.id)) return true;         // compartilhados
  if (user.role === 'gerente' || user.role === 'responsavel_setor')
    return leadSetorIds(user, setoresList).includes(t.setor_id); // todo o setor
  if (user.role === 'responsavel_subsetor')                      // só o(s) sub-setor(es) que lidera
    return leadSystemIds(user, systemsList).map(String).includes(String(t.platform));
  return false;                                                  // funcionario: nada além de próprios/compartilhados
}
