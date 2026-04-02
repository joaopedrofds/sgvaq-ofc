# SGVAQ — Plano 2: Gestão de Eventos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CRUD completo de eventos, modalidades, critérios de pontuação por modalidade, gestão de equipe (convite por e-mail), e página pública do evento.

**Architecture:** Server Actions no Next.js 14 com validação de role/tenant em cada action. UI com shadcn/ui. Limites de plano verificados via função SQL `check_plan_limit()`. Convite de equipe usa `supabase.auth.admin.inviteUserByEmail()` server-side.

**Tech Stack:** Next.js 14 Server Actions, Supabase, TailwindCSS, shadcn/ui, react-hook-form + zod, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-03-31-sgvaq-design.md`
**Depende de:** Plano 1 (Foundation)

---

## Estrutura de Arquivos

```
src/
├── actions/
│   ├── eventos.ts              # CRUD de eventos + transições de status
│   ├── modalidades.ts          # CRUD de modalidades + critérios
│   └── equipe.ts               # convite, listagem, desativação
├── app/
│   ├── (tenant)/
│   │   ├── eventos/
│   │   │   ├── page.tsx        # lista de eventos
│   │   │   ├── novo/page.tsx   # formulário de criação
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # detalhe + edição + transições
│   │   │       └── modalidades/page.tsx
│   │   └── equipe/
│   │       └── page.tsx        # lista + convite de equipe
│   └── evento/[id]/
│       └── page.tsx            # página pública (sem auth)
├── components/
│   └── eventos/
│       ├── evento-form.tsx     # form criar/editar evento
│       ├── evento-card.tsx     # card na listagem
│       ├── status-badge.tsx    # badge colorida por status
│       ├── status-transition.tsx # botões de transição
│       ├── modalidade-form.tsx
│       └── criterios-config.tsx
└── tests/
    ├── unit/actions/
    │   ├── eventos.test.ts
    │   └── modalidades.test.ts
    └── e2e/eventos.test.ts
```

---

## Task 1: Validações com Zod + Server Actions de Evento

**Files:**
- Create: `src/actions/eventos.ts`
- Create: `tests/unit/actions/eventos.test.ts`

- [ ] **Step 1.1: Instalar dependências**

```bash
pnpm add zod react-hook-form @hookform/resolvers
```

- [ ] **Step 1.2: Escrever testes**

Criar `tests/unit/actions/eventos.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { eventoSchema, validateEventoTransition } from '@/actions/eventos'

