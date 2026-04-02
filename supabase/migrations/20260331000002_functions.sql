-- Função para atribuir posição na fila atomicamente
CREATE OR REPLACE FUNCTION assign_fila_posicao(p_modalidade_id uuid, p_senha_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_posicao integer;
BEGIN
  SELECT COALESCE(MAX(posicao), 0) + 1
  INTO v_posicao
  FROM fila_entrada
  WHERE modalidade_id = p_modalidade_id
  FOR UPDATE;

  INSERT INTO fila_entrada (modalidade_id, senha_id, posicao, ordem_atual)
  VALUES (p_modalidade_id, p_senha_id, v_posicao, v_posicao);
END;
$$;

-- Função para incrementar senhas_vendidas atomicamente
CREATE OR REPLACE FUNCTION increment_senhas_vendidas(p_modalidade_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE modalidades
  SET senhas_vendidas = senhas_vendidas + 1
  WHERE id = p_modalidade_id
    AND senhas_vendidas < total_senhas;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estoque esgotado para modalidade %', p_modalidade_id
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

-- Função para decrementar senhas_vendidas ao cancelar
CREATE OR REPLACE FUNCTION decrement_senhas_vendidas(p_modalidade_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE modalidades
  SET senhas_vendidas = GREATEST(senhas_vendidas - 1, 0)
  WHERE id = p_modalidade_id;
END;
$$;

-- Trigger para atualizar ranking após inserção/atualização de passadas
CREATE OR REPLACE FUNCTION recalculate_ranking()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_competidor_id uuid;
BEGIN
  SELECT competidor_id INTO v_competidor_id
  FROM senhas WHERE id = NEW.senha_id;

  INSERT INTO ranking (modalidade_id, senha_id, competidor_id, total_pontos, total_passadas, updated_at)
  SELECT
    NEW.modalidade_id,
    NEW.senha_id,
    v_competidor_id,
    COALESCE(SUM(pontuacao_total), 0),
    COUNT(*),
    now()
  FROM passadas
  WHERE senha_id = NEW.senha_id
    AND substituido_por IS NULL
  ON CONFLICT (modalidade_id, senha_id)
  DO UPDATE SET
    total_pontos = EXCLUDED.total_pontos,
    total_passadas = EXCLUDED.total_passadas,
    updated_at = now();

  WITH min_local AS (
    SELECT senha_id, MIN(created_at_local) AS min_created_at_local
    FROM passadas
    WHERE modalidade_id = NEW.modalidade_id AND substituido_por IS NULL
    GROUP BY senha_id
  ),
  ranked AS (
    SELECT r.id,
      RANK() OVER (
        ORDER BY r.total_pontos DESC, ml.min_created_at_local ASC
      ) AS nova_posicao
    FROM ranking r
    JOIN min_local ml ON ml.senha_id = r.senha_id
    WHERE r.modalidade_id = NEW.modalidade_id
  )
  UPDATE ranking r
  SET posicao = ranked.nova_posicao
  FROM ranked
  WHERE r.id = ranked.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_recalculate_ranking
AFTER INSERT OR UPDATE ON passadas
FOR EACH ROW
WHEN (NEW.substituido_por IS NULL)
EXECUTE FUNCTION recalculate_ranking();

-- Função para verificar limites do plano
CREATE OR REPLACE FUNCTION check_plan_limit(
  p_tenant_id uuid,
  p_resource text
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  v_plano text;
  v_count integer;
BEGIN
  SELECT plano INTO v_plano FROM tenants WHERE id = p_tenant_id;

  IF v_plano = 'profissional' THEN
    RETURN true;
  END IF;

  IF p_resource = 'eventos_mes' THEN
    SELECT COUNT(*) INTO v_count
    FROM eventos
    WHERE tenant_id = p_tenant_id
      AND date_trunc('month', created_at) = date_trunc('month', now());
    RETURN v_count < 10;
  ELSIF p_resource = 'usuarios' THEN
    SELECT COUNT(*) INTO v_count
    FROM tenant_users
    WHERE tenant_id = p_tenant_id AND ativo = true;
    RETURN v_count < 5;
  ELSIF p_resource = 'senhas_evento' THEN
    RETURN true;
  END IF;

  RETURN true;
END;
$$;
