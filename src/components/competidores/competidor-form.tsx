'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { competidorSchema, type CompetidorFormData } from '@/lib/competidores/schema'
import { createCompetidor } from '@/actions/competidores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CompetidorForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CompetidorFormData>({
    resolver: zodResolver(competidorSchema),
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(data: CompetidorFormData) {
    setLoading(true)
    setServerError(null)

    const formData = new FormData()
    formData.set('nome', data.nome)
    formData.set('cpf', data.cpf)
    if (data.whatsapp) formData.set('whatsapp', data.whatsapp)
    if (data.cidade) formData.set('cidade', data.cidade)
    if (data.estado) formData.set('estado', data.estado)

    const result = await createCompetidor(formData)
    if ('error' in result) {
      setServerError(result.error)
      setLoading(false)
      return
    }
    router.push('/competidores')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label>Nome completo</Label>
        <Input {...register('nome')} placeholder="Nome do competidor" />
        {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
      </div>

      <div className="space-y-1">
        <Label>CPF (somente números)</Label>
        <Input {...register('cpf')} placeholder="00000000000" maxLength={11} />
        {errors.cpf && <p className="text-xs text-red-500">{errors.cpf.message}</p>}
      </div>

      <div className="space-y-1">
        <Label>WhatsApp (opcional)</Label>
        <Input {...register('whatsapp')} placeholder="88990000000" maxLength={11} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Cidade (opcional)</Label>
          <Input {...register('cidade')} placeholder="Cidade" />
        </div>
        <div className="space-y-1">
          <Label>UF (opcional)</Label>
          <Input {...register('estado')} placeholder="CE" maxLength={2} />
        </div>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button type="submit" disabled={loading} className="bg-amber-700 hover:bg-amber-800">
        {loading ? 'Salvando...' : 'Cadastrar competidor'}
      </Button>
    </form>
  )
}