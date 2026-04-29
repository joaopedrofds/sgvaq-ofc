'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { eventoSchema } from '@/lib/eventos/schema'
import { createEvento, updateEvento } from '@/actions/eventos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type FormData = z.infer<typeof eventoSchema>

interface EventoFormProps {
  eventoId?: string
  defaultValues?: Partial<FormData>
}

export function EventoForm({ eventoId, defaultValues }: EventoFormProps) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(eventoSchema),
    defaultValues,
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(data: FormData) {
    setLoading(true)
    setServerError(null)
    const result = eventoId
      ? await updateEvento(eventoId, data)
      : await createEvento(data)

    if ('error' in result) {
      setServerError(result.error)
      setLoading(false)
      return
    }
    router.push('/eventos')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label>Nome do evento</Label>
        <Input {...register('nome')} />
        {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
      </div>

      <div className="space-y-1">
        <Label>Tipo</Label>
        <Select onValueChange={v => setValue('tipo', v as 'vaquejada' | 'tambor')}
          defaultValue={defaultValues?.tipo}>
          <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vaquejada">Vaquejada</SelectItem>
            <SelectItem value="tambor">Prova de Tambor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Data início</Label>
          <Input type="date" {...register('data_inicio')} />
        </div>
        <div className="space-y-1">
          <Label>Data fim</Label>
          <Input type="date" {...register('data_fim')} />
          {errors.data_fim && <p className="text-xs text-red-500">{errors.data_fim.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Cidade</Label>
          <Input {...register('cidade')} />
        </div>
        <div className="space-y-1">
          <Label>Estado (UF)</Label>
          <Input {...register('estado')} maxLength={2} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Local (opcional)</Label>
        <Input {...register('local')} />
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button type="submit" disabled={loading} className="bg-amber-700 hover:bg-amber-800">
        {loading ? 'Salvando...' : eventoId ? 'Salvar alterações' : 'Criar evento'}
      </Button>
    </form>
  )
}
