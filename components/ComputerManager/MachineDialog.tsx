'use client'
import { Button } from '@/app/_components/_ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/app/_components/_ui/dialog'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Textarea } from '@/app/_components/_ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/app/_components/_ui/tooltip'
import {
  getIPInfo,
  lockMachine,
  sendFileToMachine,
  sendNotice
} from '@/app/computers/actions'
import { Machine } from '@/types/Machine'
import { Notification } from '@/types/Notification'
import {
  ArrowRight,
  Bell,
  FileUp,
  Lock,
  Send,
  SendHorizonal
} from 'lucide-react'
import React, { ChangeEventHandler, useEffect, useRef, useState } from 'react'

interface MachineDialogProps {
  machine: Machine
}

export default function MachineDialog ({ machine }: MachineDialogProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    pc: false,
    notice: false
  })
  const [notification, setNotification] = useState<Notification>({
    title: 'Tracer',
    message: ''
  })
  const [ip, setIp] = useState<Record<string, string>>()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const openNativeFileDialog = () => {
    // Esto abre el explorador de archivos del sistema operativo
    // En Windows: File Explorer
    // En macOS: Finder
    // En Linux: Nautilus/Dolphin/etc
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('Archivo seleccionado:', file.name)

    // Enviar archivo
    const formData = new FormData()
    formData.append('file', file)

    sendFileToMachine(machine.machineSerial, formData)
  }
  const handleNotice = () => {
    sendNotice(machine.machineSerial, notification)
    setOpen(prev => {
      return {
        ...prev,
        notice: false
      }
    })
  }

  const handleLock = () => {
    lockMachine(machine.machineSerial)
  }

  useEffect(() => {
    if (open.pc) return

    const getGeo = async () => {
      try {
        const info = await getIPInfo(machine.ip)
        setIp(info)
      } catch (error) {
        console.error('Error obteniendo información de IP:', error)
      }
    }

    getGeo()
  }, [open.pc, machine.ip]) // Agregadas las dependencias necesarias

  const handleNotification: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = event => {
    setNotification(prev => {
      return { ...prev, [event.target.id]: event.target.value }
    })
  }

  return (
    <Dialog
      onOpenChange={val =>
        setOpen(prev => {
          return { ...prev, pc: val }
        })
      }
      open={open.pc}
    >
      <DialogTrigger asChild>
        <Button className='cursor-pointer'>
          Ver Datos <ArrowRight />
        </Button>
      </DialogTrigger>
      <DialogContent className='w-max-120 h-max-70'>
        <DialogHeader>
          <div className='flex gap-1'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleLock}
                  className='cursor-pointer'
                  size={'icon-sm'}
                  variant={'ghost'}
                >
                  <Lock />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Bloquear</p>
              </TooltipContent>
            </Tooltip>
            <Dialog
              onOpenChange={val =>
                setOpen(prev => {
                  return { ...prev, notice: val }
                })
              }
              open={open.notice}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      className='cursor-pointer'
                      size={'icon-sm'}
                      variant={'ghost'}
                    >
                      <Bell />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enviar Notificacion</p>
                </TooltipContent>
              </Tooltip>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enviar Notificacion</DialogTitle>
                </DialogHeader>
                <div className='grid'>
                  <Label htmlFor='title'>Titulo</Label>
                  <Input
                    id='title'
                    value={notification?.title}
                    onChange={handleNotification}
                  />
                </div>
                <div className='grid'>
                  <Label htmlFor='message'>Mensaje</Label>
                  <Textarea
                    id='message'
                    value={notification?.message}
                    onChange={handleNotification}
                  />
                </div>
                <Button className='cursor-pointer' onClick={handleNotice}>
                  Enviar <SendHorizonal />
                </Button>
              </DialogContent>
            </Dialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openNativeFileDialog}
                  className='cursor-pointer'
                  size={'icon-sm'}
                  variant={'ghost'}
                >
                  <input
                    ref={fileInputRef}
                    type='file'
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <FileUp />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Enviar Archivo</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <DialogTitle>
            {machine.machineName} ({machine.machineSerial})
          </DialogTitle>
        </DialogHeader>

        <div className='grid gap-4'>
          <div className='grid'>
            <h2 className='text-lg font-bold'>Usuario del computador</h2>
            <h3 className='text-md font-medium'>{machine.displayName}</h3>
          </div>
          <div className='grid'>
            <h2 className='text-lg font-bold'>Localizacion</h2>
            <h3 className='text-md flex gap-4 font-medium'>
              {ip?.city}
              <img src={ip?.flag} />
            </h3>
          </div>

          <div className='grid'>
            <h2 className='text-lg font-bold'>Nombre de Usuario</h2>
            <h3 className='text-md font-medium'>{machine.userName}</h3>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
