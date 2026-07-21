// Self-check da regra de visibilidade. Rodar: node src/lib/visibility.test.mjs
import assert from 'node:assert';
import { canSeeTicket, seVePorOrigem, leadSetorIds, leadSystemIds, colaboradoresDoSetor, podeAtribuir, isColaboradorDoSetor, userSystemIds, userSetorIds, noSetor, afiliadosDe, responsaveisDe } from './visibility.js';

const setores = [{ id: 1, primary_responsibles: [10] }, { id: 2, primary_responsibles: [20] }];
const systems = [{ id: 100, setor_id: 1, primary_responsibles: [30] }];

const admin     = { id: 1,  role: 'admin' };
const func      = { id: 5,  role: 'funcionario' };
const respSub   = { id: 30, role: 'responsavel_subsetor' };
const gerente   = { id: 10, role: 'gerente' };

const tSetor1 = { setor_id: 1, platform: '100', created_by: 999, shared_with: [] };
const tSetor2 = { setor_id: 2, platform: null,  created_by: 999, shared_with: [] };
const tOwn    = { setor_id: 2, platform: null,  created_by: 5,   shared_with: [] };
const tShared = { setor_id: 2, platform: null,  created_by: 999, shared_with: [5] };

// admin vê tudo
assert.equal(canSeeTicket(tSetor1, admin, setores, systems), true);
// funcionario só vê próprios/compartilhados
assert.equal(canSeeTicket(tSetor1, func, setores, systems), false);
assert.equal(canSeeTicket(tOwn, func, setores, systems), true);
assert.equal(canSeeTicket(tShared, func, setores, systems), true);
// gerente vê todo o setor 1, não o setor 2
assert.equal(canSeeTicket(tSetor1, gerente, setores, systems), true);
assert.equal(canSeeTicket(tSetor2, gerente, setores, systems), false);
// resp. sub-setor vê pelo platform (system 100), não outro setor
assert.equal(canSeeTicket(tSetor1, respSub, setores, systems), true);
assert.equal(canSeeTicket(tSetor2, respSub, setores, systems), false);
// Kanban (includeOwn=false): quem só criou não vê; escopo/compartilhado seguem valendo
assert.equal(canSeeTicket(tOwn, func, setores, systems, false), false);       // só criou → fora do board
assert.equal(canSeeTicket(tShared, func, setores, systems, false), true);     // compartilhado → no board
assert.equal(canSeeTicket(tSetor1, gerente, setores, systems, false), true);// escopo do setor → no board

// helpers
assert.deepEqual(leadSetorIds(gerente, setores), [1]);
assert.deepEqual(leadSystemIds(respSub, systems), [100]);

// --- Atribuição flexível ---
// pool do setor 1 = resp. do setor (10) + resp. do sub-setor 100 (30)
assert.deepEqual(colaboradoresDoSetor(1, setores, systems).sort((a,b)=>a-b), [10, 30]);
assert.deepEqual(colaboradoresDoSetor(2, setores, systems), [20]); // só o resp. do setor 2
// podeAtribuir: admin sim; quem lidera o setor do ticket sim; resp. de sub-setor não lidera o setor
assert.equal(podeAtribuir(admin, tSetor1, setores), true);
assert.equal(podeAtribuir(gerente, tSetor1, setores), true);         // lidera setor 1
assert.equal(podeAtribuir(respSub, tSetor1, setores), false);        // lidera só o sub-setor
assert.equal(podeAtribuir(func, tSetor1, setores), false);
// isColaboradorDoSetor
assert.equal(isColaboradorDoSetor(respSub, 1, setores, systems), true);  // 30 está no sub-setor de 1
assert.equal(isColaboradorDoSetor(func, 1, setores, systems), false);

// --- Vínculo de sub-setor (funcionário do sub-setor) ---
const funcSub = { id: 40, role: 'funcionario', name: 'F40', system_id: 100 }; // funcionário do sub-setor 100 (setor 1)
// com allUsers, o funcionário do sub-setor entra no pool de direcionamento do setor
assert.deepEqual(colaboradoresDoSetor(1, setores, systems, [funcSub]).sort((a, b) => a - b), [10, 30, 40]);
// sem allUsers, segue só resolvedores (usado no broadcast)
assert.deepEqual(colaboradoresDoSetor(1, setores, systems).sort((a, b) => a - b), [10, 30]);
// quem recebe a demanda (responsible = seu nome) enxerga o ticket, mesmo funcionário
const tAtribuido = { setor_id: 2, platform: null, created_by: 999, shared_with: [], responsible: 'F40' };
assert.equal(canSeeTicket(tAtribuido, funcSub, setores, systems), true);
assert.equal(canSeeTicket(tAtribuido, func, setores, systems), false);