describe('eventoSchema', () => {
  it('valida evento válido', () => {
    const result = eventoSchema.safeParse({
      nome: 'Vaquejada do Nordeste',
      tipo: 'vaquejada',
      data_inicio: '2026-05-01',
      data_fim: '2026-05-02',
      local: 'Parque de Vaquejada',
      cidade: 'Fortaleza',
      estado: 'CE',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita data_fim anterior a data_inicio', () => {
    const result = eventoSchema.safeParse({
      nome: 'Teste',
      tipo: 'vaquejada',
      data_inicio: '2026-05-02',
      data_fim: '2026-05-01',
      cidade: 'Fortaleza',
      estado: 'CE',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toContain('data_fim')
  })
})

describe('validateEventoTransition', () => {
  it('permite rascunho → aberto', () => {
    expect(validateEventoTransition('rascunho', 'aberto')).toBe(true)
  })
  it('permite aberto → em_andamento', () => {
    expect(validateEventoTransition('aberto', 'em_andamento')).toBe(true)
  })
  it('permite em_andamento → encerrado', () => {
    expect(validateEventoTransition('em_andamento', 'encerrado')).toBe(true)
  })
  it('nega encerrado → qualquer coisa', () => {
    expect(validateEventoTransition('encerrado', 'aberto')).toBe(false)
    expect(validateEventoTransition('encerrado', 'rascunho')).toBe(false)
  })
  it('nega pular etapas (rascunho → em_andamento)', () => {
    expect(validateEventoTransition('rascunho', 'em_andamento')).toBe(false)
  })
})
```

- [ ] **Step 1.3: Rodar e confirmar falha**

```bash
pnpm test tests/unit/actions/eventos.test.ts
# Expected: FAIL
```

- [ ] **Step 1.4: Implementar eventos.ts**

Criar `src/actions/eventos.ts`:
```typescript
'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'
import type { EventoStatus } from '@/types'

export const eventoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  tipo: z.enum(['vaquejada', 'tambor']),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  local: z.string().optional(),
  cidade: z.string().min(2, 'Cidade obrigatória'),
  estado: z.string().length(2, 'UF deve ter 2 caracteres'),
}).refine(d => d.data_fim >= d.data_inicio, {
  message: 'data_fim deve ser igual ou posterior a data_inicio',
  path: ['data_fim'],
})

const VALID_TRANSITIONS: Record<EventoStatus, EventoStatus[]> = {
  rascunho: ['aberto'],
  aberto: ['em_andamento'],
  em_andamento: ['encerrado'],
  encerrado: [],
}

export function validateEventoTransition(from: EventoStatus, to: EventoStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export async function createEvento(formData: z.infer<typeof eventoSchema>) {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const parsed = eventoSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verificar limite do plano
  const admin = createAdminClient()
  const { data: limitOk } = await admin.rpc('check_plan_limit', {
    p_tenant_id: session!.tenantId,
    p_resource: 'eventos_mes',
  })
  if (!limitOk) return { error: 'Limite de eventos do plano atingido (máx 10/mês no plano básico).' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('eventos')
    .insert({ ...parsed.data, tenant_id: session!.tenantId })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/eventos')
  return { data }
}

export async function updateEvento(id: string, formData: Partial<z.infer<typeof eventoSchema>>) {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('eventos')
    .update(formData)
    .eq('id', id)
    .eq('tenant_id', session!.tenantId)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/eventos/${id}`)
  return { data }
}

export async function transitionEventoStatus(id: string, novoStatus: EventoStatus) {
  const session = await getSession()
  requireRole(session, ['organizador', 'financeiro'])

  const supabase = await createClient()
  const { data: evento } = await supabase
    .from('eventos')
    .select('status')
    .eq('id', id)
    .single()

  if (!evento) return { error: 'Evento não encontrado' }
  if (!validateEventoTransition(evento.status as EventoStatus, novoStatus)) {
    return { error: `Transição inválida: ${evento.status} → ${novoStatus}` }
  }

  const { error } = await supabase
    .from('eventos')
    .update({ status: novoStatus })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/eventos/${id}`)
  return { success: true }
}

export async function getEventos() {
  const session = await getSession()
  requireRole(session, ['organizador', 'financeiro', 'juiz', 'locutor'])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('eventos')
    .select('*, modalidades(count)')
    .order('data_inicio', { ascending: false })

  if (error) return { error: error.message }
  return { data }
}
```

- [ ] **Step 1.5: Rodar testes**

```bash
pnpm test tests/unit/actions/eventos.test.ts
# Expected: PASS
```

- [ ] **Step 1.6: Commit**

```bash
git add src/actions/eventos.ts tests/unit/actions/eventos.test.ts
git commit -m "feat: evento server actions with zod validation and status transitions (TDD)"
```

---

## Task 2: Server Actions de Modalidades e Critérios

**Files:**
- Create: `src/actions/modalidades.ts`
- Create: `tests/unit/actions/modalidades.test.ts`

- [ ] **Step 2.1: Escrever testes**

Criar `tests/unit/actions/modalidades.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { modalidadeSchema } from '@/actions/modalidades'

describe('modalidadeSchema', () => {
  it('valida modalidade válida', () => {
    const r = modalidadeSchema.safeParse({
      nome: 'Aberto',
      valor_senha: 5000,
      total_senhas: 100,
      premiacao_descricao: '1º lugar: R$5.000',
    })
    expect(r.success).toBe(true)
  })

  it('aceita valor_senha = 0 (gratuito)', () => {
    const r = modalidadeSchema.safeParse({
      nome: 'Gratuito',
      valor_senha: 0,
      total_senhas: 50,
    })
    expect(r.success).toBe(true)
  })

  it('rejeita total_senhas = 0', () => {
    const r = modalidadeSchema.safeParse({
      nome: 'Teste',
      valor_senha: 1000,
      total_senhas: 0,
    })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2.2: Rodar e confirmar falha**

```bash
pnpm test tests/unit/actions/modalidades.test.ts
# Expected: FAIL
```

- [ ] **Step 2.3: Implementar modalidades.ts**

Criar `src/actions/modalidades.ts`:
```typescript
'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'

export const modalidadeSchema = z.object({
  nome: z.string().min(2),
  valor_senha: z.number().int().min(0),
  total_senhas: z.number().int().min(1, 'Deve ter ao menos 1 senha'),
  premiacao_descricao: z.string().optional(),
})

export async function createModalidade(eventoId: string, formData: z.infer<typeof modalidadeSchema>) {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const parsed = modalidadeSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('modalidades')
    .insert({ ...parsed.data, evento_id: eventoId })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/eventos/${eventoId}/modalidades`)
  return { data }
}

export async function getModalidades(eventoId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('modalidades')
    .select('*, modalidade_criterios(*, criterios_pontuacao(*))')
    .eq('evento_id', eventoId)
    .order('nome')

  if (error) return { error: error.message }
  return { data }
}

export async function getCriteriosPadrao(tipoProva: 'vaquejada' | 'tambor') {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('criterios_pontuacao')
    .select('*')
    .eq('tipo_prova', tipoProva)
    .order('ordem')

  if (error) return { error: error.message }
  return { data }
}

export async function updateModalidadeCriterios(
  modalidadeId: string,
  criterios: { criterio_id: string; peso_override?: number }[]
) {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()

  // Remove critérios existentes e reinserere
  await supabase.from('modalidade_criterios').delete().eq('modalidade_id', modalidadeId)

  if (criterios.length > 0) {
    const { error } = await supabase.from('modalidade_criterios').insert(
      criterios.map(c => ({ modalidade_id: modalidadeId, ...c }))
    )
    if (error) return { error: error.message }
  }

  return { success: true }
}
```

- [ ] **Step 2.4: Rodar testes**

```bash
pnpm test
# Expected: PASS
```

- [ ] **Step 2.5: Commit**

```bash
git add src/actions/modalidades.ts tests/unit/actions/modalidades.test.ts
git commit -m "feat: modalidades and scoring criteria server actions (TDD)"
```

---

## Task 3: Server Actions de Equipe

**Files:**
- Create: `src/actions/equipe.ts`

- [ ] **Step 3.1: Implementar equipe.ts**

Criar `src/actions/equipe.ts`:
```typescript
'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'

const conviteSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['financeiro', 'juiz', 'locutor']), // organizador não pode convidar outro organizador
  whatsapp: z.string().optional(),
})

export async function convidarMembro(formData: z.infer<typeof conviteSchema>) {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const parsed = conviteSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verificar limite do plano (máx 5 usuários no básico)
  const admin = createAdminClient()
  const { data: limitOk } = await admin.rpc('check_plan_limit', {
    p_tenant_id: session!.tenantId,
    p_resource: 'usuarios',
  })
  if (!limitOk) return { error: 'Limite de usuários atingido (máx 5 no plano básico).' }

  // Convidar via Supabase Auth (envia e-mail)
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: {
        role: parsed.data.role,
        tenant_id: session!.tenantId,
        nome: parsed.data.nome,
      },
    }
  )
  if (inviteError) return { error: inviteError.message }

  // Criar registro em tenant_users
  const supabase = await createClient()
  const { error } = await supabase.from('tenant_users').insert({
    tenant_id: session!.tenantId,
    user_id: inviteData.user.id,
    nome: parsed.data.nome,
    email: parsed.data.email,
    role: parsed.data.role,
    whatsapp: parsed.data.whatsapp,
  })

  if (error) return { error: error.message }
  revalidatePath('/equipe')
  return { success: true }
}

