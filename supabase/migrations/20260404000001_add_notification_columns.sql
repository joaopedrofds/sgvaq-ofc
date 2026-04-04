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
