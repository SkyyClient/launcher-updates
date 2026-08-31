import React, { useState } from 'react'
import { Newspaper, ChevronRight, ArrowLeft } from 'lucide-react'
import { useSkyyStore } from '@/store'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/store/toast'

export default function News() {
  const news = useSkyyStore((s) => s.news)

  const formatted = [...news].sort((a, b) => b.date.localeCompare(a.date))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = formatted.find((n) => n.id === selectedId)

  if (selected) {
    return (
      <div className="flex flex-col gap-6">
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-2 text-skyy-muted hover:text-skyy-text w-fit transition-colors"
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <GlassPanel className="p-8">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant={selected.category === 'Actualizacion' ? 'violet' : 'info'}>
              {selected.category}
            </Badge>
            <span className="text-xs text-skyy-muted">{selected.date}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-skyy-text font-display">
            {selected.title}
          </h1>
          <div className="mt-4 rounded-xl overflow-hidden h-40 bg-skyy-gradient/30 flex items-center justify-center">
            {selected.image ? (
              <img src={selected.image} alt={selected.title} className="w-full h-full object-cover" />
            ) : (
              <Newspaper size={40} className="text-skyy-violet/50" />
            )}
          </div>
          <p className="mt-5 text-sm text-skyy-muted leading-relaxed">
            {selected.description}
          </p>
        </GlassPanel>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-skyy-text tracking-wide">
          NOTICIAS
        </h1>
        <p className="text-sm text-skyy-muted mt-1">
          Novedades de SKYY CLIENT y Minecraft
        </p>
      </div>

      {formatted.length === 0 ? (
        <GlassPanel className="p-12 text-center text-skyy-muted text-sm">
          No hay noticias disponibles.
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formatted.map((n, i) => (
            <button
              key={n.id}
              onClick={() => setSelectedId(n.id)}
              className={`glass rounded-2xl p-6 text-left hover:bg-white/[0.05] transition-colors group ${
                i === 0 ? 'md:col-span-2' : ''
              }`}
            >
              <div
                className={`rounded-xl overflow-hidden mb-4 flex items-center justify-center bg-skyy-gradient/20 ${
                  i === 0 ? 'h-44' : 'h-28'
                }`}
              >
                {n.image ? (
                  <img src={n.image} alt={n.title} className="w-full h-full object-cover" />
                ) : (
                  <Newspaper size={i === 0 ? 40 : 28} className="text-skyy-violet/40" />
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={n.category === 'Actualizacion' ? 'violet' : 'info'}>
                  {n.category}
                </Badge>
                <span className="text-[10px] text-skyy-muted">{n.date}</span>
              </div>
              <h3 className={`font-bold text-skyy-text font-display ${i === 0 ? 'text-xl' : 'text-base'}`}>
                {n.title}
              </h3>
              <p className="text-xs text-skyy-muted mt-2 line-clamp-3">{n.description}</p>
              <div className="mt-3 flex items-center gap-1 text-skyy-violet text-xs group-hover:gap-2 transition-all">
                Leer mas <ChevronRight size={13} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
