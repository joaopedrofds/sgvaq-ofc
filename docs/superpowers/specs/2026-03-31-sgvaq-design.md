# SGVAQ — Sistema Gerencial de Vaquejada
**Design Spec** | 2026-03-31 | v4 (final)

---

## 1. Visão Geral

O SGVAQ é um SaaS multi-tenant para gestão completa de eventos de vaquejada e prova de tambor. Cada organizadora de eventos é um tenant independente. O sistema cobre o ciclo completo: criação do evento, venda de senhas (presencial + online), check-in, pontuação ao vivo, ranking automático e relatórios financeiros. A receita do SGVAQ é baseada em 10% do valor de cada senha vendida por evento.

---

## 2. Modelo de Negócio

- **Multi-tenant SaaS** — cada organizadora acessa via subdomínio `slug.sgvaq.com.br`
- **Monetização** — 10% do valor bruto de cada senha vendida. O valor é arredondado para baixo em centavos inteiros (ex: R$15,00 → R$1,50). Senhas com `valor_senha = 0` não geram cobrança.
- **Cobrança** — relatório PDF gerado automaticamente no fechamento do mês pelo Super Admin. O pagamento da taxa é feito fora do sistema (Pix manual). O Super Admin registra a confirmação de pagamento anexando comprovante.
- **Moeda** — todos os valores monetários são armazenados em **centavos inteiros (integer)** em BRL. Ex: R$50,00 → `5000`.
- **Planos** — gerenciados pelo Super Admin. Na v1, existem 2 planos:
  - `basico`: máx 10 eventos/mês, máx 500 senhas/evento, máx 5 usuários por tenant
  - `profissional`: ilimitado
  - Ao atingir um limite, o sistema bloqueia a ação e exibe mensagem clara ao organizador.

---

## 3. Arquitetura

### Stack
- **Frontend + API:** Next.js 14 (App Router, Server Actions)
- **Banco de dados:** Supabase (PostgreSQL + Realtime + Auth + Storage + Edge Functions)
- **Estilo:** TailwindCSS + shadcn/ui
- **Offline:** PWA com IndexedDB (fila de sync com timestamp + UUID local)
- **Notificações:** WhatsApp via Zapi ou Evolution API
- **Impressão:** CSS `@media print` para senha em papel + ESC/POS para impressora térmica via servidor local (bridge Node.js leve rodando no computador do caixa)
- **Deploy:** Vercel (frontend) + Supabase Cloud

### Roteamento Multi-tenant
- **Canônico: subdomínio** — `slug.sgvaq.com.br`
- Next.js Middleware detecta o subdomínio no `request.headers.get('host')`, extrai o slug e injeta o `tenant_id` no contexto da requisição
- Rotas internas seguem estrutura de path `/dashboard`, `/eventos`, etc. (sem `[slug]` no path, pois o tenant já está no contexto do Middleware)
- Ambiente de desenvolvimento: `slug.localhost:3000` via hosts file ou variável de ambiente

### Diagrama
```
Browser: organizador.sgvaq.com.br
         ↓
Next.js Middleware → extrai slug → resolve tenant_id
         ↓
Server Actions / API Routes (com tenant_id no contexto)
         ↓
Supabase (RLS valida tenant_id via JWT claim)
```

### Isolamento Multi-tenant
- Todas as tabelas têm `tenant_id`
- Row-Level Security (RLS) no PostgreSQL usando claim `tenant_id` do JWT
- Operações de Super Admin executadas **server-side via service_role key** — nunca exposta ao cliente
- Frontend do Super Admin acessa via rota protegida `/admin` com validação de role no Middleware

