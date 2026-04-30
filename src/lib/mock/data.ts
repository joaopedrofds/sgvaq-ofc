export interface MockCompetidor {
  id: string
  nome: string
  cpf: string
  whatsapp: string | null
  cidade: string | null
  estado: string | null
  foto_url: string | null
  lgpd_aceite_em: string | null
  created_at: string
}

export interface MockEvento {
  id: string
  tenant_id: string
  nome: string
  tipo: 'vaquejada' | 'tambor'
  data_inicio: string
  data_fim: string
  local: string | null
  cidade: string
  estado: string
  status: 'rascunho' | 'aberto' | 'em_andamento' | 'encerrado'
  banner_url: string | null
  regulamento_url: string | null
  created_at: string
  modalidades?: { count: number }[]
}

export interface MockModalidade {
  id: string
  evento_id: string
  nome: string
  valor_senha: number
  total_senhas: number
  senhas_vendidas: number
  premiacao_descricao: string | null
  checkin_aberto: boolean
  modalidade_criterios?: MockModalidadeCriterio[]
}

export interface MockModalidadeCriterio {
  criterio_id: string
  criterios_pontuacao: MockCriterio
}

export interface MockCriterio {
  id: string
  tipo_prova: 'vaquejada' | 'tambor'
  nome_criterio: string
  peso: number
  valor_minimo: number
  valor_maximo: number
  descricao: string | null
  ordem: number
}

export interface MockSenha {
  id: string
  modalidade_id: string
  competidor_id: string
  numero_senha: number
  canal: 'presencial' | 'online'
  status: 'pendente' | 'ativa' | 'cancelada' | 'checkin_feito'
  valor_pago: number
  comprovante_url: string | null
  comprovante_status: string | null
  comprovante_rejeicao_motivo: string | null
  vendido_por: string | null
  created_at: string
  competidores?: { nome: string; cpf: string; whatsapp: string | null }
  modalidades?: { nome: string; eventos: { nome: string } }
}

export interface MockFila {
  id: string
  modalidade_id: string
  senha_id: string
  posicao: number
  ordem_atual: number
  status: 'aguardando' | 'chamado' | 'passou' | 'ausente'
  hora_chamada: string | null
  hora_entrada: string | null
  hora_ausencia: string | null
  senhas?: { numero_senha: number; competidores: { nome: string; whatsapp: string | null } }
}

export interface MockRanking {
  id: string
  modalidade_id: string
  senha_id: string
  competidor_id: string
  total_pontos: number
  total_passadas: number
  posicao: number
  updated_at: string
  competidores?: { nome: string }
  senhas?: { numero_senha: number }
}

export interface MockTransacao {
  id: string
  tenant_id: string
  senha_id: string | null
  tipo: 'venda' | 'cancelamento'
  valor: number
  taxa_sgvaq: number
  canal: 'presencial' | 'online'
  user_id: string | null
  evento_id: string
  created_at: string
  descricao: string | null
}

export interface MockEquipe {
  id: string
  tenant_id: string
  user_id: string
  nome: string
  email: string
  role: string
  whatsapp: string | null
  ativo: boolean
  created_at: string
}

export interface MockCobranca {
  id: string
  tenant_id: string
  mes: string
  total_cobranca: number
  status: string
  comprovante_url: string | null
  created_at: string
  updated_at: string
  tenant?: { nome: string; slug: string }
}

export interface MockNotificacao {
  id: string
  tenant_id: string
  idempotency_key: string
  competidor_id: string
  tipo: string
  mensagem: string
  status: string
  tentativas: number
  erro: string | null
  created_at: string
  updated_at: string | null
  proximo_retry_em: string | null
  tenant?: { nome: string }
}

// ============================================================
// Armazenamento persistente entre hot-reloads
// ============================================================
const GLOBAL_KEY = '__sgvaq_mock_state'

function getGlobalState<T>(key: string, fallback: T): T {
  if (typeof globalThis === 'undefined') return fallback
  if (!(globalThis as any)[GLOBAL_KEY]) (globalThis as any)[GLOBAL_KEY] = {}
  if (!((globalThis as any)[GLOBAL_KEY][key])) (globalThis as any)[GLOBAL_KEY][key] = fallback
  return (globalThis as any)[GLOBAL_KEY][key]
}

