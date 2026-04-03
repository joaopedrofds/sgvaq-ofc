import { getSession } from '@/lib/auth/get-session'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import type { UserRole } from '@/types'

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'super_admin') redirect('/admin/dashboard')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={session.role as UserRole} />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
