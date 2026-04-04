import { EventoForm } from '@/components/eventos/evento-form'

export default function NovoEventoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Evento</h1>
      <EventoForm />
    </div>
  )
}
