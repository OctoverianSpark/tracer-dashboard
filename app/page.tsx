'use client'
import Image from 'next/image'
import { signIn, useSession } from 'next-auth/react'
import { Card, CardContent } from './_components/_ui/card'
import { Button } from './_components/_ui/button'
import { Users, Monitor, Clock, TrendingUp } from 'lucide-react'
import { redirect, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!session) return
    
    const perms = JSON.parse(session.role?.access_level ?? '{}')
    const hasAccess = Object.values(perms).some(Boolean)
    if (hasAccess) redirect('/home')
  }, [session, router])
    
  return (
    <div className='grid place-items-center min-h-screen'>
      <div className='w-full max-w-sm space-y-6 px-4'>

        <div className='flex flex-col items-center gap-3 text-center'>
          <span className='rounded-2xl overflow-hidden shadow-[0_0_28px_rgba(255,255,255,0.45)]'>
            <Image src='/logo.png' alt='ActiMetrics' width={96} height={96} className='block' />
          </span>
          <h1 className='text-2xl font-semibold tracking-tight'>ActiMetrics</h1>
          <p className='text-sm text-muted-foreground'>
            Monitoreo de actividad y productividad empresarial
          </p>
        </div>

        <Card>
          <CardContent className='pt-6 space-y-4'>
            <div className='space-y-1'>
              <p className='text-sm font-medium text-center'>Iniciar sesión</p>
              <p className='text-xs text-center text-muted-foreground'>
                Usa tu cuenta corporativa de Google para acceder
              </p>
            </div>
            <Button
              className='w-full cursor-pointer gap-2'
              variant='outline'
              onClick={() => signIn('google',{ callbackUrl: '/home' })}
            >
              <svg className='size-4' viewBox='0 0 24 24'>
                <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4'/>
                <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853'/>
                <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z' fill='#FBBC05'/>
                <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335'/>
              </svg>
              Continuar con Google
            </Button>
          </CardContent>
        </Card>

        <p className='text-center text-xs text-muted-foreground'>
          Solo cuentas corporativas autorizadas pueden acceder
        </p>
      </div>
    </div>
  )
}