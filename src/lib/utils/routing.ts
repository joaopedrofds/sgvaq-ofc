const PUBLIC_ROUTE_PREFIXES = ['/evento/', '/locutor/', '/login', '/cadastro', '/_next/', '/favicon', '/api/']

export function extractSlugFromHost(host: string, appDomain: string): string | null {
  const hostWithoutPort = host.split(':')[0]
  if (hostWithoutPort === appDomain) return null

  const suffix = `.${appDomain}`
  if (!hostWithoutPort.endsWith(suffix)) return null

  const slug = hostWithoutPort.slice(0, -suffix.length)
  if (!slug || slug === 'www') return null

  return slug
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix)) || pathname === '/'
}

export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin')
}
