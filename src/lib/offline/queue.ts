import { openDB, type IDBPDatabase } from 'idb'
import { v4 as uuidv4 } from 'uuid'

export interface PassadaPayload {
  uuid_local: string
  senha_id: string
  modalidade_id: string
  numero_passada: number
  juiz_id: string
  pontuacao_total: number
  detalhes_json: DetalheCriterio[]
  penalidade: number
  penalidade_motivo?: string
  created_at_local: string
  origem: 'offline'
}

export interface DetalheCriterio {
  criterio_id: string
  nome: string
  valor: number
  peso: number
  pontuacao: number
  observacao: string
}

interface BuildPayloadInput {
  senha_id: string
  modalidade_id: string
  numero_passada: number
  juiz_id: string
  detalhes: DetalheCriterio[]
  penalidade: number
  penalidade_motivo?: string
}

export function buildPassadaPayload(input: BuildPayloadInput): PassadaPayload {
  const pontuacaoTotal = input.detalhes.reduce((sum, d) => sum + d.pontuacao, 0) - input.penalidade
  return {
    uuid_local: uuidv4(),
    senha_id: input.senha_id,
    modalidade_id: input.modalidade_id,
    numero_passada: input.numero_passada,
    juiz_id: input.juiz_id,
    pontuacao_total: Math.round(pontuacaoTotal * 100) / 100,
    detalhes_json: input.detalhes,
    penalidade: input.penalidade,
    penalidade_motivo: input.penalidade_motivo,
    created_at_local: new Date().toISOString(),
    origem: 'offline',
  }
}

export function validateOfflinePayload(p: PassadaPayload): boolean {
  return !!(p.uuid_local && p.senha_id && p.modalidade_id && p.juiz_id && p.created_at_local)
}

let db: IDBPDatabase | null = null

async function getDB() {
  if (!db) {
    db = await openDB('sgvaq-offline', 1, {
      upgrade(database) {
        database.createObjectStore('sync_queue', { keyPath: 'uuid_local' })
      },
    })
  }
  return db
}

export async function enqueuePassada(payload: PassadaPayload): Promise<void> {
  const database = await getDB()
  await database.put('sync_queue', payload)
}

export async function getQueue(): Promise<PassadaPayload[]> {
  const database = await getDB()
  const all = await database.getAll('sync_queue')
  return all.sort((a, b) =>
    new Date(a.created_at_local).getTime() - new Date(b.created_at_local).getTime()
  )
}

export async function removeFromQueue(uuid_local: string): Promise<void> {
  const database = await getDB()
  await database.delete('sync_queue', uuid_local)
}

export async function getQueueSize(): Promise<number> {
  const database = await getDB()
  return database.count('sync_queue')
}
