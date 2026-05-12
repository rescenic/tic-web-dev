import { cookies } from 'next/headers'
import { randomBytes, createHmac } from 'crypto'

const CSRF_SECRET_COOKIE = 'csrf_secret'
const CSRF_HEADER = 'x-csrf-token'

export async function getCsrfSecret() {
  const cookieStore = await cookies()
  let secret = cookieStore.get(CSRF_SECRET_COOKIE)?.value

  if (!secret) {
    secret = randomBytes(32).toString('hex')
    cookieStore.set(CSRF_SECRET_COOKIE, secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  }

  return secret
}

export async function generateCsrfToken() {
  const secret = await getCsrfSecret()
  // In a real scenario, you might want to add a timestamp or salt
  return createHmac('sha256', secret).update('csrf-token').digest('hex')
}

export async function verifyCsrfToken(token: string | null) {
  if (!token) return false
  const secret = await getCsrfSecret()
  const expectedToken = createHmac('sha256', secret).update('csrf-token').digest('hex')
  return token === expectedToken
}