export async function getEquipe() {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_users')
    .select('*')
    .order('nome')

  if (error) return { error: error.message }
  return { data }
}

export async function desativarMembro(userId: string) {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenant_users')
    .update({ ativo: false })
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath('/equipe')
  return { success: true }
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/actions/equipe.ts
git commit -m "feat: team management server actions (invite, list, deactivate)"
```

---

## Task 4: Componentes de UI — Eventos

**Files:**
- Create: `src/components/eventos/status-badge.tsx`
- Create: `src/components/eventos/evento-card.tsx`
- Create: `src/components/eventos/evento-form.tsx`
- Create: `src/components/eventos/status-transition.tsx`

- [ ] **Step 4.1: StatusBadge**

Criar `src/components/eventos/status-badge.tsx`:
```tsx
import { cn } from '@/lib/utils'
import type { EventoStatus } from '@/types'

const statusConfig: Record<EventoStatus, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700' },
  aberto: { label: 'Aberto', className: 'bg-green-100 text-green-700' },
  em_andamento: { label: 'Em andamento', className: 'bg-blue-100 text-blue-700' },
  encerrado: { label: 'Encerrado', className: 'bg-red-100 text-red-700' },
}

export function StatusBadge({ status }: { status: EventoStatus }) {
  const config = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}
