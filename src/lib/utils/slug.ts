const RESERVED_SLUGS = new Set([
  'www', 'api', 'admin', 'app', 'static', 'mail',
  'support', 'help', 'login', 'cadastro'
])

const SLUG_REGEX = /^[a-z0-9-]{3,30}$/

export function validateSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug)
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}
