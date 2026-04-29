import { z } from 'zod'

export const vendaSchema = z.object({
  modalidade_id: z.string().uuid(),
  competidor_cpf: z.string().min(11, 'CPF inválido'),
  canal: z.enum(['presencial', 'online']),
})