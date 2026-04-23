
// Adaptador para conexão com a API MySQL local (Substituto do Supabase)

class ApiQueryBuilder {
  constructor(table) {
    this.query = { table, filters: [], order: null, limit: null, single: false };
  }

  select(cols = '*') { 
    if (!this.query.action) this.query.action = 'select'; 
    this.query.cols = cols; 
    return this; 
  }
  insert(data) { this.query.action = 'insert'; this.query.data = data; return this; }
  update(data) { this.query.action = 'update'; this.query.data = data; return this; }
  upsert(data) { this.query.action = 'upsert'; this.query.data = data; return this; }
  delete() { this.query.action = 'delete'; return this; }
  
  eq(col, val) { this.query.filters.push({ type: 'eq', col, val }); return this; }
  neq(col, val) { this.query.filters.push({ type: 'neq', col, val }); return this; }
  
  order(column, options = { ascending: true }) {
    this.query.order = { column, ascending: options.ascending !== false };
    return this;
  }
  
  limit(num) { this.query.limit = num; return this; }
  single() { this.query.single = true; return this; }

  async then(resolve) {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.query)
      });
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await res.json();
        if (!res.ok) {
          resolve({ data: null, error: result.error || { message: `Erro HTTP ${res.status}` } });
        } else {
          resolve(result);
        }
      } else {
        const text = await res.text();
        resolve({ data: null, error: { message: `Resposta não-JSON (${res.status}): ${text.substring(0, 100)}` } });
      }
    } catch (e) {
      console.error('Erro na API:', e);
      resolve({ data: null, error: { message: e.message || 'Erro desconhecido na rede' } });
    }
  }
}

export const api = {
  from: (table) => new ApiQueryBuilder(table),
  
  // Mocks para evitar erros em códigos legados
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {}
  }),
  removeChannel: () => {},
  
  storage: {
    from: () => ({
      upload: async () => ({ error: { message: "Storage desabilitado" } }),
      getPublicUrl: () => ({ data: { publicUrl: null } })
    })
  }
};