### Estratégia Offline (PWA)
- Juiz lança pontuações sem internet via IndexedDB
- Cada registro offline recebe `uuid_local` (UUIDv4 gerado no cliente) + `created_at_local` (ISO timestamp)
- Service Worker mantém fila de sync como array ordenado por `created_at_local`
- Ao reconectar, Edge Function processa a fila **em ordem cronológica por `created_at_local`**
- **Autenticação offline sync:** a fila é enviada com o JWT do juiz. A Edge Function valida que o `juiz_id` em cada registro coincide com o `sub` do JWT — registros inconsistentes são rejeitados e logados
- **Conflito:** definido como dois registros com mesmo `senha_id + numero_passada`. O sistema mantém o registro com menor `created_at_local` e move o conflitante para `passadas_conflitos` para revisão manual pelo organizador via UI

---

## 4. Modelo de Dados

```sql
-- Organizadoras
tenants (
  id uuid PK,
  nome text,
  slug text UNIQUE,
  logo_url text,
  plano text DEFAULT 'basico', -- 'basico' | 'profissional'
  ativo boolean DEFAULT true,
  created_at timestamptz
)

-- Identidade de competidores (global, sem tenant_id)
-- Um competidor existe uma única vez no sistema, independente de quantos tenants participa
competidores (
  id uuid PK,
  user_id uuid FK → auth.users,  -- conta de login do competidor
  nome text,
  cpf text UNIQUE,
  whatsapp text,
  cidade text,
  estado text,
  foto_url text,
  lgpd_aceite_em timestamptz, -- obrigatório no cadastro (NOT NULL no insert via Server Action)
  created_at timestamptz
)
-- RLS em competidores:
--   SELECT: qualquer usuário autenticado (tenant_users ou competidor) pode ler (necessário para busca no caixa)
--   INSERT: somente o próprio competidor (via auth.uid()) OU tenant_users com role 'financeiro'/'organizador'
--   UPDATE: somente o próprio competidor (auth.uid() == user_id)
--   DELETE: negado para todos (LGPD: dados são anonimizados, não deletados)

-- Usuários internos de um tenant (organizador, financeiro, juiz, locutor)
-- Competidores NÃO estão nessa tabela — usam 'competidores' + auth.users diretamente
tenant_users (
  id uuid PK,
  tenant_id uuid FK → tenants,
  user_id uuid FK → auth.users,
  nome text,
  email text,
  role text, -- 'organizador' | 'financeiro' | 'juiz' | 'locutor'
  whatsapp text,
  ativo boolean DEFAULT true,
  created_at timestamptz
)
-- Super Admin: role armazenado como custom claim no JWT do Supabase Auth

-- Eventos
eventos (
  id uuid PK,
  tenant_id uuid FK → tenants,
  nome text,
  tipo text, -- 'vaquejada' | 'tambor'
  data_inicio date,
  data_fim date,
  local text,
  cidade text,
  estado text,
  status text DEFAULT 'rascunho',
  -- status: 'rascunho' → 'aberto' → 'em_andamento' → 'encerrado'
  -- Transições:
  --   rascunho → aberto: pelo organizador (abre venda de senhas)
  --   aberto → em_andamento: pelo organizador ou financeiro (inicia check-in/prova)
  --   em_andamento → encerrado: pelo organizador (encerra prova, congela pontuações)
  --   encerrado não pode ser revertido
  --   em 'em_andamento': venda de novas senhas é bloqueada automaticamente
  banner_url text,
  regulamento_url text,
  created_at timestamptz
)

-- Modalidades de um evento
modalidades (
  id uuid PK,
  evento_id uuid FK → eventos,
  nome text, -- ex: 'Aberto', 'Amador', 'Mirim'
  valor_senha integer, -- em centavos BRL (0 = gratuito, sem cobrança de 10%)
  total_senhas integer,
  senhas_vendidas integer DEFAULT 0, -- incrementado atomicamente via função SQL
  premiacao_descricao text,
  checkin_aberto boolean DEFAULT false
)

-- Senhas vendidas
senhas (
  id uuid PK,
  modalidade_id uuid FK → modalidades,
  competidor_id uuid FK → competidores,
  numero_senha integer, -- sequencial por modalidade
  canal text, -- 'presencial' | 'online'
  status text DEFAULT 'pendente',
  -- status: 'pendente' (online aguardando aprovação) | 'ativa' | 'cancelada' | 'checkin_feito'
  valor_pago integer, -- em centavos
  comprovante_url text, -- storage privado, acesso via signed URL
  comprovante_status text, -- 'pendente' | 'aprovado' | 'rejeitado' (apenas canal online)
  comprovante_rejeicao_motivo text,
  vendido_por uuid FK → tenant_users, -- null se online (auto)
  cancelado_por uuid FK → tenant_users,
  cancelado_em timestamptz,
  created_at timestamptz
)
-- Cancelamento: permitido por 'financeiro' e 'organizador'
-- Cancelar senha com checkin_feito requer confirmação explícita
-- Ao cancelar: senhas_vendidas na modalidade é decrementado via função SQL atômica
-- Senha cancelada pode ter seu número reutilizado (nova senha criada para o slot)

-- Fila de entrada no dia
fila_entrada (
  id uuid PK,
  modalidade_id uuid FK → modalidades,
  senha_id uuid FK → senhas,
  posicao integer, -- posição original na fila (imutável após criação)
  ordem_atual integer, -- ordem de chamada (reordenável pelo organizador)
  status text DEFAULT 'aguardando',
  -- status: 'aguardando' | 'chamado' | 'passou' | 'ausente'
  hora_chamada timestamptz,
  hora_entrada timestamptz,
  hora_ausencia timestamptz -- preenchido se expirar sem aparecer
  -- Timeout: organizador configura tempo máximo (padrão 3min). Após timeout,
  -- financeiro/organizador marca como 'ausente' e avança a fila.
  -- 'ausente' pode ser revertido para 'aguardando' antes do encerramento da prova.
)
-- Posicao: atribuída na ordem de check-in.
--   Concorrência: função SQL atômica assign_posicao() usa SELECT MAX(posicao)+1 FOR UPDATE
--   na tabela fila_entrada filtrada por modalidade_id, evitando duplicatas em check-ins simultâneos.
-- Organizador pode reordenar via drag-and-drop antes de iniciar a prova (atualiza ordem_atual).
-- Após iniciar, reordenação requer confirmação. posicao original permanece imutável.
-- Competidor com 2 senhas na mesma modalidade tem 2 entradas na fila.

-- Critérios de pontuação (padrão ABVAQ, pré-cadastrados pelo Super Admin)
criterios_pontuacao (
  id uuid PK,
  tipo_prova text, -- 'vaquejada' | 'tambor'
  nome_criterio text, -- ex: 'Derrubada', 'Faixa', 'Alinhamento'
  peso numeric(5,2), -- peso para cálculo do pontuacao_total
  valor_minimo numeric(5,2),
  valor_maximo numeric(5,2),
  descricao text,
  ordem integer -- ordem de exibição na tela do juiz
)

-- Modelo de pontuação por modalidade (quais critérios se aplicam)
-- Se não configurado, usa os critérios padrão do tipo da prova
modalidade_criterios (
  id uuid PK,
  modalidade_id uuid FK → modalidades,
  criterio_id uuid FK → criterios_pontuacao,
  peso_override numeric(5,2) -- sobrescreve o peso padrão se preenchido
)

-- Passadas / pontuação
passadas (
  id uuid PK,
  uuid_local uuid UNIQUE, -- ID gerado offline no cliente (idempotência)
  -- UNIQUE constraint: (senha_id, numero_passada) — garante unicidade lógica
  senha_id uuid FK → senhas,
  modalidade_id uuid FK → modalidades,
  numero_passada integer, -- ex: 1ª passada, 2ª passada
  juiz_id uuid FK → tenant_users,
  pontuacao_total numeric(8,2), -- calculado: Σ(criterio.valor * peso)
  detalhes_json jsonb,
  -- Estrutura de detalhes_json:
  -- [ { "criterio_id": "uuid", "nome": "Derrubada", "valor": 10.0,
  --     "peso": 1.5, "pontuacao": 15.0, "observacao": "" }, ... ]
  penalidade numeric(5,2) DEFAULT 0, -- desconto aplicado pelo juiz
  penalidade_motivo text,
  criado_em timestamptz, -- timestamp servidor
  created_at_local timestamptz, -- timestamp dispositivo offline
  sincronizado boolean DEFAULT true, -- false = veio da fila offline
  origem text DEFAULT 'online' -- 'online' | 'offline'
)
-- Algoritmo de pontuação: pontuacao_total = Σ(detalhe.pontuacao) - penalidade
-- Empate (mesma pontuacao_total): desempate por menor created_at_local (quem lançou primeiro)
--   Se ainda empatado: posição compartilhada (ex: dois 1º lugares), próxima posição é saltada
-- Nota: "tempo de passada" (tempo cronometrado na pista) está fora do escopo v1

-- Passadas com conflito de sync (mesmo senha_id + numero_passada)
passadas_conflitos (
  id uuid PK,
  passada_original_id uuid FK → passadas,
  dados_conflito jsonb, -- payload completo do registro rejeitado
  resolvido boolean DEFAULT false,
  resolvido_por uuid FK → tenant_users,
  resolvido_em timestamptz,
  created_at timestamptz
)

-- Ranking por modalidade (tabela de resumo atualizada por trigger)
ranking (
  id uuid PK,
  modalidade_id uuid FK → modalidades,
  senha_id uuid FK → senhas,
  competidor_id uuid FK → competidores,
  total_pontos numeric(8,2),
  total_passadas integer,
  posicao integer, -- calculado considerando regra de empate
  updated_at timestamptz
)
-- Implementação: tabela regular atualizada por trigger AFTER INSERT/UPDATE ON passadas
-- (não materialized view — triggers podem escrever em tabelas regulares diretamente)

-- Audit log financeiro (append-only, sem UPDATE/DELETE via RLS)
financeiro_transacoes (
  id uuid PK,
  tenant_id uuid FK → tenants,
  senha_id uuid FK → senhas,
  tipo text, -- 'venda' | 'cancelamento'
  valor integer, -- em centavos
  canal text, -- 'presencial' | 'online'
  user_id uuid, -- quem executou
  created_at timestamptz
  -- RLS: INSERT permitido para roles autorizados; UPDATE e DELETE negados para TODOS
)

-- Cobranças mensais SGVAQ (10%)
cobrancas_sgvaq (
  id uuid PK,
  tenant_id uuid FK → tenants,
  mes_referencia text, -- formato 'YYYY-MM'
  total_vendas integer, -- em centavos
  valor_devido integer, -- em centavos, arredondado para baixo
  status text DEFAULT 'pendente',
  -- status: 'pendente' | 'pago' | 'contestado' | 'isento' (valor zero)
  comprovante_pagamento_url text, -- preenchido pelo Super Admin ao confirmar
  confirmado_por uuid, -- user_id do super admin que confirmou
  confirmado_em timestamptz,
  pdf_url text,
  created_at timestamptz
)

-- Fila de notificações WhatsApp
notificacoes_fila (
  id uuid PK,
  idempotency_key text UNIQUE, -- formato: '{tipo}:{entidade_id}' ex: 'chamada_fila:uuid-fila'
  competidor_id uuid FK → competidores,
  tipo text,
  -- tipos: 'senha_confirmada' | 'comprovante_aprovado' | 'comprovante_rejeitado'
  --        | 'chamada_fila' | 'ranking_final'
  mensagem text,
  status text DEFAULT 'pendente', -- 'pendente' | 'enviado' | 'falhou'
  tentativas integer DEFAULT 0, -- máx 3
  erro_detalhe text,
  created_at timestamptz
)
-- Edge Function processa a fila a cada 30s com retry (backoff: 1min, 5min, 15min)
-- Após 3 tentativas: status = 'falhou', erro_detalhe preenchido, nenhuma nova tentativa automática
-- Dead-letter: registros com status='falhou' visíveis no dashboard do Super Admin para reenvio manual
-- Deduplicação: INSERT com ON CONFLICT (idempotency_key) DO NOTHING evita duplicatas

-- Storage buckets:
-- 'comprovantes' → privado (acesso via signed URL com 1h de validade)
-- 'logos' → público
-- 'banners' → público
-- 'pdfs' → privado (acesso via signed URL)
-- Validação no upload: tipos permitidos (jpg, png, pdf), tamanho máx 5MB, sem execução server-side
```

