'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'
import {
  LayoutDashboard, Calendar, Ticket, Users, UserCheck,
  DollarSign, AlertTriangle
} from 'lucide-react'

const navItems: Record<string, { href: string; icon: React.ElementType; label: string }[]> = {
  organizador: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/eventos', icon: Calendar, label: 'Eventos' },
    { href: '/competidores', icon: Users, label: 'Competidores' },
    { href: '/equipe', icon: UserCheck, label: 'Equipe' },
    { href: '/conflitos', icon: AlertTriangle, label: 'Conflitos' },
  ],
  financeiro: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/financeiro', icon: DollarSign, label: 'Caixa' },
    { href: '/eventos', icon: Calendar, label: 'Eventos' },
  ],
  juiz: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ],
  locutor: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ],
}

interface SidebarProps {
  role: UserRole
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const items = navItems[role] ?? navItems.organizador

  return (
    <aside className="w-64 bg-amber-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-amber-800">
        <h1 className="text-xl font-bold">SGVAQ</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {items.map(item => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-amber-700 text-white'
                  : 'text-amber-200 hover:bg-amber-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
