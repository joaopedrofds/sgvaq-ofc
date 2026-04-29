import { z } from 'zod/v4'

export const competidorSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
  whatsapp: z.string().regex(/^\d{10,11}$/, 'WhatsApp deve ter 10 ou 11 dígitos').optional().or(z.literal('')),
  cidade: z.string().optional().or(z.literal('')),
  estado: z.string().length(2, 'UF deve ter 2 letras').optional().or(z.literal('')),
})

export type CompetidorFormData = z.infer<typeof competidorSchema>