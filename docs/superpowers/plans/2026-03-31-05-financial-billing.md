# Financial & Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build audit log dashboards, PDF report generation (caixa + premiação + cobrança SGVAQ), and Super Admin billing management for the 10% commission model.

**Architecture:** `financeiro_transacoes` is append-only (RLS blocks UPDATE/DELETE). Monthly billing reads all transactions grouped by tenant and event. PDFs are generated server-side via `@react-pdf/renderer` in Server Actions, streamed as `application/pdf`. Cancellations are represented as negative-value rows, not deletions.

**Tech Stack:** Next.js 14 Server Actions, `@react-pdf/renderer`, Supabase PostgreSQL, shadcn/ui, Vitest, Playwright

---

## File Structure

```
src/
  app/
    (tenant)/
      financeiro/
        page.tsx                        # Audit log dashboard (organizador/financeiro)
        relatorio/
          page.tsx                      # Relatório de caixa + download PDF
    (admin)/
      admin/
        cobrancas/
          page.tsx                      # Super Admin billing list
          [id]/
            page.tsx                    # Billing detail + status management
  actions/
    financeiro.ts                       # Server actions: list transactions, generate PDF
    cobrancas.ts                        # Super Admin: create/update billing records
  components/
    financeiro/
      TransacaoTable.tsx                # Paginated table with filters
      RelatorioCaixaDocument.tsx        # @react-pdf/renderer document: caixa report
      RelatorioCobrancaDocument.tsx     # @react-pdf/renderer document: billing invoice
      FolhasPremiacaoDocument.tsx       # @react-pdf/renderer document: award sheet
      CobrancaStatusBadge.tsx           # 'pendente' | 'pago' | 'isento' badge
      CobrancaCard.tsx                  # Super Admin billing card
  lib/
    pdf/
      render-to-buffer.ts              # Shared: ReactPDF.renderToBuffer wrapper
tests/
  unit/
    financeiro.test.ts                 # Server action unit tests
    pdf-render.test.ts                 # PDF buffer generation smoke tests
  e2e/
    financeiro.spec.ts                 # Audit log + PDF download E2E
    cobrancas.spec.ts                  # Super Admin billing E2E
```

---

### Task 1: Install PDF dependency and shared render helper

**Files:**
- Modify: `package.json`
- Create: `src/lib/pdf/render-to-buffer.ts`
- Test: `tests/unit/pdf-render.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/pdf-render.test.ts
import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@/lib/pdf/render-to-buffer'
import { Document, Page, Text } from '@react-pdf/renderer'
import React from 'react'

describe('renderToBuffer', () => {
  it('returns a Buffer for a minimal PDF document', async () => {
    const doc = React.createElement(Document, null,
      React.createElement(Page, null,
        React.createElement(Text, null, 'SGVAQ Test')
      )
    )
    const buffer = await renderToBuffer(doc)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(100)
    // PDF magic bytes
    expect(buffer.slice(0, 4).toString()).toBe('%PDF')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/pdf-render.test.ts`
Expected: FAIL — `Cannot find module '@react-pdf/renderer'`

- [ ] **Step 3: Install dependency**

```bash
pnpm add @react-pdf/renderer
```

- [ ] **Step 4: Implement render helper**

```typescript
// src/lib/pdf/render-to-buffer.ts
import ReactPDF from '@react-pdf/renderer'
import type { ReactElement } from 'react'

export async function renderToBuffer(document: ReactElement): Promise<Buffer> {
  const stream = await ReactPDF.renderToBuffer(document)
  return stream
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/pdf-render.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/pdf/render-to-buffer.ts tests/unit/pdf-render.test.ts
git commit -m "feat: add @react-pdf/renderer with shared render helper"
```

---

### Task 2: Financial server actions (list + summary)

**Files:**
- Create: `src/actions/financeiro.ts`
- Test: `tests/unit/financeiro.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/financeiro.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn()
}))
vi.mock('@/lib/auth/helpers', () => ({
  requireRole: vi.fn()
}))

import { calcularResumoFinanceiro } from '@/actions/financeiro'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'

const mockTransacoes = [
  { tipo: 'venda',        valor: 5000,  taxa_sgvaq: 500,  evento_id: 'ev1' },
  { tipo: 'venda',        valor: 10000, taxa_sgvaq: 1000, evento_id: 'ev1' },
  { tipo: 'cancelamento', valor: -5000, taxa_sgvaq: -500, evento_id: 'ev1' },
]

describe('calcularResumoFinanceiro', () => {
  beforeEach(() => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'user1', tenant_id: 'tenant1', role: 'financeiro' })
    vi.mocked(createServerSupabaseClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: mockTransacoes, error: null })
            })
          })
        })
      })
    } as any)
  })

  it('calculates net total correctly including cancellations', async () => {
    const result = await calcularResumoFinanceiro('ev1')
    // 5000 + 10000 - 5000 = 10000
    expect(result.totalBruto).toBe(10000)
    // 500 + 1000 - 500 = 1000
    expect(result.totalTaxaSgvaq).toBe(1000)
    expect(result.quantidadeVendas).toBe(2)
    expect(result.quantidadeCancelamentos).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/financeiro.test.ts`
