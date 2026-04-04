import { z } from 'zod'
import type { EventoStatus } from '@/types'

export const eventoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  tipo: z.enum(['vaquejada', 'tambor']),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  local: z.string().optional(),
  cidade: z.string().min(2, 'Cidade obrigatória'),
  estado: z.string().length(2, 'UF deve ter 2 caracteres'),
}).refine(d => d.data_fim >= d.data_inicio, {
  message: 'data_fim deve ser igual ou posterior a data_inicio',
  path: ['data_fim'],
})

const VALID_TRANSITIONS: Record<EventoStatus, EventoStatus[]> = {
  rascunho: ['aberto'],
  aberto: ['em_andamento'],
  em_andamento: ['encerrado'],
  encerrado: [],
}

export function validateEventoTransition(from: EventoStatus, to: EventoStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}
