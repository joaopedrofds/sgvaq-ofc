'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function loginMockAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (email !== 'admin@vaquejada.com' || password !== '123456789') {
    return { error: 'Email ou senha incorretos.' }
  }

  const cookieStore = await cookies()
  cookieStore.set('__sgvaq_mock_auth', 'true', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  redirect('/dashboard')
}