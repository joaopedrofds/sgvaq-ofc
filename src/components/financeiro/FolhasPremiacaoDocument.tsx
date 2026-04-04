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
            <Text style={{ width: 80, textAlign: 'right', fontWeight: 'bold' }}>
              {entry.pontuacao_total.toFixed(2)}
            </Text>
          </View>
        ))}

        <Text style={styles.footer}>SGVAQ — Folha de Premiação Oficial</Text>
      </Page>
    </Document>
  )
}