---

## 5. Perfis de Usuário e Permissões

| Perfil | Acesso |
|---|---|
| **Super Admin** | Tudo — todos os tenants, cobranças, configurações globais. Acesso via `service_role` server-side. |
| **Organizador** | Seu tenant — eventos, equipe, relatórios, modalidades, transições de status do evento |
| **Financeiro** | Caixa, venda e cancelamento de senhas, check-in, aprovação de comprovantes, relatório do dia |
| **Juiz** | Tela de pontuação do evento ativo (offline-first). Só vê eventos em `em_andamento`. |
| **Locutor** | Tela fullscreen do telão (realtime, somente leitura) |
| **Competidor** | Autenticado via `auth.users` + `competidores`. Acessa página pública, compra online, QR Code, histórico próprio. Sem `tenant_id` fixo. |

### Onboarding de usuários internos (juiz, financeiro, locutor)
1. Organizador cadastra o usuário informando nome, email e role
2. Roles permitidos para o organizador convidar: `financeiro`, `juiz`, `locutor` (não pode criar outro `organizador` ou `super_admin`)
3. Sistema envia e-mail de convite via Supabase Auth (`inviteUserByEmail`)
4. Usuário define sua senha ao aceitar o convite
5. Ao aceitar, o `tenant_id` é vinculado via custom claim no JWT via Database Webhook
6. Escalada de privilégios bloqueada: RLS em `tenant_users` impede que qualquer role defina `role = 'super_admin'` ou `role = 'organizador'` via INSERT/UPDATE direto

