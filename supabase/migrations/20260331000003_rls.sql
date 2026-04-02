-- Helper: retorna tenant_id do usuário logado
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid;
$$;

-- Helper: retorna role do usuário logado
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() ->> 'role';
$$;

-- Helper: verifica se é super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'role') = 'super_admin';
$$;

-- TENANTS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin le tudo" ON tenants FOR SELECT
  USING (is_super_admin());

CREATE POLICY "organizador le proprio tenant" ON tenants FOR SELECT
  USING (id = get_my_tenant_id());

CREATE POLICY "super_admin escreve" ON tenants FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- COMPETIDORES
ALTER TABLE competidores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados leem competidores" ON competidores FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "insert competidor" ON competidores FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR get_my_role() IN ('financeiro', 'organizador')
  );

CREATE POLICY "update proprio competidor" ON competidores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- TENANT_USERS
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "le usuarios do proprio tenant" ON tenant_users FOR SELECT
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

CREATE POLICY "organizador insere" ON tenant_users FOR INSERT
  WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND get_my_role() = 'organizador'
    AND role NOT IN ('super_admin', 'organizador')
  );

CREATE POLICY "organizador atualiza" ON tenant_users FOR UPDATE
  USING (tenant_id = get_my_tenant_id() AND get_my_role() = 'organizador')
  WITH CHECK (role NOT IN ('super_admin', 'organizador'));

-- EVENTOS
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "le eventos do tenant" ON eventos FOR SELECT
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

CREATE POLICY "organizador escreve eventos" ON eventos FOR ALL
  USING (tenant_id = get_my_tenant_id() AND get_my_role() = 'organizador')
  WITH CHECK (tenant_id = get_my_tenant_id());

-- MODALIDADES
ALTER TABLE modalidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "le modalidades" ON modalidades FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM eventos e WHERE e.id = evento_id AND e.tenant_id = get_my_tenant_id())
    OR is_super_admin()
    OR TRUE
  );

CREATE POLICY "organizador escreve modalidades" ON modalidades FOR ALL
  USING (
    EXISTS (SELECT 1 FROM eventos e WHERE e.id = evento_id AND e.tenant_id = get_my_tenant_id())
    AND get_my_role() = 'organizador'
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM eventos e WHERE e.id = evento_id AND e.tenant_id = get_my_tenant_id())
  );

-- SENHAS
ALTER TABLE senhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financeiro organizador senhas" ON senhas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM modalidades m
      JOIN eventos e ON e.id = m.evento_id
      WHERE m.id = modalidade_id AND e.tenant_id = get_my_tenant_id()
    )
    AND get_my_role() IN ('financeiro', 'organizador')
  );

CREATE POLICY "competidor le proprias senhas" ON senhas FOR SELECT
  USING (
    competidor_id IN (
      SELECT id FROM competidores WHERE user_id = auth.uid()
    )
  );

-- PASSADAS
ALTER TABLE passadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "juiz insere passadas" ON passadas FOR INSERT
  WITH CHECK (
    get_my_role() = 'juiz'
    AND juiz_id = (SELECT id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM modalidades m
      JOIN eventos e ON e.id = m.evento_id
      WHERE m.id = modalidade_id AND e.status = 'em_andamento'
        AND e.tenant_id = get_my_tenant_id()
    )
  );

CREATE POLICY "leitura passadas do tenant" ON passadas FOR SELECT
  USING (
    get_my_role() IN ('organizador', 'financeiro', 'juiz', 'locutor')
    AND EXISTS (
      SELECT 1 FROM modalidades m
      JOIN eventos e ON e.id = m.evento_id
      WHERE m.id = modalidade_id AND e.tenant_id = get_my_tenant_id()
    )
  );

CREATE POLICY "competidor le proprias passadas" ON passadas FOR SELECT
  USING (
    senha_id IN (
      SELECT s.id FROM senhas s
      JOIN competidores c ON c.id = s.competidor_id
      WHERE c.user_id = auth.uid()
    )
  );

-- RANKING
ALTER TABLE ranking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos autenticados leem ranking" ON ranking FOR SELECT
  USING (auth.role() = 'authenticated');

-- FILA_ENTRADA
ALTER TABLE fila_entrada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "le escreve fila do tenant" ON fila_entrada FOR ALL
  USING (
    get_my_role() IN ('organizador', 'financeiro', 'locutor', 'juiz')
    AND EXISTS (
      SELECT 1 FROM modalidades m
      JOIN eventos e ON e.id = m.evento_id
      WHERE m.id = modalidade_id AND e.tenant_id = get_my_tenant_id()
    )
  );

-- FINANCEIRO_TRANSACOES (append-only)
ALTER TABLE financeiro_transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert transacao" ON financeiro_transacoes FOR INSERT
  WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('financeiro', 'organizador')
  );

CREATE POLICY "le transacoes do tenant" ON financeiro_transacoes FOR SELECT
  USING (tenant_id = get_my_tenant_id() OR is_super_admin());

-- COBRANCAS_SGVAQ
ALTER TABLE cobrancas_sgvaq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin gerencia cobrancas" ON cobrancas_sgvaq FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "organizador le proprias cobrancas" ON cobrancas_sgvaq FOR SELECT
  USING (tenant_id = get_my_tenant_id() AND get_my_role() = 'organizador');

-- NOTIFICACOES_FILA
ALTER TABLE notificacoes_fila ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin le notificacoes" ON notificacoes_fila FOR SELECT
  USING (is_super_admin());

-- CRITERIOS_PONTUACAO
ALTER TABLE criterios_pontuacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos autenticados leem criterios" ON criterios_pontuacao FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "super_admin escreve criterios" ON criterios_pontuacao FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());
