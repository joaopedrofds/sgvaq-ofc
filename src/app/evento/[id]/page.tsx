export default async function EventoPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <div className="p-8 text-gray-500">Evento {id} — Em construção</div>
}