// ============================================================
// TENANT
// ============================================================
export const mockTenant = {
  id: 'mock-tenant-1',
  nome: 'Vaquejada do Sertão',
  slug: 'vaquejada-sertao',
  plano: 'profissional',
  ativo: true,
  logo_url: null,
  created_at: '2026-01-15T10:00:00Z',
}

export const mockSession = {
  id: 'mock-user-1',
  email: 'admin@vaquejada.com',
  role: 'organizador' as const,
  tenantId: 'mock-tenant-1',
}

// ============================================================
// COMPETIDORES
// ============================================================
const COMPETIDORES_KEY = 'competidores'
const defaultCompetidores: MockCompetidor[] = [
  { id: 'mock-comp-1', nome: 'João Silva', cpf: '12345678901', whatsapp: '88991234567', cidade: 'Sobral', estado: 'CE', foto_url: null, lgpd_aceite_em: '2026-04-01T10:00:00Z', created_at: '2026-04-01T10:00:00Z' },
  { id: 'mock-comp-2', nome: 'Maria Oliveira', cpf: '23456789012', whatsapp: '88992345678', cidade: 'Fortaleza', estado: 'CE', foto_url: null, lgpd_aceite_em: '2026-04-02T10:00:00Z', created_at: '2026-04-02T10:00:00Z' },
  { id: 'mock-comp-3', nome: 'Pedro Santos', cpf: '34567890123', whatsapp: '88993456789', cidade: 'Juazeiro do Norte', estado: 'CE', foto_url: null, lgpd_aceite_em: '2026-04-03T10:00:00Z', created_at: '2026-04-03T10:00:00Z' },
  { id: 'mock-comp-4', nome: 'Ana Costa', cpf: '45678901234', whatsapp: '88994567890', cidade: 'Sobral', estado: 'CE', foto_url: null, lgpd_aceite_em: '2026-04-01T10:00:00Z', created_at: '2026-04-01T10:00:00Z' },
  { id: 'mock-comp-5', nome: 'Carlos Pereira', cpf: '56789012345', whatsapp: '88995678901', cidade: 'Quixadá', estado: 'CE', foto_url: null, lgpd_aceite_em: '2026-04-05T10:00:00Z', created_at: '2026-04-05T10:00:00Z' },
  { id: 'mock-comp-6', nome: 'Lucas Mendes', cpf: '67890123456', whatsapp: '88996789012', cidade: 'Fortaleza', estado: 'CE', foto_url: null, lgpd_aceite_em: null, created_at: '2026-04-06T10:00:00Z' },
  { id: 'mock-comp-7', nome: 'Beatriz Lima', cpf: '78901234567', whatsapp: '88997890123', cidade: 'Sobral', estado: 'CE', foto_url: null, lgpd_aceite_em: '2026-04-07T10:00:00Z', created_at: '2026-04-07T10:00:00Z' },
  { id: 'mock-comp-8', nome: 'Rafael Alves', cpf: '89012345678', whatsapp: '88998901234', cidade: 'Crato', estado: 'CE', foto_url: null, lgpd_aceite_em: '2026-04-08T10:00:00Z', created_at: '2026-04-08T10:00:00Z' },
]

export const mockCompetidores: MockCompetidor[] = getGlobalState<MockCompetidor[]>(COMPETIDORES_KEY, defaultCompetidores)

export function addMockCompetidor(competidor: MockCompetidor) {
  mockCompetidores.push(competidor)
}

