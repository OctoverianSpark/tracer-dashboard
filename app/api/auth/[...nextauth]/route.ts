import { Role } from '@/types/AppUser'
import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user }) {
      console.log('[signIn] user:', user)
      console.log('[signIn] API_URL:', process.env.API_URL)
      if (!user.email) return false
      try {
        const res = await fetch(`${process.env.API_URL}/appuser/findbyemail?email=${user.email}`)
        const data = await res.json()
        console.log('[signIn] status:', res.status, '| response:', data)
        if (!res.ok) return false
        return !!data
      } catch (e) {
        console.error('[signIn] error:', e)
        return false
      }
    },

    async jwt({ token, trigger }) {
      const shouldFetch = trigger === 'signIn' || trigger === 'update' || !token.appUser
      if (!token.email || !shouldFetch) return token

      try {
        const res = await fetch(`${process.env.API_URL}/appuser/findbyemail?email=${token.email}`)
        if (!res.ok) return token

        const appUser = await res.json()
        const roleRes = await fetch(`${process.env.API_URL}/roles/find/${appUser.role_id}`)
        if (!roleRes.ok) return token

        token.appUser = appUser
        token.role = await roleRes.json()
        // Valor "congelado" al momento del login/refresh — middleware.ts lo compara en cada
        // request contra el force_logout_at actual del backend para detectar revocación.
        token.forceLogoutAt = appUser.force_logout_at ?? null
      } catch { }

      return token
    },

    async session({ session, token }) {
      session.picture = token.picture ?? ''
      session.role = token.role as Role
      session.appUser = token.appUser
      return session
    }
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }