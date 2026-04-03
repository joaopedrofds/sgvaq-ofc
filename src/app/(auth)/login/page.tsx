import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './login-form'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900">SGVAQ</h1>
          <p className="text-amber-700 mt-1">Sistema Gerencial de Vaquejada</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