// ============================================================
// EVENTOS
// ============================================================
const EVENTOS_KEY = 'eventos'
const defaultEventos: MockEvento[] = [
  {
    id: 'mock-evento-1', tenant_id: 'mock-tenant-1', nome: 'Vaquejada do Sertão 2026', tipo: 'vaquejada',
    data_inicio: '2026-05-15', data_fim: '2026-05-17', local: 'Parque de Vaquejada do Sertão',
    cidade: 'Sobral', estado: 'CE', status: 'em_andamento', banner_url: null, regulamento_url: null,
    created_at: '2026-03-01T10:00:00Z', modalidades: [{ count: 3 }],
  },
  {
    id: 'mock-evento-2', tenant_id: 'mock-tenant-1', nome: 'Tambor de Ouro', tipo: 'tambor',
    data_inicio: '2026-06-01', data_fim: '2026-06-01', local: 'Arena Tamboril',
    cidade: 'Quixadá', estado: 'CE', status: 'aberto', banner_url: null, regulamento_url: null,
    created_at: '2026-03-15T10:00:00Z', modalidades: [{ count: 2 }],
  },
  {
    id: 'mock-evento-3', tenant_id: 'mock-tenant-1', nome: 'Vaquejada de Julho', tipo: 'vaquejada',
    data_inicio: '2026-07-20', data_fim: '2026-07-22', local: null,
    cidade: 'Juazeiro do Norte', estado: 'CE', status: 'rascunho', banner_url: null, regulamento_url: null,
    created_at: '2026-04-10T10:00:00Z', modalidades: [{ count: 0 }],
  },
]

export const mockEventos: MockEvento[] = getGlobalState<MockEvento[]>(EVENTOS_KEY, defaultEventos)

/** Adiciona um evento criado via form ao store mutável */
export function addMockEvento(evento: MockEvento) {
  mockEventos.push(evento)
}

// ============================================================
// CRITÉRIOS DE PONTUAÇÃO
// ============================================================
export const mockCriterios: MockCriterio[] = [
  { id: 'mock-crit-1', tipo_prova: 'vaquejada', nome_criterio: 'Derrubada', peso: 3.0, valor_minimo: 0, valor_maximo: 10, descricao: 'Pontuação pela derrubada do boi', ordem: 1 },
  { id: 'mock-crit-2', tipo_prova: 'vaquejada', nome_criterio: 'Faixa', peso: 2.0, valor_minimo: 0, valor_maximo: 10, descricao: 'Pontuação pela faixa', ordem: 2 },
  { id: 'mock-crit-3', tipo_prova: 'vaquejada', nome_criterio: 'Velocidade', peso: 1.0, valor_minimo: 0, valor_maximo: 10, descricao: 'Velocidade da passada', ordem: 3 },
  { id: 'mock-crit-4', tipo_prova: 'tambor', nome_criterio: 'Tempo', peso: 2.0, valor_minimo: 0, valor_maximo: 10, descricao: 'Tempo da prova', ordem: 1 },
  { id: 'mock-crit-5', tipo_prova: 'tambor', nome_criterio: 'Técnica', peso: 2.0, valor_minimo: 0, valor_maximo: 10, descricao: 'Técnica de montaria', ordem: 2 },
]