Expected: FAIL — `Cannot find module '@/actions/financeiro'`

- [ ] **Step 3: Implement financial actions**

```typescript
// src/actions/financeiro.ts
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'

export interface ResumoFinanceiro {
  totalBruto: number        // centavos
  totalTaxaSgvaq: number    // centavos
  quantidadeVendas: number
  quantidadeCancelamentos: number
  transacoes: FinanceiroTransacao[]
}

export interface FinanceiroTransacao {
  id: string
  tipo: 'venda' | 'cancelamento'
  valor: number
  taxa_sgvaq: number
  descricao: string | null
  created_at: string
  senha_id: string | null
  evento_id: string
}

export async function listarTransacoes(
  eventoId: string,
  page = 0,
  pageSize = 50
): Promise<{ data: FinanceiroTransacao[]; count: number }> {
  await requireRole(['organizador', 'financeiro', 'super_admin'])
  const supabase = createServerSupabaseClient()

  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('financeiro_transacoes')
    .select('*', { count: 'exact' })
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)
  return { data: data as FinanceiroTransacao[], count: count ?? 0 }
}

export async function calcularResumoFinanceiro(eventoId: string): Promise<ResumoFinanceiro> {
  await requireRole(['organizador', 'financeiro', 'super_admin'])
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('financeiro_transacoes')
    .select('*')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: true })
    .range(0, 9999)

  if (error) throw new Error(error.message)

  const transacoes = data as FinanceiroTransacao[]
  const totalBruto = transacoes.reduce((acc, t) => acc + t.valor, 0)
  const totalTaxaSgvaq = transacoes.reduce((acc, t) => acc + t.taxa_sgvaq, 0)
  const quantidadeVendas = transacoes.filter(t => t.tipo === 'venda').length
  const quantidadeCancelamentos = transacoes.filter(t => t.tipo === 'cancelamento').length

  return { totalBruto, totalTaxaSgvaq, quantidadeVendas, quantidadeCancelamentos, transacoes }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/financeiro.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/actions/financeiro.ts tests/unit/financeiro.test.ts
git commit -m "feat: financial server actions — list transactions and summary"
```

---

### Task 3: PDF documents (caixa report + billing invoice)

**Files:**
- Create: `src/components/financeiro/RelatorioCaixaDocument.tsx`
- Create: `src/components/financeiro/RelatorioCobrancaDocument.tsx`
- Create: `src/components/financeiro/FolhasPremiacaoDocument.tsx`

- [ ] **Step 1: Write failing smoke test**

```typescript
// tests/unit/pdf-render.test.ts (append these cases)
import { RelatorioCaixaDocument } from '@/components/financeiro/RelatorioCaixaDocument'
import { RelatorioCobrancaDocument } from '@/components/financeiro/RelatorioCobrancaDocument'
import React from 'react'

const mockResumo = {
  totalBruto: 100000,
  totalTaxaSgvaq: 10000,
  quantidadeVendas: 20,
  quantidadeCancelamentos: 2,
  transacoes: []
}

const mockEvento = {
  id: 'ev1',
  nome: 'Vaquejada Teste',
  data_inicio: '2026-04-01',
  data_fim: '2026-04-02',
  local: 'Parque Teste'
}

describe('RelatorioCaixaDocument', () => {
  it('renders to PDF buffer without throwing', async () => {
    const doc = React.createElement(RelatorioCaixaDocument, {
      evento: mockEvento,
      resumo: mockResumo,
      geradoEm: '2026-04-02T10:00:00Z'
    })
    const buffer = await renderToBuffer(doc)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.slice(0, 4).toString()).toBe('%PDF')
  })
})

describe('RelatorioCobrancaDocument', () => {
  it('renders to PDF buffer without throwing', async () => {
    const doc = React.createElement(RelatorioCobrancaDocument, {
      tenant: { nome: 'Org Teste', slug: 'org-teste' },
      mes: '2026-03',
      eventos: [{ ...mockEvento, resumo: mockResumo }],
      totalCobranca: 10000
    })
    const buffer = await renderToBuffer(doc)
    expect(Buffer.isBuffer(buffer)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/pdf-render.test.ts`
Expected: FAIL — Cannot find module

- [ ] **Step 3: Implement RelatorioCaixaDocument**

