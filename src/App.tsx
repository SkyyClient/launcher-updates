import React, { useEffect, useState } from 'react'
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { useSkyyStore } from '@/store'
import { TitleBar } from '@/components/launcher/TitleBar'
import { Sidebar } from '@/components/launcher/Sidebar'
import { ToastContainer } from '@/components/common/ToastContainer'
import { SkyyLoader } from '@/components/common/SkyyLoader'
import { ClosingScreen } from '@/components/common/ClosingScreen'
import { UpdateBanner } from '@/components/common/UpdateBanner'

import Home from '@/pages/Home'
import Play from '@/pages/Play'
import Versions from '@/pages/Versions'
import Mods from '@/pages/Mods'
import Installations from '@/pages/Installations'
import Settings from '@/pages/Settings'
import Account from '@/pages/Account'
import Downloads from '@/pages/Downloads'
import Console from '@/pages/Console'
import Novedades from '@/pages/Novedades'
import Shop from '@/pages/Shop'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-[#000000] overflow-hidden relative">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#080808]">
          {children}
        </main>
      </div>
      <div className="absolute bottom-1.5 right-3 text-xs font-bold text-white tracking-[0.18em] pointer-events-none select-none">
        v1.0.19
      </div>
      <ToastContainer />
      <UpdateBanner />
      <ClosingScreen />
    </div>
  )
}

export default function App() {
  const initialized = useSkyyStore((s) => s.initialized)
  const bootstrap = useSkyyStore((s) => s.bootstrap)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!initialized) void bootstrap()
  }, [initialized, bootstrap])

  if (!entered) {
    return (
      <SkyyLoader ready={initialized} onContinue={() => setEntered(true)} />
    )
  }

  return (
    <div className="app-enter">
      <HashRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/play" element={<Play />} />
            <Route path="/versions" element={<Versions />} />
            <Route path="/mods" element={<Mods />} />
            <Route path="/novedades" element={<Novedades />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/installations" element={<Installations />} />
            <Route path="/news" element={<Navigate to="/novedades" replace />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/account" element={<Account />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/console" element={<Console />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      </HashRouter>
    </div>
  )
}