// ============================================================
// MODALIDADES
// ============================================================
export const mockModalidades: MockModalidade[] = [
  {
    id: 'mock-mod-1', evento_id: 'mock-evento-1', nome: 'Peso Leve', valor_senha: 5000, total_senhas: 50, senhas_vendidas: 32,
    premiacao_descricao: '1º R$ 2.000 | 2º R$ 1.000 | 3º R$ 500', checkin_aberto: true,
    modalidade_criterios: [
      { criterio_id: 'mock-crit-1', criterios_pontuacao: mockCriterios[0] },
      { criterio_id: 'mock-crit-2', criterios_pontuacao: mockCriterios[1] },
      { criterio_id: 'mock-crit-3', criterios_pontuacao: mockCriterios[2] },
    ],
  },
  {
    id: 'mock-mod-2', evento_id: 'mock-evento-1', nome: 'Peso Médio', valor_senha: 8000, total_senhas: 40, senhas_vendidas: 25,
    premiacao_descricao: '1º R$ 3.500 | 2º R$ 2.000 | 3º R$ 1.000', checkin_aberto: true,
    modalidade_criterios: [
      { criterio_id: 'mock-crit-1', criterios_pontuacao: mockCriterios[0] },
      { criterio_id: 'mock-crit-2', criterios_pontuacao: mockCriterios[1] },
      { criterio_id: 'mock-crit-3', criterios_pontuacao: mockCriterios[2] },
    ],
  },
  {
    id: 'mock-mod-3', evento_id: 'mock-evento-1', nome: 'Peso Pesado', valor_senha: 12000, total_senhas: 30, senhas_vendidas: 18,
    premiacao_descricao: '1º R$ 5.000 | 2º R$ 3.000 | 3º R$ 1.500', checkin_aberto: false,
    modalidade_criterios: [
      { criterio_id: 'mock-crit-1', criterios_pontuacao: mockCriterios[0] },
      { criterio_id: 'mock-crit-2', criterios_pontuacao: mockCriterios[1] },
      { criterio_id: 'mock-crit-3', criterios_pontuacao: mockCriterios[2] },
    ],
  },
  {
    id: 'mock-mod-4', evento_id: 'mock-evento-2', nome: 'Tambor Aberto', valor_senha: 6000, total_senhas: 30, senhas_vendidas: 12,
    premiacao_descricao: '1º R$ 2.500 | 2º R$ 1.500 | 3º R$ 800', checkin_aberto: false,
    modalidade_criterios: [
      { criterio_id: 'mock-crit-4', criterios_pontuacao: mockCriterios[3] },
      { criterio_id: 'mock-crit-5', criterios_pontuacao: mockCriterios[4] },
    ],
  },
  {
    id: 'mock-mod-5', evento_id: 'mock-evento-2', nome: 'Tambor Mirim', valor_senha: 3000, total_senhas: 20, senhas_vendidas: 5,
    premiacao_descricao: '1º R$ 1.000 | 2º R$ 500 | 3º R$ 250', checkin_aberto: false,
    modalidade_criterios: [
      { criterio_id: 'mock-crit-4', criterios_pontuacao: mockCriterios[3] },
      { criterio_id: 'mock-crit-5', criterios_pontuacao: mockCriterios[4] },
    ],
  },
]

// ============================================================
// SENHAS
// ============================================================
export const mockSenhas: MockSenha[] = [
  { id: 'mock-senha-1', modalidade_id: 'mock-mod-1', competidor_id: 'mock-comp-1', numero_senha: 1, canal: 'presencial', status: 'checkin_feito', valor_pago: 5000, comprovante_url: null, comprovante_status: null, comprovante_rejeicao_motivo: null, vendido_por: 'mock-tu-1', created_at: '2026-05-01T10:00:00Z', competidores: { nome: 'João Silva', cpf: '12345678901', whatsapp: '88991234567' } },
  { id: 'mock-senha-2', modalidade_id: 'mock-mod-1', competidor_id: 'mock-comp-2', numero_senha: 2, canal: 'presencial', status: 'ativa', valor_pago: 5000, comprovante_url: null, comprovante_status: null, comprovante_rejeicao_motivo: null, vendido_por: 'mock-tu-1', created_at: '2026-05-01T10:30:00Z', competidores: { nome: 'Maria Oliveira', cpf: '23456789012', whatsapp: '88992345678' } },
  { id: 'mock-senha-3', modalidade_id: 'mock-mod-1', competidor_id: 'mock-comp-3', numero_senha: 3, canal: 'online', status: 'pendente', valor_pago: 5000, comprovante_url: 'senhas/comprovante3.pdf', comprovante_status: 'pendente', comprovante_rejeicao_motivo: null, vendido_por: null, created_at: '2026-05-02T10:00:00Z', competidores: { nome: 'Pedro Santos', cpf: '34567890123', whatsapp: '88993456789' } },
  { id: 'mock-senha-4', modalidade_id: 'mock-mod-1', competidor_id: 'mock-comp-4', numero_senha: 4, canal: 'presencial', status: 'checkin_feito', valor_pago: 5000, comprovante_url: null, comprovante_status: null, comprovante_rejeicao_motivo: null, vendido_por: 'mock-tu-1', created_at: '2026-05-01T11:00:00Z', competidores: { nome: 'Ana Costa', cpf: '45678901234', whatsapp: '88994567890' } },
  { id: 'mock-senha-5', modalidade_id: 'mock-mod-1', competidor_id: 'mock-comp-5', numero_senha: 5, canal: 'presencial', status: 'cancelada', valor_pago: 5000, comprovante_url: null, comprovante_status: null, comprovante_rejeicao_motivo: null, vendido_por: 'mock-tu-1', created_at: '2026-05-01T09:00:00Z', competidores: { nome: 'Carlos Pereira', cpf: '56789012345', whatsapp: '88995678901' } },
  { id: 'mock-senha-6', modalidade_id: 'mock-mod-1', competidor_id: 'mock-comp-6', numero_senha: 6, canal: 'presencial', status: 'ativa', valor_pago: 5000, comprovante_url: null, comprovante_status: null, comprovante_rejeicao_motivo: null, vendido_por: 'mock-tu-1', created_at: '2026-05-01T12:00:00Z', competidores: { nome: 'Lucas Mendes', cpf: '67890123456', whatsapp: '88996789012' } },
  { id: 'mock-senha-7', modalidade_id: 'mock-mod-2', competidor_id: 'mock-comp-7', numero_senha: 1, canal: 'presencial', status: 'ativa', valor_pago: 8000, comprovante_url: null, comprovante_status: null, comprovante_rejeicao_motivo: null, vendido_por: 'mock-tu-1', created_at: '2026-05-01T10:00:00Z', competidores: { nome: 'Beatriz Lima', cpf: '78901234567', whatsapp: '88997890123' } },
  { id: 'mock-senha-8', modalidade_id: 'mock-mod-2', competidor_id: 'mock-comp-8', numero_senha: 2, canal: 'online', status: 'pendente', valor_pago: 8000, comprovante_url: 'senhas/comprovante8.pdf', comprovante_status: 'pendente', comprovante_rejeicao_motivo: null, vendido_por: null, created_at: '2026-05-03T10:00:00Z', competidores: { nome: 'Rafael Alves', cpf: '89012345678', whatsapp: '88998901234' } },
]

