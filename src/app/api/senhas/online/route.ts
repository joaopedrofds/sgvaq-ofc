import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { cpf, nome, whatsapp, modalidade_id } = await request.json()
  if (!cpf || !nome || !modalidade_id) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const cpfClean = cpf.replace(/\D/g, '')

  // Upsert competidor
  let { data: competidor } = await supabase
    .from('competidores')
    .select('id')
    .eq('cpf', cpfClean)
    .single()

  if (!competidor) {
    const { data, error } = await supabase
      .from('competidores')
      .insert({ cpf: cpfClean, nome, whatsapp: whatsapp?.replace(/\D/g, '') })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 422 })
    competidor = data
  }

  // Verificar estoque
  const { data: modalidade } = await supabase
    .from('modalidades')
    .select('total_senhas, senhas_vendidas, valor_senha')
    .eq('id', modalidade_id)
    .single()

  if (!modalidade) return NextResponse.json({ error: 'Modalidade não encontrada' }, { status: 404 })
  if (modalidade.senhas_vendidas >= modalidade.total_senhas) {
    return NextResponse.json({ error: 'Estoque esgotado' }, { status: 422 })
  }

  // Próximo número
  const { data: ultima } = await supabase
    .from('senhas')
    .select('numero_senha')
    .eq('modalidade_id', modalidade_id)
    .order('numero_senha', { ascending: false })
    .limit(1)
    .single()

  const { data: senha, error } = await supabase
    .from('senhas')
    .insert({
      modalidade_id,
      competidor_id: competidor!.id,
      numero_senha: (ultima?.numero_senha ?? 0) + 1,
      canal: 'online',
      status: 'pendente',
      valor_pago: modalidade.valor_senha,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 422 })

  return NextResponse.json({ senha_id: senha.id })
}
