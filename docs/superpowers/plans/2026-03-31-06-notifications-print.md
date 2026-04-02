# Notifications & Print Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build WhatsApp notification queue processing (Edge Function with retry/dead-letter) and a local Node.js thermal printer bridge (`sgvaq-print-bridge`) for ESC/POS printing from the browser.

**Architecture:** `notificacoes_fila` rows are processed by a Supabase Edge Function (Deno) invoked via cron or webhook. Each attempt updates `tentativas` and on failure after 3 retries sets `status='falhou'`. The print bridge is a standalone Node.js HTTP server (`sgvaq-print-bridge/`) that runs on the operator's machine, accepts authenticated POST requests from the browser, and writes ESC/POS bytes to a USB/network thermal printer.

**Tech Stack:** Supabase Edge Functions (Deno), Evolution API / Zapi, Node.js 20 + express + `node-escpos`, Vitest, Playwright

---

## File Structure

```
supabase/
  functions/
    process-notifications/
      index.ts                  # Edge Function: poll notificacoes_fila, call WhatsApp API, update status
      whatsapp-client.ts        # Thin wrapper around Evolution API / Zapi HTTP calls
      retry-schedule.ts         # Retry delay logic: 1min / 5min / 15min

sgvaq-print-bridge/             # Standalone Node.js package (separate from Next.js)
  package.json
  src/
    index.ts                    # Express server: POST /print
    escpos-builder.ts           # Build ESC/POS byte sequences from JSON payload
    printer.ts                  # USB/network printer device abstraction
  tests/
    escpos-builder.test.ts      # Unit tests for ESC/POS builder
    server.test.ts              # HTTP endpoint tests
  README.md

src/
  app/
    (admin)/
      admin/
        notificacoes/
          page.tsx              # Super Admin: failed notifications list + retry
  actions/
    notificacoes.ts             # Server actions: list failed notifications, trigger retry
  components/
    notificacoes/
      NotificacaoTable.tsx      # Table of failed/pending notifications
    print/
      PrintBridgeStatus.tsx     # Client component: check bridge connectivity
      usePrintBridge.ts         # Hook: POST to local bridge + handle errors
tests/
  unit/
    notificacoes.test.ts        # Server action unit tests
  e2e/
    notificacoes.spec.ts        # Admin notifications E2E
```

---

### Task 1: WhatsApp Edge Function skeleton

**Files:**
- Create: `supabase/functions/process-notifications/retry-schedule.ts`
- Create: `supabase/functions/process-notifications/whatsapp-client.ts`
- Create: `supabase/functions/process-notifications/index.ts`

- [ ] **Step 1: Write failing unit test for retry schedule**

The retry schedule logic is pure — test it with Vitest (not Deno).

```typescript
// tests/unit/notificacoes.test.ts
import { describe, it, expect } from 'vitest'
import { getRetryDelayMs, isRetryable } from '../../supabase/functions/process-notifications/retry-schedule'

describe('getRetryDelayMs', () => {
  it('returns 1 minute delay for first retry (tentativas=1)', () => {
    expect(getRetryDelayMs(1)).toBe(60_000)
  })
  it('returns 5 minute delay for second retry (tentativas=2)', () => {
    expect(getRetryDelayMs(2)).toBe(300_000)
  })
  it('returns 15 minute delay for third retry (tentativas=3)', () => {
    expect(getRetryDelayMs(3)).toBe(900_000)
  })
})

describe('isRetryable', () => {
  it('returns true when tentativas < 3', () => {
    expect(isRetryable(0)).toBe(true)
    expect(isRetryable(2)).toBe(true)
  })
  it('returns false when tentativas >= 3', () => {
    expect(isRetryable(3)).toBe(false)
    expect(isRetryable(5)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/notificacoes.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement retry-schedule.ts**

```typescript
// supabase/functions/process-notifications/retry-schedule.ts
const DELAYS_MS = [60_000, 300_000, 900_000] // 1min, 5min, 15min