```

- [ ] **Step 4.2: EventoCard**

Criar `src/components/eventos/evento-card.tsx`:
```tsx
import Link from 'next/link'
import { Calendar, MapPin, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from './status-badge'
import type { EventoStatus } from '@/types'

interface EventoCardProps {
  id: string
  nome: string
  tipo: string
  data_inicio: string
  data_fim: string
  cidade: string
  estado: string
  status: EventoStatus
  modalidadesCount?: number
}

export function EventoCard({ id, nome, tipo, data_inicio, cidade, estado, status, modalidadesCount }: EventoCardProps) {
  return (
    <Link href={`/eventos/${id}`}>
      <Card className="hover:border-amber-400 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{nome}</CardTitle>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-gray-500 capitalize">{tipo}</p>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(data_inicio).toLocaleDateString('pt-BR')}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {cidade}/{estado}
          </div>
          {modalidadesCount !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {modalidadesCount} modalidade(s)
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 4.3: EventoForm**

Criar `src/components/eventos/evento-form.tsx`:
```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { eventoSchema, createEvento, updateEvento } from '@/actions/eventos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type FormData = z.infer<typeof eventoSchema>

interface EventoFormProps {
  eventoId?: string
  defaultValues?: Partial<FormData>
}

export function EventoForm({ eventoId, defaultValues }: EventoFormProps) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(eventoSchema),
    defaultValues,
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(data: FormData) {
    setLoading(true)
    setServerError(null)
    const result = eventoId
      ? await updateEvento(eventoId, data)
      : await createEvento(data)

    if ('error' in result) {
      setServerError(result.error)
      setLoading(false)
      return
    }
    router.push('/eventos')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label>Nome do evento</Label>
        <Input {...register('nome')} />
        {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
      </div>

      <div className="space-y-1">
        <Label>Tipo</Label>
        <Select onValueChange={v => setValue('tipo', v as 'vaquejada' | 'tambor')}
          defaultValue={defaultValues?.tipo}>
          <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vaquejada">Vaquejada</SelectItem>
            <SelectItem value="tambor">Prova de Tambor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Data início</Label>
          <Input type="date" {...register('data_inicio')} />
        </div>
        <div className="space-y-1">
          <Label>Data fim</Label>
          <Input type="date" {...register('data_fim')} />
          {errors.data_fim && <p className="text-xs text-red-500">{errors.data_fim.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Cidade</Label>
          <Input {...register('cidade')} />
        </div>
        <div className="space-y-1">
          <Label>Estado (UF)</Label>
          <Input {...register('estado')} maxLength={2} className="uppercase" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Local (opcional)</Label>
        <Input {...register('local')} />
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button type="submit" disabled={loading} className="bg-amber-700 hover:bg-amber-800">
        {loading ? 'Salvando...' : eventoId ? 'Salvar alterações' : 'Criar evento'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4.4: StatusTransition**

Criar `src/components/eventos/status-transition.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { transitionEventoStatus } from '@/actions/eventos'
import type { EventoStatus } from '@/types'

const transitions: Record<EventoStatus, { to: EventoStatus; label: string; variant: 'default' | 'destructive' } | null> = {
  rascunho: { to: 'aberto', label: 'Abrir vendas', variant: 'default' },
  aberto: { to: 'em_andamento', label: 'Iniciar prova', variant: 'default' },
  em_andamento: { to: 'encerrado', label: 'Encerrar prova', variant: 'destructive' },
  encerrado: null,
}

export function StatusTransition({ eventoId, currentStatus }: { eventoId: string; currentStatus: EventoStatus }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const transition = transitions[currentStatus]

  if (!transition) return <p className="text-sm text-gray-500">Evento encerrado.</p>

  async function handleTransition() {
    if (!confirm(`Confirmar: ${transition!.label}?`)) return
    setLoading(true)
    const result = await transitionEventoStatus(eventoId, transition!.to)
    if ('error' in result) setError(result.error)
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleTransition}
        disabled={loading}
        variant={transition.variant}
        className={transition.variant === 'default' ? 'bg-amber-700 hover:bg-amber-800' : ''}
      >
        {loading ? 'Processando...' : transition.label}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4.5: Adicionar Select ao shadcn**

```bash
pnpm dlx shadcn@latest add select badge separator
```

- [ ] **Step 4.6: Commit**

```bash
git add src/components/eventos/
git commit -m "feat: evento UI components (card, form, status badge, transitions)"
```

---

## Task 5: Páginas de Eventos

**Files:**
- Modify: `src/app/(tenant)/eventos/page.tsx`
- Create: `src/app/(tenant)/eventos/novo/page.tsx`
- Create: `src/app/(tenant)/eventos/[id]/page.tsx`
- Create: `src/app/(tenant)/eventos/[id]/modalidades/page.tsx`

- [ ] **Step 5.1: Lista de eventos**

Sobrescrever `src/app/(tenant)/eventos/page.tsx`:
```tsx
import { getEventos } from '@/actions/eventos'
import { EventoCard } from '@/components/eventos/evento-card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { EventoStatus } from '@/types'

export default async function EventosPage() {
  const result = await getEventos()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
        <Button asChild className="bg-amber-700 hover:bg-amber-800">
          <Link href="/eventos/novo"><Plus className="h-4 w-4 mr-2" />Novo evento</Link>
        </Button>
      </div>

      {'error' in (result ?? {}) ? (
        <p className="text-red-500">{(result as any).error}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {result.data?.map(evento => (
            <EventoCard
              key={evento.id}
              id={evento.id}
              nome={evento.nome}
              tipo={evento.tipo}
              data_inicio={evento.data_inicio}
              data_fim={evento.data_fim}
              cidade={evento.cidade ?? ''}
              estado={evento.estado ?? ''}
              status={evento.status as EventoStatus}
            />
          ))}
          {result.data?.length === 0 && (
            <p className="col-span-3 text-gray-500 text-center py-12">
              Nenhum evento criado ainda.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5.2: Criar novo evento**

Criar `src/app/(tenant)/eventos/novo/page.tsx`:
```tsx
import { EventoForm } from '@/components/eventos/evento-form'

export default function NovoEventoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Evento</h1>
      <EventoForm />
    </div>
  )
}
```

- [ ] **Step 5.3: Detalhe do evento**

Criar `src/app/(tenant)/eventos/[id]/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EventoForm } from '@/components/eventos/evento-form'
import { StatusBadge } from '@/components/eventos/status-badge'
import { StatusTransition } from '@/components/eventos/status-transition'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { EventoStatus } from '@/types'

export default async function EventoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: evento } = await supabase
    .from('eventos')
    .select('*')
    .eq('id', id)
    .single()

  if (!evento) notFound()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{evento.nome}</h1>
          <StatusBadge status={evento.status as EventoStatus} />
        </div>
        <StatusTransition eventoId={id} currentStatus={evento.status as EventoStatus} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Editar dados</h2>
          <EventoForm eventoId={id} defaultValues={evento} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Ações</h2>
          <div className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/eventos/${id}/modalidades`}>Modalidades e critérios</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/eventos/${id}/senhas`}>Senhas vendidas</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/eventos/${id}/checkin`}>Check-in</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/eventos/${id}/ranking`}>Ranking</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5.4: Página de modalidades**

