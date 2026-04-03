import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold text-amber-900">SGVAQ</h1>
        <p className="text-xl text-amber-700">
          Sistema Gerencial de Vaquejada — gerencie suas provas com eficiência,
          do caixa ao telão.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium bg-amber-700 text-white hover:bg-amber-800 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Cadastrar Organizadora
          </Link>
        </div>
      </div>
    </main>
  )
}
