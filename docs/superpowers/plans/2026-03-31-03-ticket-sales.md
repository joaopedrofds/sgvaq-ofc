# SGVAQ — Plano 3: Venda de Senhas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Venda de senhas presencial (caixa) e online (Pix + comprovante), geração de QR Code, aprovação/rejeição de comprovantes, controle de estoque, impressão de senha.

**Architecture:** Server Actions com transações SQL atômicas via `increment_senhas_vendidas()`. QR Code gerado server-side com `qrcode` lib. Upload de comprovante para bucket `comprovantes` (privado). Impressão via CSS `@media print`.

**Tech Stack:** Next.js 14 Server Actions, Supabase Storage, `qrcode`, `react-dropzone`, TailwindCSS, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-31-sgvaq-design.md`
**Depende de:** Planos 1 e 2

---

## Estrutura de Arquivos

```
src/
├── actions/
│   ├── senhas.ts               # venda, cancelamento, ativação
│   └── comprovantes.ts         # upload, aprovação, rejeição
├── app/
│   ├── (tenant)/eventos/[id]/
│   │   └── senhas/page.tsx     # controle de senhas (financeiro)
│   └── evento/[id]/
│       └── inscricao/page.tsx  # compra online (competidor, sem auth obrigatória)
├── components/
│   ├── senhas/
│   │   ├── caixa-form.tsx      # formulário do caixa presencial
│   │   ├── senha-card.tsx      # card com QR code
│   │   ├── senha-print.tsx     # componente otimizado para impressão
│   │   ├── comprovante-upload.tsx
│   │   └── comprovante-review.tsx
│   └── qr/
│       └── qr-code.tsx
└── tests/
    ├── unit/actions/senhas.test.ts
    └── e2e/ticket-sales.test.ts
```

---

## Task 1: Instalar dependências

- [ ] **Step 1.1: Instalar libs**

```bash
pnpm add qrcode react-dropzone
pnpm add -D @types/qrcode
```

- [ ] **Step 1.2: Criar buckets Supabase Storage**

```bash
pnpm supabase db execute --sql "
  INSERT INTO storage.buckets (id, name, public) VALUES
    ('comprovantes', 'comprovantes', false),
    ('logos', 'logos', true),
    ('banners', 'banners', true),
    ('pdfs', 'pdfs', false)
  ON CONFLICT (id) DO NOTHING;
"
```

- [ ] **Step 1.3: Commit**

```bash
git add .
git commit -m "chore: add qrcode and react-dropzone deps + storage buckets"
```

---

## Task 2: Server Actions de Senhas

**Files:**
- Create: `src/actions/senhas.ts`
- Create: `tests/unit/actions/senhas.test.ts`

- [ ] **Step 2.1: Escrever testes**

Criar `tests/unit/actions/senhas.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { vendaSchema } from '@/actions/senhas'

