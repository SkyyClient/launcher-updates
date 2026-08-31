import React, { useState } from 'react'
import { Sparkles, ChevronRight, ArrowLeft, Calendar } from 'lucide-react'
import { useSkyyStore } from '@/store'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Badge } from '@/components/ui/Badge'
import heroNovedades from '@/img/novedades-hero.png'

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Actualización': { bg: 'bg-skyy-violet/20', text: 'text-violet-300' },
  'Minecraft': { bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
  'Función': { bg: 'bg-amber-500/20', text: 'text-amber-300' },
  'Noticia': { bg: 'bg-sky-500/20', text: 'text-sky-300' },
  'Novedad': { bg: 'bg-sky-500/20', text: 'text-sky-300' },
}

const DEFAULT_COLOR = { bg: 'bg-white/10', text: 'text-white/70' }

export default function Novedades() {
  const news = useSkyyStore((s) => s.news)
  const [filter, setFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const sorted = [...news].sort((a, b) => b.date.localeCompare(a.date))
  const categories = [...new Set(news.map((n) => n.category))].filter(Boolean)
  const filtered = filter === 'all' ? sorted : sorted.filter((n) => n.category === filter)
  const selected = sorted.find((n) => n.id === selectedId)

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  if (selected) {
    const colors = CATEGORY_COLORS[selected.category] ?? DEFAULT_COLOR
    return (
      <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-2 text-skyy-muted hover:text-skyy-text w-fit transition-colors"
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <GlassPanel className="p-8">
          <div className="flex items-center gap-3 mb-3">
            <Badge className={`${colors.bg} ${colors.text}`}>
              {selected.category}
            </Badge>
            <span className="text-xs text-skyy-muted flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(selected.date)}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-skyy-text font-display">
            {selected.title}
          </h1>
          <div className="mt-5 rounded-xl overflow-hidden h-56 bg-skyy-gradient/20 flex items-center justify-center border border-skyy-violet/10">
            {selected.image ? (
              <img src={selected.image} alt={selected.title} className="w-full h-full object-cover" />
            ) : (
              <Sparkles size={48} className="text-skyy-violet/50" />
            )}
          </div>
          <div className="mt-6 text-sm text-skyy-muted leading-relaxed whitespace-pre-line">
            {selected.description}
          </div>
        </GlassPanel>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Hero */}
      <div className="relative w-full h-[260px] shrink-0 overflow-hidden">
        <img src={heroNovedades} alt="" className="absolute inset-0 w-full h-full object-cover brightness-[1.2]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 px-6 pb-6">
          <h1 className="text-5xl font-black text-white tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            NOVEDADES
          </h1>
          <p className="text-sm text-white/70 mt-1.5 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
            Ultimas actualizaciones y novedades del launcher
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-6 flex flex-col gap-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-skyy-violet/30 text-violet-300 border border-skyy-violet/40'
                : 'text-skyy-muted hover:text-skyy-text border border-transparent'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === cat
                  ? 'bg-skyy-violet/30 text-violet-300 border border-skyy-violet/40'
                  : 'text-skyy-muted hover:text-skyy-text border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <GlassPanel className="p-12 text-center text-skyy-muted text-sm">
            No hay novedades para mostrar.
          </GlassPanel>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((novedad, i) => {
              const colors = CATEGORY_COLORS[novedad.category] ?? DEFAULT_COLOR
              return (
                <button
                  key={novedad.id}
                  onClick={() => setSelectedId(novedad.id)}
                  className={`glass rounded-2xl p-6 text-left hover:bg-white/[0.05] transition-colors group ${
                    i === 0 ? 'md:col-span-2' : ''
                  }`}
                >
                  <div
                    className={`rounded-xl overflow-hidden mb-4 flex items-center justify-center bg-skyy-gradient/20 ${
                      i === 0 ? 'h-44' : 'h-28'
                    }`}
                  >
                    {novedad.image ? (
                      <img src={novedad.image} alt={novedad.title} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles size={i === 0 ? 40 : 28} className="text-skyy-violet/40" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`${colors.bg} ${colors.text}`}>
                      {novedad.category}
                    </Badge>
                    <span className="text-[10px] text-skyy-muted flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(novedad.date)}
                    </span>
                  </div>
                  <h3 className={`font-bold text-skyy-text font-display ${i === 0 ? 'text-xl' : 'text-base'}`}>
                    {novedad.title}
                  </h3>
                  <p className="text-xs text-skyy-muted mt-2 line-clamp-3">{novedad.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-skyy-violet text-xs group-hover:gap-2 transition-all">
                    Leer mas <ChevronRight size={13} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
