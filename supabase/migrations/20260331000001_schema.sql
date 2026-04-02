-- TENANTS
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  plano text NOT NULL DEFAULT 'basico' CHECK (plano IN ('basico', 'profissional')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]{3,30}$'),
  CONSTRAINT slug_not_reserved CHECK (slug NOT IN (
    'www','api','admin','app','static','mail','support','help','login','cadastro'
  ))
);

-- COMPETIDORES (global, sem tenant_id)
CREATE TABLE competidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  nome text NOT NULL,
  cpf text NOT NULL UNIQUE,
  whatsapp text,
  cidade text,
  estado text,
  foto_url text,
  lgpd_aceite_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- TENANT_USERS (usuários internos: organizador, financeiro, juiz, locutor)
CREATE TABLE tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('organizador', 'financeiro', 'juiz', 'locutor')),
  whatsapp text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

-- EVENTOS
CREATE TABLE eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('vaquejada', 'tambor')),
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  local text,
  cidade text,
  estado text,
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'aberto', 'em_andamento', 'encerrado')),
  banner_url text,
  regulamento_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT datas_validas CHECK (data_fim >= data_inicio)
);

-- MODALIDADES
CREATE TABLE modalidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  valor_senha integer NOT NULL DEFAULT 0 CHECK (valor_senha >= 0),
  total_senhas integer NOT NULL CHECK (total_senhas > 0),
  senhas_vendidas integer NOT NULL DEFAULT 0 CHECK (senhas_vendidas >= 0),
  premiacao_descricao text,
  checkin_aberto boolean NOT NULL DEFAULT false
);

-- CRITERIOS_PONTUACAO
CREATE TABLE criterios_pontuacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_prova text NOT NULL CHECK (tipo_prova IN ('vaquejada', 'tambor')),
  nome_criterio text NOT NULL,
  peso numeric(5,2) NOT NULL DEFAULT 1.0 CHECK (peso > 0),
  valor_minimo numeric(5,2) NOT NULL DEFAULT 0,
  valor_maximo numeric(5,2) NOT NULL DEFAULT 10,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  CONSTRAINT minmax CHECK (valor_maximo >= valor_minimo)
);

-- MODALIDADE_CRITERIOS (override por modalidade)
CREATE TABLE modalidade_criterios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modalidade_id uuid NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  criterio_id uuid NOT NULL REFERENCES criterios_pontuacao(id),
  peso_override numeric(5,2) CHECK (peso_override > 0),
  UNIQUE (modalidade_id, criterio_id)
);

-- SENHAS
CREATE TABLE senhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modalidade_id uuid NOT NULL REFERENCES modalidades(id),
  competidor_id uuid NOT NULL REFERENCES competidores(id),
  numero_senha integer NOT NULL,
  canal text NOT NULL CHECK (canal IN ('presencial', 'online')),
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'ativa', 'cancelada', 'checkin_feito')),
  valor_pago integer NOT NULL DEFAULT 0 CHECK (valor_pago >= 0),
  comprovante_url text,
  comprovante_status text CHECK (comprovante_status IN ('pendente', 'aprovado', 'rejeitado')),
  comprovante_rejeicao_motivo text,
  vendido_por uuid REFERENCES tenant_users(id),
  cancelado_por uuid REFERENCES tenant_users(id),
  cancelado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (modalidade_id, numero_senha)
);

-- FILA_ENTRADA
CREATE TABLE fila_entrada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modalidade_id uuid NOT NULL REFERENCES modalidades(id),
  senha_id uuid NOT NULL REFERENCES senhas(id),
  posicao integer NOT NULL,
  ordem_atual integer NOT NULL,
  status text NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'chamado', 'passou', 'ausente')),
  hora_chamada timestamptz,
  hora_entrada timestamptz,
  hora_ausencia timestamptz,
  UNIQUE (modalidade_id, posicao)
);

-- PASSADAS
CREATE TABLE passadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid_local uuid NOT NULL UNIQUE,
  senha_id uuid NOT NULL REFERENCES senhas(id),
  modalidade_id uuid NOT NULL REFERENCES modalidades(id),
  numero_passada integer NOT NULL,
  juiz_id uuid NOT NULL REFERENCES tenant_users(id),
  pontuacao_total numeric(8,2) NOT NULL DEFAULT 0,
  detalhes_json jsonb NOT NULL DEFAULT '[]',
  penalidade numeric(5,2) NOT NULL DEFAULT 0,
  penalidade_motivo text,
  substituido_por uuid REFERENCES passadas(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  created_at_local timestamptz NOT NULL,
  sincronizado boolean NOT NULL DEFAULT true,
  origem text NOT NULL DEFAULT 'online' CHECK (origem IN ('online', 'offline')),
  UNIQUE (senha_id, numero_passada)
);

-- PASSADAS_CONFLITOS
CREATE TABLE passadas_conflitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passada_original_id uuid NOT NULL REFERENCES passadas(id),
  dados_conflito jsonb NOT NULL,
  resolvido boolean NOT NULL DEFAULT false,
  resolvido_por uuid REFERENCES tenant_users(id),
  resolvido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RANKING
CREATE TABLE ranking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modalidade_id uuid NOT NULL REFERENCES modalidades(id),
  senha_id uuid NOT NULL REFERENCES senhas(id),
  competidor_id uuid NOT NULL REFERENCES competidores(id),
  total_pontos numeric(8,2) NOT NULL DEFAULT 0,
  total_passadas integer NOT NULL DEFAULT 0,
  posicao integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (modalidade_id, senha_id)
);

-- FINANCEIRO_TRANSACOES (append-only)
CREATE TABLE financeiro_transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  senha_id uuid REFERENCES senhas(id),
  tipo text NOT NULL CHECK (tipo IN ('venda', 'cancelamento')),
  valor integer NOT NULL,
  canal text NOT NULL CHECK (canal IN ('presencial', 'online')),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- COBRANCAS_SGVAQ
CREATE TABLE cobrancas_sgvaq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  mes_referencia text NOT NULL,
  total_vendas integer NOT NULL DEFAULT 0,
  valor_devido integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'pago', 'contestado', 'isento')),
  comprovante_pagamento_url text,
  confirmado_por uuid,
  confirmado_em timestamptz,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, mes_referencia)
);

-- NOTIFICACOES_FILA
CREATE TABLE notificacoes_fila (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  competidor_id uuid NOT NULL REFERENCES competidores(id),
  tipo text NOT NULL CHECK (tipo IN (
    'senha_confirmada', 'comprovante_aprovado', 'comprovante_rejeitado',
    'chamada_fila', 'ranking_final'
  )),
  mensagem text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'falhou')),
  tentativas integer NOT NULL DEFAULT 0,
  erro_detalhe text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_eventos_tenant_id ON eventos(tenant_id);
CREATE INDEX idx_senhas_modalidade_id ON senhas(modalidade_id);
CREATE INDEX idx_senhas_competidor_id ON senhas(competidor_id);
CREATE INDEX idx_passadas_modalidade_id ON passadas(modalidade_id);
CREATE INDEX idx_fila_modalidade_status ON fila_entrada(modalidade_id, status);
CREATE INDEX idx_ranking_modalidade ON ranking(modalidade_id, posicao);
CREATE INDEX idx_financeiro_tenant ON financeiro_transacoes(tenant_id, created_at);
CREATE INDEX idx_notificacoes_status ON notificacoes_fila(status, tentativas);
