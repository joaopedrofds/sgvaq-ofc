'use client'
import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRCodeProps {
  value: string
  size?: number
}

export function QRCodeDisplay({ value, size = 200 }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      })
    }
  }, [value, size])

  return <canvas ref={canvasRef} />
}
