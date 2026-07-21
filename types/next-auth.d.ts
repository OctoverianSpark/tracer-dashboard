import { AppUser, Role } from './AppUser'

declare module 'next-auth' {
  interface Session {
    appUser: AppUser
    picture: string
    role: Role
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    appUser: AppUser
    role: Role
    forceLogoutAt?: string | null

  }
}