// ============================================================
// FILA DE ENTRADA
// ============================================================
export const mockFila: MockFila[] = [
  { id: 'mock-fila-1', modalidade_id: 'mock-mod-1', senha_id: 'mock-senha-1', posicao: 1, ordem_atual: 1, status: 'aguardando', hora_chamada: null, hora_entrada: null, hora_ausencia: null, senhas: { numero_senha: 1, competidores: { nome: 'João Silva', whatsapp: '88991234567' } } },
  { id: 'mock-fila-2', modalidade_id: 'mock-mod-1', senha_id: 'mock-senha-4', posicao: 2, ordem_atual: 2, status: 'chamado', hora_chamada: new Date().toISOString(), hora_entrada: null, hora_ausencia: null, senhas: { numero_senha: 4, competidores: { nome: 'Ana Costa', whatsapp: '88994567890' } } },
  { id: 'mock-fila-3', modalidade_id: 'mock-mod-1', senha_id: 'mock-senha-2', posicao: 3, ordem_atual: 3, status: 'aguardando', hora_chamada: null, hora_entrada: null, hora_ausencia: null, senhas: { numero_senha: 2, competidores: { nome: 'Maria Oliveira', whatsapp: '88992345678' } } },
  { id: 'mock-fila-4', modalidade_id: 'mock-mod-1', senha_id: 'mock-senha-6', posicao: 4, ordem_atual: 4, status: 'aguardando', hora_chamada: null, hora_entrada: null, hora_ausencia: null, senhas: { numero_senha: 6, competidores: { nome: 'Lucas Mendes', whatsapp: '88996789012' } } },
]

// ============================================================
// RANKING
// ============================================================
export const mockRanking: MockRanking[] = [
  { id: 'mock-rank-1', modalidade_id: 'mock-mod-1', senha_id: 'mock-senha-1', competidor_id: 'mock-comp-1', total_pontos: 87.5, total_passadas: 2, posicao: 1, updated_at: new Date().toISOString(), competidores: { nome: 'João Silva' }, senhas: { numero_senha: 1 } },
  { id: 'mock-rank-2', modalidade_id: 'mock-mod-1', senha_id: 'mock-senha-4', competidor_id: 'mock-comp-4', total_pontos: 82.0, total_passadas: 2, posicao: 2, updated_at: new Date().toISOString(), competidores: { nome: 'Ana Costa' }, senhas: { numero_senha: 4 } },
  { id: 'mock-rank-3', modalidade_id: 'mock-mod-1', senha_id: 'mock-senha-2', competidor_id: 'mock-comp-2', total_pontos: 76.5, total_passadas: 1, posicao: 3, updated_at: new Date().toISOString(), competidores: { nome: 'Maria Oliveira' }, senhas: { numero_senha: 2 } },
  { id: 'mock-rank-4', modalidade_id: 'mock-mod-1', senha_id: 'mock-senha-6', competidor_id: 'mock-comp-6', total_pontos: 71.0, total_passadas: 1, posicao: 4, updated_at: new Date().toISOString(), competidores: { nome: 'Lucas Mendes' }, senhas: { numero_senha: 6 } },
]