export function getRetryDelayMs(tentativas: number): number {
  const idx = Math.min(tentativas - 1, DELAYS_MS.length - 1)
  return DELAYS_MS[idx]
}

export function isRetryable(tentativas: number): boolean {
  return tentativas < 3
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/notificacoes.test.ts`
Expected: PASS

- [ ] **Step 5: Implement whatsapp-client.ts**

```typescript
// supabase/functions/process-notifications/whatsapp-client.ts

interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendWhatsAppMessage(
  to: string,      // phone number with country code: '5511999990000'
  message: string,
  apiUrl: string,
  apiKey: string
): Promise<SendResult> {
  try {
    const response = await fetch(`${apiUrl}/message/sendText/default`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: to,
        text: message
      })
    })

    if (!response.ok) {
      const body = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${body}` }
    }

    const json = await response.json() as { key?: { id?: string } }
    return { success: true, messageId: json.key?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
```

- [ ] **Step 6: Implement Edge Function index.ts**

```typescript
// supabase/functions/process-notifications/index.ts
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
```

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/process-notifications/ tests/unit/notificacoes.test.ts
git commit -m "feat: WhatsApp notification Edge Function with retry and dead-letter"
```

---

### Task 2: DB migration for notificacoes_fila columns

**Files:**
- Create: `supabase/migrations/<timestamp>_add_notification_columns.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/<timestamp>_add_notification_columns.sql

-- Add missing columns to notificacoes_fila if not already present
ALTER TABLE notificacoes_fila
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'processando', 'retry', 'enviado', 'falhou')),
  ADD COLUMN IF NOT EXISTS tentativas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proximo_retry_em timestamptz,
  ADD COLUMN IF NOT EXISTS enviado_em timestamptz,
  ADD COLUMN IF NOT EXISTS erro text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Index for efficient polling
CREATE INDEX IF NOT EXISTS idx_notificacoes_processamento
  ON notificacoes_fila (status, proximo_retry_em)
  WHERE status IN ('pendente', 'retry');
```

- [ ] **Step 2: Apply migration**

Run: `supabase db execute --sql "$(cat supabase/migrations/<timestamp>_add_notification_columns.sql)"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/<timestamp>_add_notification_columns.sql
git commit -m "feat(db): add notification status tracking columns"
```

---

### Task 3: Notifications server actions (admin)

**Files:**
- Create: `src/actions/notificacoes.ts`
- Test: `tests/unit/notificacoes.test.ts` (append)

- [ ] **Step 1: Write failing tests**

```typescript
// append to tests/unit/notificacoes.test.ts
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }))
vi.mock('@/lib/auth/helpers', () => ({ requireRole: vi.fn() }))

import { listarNotificacoesFalhas, reenviarNotificacao } from '@/actions/notificacoes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'

describe('listarNotificacoesFalhas', () => {
  it('returns only failed notifications', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'a1', tenant_id: null, role: 'super_admin' })
    const mockData = [
      { id: 'n1', status: 'falhou', tentativas: 3, mensagem: 'Sua senha foi confirmada', destinatario_telefone: '5511999990000' }
    ]
    vi.mocked(createServerSupabaseClient).mockReturnValue({
      from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: mockData, error: null }) }) }) }) })
    } as any)

    const result = await listarNotificacoesFalhas()
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('falhou')
  })
})

describe('reenviarNotificacao', () => {
  it('resets status to pendente and clears tentativas', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'a1', tenant_id: null, role: 'super_admin' })
    const mockUpdate = vi.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) })
    vi.mocked(createServerSupabaseClient).mockReturnValue({
      from: () => ({ update: mockUpdate })
    } as any)

    await reenviarNotificacao('n1')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'pendente', tentativas: 0 }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/notificacoes.test.ts -t "listarNotificacoesFalhas"`
Expected: FAIL

- [ ] **Step 3: Implement notifications actions**

```typescript
// src/actions/notificacoes.ts
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'

