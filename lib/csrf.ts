import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

export const CSRF_SECRET_COOKIE = 'csrf_secret'

export async function getCsrfSecret() {
  const cookieStore = await cookies()
  return cookieStore.get(CSRF_SECRET_COOKIE)?.value
}

export async function generateCsrfToken() {
  const secret = await getCsrfSecret()
  if (!secret) return "" // Should be handled by middleware
  return createHmac('sha256', secret).update('csrf-token').digest('hex')
}

export async function verifyCsrfToken(token: string | null) {
  if (!token) return false
  const secret = await getCsrfSecret()
  if (!secret) return false
  const expectedToken = createHmac('sha256', secret).update('csrf-token').digest('hex')
  return token === expectedToken
}
