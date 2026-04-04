import { renderToBuffer as pdfRenderToBuffer } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

export async function renderToBuffer(document: ReactElement): Promise<Buffer> {
  const stream = await pdfRenderToBuffer(document)
  return stream
}