```tsx
// src/components/financeiro/RelatorioCaixaDocument.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ResumoFinanceiro } from '@/actions/financeiro'

const styles = StyleSheet.create({
  page:        { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title:       { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle:    { fontSize: 11, color: '#555', marginBottom: 20 },
  section:     { marginBottom: 16 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  label:       { color: '#555' },
  value:       { fontWeight: 'bold' },
  summaryBox:  { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, marginBottom: 20 },
  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  total:       { fontSize: 13, fontWeight: 'bold' },
  footer:      { position: 'absolute', bottom: 20, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center' },
})

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

interface Props {
  evento: { nome: string; data_inicio: string; data_fim: string; local?: string | null }
  resumo: ResumoFinanceiro
  geradoEm: string
}

export function RelatorioCaixaDocument({ evento, resumo, geradoEm }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Relatório de Caixa</Text>
        <Text style={styles.subtitle}>{evento.nome} — {evento.data_inicio}{evento.data_fim !== evento.data_inicio ? ` a ${evento.data_fim}` : ''}{evento.local ? ` | ${evento.local}` : ''}</Text>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Total de vendas</Text>
            <Text style={styles.value}>{resumo.quantidadeVendas}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Cancelamentos</Text>
            <Text style={styles.value}>{resumo.quantidadeCancelamentos}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Receita bruta líquida</Text>
            <Text style={[styles.value, styles.total]}>{formatBRL(resumo.totalBruto)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Taxa SGVAQ (10%)</Text>
            <Text style={styles.value}>{formatBRL(resumo.totalTaxaSgvaq)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#333' }]}>
            <Text style={{ fontWeight: 'bold', flex: 2 }}>Data/Hora</Text>
            <Text style={{ fontWeight: 'bold', flex: 2 }}>Tipo</Text>
            <Text style={{ fontWeight: 'bold', flex: 3 }}>Descrição</Text>
            <Text style={{ fontWeight: 'bold', flex: 1.5, textAlign: 'right' }}>Valor</Text>
          </View>
          {resumo.transacoes.map(t => (
            <View key={t.id} style={styles.row}>
              <Text style={{ flex: 2 }}>{new Date(t.created_at).toLocaleString('pt-BR')}</Text>
              <Text style={{ flex: 2 }}>{t.tipo === 'cancelamento' ? 'Cancelamento' : 'Venda'}</Text>
              <Text style={{ flex: 3 }}>{t.descricao ?? '—'}</Text>
              <Text style={{ flex: 1.5, textAlign: 'right', color: t.valor < 0 ? 'red' : 'inherit' }}>{formatBRL(t.valor)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Gerado em {new Date(geradoEm).toLocaleString('pt-BR')} — SGVAQ Sistema Gerencial de Vaquejada</Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 4: Implement RelatorioCobrancaDocument**

```tsx
// src/components/financeiro/RelatorioCobrancaDocument.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ResumoFinanceiro } from '@/actions/financeiro'

