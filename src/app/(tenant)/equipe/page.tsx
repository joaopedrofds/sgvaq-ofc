import { getEquipe } from '@/actions/equipe'
import { ConviteForm } from '@/components/equipe/convite-form'
import { Badge } from '@/components/ui/badge'

const roleLabels: Record<string, string> = {
  organizador: 'Organizador',
  financeiro: 'Financeiro',
  juiz: 'Juiz',
  locutor: 'Locutor',
}

export default async function EquipePage() {
  const result = await getEquipe()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Equipe</h1>
      <div className="space-y-3">
        {result.data?.map(u => (
          <div key={u.id} className="flex items-center justify-between bg-white border rounded-lg p-4">
            <div>
              <p className="font-medium">{u.nome}</p>
              <p className="text-sm text-gray-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{roleLabels[u.role] ?? u.role}</Badge>
              {!u.ativo && <Badge variant="destructive">Inativo</Badge>}
            </div>
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-4">Convidar membro</h2>
        <ConviteForm />
      </div>
    </div>
  )
}
