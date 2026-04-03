import { getSession } from '@/lib/auth/get-session'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') redirect('/login')
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white min-h-screen p-6">
        <h1 className="text-xl font-bold mb-8">SGVAQ Admin</h1>
        <nav className="space-y-2">
          {[
            ['Dashboard', '/admin/dashboard'],
            ['Tenants', '/admin/tenants'],
            ['Cobranças', '/admin/cobrancas'],
            ['Critérios', '/admin/configuracoes/criterios'],
          ].map(([label, href]) => (
            <a key={href} href={href} className="block px-3 py-2 rounded text-gray-300 hover:bg-gray-800 hover:text-white text-sm">
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