// --- Funcionário em VÁRIOS sub-setores (system_id principal ∪ system_ids extras) ---
const systems2 = [{ id: 100, setor_id: 1, primary_responsibles: [30] }, { id: 200, setor_id: 2, primary_responsibles: [] }];
const funcMulti = { id: 50, role: 'funcionario', name: 'F50', system_id: 100, system_ids: [200] }; // sub-setor 100 (setor 1) + extra 200 (setor 2)
assert.deepEqual(userSystemIds(funcMulti).sort(), ['100', '200']);
// entra no pool de direcionamento tanto do setor 1 quanto do setor 2
assert.ok(colaboradoresDoSetor(1, setores, systems2, [funcMulti]).includes(50));
assert.ok(colaboradoresDoSetor(2, setores, systems2, [funcMulti]).includes(50));
// noSetor considera o sub-setor extra
assert.equal(noSetor(funcMulti, 2, systems2), true);  // via extra 200
assert.equal(noSetor(func, 2, systems2), false);
// demanda ABERTA (open_pool) do setor 2 fica visível pelo vínculo extra
const tPool2 = { setor_id: 2, platform: '200', created_by: 999, shared_with: [], open_pool: 1 };
assert.equal(canSeeTicket(tPool2, funcMulti, setores, systems2), true);
assert.equal(canSeeTicket(tPool2, func, setores, systems2), false);

// --- Kanban/direcionamento por AFILIADOS diretos (gerente/resp só veem seus afiliados + demandas a direcionar) ---
const afil  = { id: 60, role: 'funcionario', name: 'AF60', responsavel_id: 10 };  // afiliado do gerente 10
const outro = { id: 61, role: 'funcionario', name: 'OU61', responsavel_id: 999 }; // não é afiliado do gerente
const usersG = [gerente, afil, outro];
assert.deepEqual(afiliadosDe(10, usersG).map(u => u.id), [60]);
const tGerAfil    = { setor_id: 1, platform: '100', responsible: 'AF60', created_by: 999, shared_with: [] };
const tGerOutro   = { setor_id: 1, platform: '100', responsible: 'OU61', created_by: 999, shared_with: [] };
const tGerSemDono = { setor_id: 1, platform: '100', responsible: null,   created_by: 999, shared_with: [] };
assert.equal(canSeeTicket(tGerAfil,    gerente, setores, systems, true, usersG), true);  // afiliado → vê
assert.equal(canSeeTicket(tGerOutro,   gerente, setores, systems, true, usersG), false); // não-afiliado → não vê
assert.equal(canSeeTicket(tGerSemDono, gerente, setores, systems, true, usersG), true);  // sem dono → direciona
assert.equal(canSeeTicket(tGerOutro,   gerente, setores, systems, false, usersG), false);// idem no board
// resp. sub-setor: mesma regra no seu sub-setor (platform 100)
const respAfil = { id: 62, role: 'funcionario', name: 'RA62', responsavel_id: 30 };
const usersR = [respSub, respAfil, outro];
assert.equal(canSeeTicket({ setor_id: 1, platform: '100', responsible: 'RA62', created_by: 999, shared_with: [] }, respSub, setores, systems, true, usersR), true);
assert.equal(canSeeTicket({ setor_id: 1, platform: '100', responsible: 'OU61', created_by: 999, shared_with: [] }, respSub, setores, systems, true, usersR), false);

// --- Membro que atua em VÁRIOS setores (setor_id ∪ setor_ids) ---
const multiSetor = { id: 70, role: 'funcionario', name: 'MS70', setor_id: 1, setor_ids: [2] };
assert.deepEqual(userSetorIds(multiSetor).sort(), ['1', '2']);
assert.equal(noSetor(multiSetor, 1, systems2), true);  // principal
assert.equal(noSetor(multiSetor, 2, systems2), true);  // extra
assert.equal(noSetor(multiSetor, 3, systems2), false);
// listado como colaborador nos DOIS setores (principal e extra)
assert.ok(colaboradoresDoSetor(1, setores, systems2, [multiSetor]).includes(70));
assert.ok(colaboradoresDoSetor(2, setores, systems2, [multiSetor]).includes(70));
// vê open_pool dos dois setores
assert.equal(canSeeTicket({ setor_id: 2, platform: null, created_by: 999, shared_with: [], open_pool: 1 }, multiSetor, setores, systems2), true);

