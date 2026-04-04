import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ResumoFinanceiro } from '@/actions/financeiro'

const styles = StyleSheet.create({
  page:       { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title:      { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle:   { fontSize: 11, color: '#555', marginBottom: 20 },
  section:    { marginBottom: 16 },
  row:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  label:      { color: '#555' },
  value:      { fontWeight: 'bold' },
  summaryBox: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  total:      { fontSize: 13, fontWeight: 'bold' },
  footer:     { position: 'absolute', bottom: 20, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center' },
})

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

interface Props {
  evento: { nome: string; data_inicio: string; data_fim: string; local?: string | null }
  resumo: ResumoFinanceiro
  geradoEm: string
}

export function RelatorioCaixaDocument({ evento, resumo, geradoEm }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Relatório de Caixa</Text>
        <Text style={styles.subtitle}>
          {evento.nome} — {evento.data_inicio}
          {evento.data_fim !== evento.data_inicio ? ` a ${evento.data_fim}` : ''}
          {evento.local ? ` | ${evento.local}` : ''}
        </Text>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Total de vendas</Text>
            <Text style={styles.value}>{resumo.quantidadeVendas}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Cancelamentos</Text>
            <Text style={styles.value}>{resumo.quantidadeCancelamentos}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Receita bruta líquida</Text>
            <Text style={[styles.value, styles.total]}>{formatBRL(resumo.totalBruto)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Taxa SGVAQ (10%)</Text>
            <Text style={styles.value}>{formatBRL(resumo.totalTaxaSgvaq)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#333' }]}>
            <Text style={{ fontWeight: 'bold', flex: 2 }}>Data/Hora</Text>
            <Text style={{ fontWeight: 'bold', flex: 2 }}>Tipo</Text>
            <Text style={{ fontWeight: 'bold', flex: 3 }}>Descrição</Text>
            <Text style={{ fontWeight: 'bold', flex: 1.5, textAlign: 'right' }}>Valor</Text>
          </View>
          {resumo.transacoes.map(t => (
            <View key={t.id} style={styles.row}>
              <Text style={{ flex: 2 }}>{new Date(t.created_at).toLocaleString('pt-BR')}</Text>
              <Text style={{ flex: 2 }}>{t.tipo === 'cancelamento' ? 'Cancelamento' : 'Venda'}</Text>
              <Text style={{ flex: 3 }}>{t.descricao ?? '—'}</Text>
              <Text style={{ flex: 1.5, textAlign: 'right' }}>{formatBRL(t.valor)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Gerado em {new Date(geradoEm).toLocaleString('pt-BR')} — SGVAQ Sistema Gerencial de Vaquejada
        </Text>
      </Page>
    </Document>
  )
}