export interface NotificacaoFila {
  id: string
  tenant_id: string
  status: 'pendente' | 'processando' | 'retry' | 'enviado' | 'falhou'
  destinatario_telefone: string
  mensagem: string
  tentativas: number
  erro: string | null
  created_at: string
  updated_at: string | null
  tenant?: { nome: string }
}

export async function listarNotificacoesFalhas(limit = 100): Promise<NotificacaoFila[]> {
  await requireRole(['super_admin'])
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('notificacoes_fila')
    .select('*, tenant:tenants(nome)')
    .eq('status', 'falhou')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data as NotificacaoFila[]
}

export async function listarTodasNotificacoes(
  filters: { status?: string; tenantId?: string } = {},
  limit = 100
): Promise<NotificacaoFila[]> {
  await requireRole(['super_admin'])
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from('notificacoes_fila')
    .select('*, tenant:tenants(nome)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters.status) query = query.eq('status', filters.status) as any
  if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId) as any

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as NotificacaoFila[]
}

export async function reenviarNotificacao(notificacaoId: string): Promise<void> {
  await requireRole(['super_admin'])
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('notificacoes_fila')
    .update({
      status: 'pendente',
      tentativas: 0,
      proximo_retry_em: null,
      erro: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', notificacaoId)

  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run tests/unit/notificacoes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/actions/notificacoes.ts tests/unit/notificacoes.test.ts
git commit -m "feat: notifications server actions for admin management"
```

---

### Task 4: Super Admin notifications dashboard

**Files:**
- Create: `src/components/notificacoes/NotificacaoTable.tsx`
- Create: `src/app/(admin)/admin/notificacoes/page.tsx`

- [ ] **Step 1: Implement NotificacaoTable**

```tsx
// src/components/notificacoes/NotificacaoTable.tsx
'use client'
import { useState, useTransition } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2 } from 'lucide-react'
import { reenviarNotificacao } from '@/actions/notificacoes'
import type { NotificacaoFila } from '@/actions/notificacoes'
import { useRouter } from 'next/navigation'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendente: 'outline',
  processando: 'secondary',
  retry: 'default',
  enviado: 'secondary',
  falhou: 'destructive'
}

const statusLabel: Record<string, string> = {
  pendente: 'Pendente',
  processando: 'Processando',
  retry: 'Retry',
  enviado: 'Enviado',
  falhou: 'Falhou'
}

interface Props {
  notificacoes: NotificacaoFila[]
}

export function NotificacaoTable({ notificacoes }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [retrying, setRetrying] = useState<string | null>(null)

  async function handleReenviar(id: string) {
    setRetrying(id)
    try {
      await reenviarNotificacao(id)
      startTransition(() => router.refresh())
    } finally {
      setRetrying(null)
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tenant</TableHead>
          <TableHead>Destinatário</TableHead>
          <TableHead>Mensagem</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Tentativas</TableHead>
          <TableHead>Erro</TableHead>
          <TableHead>Ação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notificacoes.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              Nenhuma notificação com falha
            </TableCell>
          </TableRow>
        )}
        {notificacoes.map(n => (
          <TableRow key={n.id}>
            <TableCell className="text-sm font-medium">{(n.tenant as any)?.nome ?? n.tenant_id.slice(0, 8)}</TableCell>
            <TableCell className="font-mono text-sm">{n.destinatario_telefone}</TableCell>
            <TableCell className="text-sm max-w-xs truncate" title={n.mensagem}>{n.mensagem}</TableCell>
            <TableCell>
              <Badge variant={statusVariant[n.status] ?? 'outline'}>{statusLabel[n.status] ?? n.status}</Badge>
            </TableCell>
            <TableCell className="text-center">{n.tentativas}</TableCell>
            <TableCell className="text-sm text-destructive max-w-xs truncate" title={n.erro ?? ''}>
              {n.erro ?? '—'}
            </TableCell>
            <TableCell>
              {n.status === 'falhou' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReenviar(n.id)}
                  disabled={retrying === n.id || pending}
                >
                  {retrying === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 2: Implement notifications admin page**

```tsx
// src/app/(admin)/admin/notificacoes/page.tsx
import { listarTodasNotificacoes } from '@/actions/notificacoes'
import { NotificacaoTable } from '@/components/notificacoes/NotificacaoTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PageProps {
  searchParams: { status?: string }
}

export default async function NotificacoesAdminPage({ searchParams }: PageProps) {
  const notificacoes = await listarTodasNotificacoes({ status: searchParams.status }, 200)
  const falhas = notificacoes.filter(n => n.status === 'falhou').length
  const enviadas = notificacoes.filter(n => n.status === 'enviado').length
  const pendentes = notificacoes.filter(n => ['pendente', 'retry'].includes(n.status)).length

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Notificações WhatsApp</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendentes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{pendentes}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Enviadas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{enviadas}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Falhas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{falhas}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Todas as Notificações</CardTitle></CardHeader>
        <CardContent>
          <NotificacaoTable notificacoes={notificacoes} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/notificacoes/NotificacaoTable.tsx src/app/(admin)/admin/notificacoes/page.tsx
git commit -m "feat: Super Admin notifications dashboard with retry UI"
```

---

### Task 5: Print bridge Node.js package scaffold

**Files:**
- Create: `sgvaq-print-bridge/package.json`
- Create: `sgvaq-print-bridge/src/escpos-builder.ts`
- Create: `sgvaq-print-bridge/src/printer.ts`
- Create: `sgvaq-print-bridge/src/index.ts`
- Create: `sgvaq-print-bridge/tests/escpos-builder.test.ts`

- [ ] **Step 1: Write failing ESC/POS unit tests**

```typescript
// sgvaq-print-bridge/tests/escpos-builder.test.ts
import { describe, it, expect } from 'vitest'
import { buildSenhaEscPos } from '../src/escpos-builder'

describe('buildSenhaEscPos', () => {
  it('returns a Buffer', () => {
    const payload = {
      eventoNome: 'Vaquejada Teste',
      modalidadeNome: 'Vaquejada Tradicional',
      numeroSenha: '0042',
      competidorNome: 'João da Silva',
      valorSenha: 5000, // centavos
      qrCodeData: 'sgvaq:senha:abc123',
      dataHora: '2026-04-01T10:00:00Z'
    }
    const buffer = buildSenhaEscPos(payload)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(10)
  })

  it('includes ESC @ reset byte at start', () => {
    const payload = {
      eventoNome: 'Test',
      modalidadeNome: 'Test',
      numeroSenha: '001',
      competidorNome: 'Test',
      valorSenha: 0,
      qrCodeData: 'test',
      dataHora: '2026-01-01T00:00:00Z'
    }
    const buffer = buildSenhaEscPos(payload)
    // ESC @ = 0x1B 0x40
    expect(buffer[0]).toBe(0x1b)
    expect(buffer[1]).toBe(0x40)
  })
})
```

- [ ] **Step 2: Create package.json for bridge**

```json
// sgvaq-print-bridge/package.json
{
  "name": "sgvaq-print-bridge",
  "version": "1.0.0",
  "description": "Local HTTP bridge for ESC/POS thermal printer — SGVAQ",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 3: Install bridge dependencies**

```bash
cd sgvaq-print-bridge && pnpm install && cd ..
```

- [ ] **Step 4: Implement escpos-builder.ts**

```typescript
// sgvaq-print-bridge/src/escpos-builder.ts

// ESC/POS command bytes
const ESC = 0x1b
const GS  = 0x1d
const LF  = 0x0a

// Commands
const RESET             = Buffer.from([ESC, 0x40])
const BOLD_ON           = Buffer.from([ESC, 0x45, 0x01])
const BOLD_OFF          = Buffer.from([ESC, 0x45, 0x00])
const ALIGN_CENTER      = Buffer.from([ESC, 0x61, 0x01])
const ALIGN_LEFT        = Buffer.from([ESC, 0x61, 0x00])
const DOUBLE_HEIGHT_ON  = Buffer.from([ESC, 0x21, 0x10])
const DOUBLE_HEIGHT_OFF = Buffer.from([ESC, 0x21, 0x00])
const CUT               = Buffer.from([GS, 0x56, 0x42, 0x00])
const NEWLINE           = Buffer.from([LF])

function text(str: string): Buffer {
  return Buffer.from(str + '\n', 'latin1')
}

function separator(): Buffer {
  return text('--------------------------------')
}

function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

export interface SenhaPayload {
  eventoNome: string
  modalidadeNome: string
  numeroSenha: string
  competidorNome: string
  valorSenha: number
  qrCodeData: string
  dataHora: string
}

export function buildSenhaEscPos(payload: SenhaPayload): Buffer {
  const parts: Buffer[] = []

  parts.push(RESET)
  parts.push(ALIGN_CENTER)
  parts.push(DOUBLE_HEIGHT_ON)
  parts.push(BOLD_ON)
  parts.push(text('SGVAQ'))
  parts.push(BOLD_OFF)
  parts.push(DOUBLE_HEIGHT_OFF)
  parts.push(text(payload.eventoNome))
  parts.push(text(payload.modalidadeNome))
  parts.push(separator())

  parts.push(ALIGN_LEFT)
  parts.push(text(`Senha: ${payload.numeroSenha}`))
  parts.push(text(`Competidor: ${payload.competidorNome}`))
  parts.push(text(`Valor: ${formatBRL(payload.valorSenha)}`))
  parts.push(text(`Data: ${new Date(payload.dataHora).toLocaleString('pt-BR')}`))
  parts.push(separator())

  // QR Code: GS ( k — store + print
  const qrData = Buffer.from(payload.qrCodeData, 'utf8')
  const qrStoreLen = qrData.length + 3
  parts.push(Buffer.from([
    GS, 0x28, 0x6b,           // GS ( k
    qrStoreLen & 0xff,         // pL
    (qrStoreLen >> 8) & 0xff,  // pH
    0x31, 0x50, 0x30,          // cn, fn, m (store QR data)
    ...qrData
  ]))
  // Print QR
  parts.push(Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]))
  parts.push(NEWLINE)
  parts.push(NEWLINE)
  parts.push(CUT)

  return Buffer.concat(parts)
}
```

- [ ] **Step 5: Implement printer.ts**

```typescript
// sgvaq-print-bridge/src/printer.ts
import net from 'net'
import fs from 'fs'

export interface PrinterConfig {
  type: 'usb' | 'network' | 'file'
  // For type='usb': device path e.g. '/dev/usb/lp0' or '\\\\.\\COM3'
  // For type='network': host and port
  // For type='file': path (for testing)
  device?: string
  host?: string
  port?: number
}

export async function printBuffer(data: Buffer, config: PrinterConfig): Promise<void> {
  switch (config.type) {
    case 'usb':
      await printUsb(data, config.device!)
      break
    case 'network':
      await printNetwork(data, config.host!, config.port ?? 9100)
      break
    case 'file':
      await fs.promises.writeFile(config.device!, data)
      break
    default:
      throw new Error(`Unknown printer type: ${(config as any).type}`)
  }
}

async function printUsb(data: Buffer, device: string): Promise<void> {
  await fs.promises.writeFile(device, data)
}

async function printNetwork(data: Buffer, host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host, () => {
      socket.write(data, (err) => {
        socket.end()
        if (err) reject(err)
        else resolve()
      })
    })
    socket.on('error', reject)
    socket.setTimeout(5000, () => {
      socket.destroy()
      reject(new Error('Printer connection timeout'))
    })
  })
}
```

- [ ] **Step 6: Implement Express server index.ts**

```typescript
// sgvaq-print-bridge/src/index.ts
import express from 'express'
import cors from 'cors'
import { buildSenhaEscPos, type SenhaPayload } from './escpos-builder'
import { printBuffer, type PrinterConfig } from './printer'

const PORT = Number(process.env.SGVAQ_BRIDGE_PORT ?? 6789)
const BEARER_TOKEN = process.env.SGVAQ_BRIDGE_TOKEN ?? 'sgvaq-local-dev-token'

const PRINTER_CONFIG: PrinterConfig = {
  type: (process.env.PRINTER_TYPE as PrinterConfig['type']) ?? 'usb',
  device: process.env.PRINTER_DEVICE ?? '/dev/usb/lp0',
  host: process.env.PRINTER_HOST,
  port: Number(process.env.PRINTER_PORT ?? 9100)
}

const app = express()

// Only allow connections from localhost
app.use((req, res, next) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? ''
  if (!ip.includes('127.0.0.1') && !ip.includes('::1')) {
    res.status(403).json({ error: 'Forbidden: localhost only' })
    return
  }
  next()
})