### Permissões por role (resumo para RLS)
| Role | passadas | fila_entrada | senhas | ranking | financeiro_transacoes |
|---|---|---|---|---|---|
| super_admin | leitura global (service_role) | leitura global | leitura global | leitura global | leitura global |
| organizador | leitura do tenant | leitura/escrita do tenant | leitura do tenant | leitura do tenant | leitura do tenant |
| financeiro | leitura do tenant | leitura/escrita do tenant | leitura/escrita do tenant | leitura do tenant | INSERT do tenant |
| juiz | INSERT próprio evento | leitura do evento ativo | leitura do evento ativo | leitura do evento ativo | — |
| locutor | leitura do evento ativo | leitura do evento ativo | — | leitura do evento ativo | — |
| competidor | leitura das próprias passadas | leitura da própria posição | leitura das próprias senhas | leitura do evento | — |

---

## 6. Módulos

### 6.1 Super Admin
- Dashboard geral: tenants ativos, eventos do dia, senhas vendidas, receita 10%
- Cadastro e aprovação de organizadoras
- Relatório mensal de cobrança por tenant (PDF auto-gerado via Edge Function no dia 1 de cada mês)
- Confirmação de pagamento de cobrança (upload de comprovante)
- Configuração dos critérios de pontuação padrão ABVAQ (vaquejada + tambor)
- Gerenciamento de planos e limites