// ============================================================
// FINANCEIRO / TRANSAÇÕES
// ============================================================
export const mockTransacoes: MockTransacao[] = [
  { id: 'mock-tx-1', tenant_id: 'mock-tenant-1', senha_id: 'mock-senha-1', tipo: 'venda', valor: 5000, taxa_sgvaq: 500, canal: 'presencial', user_id: 'mock-user-1', evento_id: 'mock-evento-1', created_at: '2026-05-01T10:00:00Z', descricao: null },
  { id: 'mock-tx-2', tenant_id: 'mock-tenant-1', senha_id: 'mock-senha-2', tipo: 'venda', valor: 5000, taxa_sgvaq: 500, canal: 'presencial', user_id: 'mock-user-1', evento_id: 'mock-evento-1', created_at: '2026-05-01T10:30:00Z', descricao: null },
  { id: 'mock-tx-3', tenant_id: 'mock-tenant-1', senha_id: 'mock-senha-4', tipo: 'venda', valor: 5000, taxa_sgvaq: 500, canal: 'presencial', user_id: 'mock-user-1', evento_id: 'mock-evento-1', created_at: '2026-05-01T11:00:00Z', descricao: null },
  { id: 'mock-tx-4', tenant_id: 'mock-tenant-1', senha_id: 'mock-senha-5', tipo: 'cancelamento', valor: -5000, taxa_sgvaq: 0, canal: 'presencial', user_id: 'mock-user-1', evento_id: 'mock-evento-1', created_at: '2026-05-02T09:00:00Z', descricao: 'Cancelado a pedido do cliente' },
  { id: 'mock-tx-5', tenant_id: 'mock-tenant-1', senha_id: 'mock-senha-6', tipo: 'venda', valor: 5000, taxa_sgvaq: 500, canal: 'presencial', user_id: 'mock-user-1', evento_id: 'mock-evento-1', created_at: '2026-05-01T12:00:00Z', descricao: null },
  { id: 'mock-tx-6', tenant_id: 'mock-tenant-1', senha_id: 'mock-senha-7', tipo: 'venda', valor: 8000, taxa_sgvaq: 800, canal: 'presencial', user_id: 'mock-user-1', evento_id: 'mock-evento-1', created_at: '2026-05-01T10:00:00Z', descricao: null },
]

// ============================================================
// EQUIPE
// ============================================================
export const mockEquipe: MockEquipe[] = [
  { id: 'mock-tu-1', tenant_id: 'mock-tenant-1', user_id: 'mock-user-1', nome: 'Administrador', email: 'admin@vaquejada.com', role: 'organizador', whatsapp: '8899000001', ativo: true, created_at: '2026-01-15T10:00:00Z' },
  { id: 'mock-tu-2', tenant_id: 'mock-tenant-1', user_id: 'mock-user-2', nome: 'Carlos Financeiro', email: 'carlos@vaquejada.com', role: 'financeiro', whatsapp: '8899000002', ativo: true, created_at: '2026-01-20T10:00:00Z' },
  { id: 'mock-tu-3', tenant_id: 'mock-tenant-1', user_id: 'mock-user-3', nome: 'Dr. Juiz', email: 'juiz@vaquejada.com', role: 'juiz', whatsapp: '8899000003', ativo: true, created_at: '2026-02-01T10:00:00Z' },
  { id: 'mock-tu-4', tenant_id: 'mock-tenant-1', user_id: 'mock-user-4', nome: 'Locutor Oliveira', email: 'locutor@vaquejada.com', role: 'locutor', whatsapp: '8899000004', ativo: true, created_at: '2026-02-01T10:00:00Z' },
  { id: 'mock-tu-5', tenant_id: 'mock-tenant-1', user_id: 'mock-user-5', nome: 'Ex-membro', email: 'ex@vaquejada.com', role: 'financeiro', whatsapp: null, ativo: false, created_at: '2026-01-25T10:00:00Z' },
]

