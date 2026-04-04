import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendWhatsAppMessage } from './whatsapp-client.ts'
import { isRetryable, getRetryDelayMs } from './retry-schedule.ts'

const BATCH_SIZE = 20

interface Notificacao {
  id: string
  tenant_id: string
  destinatario_telefone: string
  mensagem: string
  tentativas: number
  proximo_retry_em: string | null
  idempotency_key: string
}

Deno.serve(async (req: Request) => {
  // Verify invocation secret to prevent unauthorized calls
  const authHeader = req.headers.get('Authorization')
  const expectedSecret = Deno.env.get('NOTIFICATIONS_SECRET')
  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const apiUrl = Deno.env.get('WHATSAPP_API_URL')!
  const apiKey = Deno.env.get('WHATSAPP_API_KEY')!

  const now = new Date().toISOString()

  // Fetch pending notifications that are ready to process
  const { data: notifications, error } = await supabase
    .from('notificacoes_fila')
    .select('*')
    .in('status', ['pendente', 'retry'])
    .or(`proximo_retry_em.is.null,proximo_retry_em.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    console.error('Failed to fetch notifications:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const results = { processed: 0, failed: 0, dead_letter: 0 }

  for (const notif of (notifications ?? []) as Notificacao[]) {
    // Mark as processing (optimistic lock via status update)
    const { error: lockError } = await supabase
      .from('notificacoes_fila')
      .update({ status: 'processando', tentativas: notif.tentativas + 1, updated_at: now })
      .eq('id', notif.id)
      .eq('status', notif.status) // Only update if still in expected state

    if (lockError) {
      console.warn(`Skipping ${notif.id} — lock failed`)
      continue
    }

    const result = await sendWhatsAppMessage(
      notif.destinatario_telefone,
      notif.mensagem,
      apiUrl,
      apiKey
    )

    if (result.success) {
      await supabase
        .from('notificacoes_fila')
        .update({ status: 'enviado', enviado_em: now, updated_at: now })
        .eq('id', notif.id)
      results.processed++
    } else {
      const novasTentativas = notif.tentativas + 1
      if (isRetryable(novasTentativas)) {
        const delayMs = getRetryDelayMs(novasTentativas)
        const proximoRetry = new Date(Date.now() + delayMs).toISOString()
        await supabase
          .from('notificacoes_fila')
          .update({
            status: 'retry',
            proximo_retry_em: proximoRetry,
            erro: result.error,
            updated_at: now
          })
          .eq('id', notif.id)
        results.failed++
      } else {
        await supabase
          .from('notificacoes_fila')
          .update({ status: 'falhou', erro: result.error, updated_at: now })
          .eq('id', notif.id)
        results.dead_letter++
        console.error(`Dead letter: notification ${notif.id} failed after max retries`, result.error)
      }
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  })
})