### 6.2 Organizador
- Dashboard: eventos, vendas, ranking, competidores
- CRUD de eventos com modalidades, valores e premiação
- Transições de status do evento (rascunho → aberto → em_andamento → encerrado)
- Gerenciamento de equipe (convite por e-mail para juízes, financeiro, locutor)
- Relatórios: vendas por canal, ranking final, folha de premiação (PDF)
- Reordenação da fila de entrada (drag-and-drop antes de iniciar a prova)
- Resolução de conflitos de sync offline (tela de conflitos pendentes)
- Configuração da página pública do evento: banner, texto de descrição, campos obrigatórios de inscrição, modalidades visíveis

### 6.3 Financeiro
- Caixa presencial: busca por CPF/nome, seleção de modalidade, registro de venda, impressão de senha
- Cancelamento de senhas (com confirmação dupla para check-in já feito)
- Controle de estoque de senhas por modalidade (disponível / vendida / cancelada)
- Check-in: scan de QR Code via câmera ou digitação do número da senha
- Aprovação/rejeição de comprovantes Pix online (com motivo de rejeição obrigatório)
- Relatório de caixa do dia (por canal, total, pendências)
- Abertura/fechamento do check-in por modalidade

### 6.4 Juiz
- Tela simplificada: competidor atual na pista + número da passada
- Lançamento de pontuação por critério (critérios ABVAQ pré-carregados, pesos visíveis)
- Campo de penalidade com motivo (opcional)
- Confirmação obrigatória antes de enviar (modal de revisão)
- Funciona 100% offline — sync automático ao reconectar com indicador visual de status
- Histórico das passadas lançadas no dia com possibilidade de ver mas não editar após envio

