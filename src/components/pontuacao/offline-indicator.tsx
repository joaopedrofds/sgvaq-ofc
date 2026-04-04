'use client'
import { useEffect, useState } from 'react'
import { getQueueSize } from '@/lib/offline/queue'
import { syncQueue } from '@/lib/offline/sync'
import { createClient } from '@/lib/supabase/client'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [queueSize, setQueueSize] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    update()
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  useEffect(() => {
    const interval = setInterval(async () => {
      setQueueSize(await getQueueSize())
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isOnline && queueSize > 0 && !syncing) handleSync()
  }, [isOnline, queueSize])

  async function handleSync() {
    setSyncing(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await syncQueue(session.access_token)
    setQueueSize(await getQueueSize())
    setSyncing(false)
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
      isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      {isOnline ? 'Online' : 'Offline'}
      {queueSize > 0 && (
        <span className="bg-amber-500 text-white rounded-full px-1.5 text-xs">
          {queueSize}
        </span>
      )}
      {syncing && <RefreshCw className="h-4 w-4 animate-spin" />}
    </div>
  )
}
