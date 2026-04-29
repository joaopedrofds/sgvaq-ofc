'use client'

import { useState } from 'react'
import { Search, Phone, MapPin } from 'lucide-react'
import type { MockCompetidor } from '@/lib/mock/data'

interface Props {
  competidores: MockCompetidor[]
}

export function CompetidorList({ competidores }: Props) {
  const [busca, setBusca] = useState('')

  const filtrados = competidores.filter(c => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (
      c.nome.toLowerCase().includes(q) ||
      c.cpf.includes(q)
    )
  })

  return (
    <>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou CPF..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          {busca ? 'Nenhum competidor encontrado para esta busca.' : 'Nenhum competidor cadastrado.'}
        </p>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">CPF</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">WhatsApp</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cidade/UF</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">LGPD</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                  </td>
                  <td className="px-4 py-3">
                    {c.whatsapp ? (
                      <span className="flex items-center gap-1 text-gray-600">
                        <Phone className="h-3 w-3" />
                        {c.whatsapp}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.cidade ? (
                      <span className="flex items-center gap-1 text-gray-600">
                        <MapPin className="h-3 w-3" />
                        {c.cidade}/{c.estado}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.lgpd_aceite_em ? (
                      <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full">Aceito</span>
                    ) : (
                      <span className="text-yellow-600 text-xs bg-yellow-50 px-2 py-1 rounded-full">Pendente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}