Criar `src/app/(tenant)/eventos/[id]/modalidades/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { getModalidades, getCriteriosPadrao } from '@/actions/modalidades'
import { ModalidadeForm } from '@/components/eventos/modalidade-form'
import { formatMoney } from '@/lib/utils/money'

export default async function ModalidadesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: evento } = await supabase.from('eventos').select('tipo, nome').eq('id', id).single()
  const { data: modalidades } = await getModalidades(id)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Modalidades — {evento?.nome}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modalidades?.map(m => (
          <div key={m.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <h3 className="font-semibold">{m.nome}</h3>
              <span className="text-sm text-gray-500">{formatMoney(m.valor_senha)}/senha</span>
            </div>
            <p className="text-sm text-gray-600">{m.total_senhas} senhas | {m.senhas_vendidas} vendidas</p>
            {m.premiacao_descricao && <p className="text-xs text-amber-700">{m.premiacao_descricao}</p>}
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Adicionar modalidade</h2>
        <ModalidadeForm eventoId={id} tipoProva={evento?.tipo as 'vaquejada' | 'tambor'} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5.5: ModalidadeForm component**

Criar `src/components/eventos/modalidade-form.tsx`:
```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { modalidadeSchema, createModalidade } from '@/actions/modalidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type FormData = z.infer<typeof modalidadeSchema>

