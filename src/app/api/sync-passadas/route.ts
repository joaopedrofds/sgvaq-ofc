import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  // Validar JWT
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await request.json()

  // Validar que juiz_id bate com o usuário autenticado
  const admin = createAdminClient()
  const { data: tenantUser } = await admin
    .from('tenant_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!tenantUser || tenantUser.role !== 'juiz') {
    return NextResponse.json({ error: 'Apenas juízes podem sincronizar passadas' }, { status: 403 })
  }

  if (payload.juiz_id !== tenantUser.id) {
    return NextResponse.json({ error: 'juiz_id não bate com usuário autenticado' }, { status: 403 })
  }

  // Tentar inserir (idempotente via uuid_local UNIQUE)
  const { error } = await admin.from('passadas').insert({
    uuid_local: payload.uuid_local,
    senha_id: payload.senha_id,
    modalidade_id: payload.modalidade_id,
    numero_passada: payload.numero_passada,
    juiz_id: payload.juiz_id,
    pontuacao_total: payload.pontuacao_total,
    detalhes_json: payload.detalhes_json,
    penalidade: payload.penalidade,
    penalidade_motivo: payload.penalidade_motivo,
    created_at_local: payload.created_at_local,
    sincronizado: false,
    origem: 'offline',
  })

  if (error) {
    // uuid_local duplicado = já sincronizado
    if (error.code === '23505') return NextResponse.json({ status: 'already_synced' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 422 })
  }

  // Marcar como sincronizado
  await admin.from('passadas').update({ sincronizado: true }).eq('uuid_local', payload.uuid_local)

  return NextResponse.json({ status: 'synced' })
}
