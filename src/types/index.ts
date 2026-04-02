export type UserRole = 'super_admin' | 'organizador' | 'financeiro' | 'juiz' | 'competidor' | 'locutor'
export type EventoStatus = 'rascunho' | 'aberto' | 'em_andamento' | 'encerrado'
export type SenhaStatus = 'pendente' | 'ativa' | 'cancelada' | 'checkin_feito'
export type SenhaCanal = 'presencial' | 'online'
export type TipoProva = 'vaquejada' | 'tambor'
export type FilaStatus = 'aguardando' | 'chamado' | 'passou' | 'ausente'
export type NotificacaoTipo = 'senha_confirmada' | 'comprovante_aprovado' | 'comprovante_rejeitado' | 'chamada_fila' | 'ranking_final'

export interface TenantContext {
  tenantId: string
  slug: string
}

export interface SessionUser {
  id: string
  role: UserRole
  tenantId?: string
  email: string
}
