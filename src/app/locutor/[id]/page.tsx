export default async function LocutorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <div className="min-h-screen bg-black text-white p-8">Telão {id} — Em construção</div>
}
