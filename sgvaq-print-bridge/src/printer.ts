import net from 'net'
import fs from 'fs'

export interface PrinterConfig {
  type: 'usb' | 'network' | 'file'
  // For type='usb': device path e.g. '/dev/usb/lp0' or '\\\\.\\COM3'
  // For type='network': host and port
  // For type='file': path (for testing)
  device?: string
  host?: string
  port?: number
}

export async function printBuffer(data: Buffer, config: PrinterConfig): Promise<void> {
  switch (config.type) {
    case 'usb':
      await printUsb(data, config.device!)
      break
    case 'network':
      await printNetwork(data, config.host!, config.port ?? 9100)
      break
    case 'file':
      await fs.promises.writeFile(config.device!, data)
      break
    default:
      throw new Error(`Unknown printer type: ${(config as any).type}`)
  }
}

async function printUsb(data: Buffer, device: string): Promise<void> {
  await fs.promises.writeFile(device, data)
}

async function printNetwork(data: Buffer, host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host, () => {
      socket.write(data, (err) => {
        socket.end()
        if (err) reject(err)
        else resolve()
      })
    })
    socket.on('error', reject)
    socket.setTimeout(5000, () => {
      socket.destroy()
      reject(new Error('Printer connection timeout'))
    })
  })
}
