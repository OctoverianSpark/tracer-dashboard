'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/_components/_ui/card'
import { Button } from '@/app/_components/_ui/button'
import { Badge } from '@/app/_components/_ui/badge'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { type ReleaseInfo } from '@/app/app/releases/actions'
import { UploadCloud, Download, PackageCheck, PackageX, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useStaggerChildren, STAGGER_ITEM_INITIAL_STYLE } from '@/lib/animation'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function formatBytes(bytes: number) {
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso))
}

interface Props {
  initialInfo: ReleaseInfo
}

export default function ReleasePanel({ initialInfo }: Props) {
  const [info, setInfo] = useState<ReleaseInfo>(initialInfo)
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [versionName, setVersionName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  useStaggerChildren(containerRef)

  const refreshInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/tracer/updates`, { cache: 'no-store' })
      if (res.ok) {
        setInfo(await res.json())
      } else {
        setInfo(null)
      }
    } catch {
      toast.error('No se pudo conectar con el servidor')
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragging(false), [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }, [])

  const handleUpload = () => {
    if (!selectedFile || !versionName.trim()) return

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('version', versionName.trim())

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        toast.success('Instalador publicado exitosamente')
        setSelectedFile(null)
        setVersionName('')
        setProgress(0)
        refreshInfo()
      } else {
        toast.error('Error al subir el instalador')
      }
      setUploading(false)
    })

    xhr.addEventListener('error', () => {
      toast.error('Error de conexión al subir el archivo')
      setUploading(false)
      setProgress(0)
    })

    xhr.open('POST', `${API_URL}/tracer/updates?version=${versionName}`)
    xhr.send(formData)
    setUploading(true)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 items-start" ref={containerRef}>
      <div data-stagger-item style={STAGGER_ITEM_INITIAL_STYLE}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Versión publicada</CardTitle>
            <Button variant="ghost" size="icon" onClick={refreshInfo} title="Actualizar">
              <RefreshCw className="size-4" />
            </Button>
          </div>
          <CardDescription>Instalador disponible para los agentes</CardDescription>
        </CardHeader>
        <CardContent>
          {info?.ok ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <PackageCheck className="size-8 text-emerald-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium truncate">{info.filename}</p>
                  <p className="text-sm text-muted-foreground">{formatBytes(info.size)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(info.updatedAt)}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                Disponible
              </Badge>
              <a href={`${API_URL}/tracer/updates/download`} download>
                <Button variant="outline" size="sm" className="gap-2 w-full mt-2">
                  <Download className="size-4" />
                  Descargar
                </Button>
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <PackageX className="size-8 shrink-0" />
              <div>
                <p className="text-sm font-medium">Sin instalador</p>
                <p className="text-xs">No hay ninguna versión publicada aún</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <div data-stagger-item style={STAGGER_ITEM_INITIAL_STYLE}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Publicar nueva versión</CardTitle>
          <CardDescription>Arrastra el paquete .nupkg o selecciónalo desde tu equipo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${dragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
              }
            `}
          >
            <UploadCloud className={`mx-auto size-8 mb-2 ${dragging ? 'text-primary' : 'text-muted-foreground'}`} />
            {selectedFile ? (
              <div>
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">Soltar archivo .nupkg aquí</p>
                <p className="text-xs text-muted-foreground">o haz clic para explorar</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".nupkg"
              className="hidden"
              onChange={(e) => {
                setSelectedFile(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="version">Versión</Label>
            <Input
              id="version"
              placeholder="1.0.0"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              disabled={uploading}
            />
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subiendo...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !versionName.trim() || uploading}
            className="w-full gap-2"
          >
            <UploadCloud className="size-4" />
            {uploading ? `Subiendo... ${progress}%` : 'Publicar instalador'}
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