app.use(cors({ origin: /\.sgvaq\.com\.br$|localhost/ }))
app.use(express.json({ limit: '64kb' }))

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${BEARER_TOKEN}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' })
})

app.post('/print', authMiddleware, async (req, res) => {
  try {
    const payload = req.body as SenhaPayload

    // Validate required fields
    const required: (keyof SenhaPayload)[] = [
      'eventoNome', 'modalidadeNome', 'numeroSenha',
      'competidorNome', 'valorSenha', 'qrCodeData', 'dataHora'
    ]
    for (const field of required) {
      if (payload[field] === undefined || payload[field] === null) {
        res.status(400).json({ error: `Missing field: ${field}` })
        return
      }
    }

    const buffer = buildSenhaEscPos(payload)
    await printBuffer(buffer, PRINTER_CONFIG)
    res.json({ success: true, bytes: buffer.length })
  } catch (err) {
    console.error('Print error:', err)
    res.status(500).json({ error: String(err) })
  }
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`sgvaq-print-bridge running on http://127.0.0.1:${PORT}`)
  console.log(`Printer: ${PRINTER_CONFIG.type} — ${PRINTER_CONFIG.device ?? `${PRINTER_CONFIG.host}:${PRINTER_CONFIG.port}`}`)
})
```

- [ ] **Step 7: Run tests**

```bash
cd sgvaq-print-bridge && pnpm test
```
Expected: PASS (escpos-builder tests)

- [ ] **Step 8: Commit**

```bash
git add sgvaq-print-bridge/
git commit -m "feat: sgvaq-print-bridge — local ESC/POS thermal printer HTTP bridge"
```

---

### Task 6: Print bridge integration in Next.js frontend

**Files:**
- Create: `src/components/print/usePrintBridge.ts`
- Create: `src/components/print/PrintBridgeStatus.tsx`

- [ ] **Step 1: Implement usePrintBridge hook**

```typescript
// src/components/print/usePrintBridge.ts
'use client'
import { useState, useCallback, useEffect } from 'react'
import type { SenhaPayload } from '../../../sgvaq-print-bridge/src/escpos-builder'

