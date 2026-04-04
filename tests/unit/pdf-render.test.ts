import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@/lib/pdf/render-to-buffer'
import { Document, Page, Text } from '@react-pdf/renderer'
import React from 'react'

describe('renderToBuffer', () => {
  it('returns a Buffer for a minimal PDF document', async () => {
    const doc = React.createElement(Document, null,
      React.createElement(Page, null,
        React.createElement(Text, null, 'SGVAQ Test')
      )
    )
    const buffer = await renderToBuffer(doc)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(100)
    // PDF magic bytes
    expect(buffer.slice(0, 4).toString()).toBe('%PDF')
  })
})