// ============================================================
// COBRANÇAS
// ============================================================
export const mockCobrancas: MockCobranca[] = [
  { id: 'mock-cob-1', tenant_id: 'mock-tenant-1', mes: '2026-04', total_cobranca: 1500, status: 'pago', comprovante_url: 'cobrancas/comprovante-abril.pdf', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-05T10:00:00Z', tenant: { nome: mockTenant.nome, slug: mockTenant.slug } },
  { id: 'mock-cob-2', tenant_id: 'mock-tenant-1', mes: '2026-05', total_cobranca: 800, status: 'pendente', comprovante_url: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z', tenant: { nome: mockTenant.nome, slug: mockTenant.slug } },
]

// ============================================================
// NOTIFICAÇÕES
// ============================================================
export const mockNotificacoes: MockNotificacao[] = [
  { id: 'mock-not-1', tenant_id: 'mock-tenant-1', idempotency_key: 'senha_confirmada:mock-senha-1', competidor_id: 'mock-comp-1', tipo: 'senha_confirmada', mensagem: 'Sua senha #001 foi confirmada!', status: 'enviado', tentativas: 1, erro: null, created_at: '2026-05-01T10:00:00Z', updated_at: '2026-05-01T10:00:05Z', proximo_retry_em: null, tenant: { nome: mockTenant.nome } },
  { id: 'mock-not-2', tenant_id: 'mock-tenant-1', idempotency_key: 'chamada_fila:mock-senha-4', competidor_id: 'mock-comp-4', tipo: 'chamada_fila', mensagem: 'Você foi chamado para a pista! Senha #004.', status: 'pendente', tentativas: 0, erro: null, created_at: new Date().toISOString(), updated_at: null, proximo_retry_em: null, tenant: { nome: mockTenant.nome } },
  { id: 'mock-not-3', tenant_id: 'mock-tenant-1', idempotency_key: 'falha:mock-senha-3', competidor_id: 'mock-comp-3', tipo: 'comprovante_rejeitado', mensagem: 'Seu comprovante foi rejeitado. Motivo: imagem ilegível.', status: 'falhou', tentativas: 3, erro: 'HTTP 429: Too Many Requests', created_at: '2026-05-02T10:00:00Z', updated_at: '2026-05-02T10:03:00Z', proximo_retry_em: new Date(Date.now() + 3600000).toISOString(), tenant: { nome: mockTenant.nome } },
]

// ============================================================
// PASSADAS (mock para conflitos)
// ============================================================
export const mockPassadasConflitos = [
  { id: 'mock-conf-1', passada_original_id: 'mock-pass-1', dados_conflito: { senha_id: 'mock-senha-1', numero_passada: 1, pontuacao_original: 87.5, pontuacao_conflitante: 85.0, criado_em_local_original: '2026-05-15T14:30:00Z', criado_em_local_conflitante: '2026-05-15T14:31:00Z' }, resolvido: false, resolvido_por: null, resolvido_em: null, created_at: '2026-05-15T14:35:00Z' },
]

// ============================================================
// DADOS PARA PÁGINA PÚBLICA (evento/[id])
// ============================================================
export const mockEventoPublico = {
  id: 'mock-evento-1',
  nome: 'Vaquejada do Sertão 2026',
  status: 'aberto',
  data_inicio: '2026-05-15',
  data_fim: '2026-05-17',
  local: 'Parque de Vaquejada do Sertão',
  cidade: 'Sobral',
  estado: 'CE',
  modalidades: mockModalidades.filter(m => m.evento_id === 'mock-evento-1').map(m => ({
    id: m.id,
    nome: m.nome,
    valor_senha: m.valor_senha,
    total_senhas: m.total_senhas,
    senhas_vendidas: m.senhas_vendidas,
    premiacao_descricao: m.premiacao_descricao,
  })),
}