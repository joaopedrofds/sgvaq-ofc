import { z } from 'zod'

export const modalidadeSchema = z.object({
  nome: z.string().min(2),
  valor_senha: z.number().int().min(0),
  total_senhas: z.number().int().min(1, 'Deve ter ao menos 1 senha'),
  premiacao_descricao: z.string().optional(),
})