export function ModalidadeForm({ eventoId, tipoProva }: { eventoId: string; tipoProva: 'vaquejada' | 'tambor' }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(modalidadeSchema),
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(data: FormData) {
    setLoading(true)
    const result = await createModalidade(eventoId, {
      ...data,
      valor_senha: Math.round(data.valor_senha * 100), // reais → centavos
    })
    if ('error' in result) { setServerError(result.error); setLoading(false); return }
    reset()
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Nome da modalidade</Label>
        <Input {...register('nome')} placeholder="Ex: Aberto, Amador, Mirim" />
        {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Valor da senha (R$)</Label>
          <Input type="number" step="0.01" min="0" {...register('valor_senha', { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Total de senhas</Label>
          <Input type="number" min="1" {...register('total_senhas', { valueAsNumber: true })} />
          {errors.total_senhas && <p className="text-xs text-red-500">{errors.total_senhas.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label>Premiação (opcional)</Label>
        <Input {...register('premiacao_descricao')} placeholder="Ex: 1º lugar: R$ 5.000" />
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={loading} className="bg-amber-700 hover:bg-amber-800">
        {loading ? 'Salvando...' : 'Adicionar modalidade'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5.6: Commit**

```bash
git add src/app/ src/components/eventos/
git commit -m "feat: event and modalidade pages (list, create, detail, modalidades)"
```

---

## Task 6: Página Pública do Evento

**Files:**
- Modify: `src/app/evento/[id]/page.tsx`

- [ ] **Step 6.1: Implementar página pública**

Sobrescrever `src/app/evento/[id]/page.tsx`:
```tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { formatMoney } from '@/lib/utils/money'
import { StatusBadge } from '@/components/eventos/status-badge'
import { Calendar, MapPin, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { EventoStatus } from '@/types'

export default async function PublicEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Usa admin client para leitura pública sem auth
  const supabase = createAdminClient()
  const { data: evento } = await supabase
    .from('eventos')
    .select('*, modalidades(*)')
    .eq('id', id)
    .in('status', ['aberto', 'em_andamento', 'encerrado'])
    .single()

  if (!evento) notFound()

  return (
    <main className="min-h-screen bg-amber-50">
      {evento.banner_url && (
        <img src={evento.banner_url} alt={evento.nome} className="w-full h-48 object-cover" />
      )}
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-amber-900">{evento.nome}</h1>
            <StatusBadge status={evento.status as EventoStatus} />
          </div>
          <div className="flex gap-4 text-gray-600 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(evento.data_inicio).toLocaleDateString('pt-BR')}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {evento.cidade}/{evento.estado}
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-amber-900 mb-4">Modalidades</h2>
          <div className="grid gap-4">
            {evento.modalidades?.map((m: any) => (
              <div key={m.id} className="bg-white rounded-lg border p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">{m.nome}</h3>
                  <span className="text-xl font-bold text-amber-700">{formatMoney(m.valor_senha)}</span>
                </div>
                <p className="text-sm text-gray-500">
                  {m.senhas_vendidas}/{m.total_senhas} senhas vendidas
                </p>
                {m.premiacao_descricao && (
                  <p className="text-sm flex items-center gap-1 text-amber-700">
                    <Trophy className="h-4 w-4" />
                    {m.premiacao_descricao}
                  </p>
                )}
                {evento.status === 'aberto' && m.senhas_vendidas < m.total_senhas && (
                  <Button asChild className="w-full bg-amber-700 hover:bg-amber-800 mt-2">
                    <Link href={`/evento/${id}/inscricao?modalidade=${m.id}`}>
                      Comprar senha
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 6.2: Commit**

```bash
git add src/app/evento/
git commit -m "feat: public event page (no auth, shows modalidades and buy button)"
```

---

## Task 7: Página de Equipe

**Files:**
- Modify: `src/app/(tenant)/equipe/page.tsx`

- [ ] **Step 7.1: Implementar página de equipe**

Sobrescrever `src/app/(tenant)/equipe/page.tsx`:
```tsx
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
```

Criar `src/components/equipe/convite-form.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { convidarMembro } from '@/actions/equipe'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ConviteForm() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'financeiro' | 'juiz' | 'locutor'>('juiz')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await convidarMembro({ nome, email, role })
    if ('error' in result) { setError(result.error); setLoading(false); return }
    setSuccess(true)
    router.refresh()
  }

  if (success) return <p className="text-green-600">Convite enviado para {email}!</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-1">
        <Label>Nome</Label>
        <Input value={nome} onChange={e => setNome(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>Função</Label>
        <Select value={role} onValueChange={v => setRole(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="financeiro">Financeiro</SelectItem>
            <SelectItem value="juiz">Juiz</SelectItem>
            <SelectItem value="locutor">Locutor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="bg-amber-700 hover:bg-amber-800">
        {loading ? 'Enviando...' : 'Enviar convite'}
      </Button>
    </form>
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
git commit -m "feat: team management page + convite form"
git tag v0.2.0-event-management
```