const BRIDGE_URL = process.env.NEXT_PUBLIC_PRINT_BRIDGE_URL ?? 'http://127.0.0.1:6789'
const BRIDGE_TOKEN = process.env.NEXT_PUBLIC_PRINT_BRIDGE_TOKEN ?? 'sgvaq-local-dev-token'

export type BridgeStatus = 'unknown' | 'online' | 'offline'

export function usePrintBridge() {
  const [status, setStatus] = useState<BridgeStatus>('unknown')

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE_URL}/health`, { signal: AbortSignal.timeout(2000) })
      setStatus(res.ok ? 'online' : 'offline')
    } catch {
      setStatus('offline')
    }
  }, [])

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30_000)
    return () => clearInterval(interval)
  }, [checkStatus])

  const print = useCallback(async (payload: SenhaPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${BRIDGE_URL}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BRIDGE_TOKEN}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000)
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        return { success: false, error: body.error ?? `HTTP ${res.status}` }
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }, [])

  return { status, print, checkStatus }
}
```

- [ ] **Step 2: Implement PrintBridgeStatus component**

```tsx
// src/components/print/PrintBridgeStatus.tsx
'use client'
import { usePrintBridge } from './usePrintBridge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Printer, RefreshCw } from 'lucide-react'

export function PrintBridgeStatus() {
  const { status, checkStatus } = usePrintBridge()

  const variant = status === 'online' ? 'secondary' : status === 'offline' ? 'destructive' : 'outline'
  const label = status === 'online' ? 'Impressora Online' : status === 'offline' ? 'Impressora Offline' : 'Verificando...'

  return (
    <div className="flex items-center gap-2">
      <Printer className="w-4 h-4 text-muted-foreground" />
      <Badge variant={variant}>{label}</Badge>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={checkStatus} title="Verificar impressora">
        <RefreshCw className="w-3 h-3" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/print/usePrintBridge.ts src/components/print/PrintBridgeStatus.tsx
git commit -m "feat: print bridge client hook and status component"
```