describe('vendaSchema', () => {
  it('valida venda presencial válida', () => {
    const r = vendaSchema.safeParse({
      modalidade_id: 'uuid-modalidade',
      competidor_cpf: '123.456.789-09',
      canal: 'presencial',
    })
    expect(r.success).toBe(true)
  })

  it('rejeita canal inválido', () => {
    const r = vendaSchema.safeParse({
      modalidade_id: 'uuid',
      competidor_cpf: '123.456.789-09',
      canal: 'credito',
    })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2.2: Rodar e confirmar falha**

```bash
pnpm test tests/unit/actions/senhas.test.ts
# Expected: FAIL
```

- [ ] **Step 2.3: Implementar senhas.ts**

Criar `src/actions/senhas.ts`:
```typescript
'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'

export const vendaSchema = z.object({
  modalidade_id: z.string().uuid(),
  competidor_cpf: z.string().min(11, 'CPF inválido'),
  canal: z.enum(['presencial', 'online']),
})

export async function venderSenhaPresencial(formData: z.infer<typeof vendaSchema>) {
  const session = await getSession()
  requireRole(session, ['financeiro', 'organizador'])

  const parsed = vendaSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const admin = createAdminClient()

  // Buscar competidor pelo CPF
  const cpfClean = parsed.data.competidor_cpf.replace(/\D/g, '')
  const { data: competidor } = await supabase
    .from('competidores')
    .select('id')
    .eq('cpf', cpfClean)
    .single()

  if (!competidor) return { error: 'Competidor não encontrado. Cadastre-o primeiro.' }

  // Buscar valor da senha
  const { data: modalidade } = await supabase
    .from('modalidades')
    .select('valor_senha, total_senhas, senhas_vendidas')
    .eq('id', parsed.data.modalidade_id)
    .single()

  if (!modalidade) return { error: 'Modalidade não encontrada' }
  if (modalidade.senhas_vendidas >= modalidade.total_senhas) {
    return { error: 'Estoque de senhas esgotado para esta modalidade' }
  }

  // Próximo número de senha
  const { data: ultimaSenha } = await supabase
    .from('senhas')
    .select('numero_senha')
    .eq('modalidade_id', parsed.data.modalidade_id)
    .order('numero_senha', { ascending: false })
    .limit(1)
    .single()

  const proximoNumero = (ultimaSenha?.numero_senha ?? 0) + 1

  // Buscar tenant_user do financeiro
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', session!.id)
    .single()

  // Inserir senha
  const { data: senha, error: senhaError } = await supabase
    .from('senhas')
    .insert({
      modalidade_id: parsed.data.modalidade_id,
      competidor_id: competidor.id,
      numero_senha: proximoNumero,
      canal: 'presencial',
      status: 'ativa',
      valor_pago: modalidade.valor_senha,
      vendido_por: tenantUser?.id,
    })
    .select()
    .single()

  if (senhaError) return { error: senhaError.message }

  // Incrementar senhas_vendidas atomicamente
  await admin.rpc('increment_senhas_vendidas', { p_modalidade_id: parsed.data.modalidade_id })

  // Registrar no audit log
  await supabase.from('financeiro_transacoes').insert({
    tenant_id: session!.tenantId,
    senha_id: senha.id,
    tipo: 'venda',
    valor: modalidade.valor_senha,
    canal: 'presencial',
    user_id: session!.id,
  })

  revalidatePath(`/eventos`)
  return { data: senha }
}

export async function cancelarSenha(senhaId: string, motivo?: string) {
  const session = await getSession()
  requireRole(session, ['financeiro', 'organizador'])

  const supabase = await createClient()
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', session!.id)
    .single()

  const { data: senha } = await supabase
    .from('senhas')
    .select('status, modalidade_id, valor_pago')
    .eq('id', senhaId)
    .single()

  if (!senha) return { error: 'Senha não encontrada' }
  if (senha.status === 'cancelada') return { error: 'Senha já está cancelada' }

  const { error } = await supabase
    .from('senhas')
    .update({
      status: 'cancelada',
      cancelado_por: tenantUser?.id,
      cancelado_em: new Date().toISOString(),
    })
    .eq('id', senhaId)

  if (error) return { error: error.message }

  const admin = createAdminClient()
  await admin.rpc('decrement_senhas_vendidas', { p_modalidade_id: senha.modalidade_id })

  await supabase.from('financeiro_transacoes').insert({
    tenant_id: session!.tenantId,
    senha_id: senhaId,
    tipo: 'cancelamento',
    valor: -senha.valor_pago,
    canal: 'presencial',
    user_id: session!.id,
  })

  return { success: true }
}

export async function getSenhasByModalidade(modalidadeId: string) {
  const session = await getSession()
  requireRole(session, ['organizador', 'financeiro'])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('senhas')
    .select('*, competidores(nome, cpf, whatsapp)')
    .eq('modalidade_id', modalidadeId)
    .order('numero_senha')

  if (error) return { error: error.message }
  return { data }
}
```

- [ ] **Step 2.4: Rodar testes**

```bash
pnpm test tests/unit/actions/senhas.test.ts
# Expected: PASS
```

- [ ] **Step 2.5: Commit**

```bash
git add src/actions/senhas.ts tests/unit/actions/senhas.test.ts
git commit -m "feat: ticket sales server actions (presencial + cancel + audit log) TDD"
```

---

## Task 3: Comprovante Online (Upload + Aprovação)

**Files:**
- Create: `src/actions/comprovantes.ts`

- [ ] **Step 3.1: Implementar comprovantes.ts**

Criar `src/actions/comprovantes.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function uploadComprovante(senhaId: string, file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Tipo de arquivo não permitido. Use JPG, PNG ou PDF.' }
  }
  if (file.size > MAX_SIZE) {
    return { error: 'Arquivo muito grande. Máximo 5MB.' }
  }

  const supabase = await createClient()
  const ext = file.name.split('.').pop()
  const path = `${senhaId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('comprovantes')
    .upload(path, file, { contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { error } = await supabase
    .from('senhas')
    .update({
      comprovante_url: path,
      comprovante_status: 'pendente',
    })
    .eq('id', senhaId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getComprovanteUrl(senhaId: string) {
  const supabase = await createClient()
  const { data: senha } = await supabase
    .from('senhas')
    .select('comprovante_url')
    .eq('id', senhaId)
    .single()

  if (!senha?.comprovante_url) return { error: 'Sem comprovante' }

  // Gera signed URL sob demanda (não armazena)
  const { data } = await supabase.storage
    .from('comprovantes')
    .createSignedUrl(senha.comprovante_url, 3600)

  return { url: data?.signedUrl }
}

export async function aprovarComprovante(senhaId: string) {
  const session = await getSession()
  requireRole(session, ['financeiro', 'organizador'])

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: senha } = await supabase
    .from('senhas')
    .select('modalidade_id, valor_pago, competidor_id, comprovante_status')
    .eq('id', senhaId)
    .single()

  if (!senha) return { error: 'Senha não encontrada' }
  if (senha.comprovante_status !== 'pendente') return { error: 'Comprovante não está pendente' }

  // Verificar estoque antes de ativar
  const { data: modalidade } = await supabase
    .from('modalidades')
    .select('total_senhas, senhas_vendidas')
    .eq('id', senha.modalidade_id)
    .single()

  if (!modalidade || modalidade.senhas_vendidas >= modalidade.total_senhas) {
    return { error: 'Estoque esgotado. Não é possível aprovar.' }
  }

  const { error } = await supabase
    .from('senhas')
    .update({ status: 'ativa', comprovante_status: 'aprovado' })
    .eq('id', senhaId)

  if (error) return { error: error.message }

  await admin.rpc('increment_senhas_vendidas', { p_modalidade_id: senha.modalidade_id })

  await supabase.from('financeiro_transacoes').insert({
    tenant_id: session!.tenantId,
    senha_id: senhaId,
    tipo: 'venda',
    valor: senha.valor_pago,
    canal: 'online',
    user_id: session!.id,
  })

  // Enfileirar notificação WhatsApp
  await supabase.from('notificacoes_fila').insert({
    idempotency_key: `comprovante_aprovado:${senhaId}`,
    competidor_id: senha.competidor_id,
    tipo: 'comprovante_aprovado',
    mensagem: 'Seu comprovante foi aprovado! Sua senha está ativa.',
  }).onConflict('idempotency_key').ignore()

  revalidatePath('/financeiro')
  return { success: true }
}

export async function rejeitarComprovante(senhaId: string, motivo: string) {
  const session = await getSession()
  requireRole(session, ['financeiro', 'organizador'])

  if (!motivo.trim()) return { error: 'Motivo de rejeição é obrigatório' }

  const supabase = await createClient()
  const { data: senha } = await supabase
    .from('senhas')
    .select('competidor_id')
    .eq('id', senhaId)
    .single()

  const { error } = await supabase
    .from('senhas')
    .update({
      comprovante_status: 'rejeitado',
      comprovante_rejeicao_motivo: motivo,
    })
    .eq('id', senhaId)

  if (error) return { error: error.message }

  // Notificar competidor
  if (senha) {
    await supabase.from('notificacoes_fila').insert({
      idempotency_key: `comprovante_rejeitado:${senhaId}`,
      competidor_id: senha.competidor_id,
      tipo: 'comprovante_rejeitado',
      mensagem: `Seu comprovante foi rejeitado. Motivo: ${motivo}`,
    }).onConflict('idempotency_key').ignore()
  }

  revalidatePath('/financeiro')
  return { success: true }
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/actions/comprovantes.ts
git commit -m "feat: comprovante upload, approval, rejection with WhatsApp notification queue"
```

---

## Task 4: QR Code Component

**Files:**
- Create: `src/components/qr/qr-code.tsx`
- Create: `src/components/senhas/senha-print.tsx`

- [ ] **Step 4.1: QR Code component**

Criar `src/components/qr/qr-code.tsx`:
```tsx
'use client'
import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRCodeProps {
  value: string
  size?: number
}

export function QRCodeDisplay({ value, size = 200 }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      })
    }
  }, [value, size])

  return <canvas ref={canvasRef} />
}
```

- [ ] **Step 4.2: Senha Print component**

Criar `src/components/senhas/senha-print.tsx`:
```tsx
import { QRCodeDisplay } from '@/components/qr/qr-code'
import { formatMoney } from '@/lib/utils/money'

interface SenhaPrintProps {
  senhaId: string
  tenantId: string
  numeroSenha: number
  nomeCompetidor: string
  nomeEvento: string
  dataEvento: string
  modalidade: string
  valorPago: number
  nomeOrganizadora: string
  logoUrl?: string
}

export function SenhaPrint({
  senhaId, tenantId, numeroSenha, nomeCompetidor,
  nomeEvento, dataEvento, modalidade, valorPago,
  nomeOrganizadora, logoUrl,
}: SenhaPrintProps) {
  const qrValue = JSON.stringify({ senha_id: senhaId, tenant_id: tenantId })

  return (
    <div className="w-80 border-2 border-black p-4 font-mono text-sm print:shadow-none">
      <div className="text-center border-b pb-2 mb-2">
        {logoUrl && <img src={logoUrl} alt={nomeOrganizadora} className="h-12 mx-auto mb-1" />}
        <p className="font-bold text-lg">{nomeOrganizadora}</p>
        <p className="font-bold">{nomeEvento}</p>
        <p className="text-xs">{new Date(dataEvento).toLocaleDateString('pt-BR')}</p>
      </div>

      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="font-bold text-2xl">#{numeroSenha.toString().padStart(3, '0')}</p>
          <p className="font-semibold">{nomeCompetidor}</p>
          <p className="text-xs text-gray-600">{modalidade}</p>
          <p className="text-xs text-gray-600">Valor: {formatMoney(valorPago)}</p>
        </div>
        <QRCodeDisplay value={qrValue} size={100} />
      </div>

      <div className="border-t mt-2 pt-2 text-center">
        <p className="text-xs text-gray-500">Apresente o QR Code no check-in</p>
      </div>
    </div>
  )
}
```

Criar `src/app/globals.css` adições (append):
```css
@media print {
  body * { visibility: hidden; }
  .print-area, .print-area * { visibility: visible; }
  .print-area { position: absolute; left: 0; top: 0; }
}
```

- [ ] **Step 4.3: Commit**

```bash
git add src/components/qr/ src/components/senhas/senha-print.tsx
git commit -m "feat: QR Code component and printable senha template"
```

---

## Task 5: Página do Caixa Presencial

**Files:**
- Create: `src/components/senhas/caixa-form.tsx`
- Modify: `src/app/(tenant)/eventos/[id]/senhas/page.tsx`

- [ ] **Step 5.1: CaixaForm**

Criar `src/components/senhas/caixa-form.tsx`:
```tsx
'use client'
import { useState, useRef } from 'react'
import { venderSenhaPresencial } from '@/actions/senhas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SenhaPrint } from './senha-print'

interface ModalidadeInfo {
  id: string
  nome: string
  valor_senha: number
}

interface CaixaFormProps {
  modalidades: ModalidadeInfo[]
  nomeEvento: string
  dataEvento: string
  tenantId: string
  nomeOrganizadora: string
}

export function CaixaForm({ modalidades, nomeEvento, dataEvento, tenantId, nomeOrganizadora }: CaixaFormProps) {
  const [cpf, setCpf] = useState('')
  const [modalidadeId, setModalidadeId] = useState(modalidades[0]?.id ?? '')
  const [senha, setSenha] = useState<any>(null)
  const [competidor, setCompetidor] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const selectedModalidade = modalidades.find(m => m.id === modalidadeId)

  async function handleVenda() {
    setLoading(true)
    setError(null)
    const result = await venderSenhaPresencial({
      modalidade_id: modalidadeId,
      competidor_cpf: cpf,
      canal: 'presencial',
    })
    if ('error' in result) { setError(result.error); setLoading(false); return }
    setSenha(result.data)
    setLoading(false)
  }

  function handlePrint() {
    window.print()
  }

  if (senha && competidor) {
    return (
      <div className="space-y-4">
        <div className="print-area" ref={printRef}>
          <SenhaPrint
            senhaId={senha.id}
            tenantId={tenantId}
            numeroSenha={senha.numero_senha}
            nomeCompetidor={competidor.nome}
            nomeEvento={nomeEvento}
            dataEvento={dataEvento}
            modalidade={selectedModalidade?.nome ?? ''}
            valorPago={senha.valor_pago}
            nomeOrganizadora={nomeOrganizadora}
          />
        </div>
        <div className="flex gap-2 print:hidden">
          <Button onClick={handlePrint} className="bg-amber-700 hover:bg-amber-800">
            Imprimir senha
          </Button>
          <Button variant="outline" onClick={() => { setSenha(null); setCpf('') }}>
            Nova venda
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-sm">
      <div className="space-y-1">
        <Label>CPF do competidor</Label>
        <Input
          value={cpf}
          onChange={e => setCpf(e.target.value)}
          placeholder="000.000.000-00"
        />
      </div>
      <div className="space-y-1">
        <Label>Modalidade</Label>
        <select
          value={modalidadeId}
          onChange={e => setModalidadeId(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm"
        >
          {modalidades.map(m => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={handleVenda} disabled={loading || !cpf} className="w-full bg-amber-700 hover:bg-amber-800">
        {loading ? 'Processando...' : 'Registrar venda'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 5.2: Página de senhas do evento**

Criar `src/app/(tenant)/eventos/[id]/senhas/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { getSenhasByModalidade } from '@/actions/senhas'
import { CaixaForm } from '@/components/senhas/caixa-form'
import { getSession } from '@/lib/auth/get-session'
import { notFound } from 'next/navigation'

export default async function SenhasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const supabase = await createClient()

  const { data: evento } = await supabase
    .from('eventos')
    .select('*, tenants(nome), modalidades(*)')
    .eq('id', id)
    .single()

  if (!evento) notFound()

  const modalidades = evento.modalidades ?? []

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Senhas — {evento.nome}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modalidades.map((m: any) => (
          <div key={m.id} className="bg-white border rounded-lg p-4">
            <p className="font-semibold">{m.nome}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-green-600">{m.senhas_vendidas} vendidas</span>
              <span className="text-gray-500">{m.total_senhas - m.senhas_vendidas} disponíveis</span>
              <span className="text-red-500">0 canceladas</span>
            </div>
          </div>
        ))}
      </div>

      {evento.status !== 'encerrado' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Caixa — Venda Presencial</h2>
          <CaixaForm
            modalidades={modalidades.map((m: any) => ({ id: m.id, nome: m.nome, valor_senha: m.valor_senha }))}
            nomeEvento={evento.nome}
            dataEvento={evento.data_inicio}
            tenantId={session!.tenantId!}
            nomeOrganizadora={(evento.tenants as any)?.nome ?? ''}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5.3: Commit**

```bash
git add src/components/senhas/ src/app/\(tenant\)/eventos/
git commit -m "feat: presencial ticket sales UI (caixa form + print)"
```

---

## Task 6: Página de Compra Online (Competidor)

**Files:**
- Modify: `src/app/evento/[id]/inscricao/page.tsx`

- [ ] **Step 6.1: Implementar inscrição online**

Criar `src/app/evento/[id]/inscricao/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadComprovante } from '@/actions/comprovantes'
import { venderSenhaOnline } from '@/actions/senhas'

export default function InscricaoPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams()
  const modalidadeId = searchParams.get('modalidade') ?? ''
  const [cpf, setCpf] = useState('')
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [senhaId, setSenhaId] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'upload' | 'done'>('form')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmitDados(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Criar senha pendente online (sem incrementar estoque — só após aprovação)
    const res = await fetch('/api/senhas/online', {
      method: 'POST',
      body: JSON.stringify({ cpf, nome, whatsapp, modalidade_id: modalidadeId }),
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    setSenhaId(data.senha_id)
    setStep('upload')
    setLoading(false)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !senhaId) return
    setLoading(true)
    const result = await uploadComprovante(senhaId, file)
    if ('error' in result) { setError(result.error); setLoading(false); return }
    setStep('done')
    setLoading(false)
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-green-700">Comprovante enviado!</h2>
          <p className="text-gray-600">
            Seu comprovante está em análise. Você receberá uma confirmação pelo WhatsApp
            quando sua senha for ativada.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl p-8 max-w-md w-full space-y-6">
        <h1 className="text-2xl font-bold text-amber-900">Compra de Senha</h1>

        {step === 'form' && (
          <form onSubmit={handleSubmitDados} className="space-y-4">
            <div className="space-y-1">
              <Label>Nome completo</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" required />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(85) 99999-9999" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full bg-amber-700 hover:bg-amber-800">
              {loading ? 'Processando...' : 'Continuar'}
            </Button>
          </form>
        )}

        {step === 'upload' && (
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">Dados para Pix:</p>
              <p>Chave: <strong>11999999999</strong></p>
              <p>Favorecido: <strong>Organizadora do Evento</strong></p>
            </div>
            <div className="space-y-1">
              <Label>Comprovante do Pix</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                required
              />
              <p className="text-xs text-gray-500">JPG, PNG ou PDF — máx 5MB</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading || !file} className="w-full bg-amber-700 hover:bg-amber-800">
              {loading ? 'Enviando...' : 'Enviar comprovante'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6.2: Criar API route para venda online**

Criar `src/app/api/senhas/online/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { cpf, nome, whatsapp, modalidade_id } = await request.json()
  if (!cpf || !nome || !modalidade_id) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const cpfClean = cpf.replace(/\D/g, '')

  // Upsert competidor
  let { data: competidor } = await supabase
    .from('competidores')
    .select('id')
    .eq('cpf', cpfClean)
    .single()

  if (!competidor) {
    const { data, error } = await supabase
      .from('competidores')
      .insert({ cpf: cpfClean, nome, whatsapp: whatsapp?.replace(/\D/g, '') })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 422 })
    competidor = data
  }

  // Verificar estoque
  const { data: modalidade } = await supabase
    .from('modalidades')
    .select('total_senhas, senhas_vendidas, valor_senha')
    .eq('id', modalidade_id)
    .single()

  if (!modalidade) return NextResponse.json({ error: 'Modalidade não encontrada' }, { status: 404 })
  if (modalidade.senhas_vendidas >= modalidade.total_senhas) {
    return NextResponse.json({ error: 'Estoque esgotado' }, { status: 422 })
  }

  // Próximo número
  const { data: ultima } = await supabase
    .from('senhas')
    .select('numero_senha')
    .eq('modalidade_id', modalidade_id)
    .order('numero_senha', { ascending: false })
    .limit(1)
    .single()

  const { data: senha, error } = await supabase
    .from('senhas')
    .insert({
      modalidade_id,
      competidor_id: competidor!.id,
      numero_senha: (ultima?.numero_senha ?? 0) + 1,
      canal: 'online',
      status: 'pendente',
      valor_pago: modalidade.valor_senha,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 422 })

  return NextResponse.json({ senha_id: senha.id })
}
```

- [ ] **Step 6.3: Commit**

```bash
git add src/app/evento/ src/app/api/
git commit -m "feat: online ticket purchase flow (form + Pix upload)"
```

---

## Task 7: Página de Comprovantes Pendentes

**Files:**
- Modify: `src/app/(tenant)/financeiro/page.tsx`

- [ ] **Step 7.1: Implementar página financeiro**

Sobrescrever `src/app/(tenant)/financeiro/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { ComprovanteReview } from '@/components/senhas/comprovante-review'

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: pendentes } = await supabase
    .from('senhas')
    .select('*, competidores(nome, whatsapp), modalidades(nome, eventos(nome))')
    .eq('canal', 'online')
    .eq('comprovante_status', 'pendente')
    .order('created_at')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financeiro — Comprovantes Pendentes</h1>
      {pendentes?.length === 0 ? (
        <p className="text-gray-500">Nenhum comprovante pendente.</p>
      ) : (
        <div className="space-y-4">
          {pendentes?.map(s => <ComprovanteReview key={s.id} senha={s} />)}
        </div>
      )}
    </div>
  )
}
```

Criar `src/components/senhas/comprovante-review.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { aprovarComprovante, rejeitarComprovante, getComprovanteUrl } from '@/actions/comprovantes'
import { useRouter } from 'next/navigation'

export function ComprovanteReview({ senha }: { senha: any }) {
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null)
  const router = useRouter()

  async function handleVerComprovante() {
    const res = await getComprovanteUrl(senha.id)
    if (res.url) window.open(res.url, '_blank')
  }

  async function handleAprovar() {
    setLoading(true)
    await aprovarComprovante(senha.id)
    router.refresh()
  }

  async function handleRejeitar() {
    if (!motivo.trim()) { alert('Informe o motivo da rejeição'); return }
    setLoading(true)
    await rejeitarComprovante(senha.id, motivo)
    router.refresh()
  }

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <div className="flex justify-between">
        <div>
          <p className="font-semibold">{senha.competidores?.nome}</p>
          <p className="text-sm text-gray-500">
            {senha.modalidades?.eventos?.nome} — {senha.modalidades?.nome}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(senha.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleVerComprovante}>
          Ver comprovante
        </Button>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleAprovar} disabled={loading} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
          Aprovar
        </Button>
        <div className="flex-1 flex gap-2">
          <Input
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Motivo da rejeição..."
            className="text-sm"
          />
          <Button onClick={handleRejeitar} disabled={loading} size="sm" variant="destructive">
            Rejeitar
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7.2: Rodar todos os testes**

```bash
pnpm test
pnpm build
# Expected: sem erros
```

- [ ] **Step 7.3: Commit final**

```bash
git add src/
git commit -m "feat: comprovante review UI (approve/reject) + financeiro page"
git tag v0.3.0-ticket-sales
```
