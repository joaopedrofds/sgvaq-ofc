interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendWhatsAppMessage(
  to: string,      // phone number with country code: '5511999990000'
  message: string,
  apiUrl: string,
  apiKey: string
): Promise<SendResult> {
  try {
    const response = await fetch(`${apiUrl}/message/sendText/default`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: to,
        text: message
      })
    })

    if (!response.ok) {
      const body = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${body}` }
    }

    const json = await response.json() as { key?: { id?: string } }
    return { success: true, messageId: json.key?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
