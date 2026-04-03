'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { modalidadeSchema, createModalidade } from '@/actions/modalidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type FormData = z.infer<typeof modalidadeSchema>

export function ModalidadeForm({ eventoId, tipoProva }: { eventoId: string; tipoProva: 'vaquejada' | 'tambor' }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(modalidadeSchema),
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(data: FormData) {
    setLoading(true)
    const result = await createModalidade(eventoId, {
      ...data,
      valor_senha: Math.round(data.valor_senha * 100),
    })
    if ('error' in result) { setServerError(result.error); setLoading(false); return }
    reset()
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Nome da modalidade</Label>
        <Input {...register('nome')} placeholder="Ex: Aberto, Amador, Mirim" />
        {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Valor da senha (R$)</Label>
          <Input type="number" step="0.01" min="0" {...register('valor_senha', { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Total de senhas</Label>
          <Input type="number" min="1" {...register('total_senhas', { valueAsNumber: true })} />
          {errors.total_senhas && <p className="text-xs text-red-500">{errors.total_senhas.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label>Premiação (opcional)</Label>
        <Input {...register('premiacao_descricao')} placeholder="Ex: 1º lugar: R$ 5.000" />
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={loading} className="bg-amber-700 hover:bg-amber-800">
        {loading ? 'Salvando...' : 'Adicionar modalidade'}
      </Button>
    </form>
  )
}