// --- Visibilidade de ORIGEM (config `origin_visibility` do setor de origem) ---
const setoresOwn   = [{ id: 1, primary_responsibles: [10], origin_visibility: 'own' },      { id: 2, primary_responsibles: [20] }];
const setoresSetor = [{ id: 1, primary_responsibles: [10], origin_visibility: 'setor' },    { id: 2, primary_responsibles: [20] }];
const setoresSub   = [{ id: 1, primary_responsibles: [10], origin_visibility: 'subsetor' }, { id: 2, primary_responsibles: [20] }];
const colegaSetor1 = { id: 80, role: 'funcionario', name: 'C80', setor_id: 1 };    // mesmo setor de origem, sem sub-setor
const colegaSub100 = { id: 81, role: 'funcionario', name: 'C81', system_id: 100 }; // mesmo sub-setor de origem (setor 1)
const forasteiro   = { id: 82, role: 'funcionario', name: 'C82', setor_id: 2 };    // outro setor
const tEnviado = { setor_id: 2, platform: null, origin_setor_id: 1, origin_system_id: 100, created_by: 999, shared_with: [] };
// own (default): colega NÃO vê o que o setor enviou
assert.equal(canSeeTicket(tEnviado, colegaSetor1, setoresOwn, systems), false);
// setor: qualquer um do setor de origem acompanha na lista
assert.equal(canSeeTicket(tEnviado, colegaSetor1, setoresSetor, systems), true);
assert.equal(canSeeTicket(tEnviado, forasteiro,   setoresSetor, systems), false);
// subsetor: só quem está no MESMO sub-setor de origem
assert.equal(canSeeTicket(tEnviado, colegaSub100, setoresSub, systems), true);
assert.equal(canSeeTicket(tEnviado, colegaSetor1, setoresSub, systems), false); // no setor, mas não no sub-setor 100
// não polui o Kanban do destino (includeOwn=false)
assert.equal(canSeeTicket(tEnviado, colegaSetor1, setoresSetor, systems, false), false);
// helper seVePorOrigem usado tanto no canSeeTicket quanto na aba "Enviados"
assert.equal(seVePorOrigem(tEnviado, colegaSetor1, setoresSetor, systems), true);
assert.equal(seVePorOrigem(tEnviado, colegaSetor1, setoresOwn, systems), false);
assert.equal(seVePorOrigem(tEnviado, colegaSub100, setoresSub, systems), true);
assert.equal(seVePorOrigem(tEnviado, forasteiro, setoresSetor, systems), false);
// subsetor mode particionado por nível: ticket SEM sub-setor de origem (autor solto no setor)
const tEnviadoSetor = { setor_id: 2, platform: null, origin_setor_id: 1, origin_system_id: null, created_by: 998, shared_with: [] };
assert.equal(seVePorOrigem(tEnviadoSetor, colegaSetor1, setoresSub, systems), true);  // do setor sem sub-setor → vê os "do setor"
assert.equal(seVePorOrigem(tEnviadoSetor, colegaSub100, setoresSub, systems), false); // está num sub-setor → só vê do sub-setor
assert.equal(seVePorOrigem(tEnviado,      colegaSub100, setoresSub, systems), true);  // ticket de sub-setor → colega do sub-setor vê
assert.equal(seVePorOrigem(tEnviado,      colegaSetor1, setoresSub, systems), false); // do setor não vê o do sub-setor

// --- Múltiplos responsáveis (responsavel_id principal ∪ responsavel_ids extras) ---
const membroMultiResp = { id: 90, role: 'funcionario', name: 'M90', responsavel_id: 10, responsavel_ids: [20] };
assert.deepEqual(responsaveisDe(membroMultiResp).sort(), ['10', '20']);
assert.deepEqual(responsaveisDe({ id: 91, responsavel_id: 10 }), ['10']);          // só principal
assert.deepEqual(responsaveisDe({ id: 92, responsavel_ids: [30] }), ['30']);        // só extra
assert.deepEqual(responsaveisDe({ id: 93 }), []);                                   // nenhum
// ambos os responsáveis (10 e 20) enxergam o membro como afiliado
assert.deepEqual(afiliadosDe(10, [membroMultiResp]).map(u => u.id), [90]);
assert.deepEqual(afiliadosDe(20, [membroMultiResp]).map(u => u.id), [90]);          // responsável EXTRA também
assert.deepEqual(afiliadosDe(99, [membroMultiResp]).map(u => u.id), []);            // quem não é responsável, não

console.log('visibility.test: OK');