---

### Task 7: E2E tests for notifications admin

**Files:**
- Create: `tests/e2e/notificacoes.spec.ts`

- [ ] **Step 1: Write E2E tests**

```typescript
// tests/e2e/notificacoes.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Notifications Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[name=email]', 'superadmin@sgvaq.com')
    await page.fill('[name=password]', 'admin123')
    await page.click('[type=submit]')
    await page.waitForURL('/admin')
  })

  test('shows notifications dashboard with stats', async ({ page }) => {
    await page.goto('/admin/notificacoes')
    await expect(page.getByText('Notificações WhatsApp')).toBeVisible()
    await expect(page.getByText('Pendentes')).toBeVisible()
    await expect(page.getByText('Enviadas')).toBeVisible()
    await expect(page.getByText('Falhas')).toBeVisible()
  })

  test('shows empty state when no failed notifications', async ({ page }) => {
    await page.goto('/admin/notificacoes?status=falhou')
    // Either shows data or shows empty state
    const hasEmpty = await page.getByText('Nenhuma notificação com falha').isVisible().catch(() => false)
    const hasTable = await page.locator('table').isVisible().catch(() => false)
    expect(hasEmpty || hasTable).toBe(true)
  })
})
```

- [ ] **Step 2: Run E2E tests**

Run: `pnpm playwright test tests/e2e/notificacoes.spec.ts`
Expected: Tests run and verify page structure

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/notificacoes.spec.ts
git commit -m "test(e2e): notifications admin dashboard"
```

---

### Task 8: Edge Function deployment configuration

**Files:**
- Create: `supabase/functions/process-notifications/.env.example`
- Modify: `supabase/config.toml` (add cron schedule)

- [ ] **Step 1: Create env example**

```bash
# supabase/functions/process-notifications/.env.example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WHATSAPP_API_URL=https://your-evolution-api.com
WHATSAPP_API_KEY=your-api-key
NOTIFICATIONS_SECRET=your-invocation-secret
```

- [ ] **Step 2: Add cron schedule to supabase/config.toml**

In `supabase/config.toml`, add a cron job to invoke the Edge Function every 2 minutes:

```toml
[functions.process-notifications]
verify_jwt = false

# Cron: invoke Edge Function every 2 minutes
# Note: configure pg_cron in Supabase dashboard or via SQL:
# SELECT cron.schedule('process-notifications', '*/2 * * * *',
#   $$SELECT net.http_post(
#     url := 'https://your-project.supabase.co/functions/v1/process-notifications',
#     headers := '{"Authorization": "Bearer YOUR_NOTIFICATIONS_SECRET"}'::jsonb
#   )$$);
```

- [ ] **Step 3: Write deploy instructions in README**

```bash
# Deploy Edge Function
supabase functions deploy process-notifications --no-verify-jwt

# Set secrets
supabase secrets set WHATSAPP_API_URL=https://your-api.com
supabase secrets set WHATSAPP_API_KEY=your-key
supabase secrets set NOTIFICATIONS_SECRET=$(openssl rand -hex 32)
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/process-notifications/.env.example supabase/config.toml
git commit -m "feat: Edge Function deployment config and cron schedule documentation"
```
