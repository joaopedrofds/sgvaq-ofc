/**
 * Mock Supabase client for server-side use when NEXT_PUBLIC_MOCK=true.
 * Retorna dados mockados para consultas comuns.
 */
import { mockEventos, mockModalidades, mockSenhas, mockCompetidores, mockFila, mockRanking, mockEquipe } from '@/lib/mock/data'

function mockFrom(table: string) {
  const allData: Record<string, any[]> = {
    eventos: mockEventos as any[],
    modalidades: mockModalidades as any[],
    senhas: mockSenhas as any[],
    competidores: mockCompetidores as any[],
    fila_entrada: mockFila as any[],
    ranking: mockRanking as any[],
    tenant_users: mockEquipe as any[],
  }

  const rows = allData[table] ?? []

  const mockQuery = {
    select(columns?: string) {
      let filtered = rows
      const query: any = {
        eq(field: string, value: any) {
          filtered = filtered.filter((r: any) => r[field] === value)
          return query
        },
        neq(field: string, value: any) {
          filtered = filtered.filter((r: any) => r[field] !== value)
          return query
        },
        in(field: string, values: any[]) {
          filtered = filtered.filter((r: any) => values.includes(r[field]))
          return query
        },
        order(field: string, opts?: { ascending?: boolean }) {
          filtered = [...filtered].sort((a: any, b: any) => {
            const valA = a[field] ?? ''
            const valB = b[field] ?? ''
            const cmp = typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB
            return opts?.ascending === false ? -cmp : cmp
          })
          return query
        },
        limit(n: number) {
          filtered = filtered.slice(0, n)
          return query
        },
        range(from: number, to: number) {
          filtered = filtered.slice(from, to + 1)
          return query
        },
        single() {
          return { data: filtered[0] ?? null, error: filtered.length === 0 ? { message: 'Not found' } : null }
        },
        then(resolve?: any) {
          const result = { data: filtered, error: null, count: filtered.length }
          return resolve ? Promise.resolve(resolve(result)) : Promise.resolve(result)
        },
      }
      return query
    },
    insert(values: any) {
      return { data: values, error: null, select() { return this }, single() { return { data: values, error: null } } }
    },
    update(values: any) {
      return { data: null, error: null, eq() { return this }, select() { return this }, single() { return { data: values, error: null } } }
    },
    delete() {
      return { eq() { return this } }
    },
  }

  return mockQuery
}

export function createMockServerClient() {
  return {
    from: mockFrom,
    auth: {
      getUser: async () => ({ data: { user: { id: 'mock-user-1', email: 'admin@vaquejada.com', app_metadata: { role: 'organizador', tenant_id: 'mock-tenant-1' }, user_metadata: {} } }, error: null }),
      getSession: async () => ({ data: { session: { access_token: 'mock-token', user: { id: 'mock-user-1' } } }, error: null }),
      signInWithPassword: async () => ({ data: { user: { id: 'mock-user-1' } }, error: null }),
      signOut: async () => ({ error: null }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: 'mock/path' }, error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: '/mock/file.pdf' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '/mock/file.pdf' } }),
      }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => {},
    }),
    removeChannel: () => {},
  }
}