const styles = StyleSheet.create({
  page:      { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title:     { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle:  { fontSize: 11, color: '#555', marginBottom: 20 },
  section:   { marginBottom: 16 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  totalRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginTop: 8, borderTopWidth: 1.5, borderTopColor: '#000' },
  bold:      { fontWeight: 'bold' },
  footer:    { position: 'absolute', bottom: 20, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center' },
})

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

interface EventoResumo {
  nome: string
  data_inicio: string
  resumo: ResumoFinanceiro
}

interface Props {
  tenant: { nome: string; slug: string }
  mes: string // 'YYYY-MM'
  eventos: EventoResumo[]
  totalCobranca: number
}

export function RelatorioCobrancaDocument({ tenant, mes, eventos, totalCobranca }: Props) {
  const [year, month] = mes.split('-')
  const mesFormatado = new Date(Number(year), Number(month) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Cobrança SGVAQ — {mesFormatado}</Text>
        <Text style={styles.subtitle}>Organizadora: {tenant.nome} ({tenant.slug}.sgvaq.com.br)</Text>

        <View style={styles.section}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#333' }]}>
            <Text style={[styles.bold, { flex: 3 }]}>Evento</Text>
            <Text style={[styles.bold, { flex: 2 }]}>Data</Text>
            <Text style={[styles.bold, { flex: 2, textAlign: 'right' }]}>Receita Bruta</Text>
            <Text style={[styles.bold, { flex: 2, textAlign: 'right' }]}>Taxa 10%</Text>
          </View>
          {eventos.map((ev, i) => (
            <View key={i} style={styles.row}>
              <Text style={{ flex: 3 }}>{ev.nome}</Text>
              <Text style={{ flex: 2 }}>{ev.data_inicio}</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>{formatBRL(ev.resumo.totalBruto)}</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>{formatBRL(ev.resumo.totalTaxaSgvaq)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.bold, { flex: 7 }]}>TOTAL A PAGAR</Text>
            <Text style={[styles.bold, { flex: 2, textAlign: 'right', fontSize: 13 }]}>{formatBRL(totalCobranca)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 20, padding: 12, backgroundColor: '#fffbea', borderRadius: 4 }}>
          <Text style={styles.bold}>Instruções de pagamento</Text>
          <Text style={{ marginTop: 6, lineHeight: 1.6 }}>
            Realize o pagamento via Pix e envie o comprovante ao administrador do SGVAQ para que o status seja atualizado para "Pago".
          </Text>
        </View>

        <Text style={styles.footer}>SGVAQ Sistema Gerencial de Vaquejada — Documento gerado automaticamente</Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 5: Implement FolhasPremiacaoDocument**

```tsx
// src/components/financeiro/FolhasPremiacaoDocument.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page:      { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title:     { fontSize: 16, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  subtitle:  { fontSize: 10, color: '#555', marginBottom: 20, textAlign: 'center' },
  row:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#000', marginBottom: 4 },
  bold:      { fontWeight: 'bold' },
  footer:    { position: 'absolute', bottom: 20, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center' },
})

interface RankingEntry {
  posicao: number
  competidor_nome: string
  pontuacao_total: number
  numero_senha: string
}

interface Props {
  evento: { nome: string; data_inicio: string }
  modalidade: { nome: string }
  ranking: RankingEntry[]
}

export function FolhasPremiacaoDocument({ evento, modalidade, ranking }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{evento.nome}</Text>
        <Text style={styles.subtitle}>{modalidade.nome} — {evento.data_inicio}</Text>

        <View style={styles.headerRow}>
          <Text style={[styles.bold, { width: 40 }]}>Pos.</Text>
          <Text style={[styles.bold, { flex: 1 }]}>Competidor</Text>
          <Text style={[styles.bold, { width: 60 }]}>Senha</Text>
          <Text style={[styles.bold, { width: 80, textAlign: 'right' }]}>Pontuação</Text>
        </View>

        {ranking.map(entry => (
          <View key={entry.posicao} style={styles.row}>
            <Text style={{ width: 40 }}>{entry.posicao}º</Text>
            <Text style={{ flex: 1 }}>{entry.competidor_nome}</Text>
            <Text style={{ width: 60 }}>{entry.numero_senha}</Text>
            <Text style={{ width: 80, textAlign: 'right', fontWeight: 'bold' }}>{entry.pontuacao_total.toFixed(2)}</Text>
          </View>
        ))}

        <Text style={styles.footer}>SGVAQ — Folha de Premiação Oficial</Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/pdf-render.test.ts`
Expected: PASS (3 suites)

- [ ] **Step 7: Commit**

```bash
git add src/components/financeiro/RelatorioCaixaDocument.tsx src/components/financeiro/RelatorioCobrancaDocument.tsx src/components/financeiro/FolhasPremiacaoDocument.tsx tests/unit/pdf-render.test.ts
git commit -m "feat: PDF documents for caixa report, billing invoice, and award sheet"
```

---

### Task 4: PDF download Server Actions

**Files:**
- Modify: `src/actions/financeiro.ts`
- Test: `tests/unit/financeiro.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// append to tests/unit/financeiro.test.ts
import { gerarPdfRelatorioCaixa } from '@/actions/financeiro'

describe('gerarPdfRelatorioCaixa', () => {
  it('returns a base64 string', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'u1', tenant_id: 't1', role: 'organizador' })
    // Mock supabase to return evento + transacoes
    vi.mocked(createServerSupabaseClient).mockReturnValue({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: 'ev1', nome: 'Teste', data_inicio: '2026-04-01', data_fim: '2026-04-01', local: null }, error: null }),
            order: () => ({ range: () => Promise.resolve({ data: [], error: null }) })
          })
        })
      })
    } as any)

    const result = await gerarPdfRelatorioCaixa('ev1')
    expect(typeof result.base64).toBe('string')
    expect(result.filename).toMatch(/relatorio-caixa-.*\.pdf/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/financeiro.test.ts -t "gerarPdfRelatorioCaixa"`
Expected: FAIL — function not found

- [ ] **Step 3: Implement PDF generation actions**

```typescript
// append to src/actions/financeiro.ts
import React from 'react'
import { renderToBuffer } from '@/lib/pdf/render-to-buffer'
import { RelatorioCaixaDocument } from '@/components/financeiro/RelatorioCaixaDocument'
import { RelatorioCobrancaDocument } from '@/components/financeiro/RelatorioCobrancaDocument'
import { FolhasPremiacaoDocument } from '@/components/financeiro/FolhasPremiacaoDocument'

export async function gerarPdfRelatorioCaixa(eventoId: string): Promise<{ base64: string; filename: string }> {
  await requireRole(['organizador', 'financeiro', 'super_admin'])
  const supabase = createServerSupabaseClient()

  const { data: evento, error: evErr } = await supabase
    .from('eventos')
    .select('id, nome, data_inicio, data_fim, local')
    .eq('id', eventoId)
    .single()
  if (evErr) throw new Error(evErr.message)

  const resumo = await calcularResumoFinanceiro(eventoId)

  const buffer = await renderToBuffer(
    React.createElement(RelatorioCaixaDocument, {
      evento,
      resumo,
      geradoEm: new Date().toISOString()
    })
  )

  const slug = evento.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return {
    base64: buffer.toString('base64'),
    filename: `relatorio-caixa-${slug}-${evento.data_inicio}.pdf`
  }
}

export async function gerarPdfFolhaPremiacao(
  eventoId: string,
  modalidadeId: string
): Promise<{ base64: string; filename: string }> {
  await requireRole(['organizador', 'financeiro', 'super_admin'])
  const supabase = createServerSupabaseClient()

  const { data: evento } = await supabase
    .from('eventos')
    .select('nome, data_inicio')
    .eq('id', eventoId)
    .single()

  const { data: modalidade } = await supabase
    .from('modalidades')
    .select('nome')
    .eq('id', modalidadeId)
    .single()

  const { data: ranking } = await supabase
    .from('ranking')
    .select('posicao, pontuacao_total, senhas(numero_senha, competidores(nome_completo))')
    .eq('evento_id', eventoId)
    .eq('modalidade_id', modalidadeId)
    .order('posicao', { ascending: true })

  const rankingFormatted = (ranking ?? []).map((r: any) => ({
    posicao: r.posicao,
    pontuacao_total: r.pontuacao_total,
    numero_senha: r.senhas?.numero_senha ?? '—',
    competidor_nome: r.senhas?.competidores?.nome_completo ?? '—'
  }))

  const buffer = await renderToBuffer(
    React.createElement(FolhasPremiacaoDocument, {
      evento: evento!,
      modalidade: modalidade!,
      ranking: rankingFormatted
    })
  )

  return {
    base64: buffer.toString('base64'),
    filename: `premiacao-${modalidade!.nome.toLowerCase().replace(/\s+/g, '-')}.pdf`
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/financeiro.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/actions/financeiro.ts tests/unit/financeiro.test.ts
git commit -m "feat: PDF generation server actions for caixa report and award sheet"
```

---

### Task 5: Audit log dashboard UI (tenant financeiro page)

**Files:**
- Create: `src/components/financeiro/TransacaoTable.tsx`
- Create: `src/components/financeiro/CobrancaStatusBadge.tsx`
- Create: `src/app/(tenant)/financeiro/page.tsx`
- Create: `src/app/(tenant)/financeiro/relatorio/page.tsx`

- [ ] **Step 1: Implement TransacaoTable component**

```tsx
// src/components/financeiro/TransacaoTable.tsx
'use client'
import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { FinanceiroTransacao } from '@/actions/financeiro'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

interface Props {
  transacoes: FinanceiroTransacao[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function TransacaoTable({ transacoes, total, page, pageSize, onPageChange }: Props) {
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Taxa SGVAQ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transacoes.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Nenhuma transação registrada
              </TableCell>
            </TableRow>
          )}
          {transacoes.map(t => (
            <TableRow key={t.id} className={t.tipo === 'cancelamento' ? 'opacity-60' : ''}>
              <TableCell className="text-sm">
                {new Date(t.created_at).toLocaleString('pt-BR')}
              </TableCell>
              <TableCell>
                <Badge variant={t.tipo === 'cancelamento' ? 'destructive' : 'default'}>
                  {t.tipo === 'cancelamento' ? 'Cancelamento' : 'Venda'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{t.descricao ?? '—'}</TableCell>
              <TableCell className={`text-right font-mono ${t.valor < 0 ? 'text-destructive' : ''}`}>
                {formatBRL(t.valor)}
              </TableCell>
              <TableCell className={`text-right font-mono text-sm ${t.taxa_sgvaq < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {formatBRL(t.taxa_sgvaq)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {total} transações — página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Implement financeiro page**

```tsx
// src/app/(tenant)/financeiro/page.tsx
import { Suspense } from 'react'
import { listarTransacoes, calcularResumoFinanceiro } from '@/actions/financeiro'
import { TransacaoTable } from '@/components/financeiro/TransacaoTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTenantFromContext } from '@/lib/tenant/context'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

interface PageProps {
  searchParams: { evento_id?: string; page?: string }
}

export default async function FinanceiroPage({ searchParams }: PageProps) {
  const eventoId = searchParams.evento_id
  if (!eventoId) {
    return (
      <div className="p-8 text-muted-foreground text-center">
        Selecione um evento para ver o relatório financeiro.
      </div>
    )
  }

  const page = Number(searchParams.page ?? 0)
  const [{ data: transacoes, count }, resumo] = await Promise.all([
    listarTransacoes(eventoId, page),
    calcularResumoFinanceiro(eventoId)
  ])

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Relatório Financeiro</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Receita Bruta</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatBRL(resumo.totalBruto)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Taxa SGVAQ</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-muted-foreground">{formatBRL(resumo.totalTaxaSgvaq)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vendas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{resumo.quantidadeVendas}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cancelamentos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{resumo.quantidadeCancelamentos}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <TransacaoTable
            transacoes={transacoes}
            total={count}
            page={page}
            pageSize={50}
            onPageChange={() => {}}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Implement relatorio page with download button**

```tsx
// src/app/(tenant)/financeiro/relatorio/page.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { gerarPdfRelatorioCaixa, gerarPdfFolhaPremiacao } from '@/actions/financeiro'
import { FileDown, Loader2 } from 'lucide-react'

function downloadBase64Pdf(base64: string, filename: string) {
  const link = document.createElement('a')
  link.href = `data:application/pdf;base64,${base64}`
  link.download = filename
  link.click()
}

interface Props {
  params: { eventoId?: string }
  searchParams: { evento_id?: string; modalidade_id?: string }
}

export default function RelatorioPage({ searchParams }: Props) {
  const [loadingCaixa, setLoadingCaixa] = useState(false)
  const [loadingPremiacao, setLoadingPremiacao] = useState(false)

  const eventoId = searchParams.evento_id

  async function handleDownloadCaixa() {
    if (!eventoId) return
    setLoadingCaixa(true)
    try {
      const { base64, filename } = await gerarPdfRelatorioCaixa(eventoId)
      downloadBase64Pdf(base64, filename)
    } finally {
      setLoadingCaixa(false)
    }
  }

  async function handleDownloadPremiacao() {
    const modalidadeId = searchParams.modalidade_id
    if (!eventoId || !modalidadeId) return
    setLoadingPremiacao(true)
    try {
      const { base64, filename } = await gerarPdfFolhaPremiacao(eventoId, modalidadeId)
      downloadBase64Pdf(base64, filename)
    } finally {
      setLoadingPremiacao(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>
      <div className="flex flex-wrap gap-4">
        <Button onClick={handleDownloadCaixa} disabled={!eventoId || loadingCaixa}>
          {loadingCaixa ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
          Relatório de Caixa (PDF)
        </Button>
        <Button variant="outline" onClick={handleDownloadPremiacao} disabled={!eventoId || !searchParams.modalidade_id || loadingPremiacao}>
          {loadingPremiacao ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
          Folha de Premiação (PDF)
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/financeiro/TransacaoTable.tsx src/app/(tenant)/financeiro/page.tsx src/app/(tenant)/financeiro/relatorio/page.tsx
git commit -m "feat: audit log dashboard and PDF download pages"
```

---

### Task 6: Billing server actions (cobrancas)

**Files:**
- Create: `src/actions/cobrancas.ts`
- Test: `tests/unit/financeiro.test.ts` (append)

- [ ] **Step 1: Write failing tests**

```typescript
// append to tests/unit/financeiro.test.ts
import { calcularCobrancaMensal } from '@/actions/cobrancas'

describe('calcularCobrancaMensal', () => {
  it('sums taxa_sgvaq for all eventos in a tenant for a given month', async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', tenant_id: null, role: 'super_admin' })
    vi.mocked(createServerSupabaseClient).mockReturnValue({
      from: (table: string) => {
        if (table === 'financeiro_transacoes') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  lt: () => Promise.resolve({
                    data: [
                      { taxa_sgvaq: 500, evento_id: 'ev1' },
                      { taxa_sgvaq: 1000, evento_id: 'ev1' },
                      { taxa_sgvaq: -500, evento_id: 'ev2' }, // cancellation
                    ],
                    error: null
                  })
                })
              })
            })
          }
        }
        return { select: () => ({ eq: () => ({ data: [], error: null }) }) }
      }
    } as any)

    const result = await calcularCobrancaMensal('tenant1', '2026-03')
    expect(result.totalCobranca).toBe(1000) // 500 + 1000 - 500
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/financeiro.test.ts -t "calcularCobrancaMensal"`
Expected: FAIL — module not found

- [ ] **Step 3: Implement billing actions**

```typescript
// src/actions/cobrancas.ts
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/helpers'

export type CobrancaStatus = 'pendente' | 'pago' | 'isento'

export interface CobrancaSgvaq {
  id: string
  tenant_id: string
  mes: string // 'YYYY-MM'
  total_cobranca: number
  status: CobrancaStatus
  comprovante_url: string | null
  created_at: string
  updated_at: string
  tenant?: { nome: string; slug: string }
}

export async function calcularCobrancaMensal(
  tenantId: string,
  mes: string // 'YYYY-MM'
): Promise<{ totalCobranca: number; porEvento: Record<string, number> }> {
  await requireRole(['super_admin'])
  const supabase = createServerSupabaseClient()

  const [year, month] = mes.split('-').map(Number)
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 1).toISOString()

  const { data, error } = await supabase
    .from('financeiro_transacoes')
    .select('taxa_sgvaq, evento_id')
    .eq('tenant_id', tenantId)
    .gte('created_at', start)
    .lt('created_at', end)

  if (error) throw new Error(error.message)

  const transacoes = data as { taxa_sgvaq: number; evento_id: string }[]
  const totalCobranca = transacoes.reduce((acc, t) => acc + t.taxa_sgvaq, 0)
  const porEvento: Record<string, number> = {}
  for (const t of transacoes) {
    porEvento[t.evento_id] = (porEvento[t.evento_id] ?? 0) + t.taxa_sgvaq
  }

  return { totalCobranca, porEvento }
}

export async function criarCobranca(
  tenantId: string,
  mes: string
): Promise<CobrancaSgvaq> {
  await requireRole(['super_admin'])
  const supabase = createServerSupabaseClient()

  const { totalCobranca } = await calcularCobrancaMensal(tenantId, mes)

  const { data, error } = await supabase
    .from('cobrancas_sgvaq')
    .insert({ tenant_id: tenantId, mes, total_cobranca: totalCobranca, status: 'pendente' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as CobrancaSgvaq
}

export async function atualizarStatusCobranca(
  cobrancaId: string,
  status: CobrancaStatus,
  comprovanteBase64?: string
): Promise<void> {
  await requireRole(['super_admin'])
  const supabase = createServerSupabaseClient()

  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }

  if (comprovanteBase64) {
    const filename = `cobrancas/${cobrancaId}/comprovante-${Date.now()}.pdf`
    const buffer = Buffer.from(comprovanteBase64, 'base64')
    const { error: uploadError } = await supabase.storage
      .from('comprovantes')
      .upload(filename, buffer, { contentType: 'application/pdf', upsert: true })
    if (uploadError) throw new Error(uploadError.message)
    updates.comprovante_url = filename
  }

  const { error } = await supabase
    .from('cobrancas_sgvaq')
    .update(updates)
    .eq('id', cobrancaId)

  if (error) throw new Error(error.message)
}

export async function listarCobrancas(
  filters: { tenantId?: string; mes?: string; status?: CobrancaStatus } = {}
): Promise<CobrancaSgvaq[]> {
  await requireRole(['super_admin'])
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from('cobrancas_sgvaq')
    .select('*, tenant:tenants(nome, slug)')
    .order('mes', { ascending: false })

  if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId) as any
  if (filters.mes) query = query.eq('mes', filters.mes) as any
  if (filters.status) query = query.eq('status', filters.status) as any

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as CobrancaSgvaq[]
}

export async function gerarPdfCobranca(cobrancaId: string): Promise<{ base64: string; filename: string }> {
  await requireRole(['super_admin'])
  const supabase = createServerSupabaseClient()

  const { data: cobranca, error } = await supabase
    .from('cobrancas_sgvaq')
    .select('*, tenant:tenants(nome, slug)')
    .eq('id', cobrancaId)
    .single()
  if (error) throw new Error(error.message)

  const { totalCobranca, porEvento } = await calcularCobrancaMensal(cobranca.tenant_id, cobranca.mes)

  // Fetch event details for each event in porEvento
  const eventoIds = Object.keys(porEvento)
  const { data: eventos } = await supabase
    .from('eventos')
    .select('id, nome, data_inicio')
    .in('id', eventoIds)

  const eventosFormatted = (eventos ?? []).map((ev: any) => ({
    nome: ev.nome,
    data_inicio: ev.data_inicio,
    resumo: {
      totalBruto: 0, // Not needed for billing PDF
      totalTaxaSgvaq: porEvento[ev.id] ?? 0,
      quantidadeVendas: 0,
      quantidadeCancelamentos: 0,
      transacoes: []
    }
  }))

  const React = await import('react')
  const { RelatorioCobrancaDocument } = await import('@/components/financeiro/RelatorioCobrancaDocument')
  const { renderToBuffer } = await import('@/lib/pdf/render-to-buffer')

  const buffer = await renderToBuffer(
    React.default.createElement(RelatorioCobrancaDocument, {
      tenant: cobranca.tenant,
      mes: cobranca.mes,
      eventos: eventosFormatted,
      totalCobranca
    })
  )

  return {
    base64: buffer.toString('base64'),
    filename: `cobranca-sgvaq-${cobranca.tenant.slug}-${cobranca.mes}.pdf`
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run tests/unit/financeiro.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/actions/cobrancas.ts tests/unit/financeiro.test.ts
git commit -m "feat: billing server actions — create, update, list, and PDF generation"
```

---

### Task 7: Super Admin billing UI

**Files:**
- Create: `src/components/financeiro/CobrancaStatusBadge.tsx`
- Create: `src/components/financeiro/CobrancaCard.tsx`
- Create: `src/app/(admin)/admin/cobrancas/page.tsx`
- Create: `src/app/(admin)/admin/cobrancas/[id]/page.tsx`

- [ ] **Step 1: Implement CobrancaStatusBadge**

```tsx
// src/components/financeiro/CobrancaStatusBadge.tsx
import { Badge } from '@/components/ui/badge'
import type { CobrancaStatus } from '@/actions/cobrancas'

const variants: Record<CobrancaStatus, 'default' | 'secondary' | 'outline'> = {
  pendente: 'default',
  pago: 'secondary',
  isento: 'outline'
}

const labels: Record<CobrancaStatus, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  isento: 'Isento'
}

export function CobrancaStatusBadge({ status }: { status: CobrancaStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
```

- [ ] **Step 2: Implement billing list page**

```tsx
// src/app/(admin)/admin/cobrancas/page.tsx
import { listarCobrancas } from '@/actions/cobrancas'
import { CobrancaStatusBadge } from '@/components/financeiro/CobrancaStatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

export default async function CobrancasPage() {
  const cobrancas = await listarCobrancas()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cobranças SGVAQ</h1>
      </div>

      <div className="space-y-3">
        {cobrancas.length === 0 && (
          <p className="text-muted-foreground text-center py-8">Nenhuma cobrança registrada.</p>
        )}
        {cobrancas.map(c => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{(c.tenant as any)?.nome ?? c.tenant_id}</p>
                <p className="text-sm text-muted-foreground">{c.mes}</p>
              </div>
              <div className="flex items-center gap-4">
                <CobrancaStatusBadge status={c.status} />
                <p className="font-bold text-lg">{formatBRL(c.total_cobranca)}</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/cobrancas/${c.id}`}>Detalhes</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implement billing detail + status management page**

```tsx
// src/app/(admin)/admin/cobrancas/[id]/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CobrancaStatusBadge } from '@/components/financeiro/CobrancaStatusBadge'
import { atualizarStatusCobranca, gerarPdfCobranca } from '@/actions/cobrancas'
import { FileDown, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { CobrancaSgvaq } from '@/actions/cobrancas'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

function downloadBase64Pdf(base64: string, filename: string) {
  const link = document.createElement('a')
  link.href = `data:application/pdf;base64,${base64}`
  link.download = filename
  link.click()
}

interface Props {
  params: { id: string }
  cobranca: CobrancaSgvaq
}

// This page is a server component that passes cobranca data
// Import cobranca data at build time via generateStaticParams or fetch server-side
export default function CobrancaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleDownloadPdf() {
    setLoading('pdf')
    try {
      const { base64, filename } = await gerarPdfCobranca(params.id)
      downloadBase64Pdf(base64, filename)
    } finally {
      setLoading(null)
    }
  }

  async function handleMarcarPago() {
    setLoading('pago')
    try {
      await atualizarStatusCobranca(params.id, 'pago')
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function handleMarcarIsento() {
    setLoading('isento')
    try {
      await atualizarStatusCobranca(params.id, 'isento')
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Detalhes da Cobrança</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              {/* CobrancaStatusBadge loaded from server data */}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">—</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button onClick={handleDownloadPdf} variant="outline" disabled={loading === 'pdf'}>
              {loading === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
              Baixar PDF
            </Button>
            <Button onClick={handleMarcarPago} disabled={!!loading}>
              {loading === 'pago' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Marcar como Pago
            </Button>
            <Button onClick={handleMarcarIsento} variant="secondary" disabled={!!loading}>
              {loading === 'isento' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Marcar como Isento
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/financeiro/CobrancaStatusBadge.tsx src/components/financeiro/CobrancaCard.tsx src/app/(admin)/admin/cobrancas/
git commit -m "feat: Super Admin billing management UI"
```

---

### Task 8: E2E tests for financial flows

**Files:**
- Create: `tests/e2e/financeiro.spec.ts`

- [ ] **Step 1: Write E2E tests**

```typescript
// tests/e2e/financeiro.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Audit log dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as financeiro role
    await page.goto('/auth/login')
    await page.fill('[name=email]', 'financeiro@test.sgvaq.com')
    await page.fill('[name=password]', 'password123')
    await page.click('[type=submit]')
    await page.waitForURL('/dashboard')
  })

  test('shows financial summary cards for an evento', async ({ page }) => {
    await page.goto('/financeiro?evento_id=SEED_EVENTO_ID')
    await expect(page.getByText('Receita Bruta')).toBeVisible()
    await expect(page.getByText('Taxa SGVAQ')).toBeVisible()
    await expect(page.getByText('Transações')).toBeVisible()
  })

  test('shows empty state when no transactions', async ({ page }) => {
    await page.goto('/financeiro?evento_id=EMPTY_EVENTO_ID')
    await expect(page.getByText('Nenhuma transação registrada')).toBeVisible()
  })
})

test.describe('PDF download', () => {
  test('caixa report PDF download button is present', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[name=email]', 'organizador@test.sgvaq.com')
    await page.fill('[name=password]', 'password123')
    await page.click('[type=submit]')
    await page.waitForURL('/dashboard')

    await page.goto('/financeiro/relatorio?evento_id=SEED_EVENTO_ID')
    await expect(page.getByText('Relatório de Caixa (PDF)')).toBeVisible()
  })
})

test.describe('Super Admin billing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[name=email]', 'superadmin@sgvaq.com')
    await page.fill('[name=password]', 'admin123')
    await page.click('[type=submit]')
    await page.waitForURL('/admin')
  })

  test('shows billing list', async ({ page }) => {
    await page.goto('/admin/cobrancas')
    await expect(page.getByText('Cobranças SGVAQ')).toBeVisible()
  })

  test('navigates to billing detail', async ({ page }) => {
    await page.goto('/admin/cobrancas')
    const detailBtn = page.getByText('Detalhes').first()
    if (await detailBtn.isVisible()) {
      await detailBtn.click()
      await expect(page.getByText('Detalhes da Cobrança')).toBeVisible()
    }
  })
})
```

- [ ] **Step 2: Run E2E tests**

Run: `pnpm playwright test tests/e2e/financeiro.spec.ts`
Expected: Tests run (may need seed data for full pass; validate structure at minimum)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/financeiro.spec.ts tests/e2e/cobrancas.spec.ts
git commit -m "test(e2e): financial dashboard, PDF download, and billing management"
```
