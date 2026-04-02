-- Critérios padrão ABVAQ para Vaquejada
INSERT INTO criterios_pontuacao (tipo_prova, nome_criterio, peso, valor_minimo, valor_maximo, descricao, ordem) VALUES
  ('vaquejada', 'Derrubada', 2.0, 0, 10, 'Derrubada do boi dentro da faixa', 1),
  ('vaquejada', 'Faixa', 1.5, 0, 10, 'Posicionamento na faixa de derrubada', 2),
  ('vaquejada', 'Alinhamento', 1.0, 0, 10, 'Alinhamento do par na pista', 3),
  ('vaquejada', 'Apresentação', 0.5, 0, 10, 'Postura e apresentação geral do par', 4);

-- Critérios padrão para Prova de Tambor
INSERT INTO criterios_pontuacao (tipo_prova, nome_criterio, peso, valor_minimo, valor_maximo, descricao, ordem) VALUES
  ('tambor', 'Tempo', 3.0, 0, 10, 'Tempo de conclusão do percurso', 1),
  ('tambor', 'Derrubada de Tambor', 2.0, 0, 10, 'Penalidade por derrubada de tambor', 2),
  ('tambor', 'Apresentação', 0.5, 0, 10, 'Postura e apresentação geral', 3);