### 6.5 Competidor
- Página pública do evento: descrição, modalidades, valor, premiação
- Compra de senha online: seleção de modalidade → upload de comprovante Pix → aguarda aprovação
- QR Code da senha exibido em tela (e enviado por WhatsApp após aprovação)
- Notificações WhatsApp: confirmação de senha, aprovação/rejeição de comprovante, chamada na fila, ranking final
- Histórico de participações e pontuações

### 6.6 Locutor / Telão
- Tela fullscreen otimizada para projetor/telão (modo noturno padrão)
- Competidor atual em destaque + próximos 3 na fila
- Placar ao vivo via Supabase Realtime (sem refresh)
- Ranking parcial da modalidade ativa
- Letras grandes, alto contraste para visibilidade à distância

---

## 7. Fluxo do Dia da Prova

```
PRÉ-EVENTO
Organizador cria evento (status: rascunho)
→ define modalidades e critérios de pontuação
→ transiciona para 'aberto' (libera venda de senhas)
Financeiro vende presencial + Competidor compra online (Pix + comprovante)
Financeiro aprova comprovantes → senha status: 'ativa' → QR Code + WhatsApp enviados

DIA DA PROVA
Financeiro abre check-in por modalidade
→ Competidor chega → scan QR Code → status: 'checkin_feito' → adicionado à fila
Organizador reordena fila se necessário (drag-and-drop)
Organizador transiciona evento para 'em_andamento' (bloqueia nova venda de senhas)

LOOP DE PASSADAS:
  Sistema/Locutor chama próximo (status fila: 'chamado') → WhatsApp enviado
  Timer de timeout iniciado (padrão: 3 min)
    → Competidor aparece: status fila: 'passou' + hora_entrada registrada
    → Timeout esgotado: Financeiro/Organizador marca 'ausente' e avança
  Juiz lança pontuação (offline ok) → sync automático
  Ranking atualizado por trigger → Telão atualiza via Realtime
  → próximo competidor

PÓS-PROVA
Organizador encerra evento (status: 'encerrado') → pontuações congeladas
Ranking final calculado e exibido
Organizador gera folha de premiação (PDF)
Notificações WhatsApp de ranking final enviadas a todos os competidores
Cobrança 10% calculada e registrada em cobrancas_sgvaq para o Super Admin
```

---

## 8. Impressão de Senha

