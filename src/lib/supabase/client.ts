import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MOCK === 'true') {
    return createMockBrowserClient() as any
  }
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function createMockBrowserClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'mock-token', user: { id: 'mock-user-1', email: 'admin@vaquejada.com' } } }, error: null }),
      signInWithPassword: async () => ({ data: { user: { id: 'mock-user-1' }, session: { access_token: 'mock-token' } }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: null }), order: () => ({ then: (cb: any) => Promise.resolve(cb({ data: [], error: null })) }) }),
        in: () => ({ order: () => ({ then: (cb: any) => Promise.resolve(cb({ data: [], error: null })) }) }),
        order: () => ({ limit: () => ({ then: (cb: any) => Promise.resolve(cb({ data: [], error: null })) }), then: (cb: any) => Promise.resolve(cb({ data: [], error: null })) }),
      }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
      delete: () => ({ eq: () => ({}) }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => {},
    }),
    removeChannel: () => {},
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: '/mock/file.pdf' }, error: null }),
      }),
    },
  }
}