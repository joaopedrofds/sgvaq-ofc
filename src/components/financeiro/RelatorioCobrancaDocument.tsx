import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ResumoFinanceiro } from '@/actions/financeiro'

const styles = StyleSheet.create({
  page:     { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title:    { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#555', marginBottom: 20 },
  section:  { marginBottom: 16 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginTop: 8, borderTopWidth: 1.5, borderTopColor: '#000' },
  bold:     { fontWeight: 'bold' },
  footer:   { position: 'absolute', bottom: 20, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center' },
})

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

interface EventoResumo {
  nome: string
  data_inicio: string
  resumo: Pick<ResumoFinanceiro, 'totalBruto' | 'totalTaxaSgvaq'>
}

interface Props {
  tenant: { nome: string; slug: string }
  mes: string // 'YYYY-MM'
  eventos: EventoResumo[]
  totalCobranca: number
}

export function RelatorioCobrancaDocument({ tenant, mes, eventos, totalCobranca }: Props) {
  const [year, month] = mes.split('-')
  const mesFormatado = new Date(Number(year), Number(month) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Cobrança SGVAQ — {mesFormatado}</Text>
        <Text style={styles.subtitle}>
          Organizadora: {tenant.nome} ({tenant.slug}.sgvaq.com.br)
        </Text>

        <View style={styles.section}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#333' }]}>
            <Text style={[styles.bold, { flex: 3 }]}>Evento</Text>
            <Text style={[styles.bold, { flex: 2 }]}>Data</Text>
            <Text style={[styles.bold, { flex: 2, textAlign: 'right' }]}>Receita Bruta</Text>
            <Text style={[styles.bold, { flex: 2, textAlign: 'right' }]}>Taxa 10%</Text>
          </View>
          {eventos.map((ev, i) => (
            <View key={i} style={styles.row}>
              <Text style={{ flex: 3 }}>{ev.nome}</Text>
              <Text style={{ flex: 2 }}>{ev.data_inicio}</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>{formatBRL(ev.resumo.totalBruto)}</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>{formatBRL(ev.resumo.totalTaxaSgvaq)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.bold, { flex: 7 }]}>TOTAL A PAGAR</Text>
            <Text style={[styles.bold, { flex: 2, textAlign: 'right', fontSize: 13 }]}>{formatBRL(totalCobranca)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 20, padding: 12, backgroundColor: '#fffbea', borderRadius: 4 }}>
          <Text style={styles.bold}>Instruções de pagamento</Text>
          <Text style={{ marginTop: 6, lineHeight: 1.6 }}>
            Realize o pagamento via Pix e envie o comprovante ao administrador do SGVAQ para que o status seja atualizado para "Pago".
          </Text>
        </View>

        <Text style={styles.footer}>
          SGVAQ Sistema Gerencial de Vaquejada — Documento gerado automaticamente
        </Text>
      </Page>
    </Document>
  )
}