**Campos obrigatórios na senha impressa:**
- Nome do evento
- Nome do competidor
- Número da senha
- Modalidade
- Data do evento
- QR Code (codifica: `{ "senha_id": "uuid", "tenant_id": "uuid" }`)
- Nome da organizadora + logo

**Mecanismos de impressão:**
1. **CSS `@media print`** — funciona em qualquer impressora conectada ao navegador (modo padrão)
2. **ESC/POS via bridge local** — servidor Node.js leve (`sgvaq-print-bridge`) instalado no computador do caixa, que recebe POST do Next.js via `localhost:6789` e envia comandos ESC/POS para impressora USB/Bluetooth
3. **Fallback:** se bridge indisponível, exibe modal com botão "Imprimir" padrão do navegador

---

## 9. Estrutura de Rotas (Next.js)

```
Subdomínio resolvido pelo Middleware → tenant_id injetado no contexto

/ (sgvaq.com.br)             Landing page SGVAQ
/cadastro                    Cadastro de organizadora
/login                       Login geral

/admin                       Super Admin (acesso via service_role server-side)
  /dashboard
  /tenants
  /cobrancas
  /configuracoes/criterios

/dashboard                   Painel do organizador/financeiro (depende do role)
/eventos                     Lista e criação de eventos
/eventos/[id]
  /modalidades
  /senhas
  /checkin
  /fila
  /pontuacao                 Tela do juiz
  /ranking
  /relatorios
/financeiro                  Caixa e transações
/competidores                Cadastro
/equipe                      Usuários do tenant
/conflitos                   Conflitos de sync offline (organizador)

/evento/[id]                 Página pública do evento (sem autenticação)
/evento/[id]/inscricao       Compra de senha online

/locutor/[id]                Tela do telão (fullscreen, sem autenticação)
```

---

## 10. Funcionalidades Técnicas de Destaque

- **QR Code:** gerado com `qrcode` lib, codifica `{ senha_id, tenant_id }`. Check-in valida que o tenant do financeiro == tenant_id do QR Code.
- **Audit log imutável:** RLS na tabela `financeiro_transacoes` nega UPDATE e DELETE para todos os roles, incluindo `service_role` (política explícita).
- **Ranking por trigger:** trigger `AFTER INSERT OR UPDATE ON passadas` recalcula `ranking` para a `modalidade_id` afetada. Regra de empate: menor `created_at_local`; se ainda igual, posições compartilhadas e próxima posição é saltada.
- **PDFs:** gerados server-side via `@react-pdf/renderer` em Edge Functions (folha de premiação, relatório de caixa, cobrança 10%).
- **WhatsApp:** Edge Function processa `notificacoes_fila` a cada 30s, retry com backoff exponencial (tentativas: 1min, 5min, 15min).
- **Supabase Realtime:** usado nas telas do locutor e do juiz para atualizações em tempo real via `subscribe` em tabelas `passadas`, `fila_entrada` e `ranking`.
- **Comprovantes:** bucket `comprovantes` privado, acesso via signed URL com validade de 1 hora. Tipos aceitos: jpg, jpeg, png, pdf. Tamanho máx: 5MB.
- **Anti-overselling:** ao ativar uma senha online, função SQL verifica atomicamente `senhas_vendidas < total_senhas` antes de incrementar (usando `SELECT ... FOR UPDATE`).
- **Impressão:** bridge local `sgvaq-print-bridge` (Node.js) para ESC/POS, com fallback para CSS print.

---

## 11. Catálogo de Notificações WhatsApp

| Evento | Gatilho | Destinatário |
|---|---|---|
| `senha_confirmada` | Venda presencial registrada | Competidor |
| `comprovante_aprovado` | Financeiro aprova comprovante | Competidor |
| `comprovante_rejeitado` | Financeiro rejeita comprovante | Competidor |
| `chamada_fila` | Status fila muda para `chamado` | Competidor |
| `ranking_final` | Evento transiciona para `encerrado` | Todos competidores da modalidade |

