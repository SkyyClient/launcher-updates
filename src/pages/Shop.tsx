import React, { useState } from 'react'
import { Store, ShoppingCart, Sparkles, Shield, Gem, Rocket, Check } from 'lucide-react'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/store/toast'

interface ShopItem {
  id: string
  title: string
  description: string
  price: string
  category: 'cosmetic' | 'booster' | 'feature'
  icon: React.ReactNode
}

// ============================================================
// TIENDA — DATOS DE EJEMPLO (MOCK)
// ------------------------------------------------------------
// Estos son datos de demostracion. Para usar datos reales,
// reemplaza el contenido de SHOP_ITEMS por tus propios
// productos, o conectalo a tu tienda/pasarela de pago real
// en vez de esta constante. Cada item:
//   { id, title, description, price, category, icon }
//   - category: 'cosmetic' | 'booster' | 'feature'
// ============================================================
const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'capa-ghost',
    title: 'Capa Fantasma',
    description: 'Capa cosmetica exclusiva con efecto de particulas fantasma al correr.',
    price: '2,99 USD',
    category: 'cosmetic',
    icon: <Shield size={20} />,
  },
  {
    id: 'tag-vip',
    title: 'Tag VIP',
    description: 'Tag de color en el chat y prefijo [VIP] en todos los servidores.',
    price: '1,49 USD',
    category: 'cosmetic',
    icon: <Gem size={20} />,
  },
  {
    id: 'boost-xp',
    title: 'Booster XP x2',
    description: 'Duplica tu experiencia ganada durante 24 horas en servidores compatibles.',
    price: '3,99 USD',
    category: 'booster',
    icon: <Rocket size={20} />,
  },
  {
    id: 'skin-exclusivo',
    title: 'Pack de Skins',
    description: 'Acceso a skins exclusivas disenadas por la comunidad SKYY.',
    price: '4,99 USD',
    category: 'feature',
    icon: <Sparkles size={20} />,
  },
]

export default function Shop() {
  const [owned] = useState<string[]>(['capa-ghost'])

  const buy = (item: ShopItem) => {
    toast.info('Tienda demo', `${item.title} (${item.price}) — La tienda aun no esta conectada a un sistema de pagos.`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-skyy-text tracking-wide">
          TIENDA
        </h1>
        <p className="text-sm text-skyy-muted mt-1">
          Mejoras y cosmeticos para tu experiencia de juego
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SHOP_ITEMS.map((item) => {
          const isOwned = owned.includes(item.id)
          return (
            <GlassPanel key={item.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-skyy-violet/15 border border-skyy-violet/30 flex items-center justify-center text-skyy-violet shrink-0">
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-skyy-text">{item.title}</h3>
                    <Badge variant="violet">{item.price}</Badge>
                  </div>
                  <p className="text-xs text-skyy-muted mt-1">{item.description}</p>
                </div>
              </div>

              <button
                onClick={() => void buy(item)}
                disabled={isOwned}
                className={[
                  'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300',
                  isOwned
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                    : 'bg-skyy-gradient bg-[length:200%_200%] hover:bg-[position:100%_50%] text-white hover:-translate-y-0.5 shadow-glow',
                ].join(' ')}
              >
                {isOwned ? (
                  <>
                    <Check size={16} /> Adquirido
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} /> Comprar
                  </>
                )}
              </button>
            </GlassPanel>
          )
        })}
      </div>

      <GlassPanel className="p-4 flex items-start gap-3 text-sm">
        <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 mt-0.5">
          <Store size={12} /> DEMO
        </span>
        <p className="text-skyy-muted text-xs leading-relaxed">
          Esta seccion es una demostracion. Los items de ejemplo no se pueden comprar de verdad.
          Para activar compras reales, conectala a tu pasarela de pago en{' '}
          <code className="font-mono text-skyy-violet">src/pages/Shop.tsx</code> reemplazando SHOP_ITEMS.
        </p>
      </GlassPanel>
    </div>
  )
}
