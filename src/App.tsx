import React, { useState } from 'react';
import {
  Globe,
  Smartphone,
  BarChart3,
  CalendarCheck,
  ShieldCheck
} from 'lucide-react';
import { AkiNeuroWebsite } from './components/AkiNeuroWebsite';
import { BookingWidget } from './components/BookingWidget';
import { AdminPanel } from './components/AdminPanel';
import { M3Badge } from './components/m3';

export default function App() {
  const [currentView, setCurrentView] = useState<'website' | 'widget_only' | 'admin' | 'concurrency'>('website');

  return (
    <div className="min-h-screen bg-[#F4FBF9] flex flex-col font-sans">
      {/* Top Application Mode Bar */}
      <div className="bg-[#191C1C] text-white border-b border-[#3F4948]/40 px-4 py-2.5 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#006A6B] flex items-center justify-center font-bold text-xs text-white">
                AN
              </div>
              <span className="font-bold text-sm tracking-tight text-white">
                AkiNeuro V2.1.2
              </span>
            </div>
            <span className="text-xs text-[#BEC9C8] hidden md:inline border-l border-[#3F4948] pl-3">
              Sistema de Reservas • Material 3 • Google Calendar • Mercado Pago • CRM
            </span>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#2E3131] p-1 rounded-2xl border border-[#3F4948]/50 text-xs">
            <button
              onClick={() => setCurrentView('website')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                currentView === 'website'
                  ? 'bg-[#006A6B] text-white shadow-sm'
                  : 'text-[#BEC9C8] hover:text-white hover:bg-[#3F4948]/50'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Sitio Web & Widget</span>
            </button>

            <button
              onClick={() => setCurrentView('widget_only')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                currentView === 'widget_only'
                  ? 'bg-[#006A6B] text-white shadow-sm'
                  : 'text-[#BEC9C8] hover:text-white hover:bg-[#3F4948]/50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Widget Standalone</span>
            </button>

            <button
              onClick={() => setCurrentView('admin')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-[#006A6B] text-white shadow-sm'
                  : 'text-[#BEC9C8] hover:text-white hover:bg-[#3F4948]/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Panel & CRM</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Render */}
      <main className="flex-1">
        {currentView === 'website' && <AkiNeuroWebsite />}

        {currentView === 'widget_only' && (
          <div className="py-10 px-4 max-w-xl mx-auto space-y-4">
            <div className="text-center space-y-1">
              <div className="flex justify-center mb-1">
                <M3Badge tone="primary">
                  Vista Widget Mobile / Embebido (Material 3)
                </M3Badge>
              </div>
              <h2 className="text-xl font-bold text-[#191C1C]">
                Flujo Directo de Reserva y Pago
              </h2>
              <p className="text-xs text-[#6F7979]">
                Visitante → Datos → Disponibilidad → Selección → Pago MP → Google Calendar → CRM
              </p>
            </div>
            <BookingWidget standalone={true} />
          </div>
        )}

        {currentView === 'admin' && (
          <div className="p-4 sm:p-6 lg:p-8">
            <AdminPanel />
          </div>
        )}
      </main>
    </div>
  );
}