---

## 12. Regras de Negócio Adicionais

### Slug de tenant
- Caracteres permitidos: `[a-z0-9-]`, mínimo 3, máximo 30 caracteres
- Slugs reservados (bloqueados): `www`, `api`, `admin`, `app`, `static`, `mail`, `support`, `help`, `login`, `cadastro`
- Slug não pode ser alterado após criação (URLs já distribuídas)

### Cancelamento de senhas e integridade financeira
- Cancelamento registra um `financeiro_transacoes` com `tipo = 'cancelamento'` e `valor` negativo
- Isso cria o efeito de estorno no log sem violar a imutabilidade do registro original
- `cobrancas_sgvaq.total_vendas` = soma de todas as transações do mês (vendas - cancelamentos)
- Se `total_vendas <= 0` após cancelamentos, `status = 'isento'` e não gera PDF de cobrança

### Signed URLs (comprovantes e PDFs)
- Signed URLs **não são armazenadas** em banco — são geradas sob demanda a cada requisição
- Server Action `getSignedUrl(bucket, path)` gera URL fresca com 1 hora de validade
- Frontend chama esta action ao abrir qualquer tela que exiba comprovante/PDF

### Impressora térmica (bridge de segurança)
- Bridge `sgvaq-print-bridge` exige token de autorização configurado na instalação
- Next.js envia header `Authorization: Bearer {PRINT_BRIDGE_TOKEN}` em cada POST
- Token configurado via variável de ambiente no setup inicial do caixa
- Sem token válido, bridge rejeita o job com HTTP 401
- Porta padrão: `6789`, configurável via variável de ambiente `PRINT_BRIDGE_PORT`

### Enforcement de planos
- Verificação de limites feita **na Server Action**, antes de qualquer INSERT
- Para `senhas_vendidas`, o `SELECT FOR UPDATE` já previne race condition
- Para limites de plano (eventos/mês, usuários): contados via `SELECT COUNT(*)` no momento da verificação, dentro de uma transação com `SERIALIZABLE` isolation para evitar TOCTOU
- Não há tabela de contadores separada — os contadores são derivados das tabelas existentes (`eventos`, `tenant_users`, `senhas`)
- Ao atingir limite: HTTP 422 com mensagem clara; nenhum dado é persistido

### Resolução de conflitos offline
- Tela `/conflitos` mostra todos os registros em `passadas_conflitos` com `resolvido = false`
- Organizador vê: passada original (que venceu) vs. passada conflitante (rejeitada)
- Opções: "Manter original" (marca `resolvido = true`) ou "Usar conflitante" (INSERT da passada conflitante com novo id, soft-delete da original via campo `substituido_por uuid FK → passadas`, recalcula ranking via trigger)
- Organizer é notificado por badge no dashboard quando há conflitos pendentes

### LGPD (Lei Geral de Proteção de Dados)
- `competidores` com PII (nome, CPF, whatsapp): não deletados, mas **anonimizados** via Server Action `anonymizeCompetidor(id)` que substitui campos por `[REMOVIDO]`
- Retenção de dados: registros financeiros mantidos por 5 anos (obrigação fiscal). Demais dados de `competidores`: anonimizados a pedido.
- Política de privacidade e termos de uso exibidos no cadastro de competidor (aceite obrigatório registrado em `competidores.lgpd_aceite_em`)

---

## 13. Fora do Escopo (v1)

- Gateway de pagamento automático (arquitetura preparada para v2)
- App mobile nativo
- Transmissão de vídeo ao vivo
- Integração com ranking nacional ABVAQ
- Múltiplos idiomas
- Multi-juiz por passada (v1: um juiz por passada)
- Ranking cross-modalidade (v1: ranking estritamente por modalidade)
- Segundo aprovador para cobranças SGVAQ
