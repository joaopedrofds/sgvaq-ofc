'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRankingRealtime(modalidadeId: string) {
  const [ranking, setRanking] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()

    // Carga inicial
    supabase
      .from('ranking')
      .select('*, competidores(nome), senhas(numero_senha)')
      .eq('modalidade_id', modalidadeId)
      .order('posicao')
      .then(({ data }) => { if (data) setRanking(data) })

    // Subscribe para atualizações
    const channel = supabase
      .channel(`ranking:${modalidadeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ranking',
        filter: `modalidade_id=eq.${modalidadeId}`,
      }, () => {
        // Re-fetch ao receber qualquer mudança
        supabase
          .from('ranking')
          .select('*, competidores(nome), senhas(numero_senha)')
          .eq('modalidade_id', modalidadeId)
          .order('posicao')
          .then(({ data }) => { if (data) setRanking(data) })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [modalidadeId])

  return ranking
}

export function useFilaRealtime(modalidadeId: string) {
  const [fila, setFila] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('fila_entrada')
      .select('*, senhas(numero_senha, competidores(nome))')
      .eq('modalidade_id', modalidadeId)
      .in('status', ['aguardando', 'chamado'])
      .order('ordem_atual')
      .limit(10)
      .then(({ data }) => { if (data) setFila(data) })

    const channel = supabase
      .channel(`fila:${modalidadeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fila_entrada',
        filter: `modalidade_id=eq.${modalidadeId}`,
      }, () => {
        supabase
          .from('fila_entrada')
          .select('*, senhas(numero_senha, competidores(nome))')
          .eq('modalidade_id', modalidadeId)
          .in('status', ['aguardando', 'chamado'])
          .order('ordem_atual')
          .limit(10)
          .then(({ data }) => { if (data) setFila(data) })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [modalidadeId])

  return fila
}
