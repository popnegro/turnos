import React, { useState } from 'react';
import {
  Stethoscope,
  Activity,
  Calendar,
  Phone,
  MapPin,
  Clock,
  Shield,
  Award,
  Users,
  ChevronRight,
  MessageCircle,
  X,
  CheckCircle,
  HeartPulse
} from 'lucide-react';
import { BookingWidget } from './BookingWidget';
import { M3Button, M3Card, M3Badge } from './m3';
import type { Booking } from '../types';

interface AkiNeuroWebsiteProps {
  onOpenWidget?: () => void;
}

export const AkiNeuroWebsite: React.FC<AkiNeuroWebsiteProps> = () => {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [lastBookingNotification, setLastBookingNotification] = useState<Booking | null>(null);

  const handleBookingFinished = (booking: Booking) => {
    setLastBookingNotification(booking);
    setTimeout(() => setLastBookingNotification(null), 8000);
  };

  return (
    <div className="min-h-screen bg-[#F4FBF9] text-[#191C1C] flex flex-col relative font-sans">
      {/* Top bar info */}
      <div className="bg-[#191C1C] text-[#BEC9C8] text-xs py-2 px-4 border-b border-[#3F4948]/30">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#6FF7F6]" />
              Av. Santa Fe 3200, Piso 4, CABA
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#6FF7F6]" />
              Lun a Vie 08:30 - 19:30 | Sáb 09:00 - 13:00
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#6FF7F6] font-medium">
              <Phone className="w-3.5 h-3.5" />
              +54 11 4892-3000
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#BEC9C8]/40 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006A6B] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              AN
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-[#191C1C] block leading-none">
                AkiNeuro
              </span>
              <span className="text-[11px] text-[#006A6B] font-semibold tracking-wide uppercase">
                Kinesiología & Neurorehabilitación
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#3F4948]">
            <a href="#servicios" className="hover:text-[#006A6B] transition-colors">Servicios</a>
            <a href="#profesionales" className="hover:text-[#006A6B] transition-colors">Especialistas</a>
            <a href="#testimonios" className="hover:text-[#006A6B] transition-colors">Pacientes</a>
            <a href="#contacto" className="hover:text-[#006A6B] transition-colors">Ubicación</a>
          </nav>

          <M3Button
            variant="filled"
            size="small"
            onClick={() => setIsWidgetOpen(true)}
            icon={<Calendar className="w-4 h-4" />}
          >
            Reservar Turno Online
          </M3Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#CCE8E7]/30 via-[#F4FBF9] to-[#F4FBF9] py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#CCE8E7] text-[#004F50] text-xs font-bold border border-[#006A6B]/20">
              <Shield className="w-4 h-4 text-[#006A6B]" />
              <span>Centro de Excelencia Kinésica y Neurológica</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#191C1C] tracking-tight leading-tight">
              Recuperá tu movimiento y calidad de vida con <span className="text-[#006A6B]">atención personalizada</span>
            </h1>

            <p className="text-[#3F4948] text-base sm:text-lg leading-relaxed max-w-xl">
              Combinamos kinesiología avanzada, neurorehabilitación, RPG y tecnología de vanguardia para tu recuperación física integral.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <M3Button
                variant="filled"
                size="large"
                onClick={() => setIsWidgetOpen(true)}
                icon={<Calendar className="w-5 h-5" />}
              >
                Reservar turno online
              </M3Button>

              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-[#BEC9C8]/50 text-[#3F4948] text-xs font-semibold shadow-xs">
                <CheckCircle className="w-4 h-4 text-[#0A5327]" />
                <span>Turnos inmediatos con confirmación en Google Calendar</span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#BEC9C8]/40">
              <div>
                <div className="text-2xl font-extrabold text-[#191C1C]">+12.000</div>
                <div className="text-xs text-[#6F7979] font-medium">Sesiones realizadas</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#006A6B]">100%</div>
                <div className="text-xs text-[#6F7979] font-medium">Atención profesional</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#191C1C]">4.9 ★</div>
                <div className="text-xs text-[#6F7979] font-medium">Opiniones de pacientes</div>
              </div>
            </div>
          </div>

          {/* Embedded Widget Preview Card on Landing */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -top-3 -right-3 bg-[#006A6B] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm z-10 animate-bounce">
                Demo Widget Activo
              </div>
              <BookingWidget onBookingComplete={handleBookingFinished} />
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="servicios" className="py-16 px-4 bg-white border-t border-[#BEC9C8]/40">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#006A6B] uppercase tracking-wider bg-[#CCE8E7] px-3 py-1 rounded-full border border-[#006A6B]/20">
              Tratamientos
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#191C1C] tracking-tight">
              Especialidades de AkiNeuro
            </h2>
            <p className="text-xs sm:text-sm text-[#6F7979]">
              Tratamientos individualizados guiados por kinesiólogos matriculados con formación continua.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <M3Card variant="elevated" className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#CCE8E7] text-[#006A6B] flex items-center justify-center">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[#191C1C]">Kinesiología & Fisiatría</h3>
              <p className="text-xs text-[#3F4948] leading-relaxed">
                Tratamiento del dolor, lesiones osteoarticulares, magnetoterapia, ultrasonido y movilización manual especializada.
              </p>
              <div className="pt-2">
                <M3Button
                  variant="text"
                  size="small"
                  onClick={() => setIsWidgetOpen(true)}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Reservar Kinesiología
                </M3Button>
              </div>
            </M3Card>

            <M3Card variant="elevated" className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D3E4FF] text-[#004A77] flex items-center justify-center">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[#191C1C]">Neurorehabilitación Motora</h3>
              <p className="text-xs text-[#3F4948] leading-relaxed">
                Protocolos neuromotores para secuelas de ACV, Parkinson, esclerosis y reentrenamiento de equilibrio y marcha.
              </p>
              <div className="pt-2">
                <M3Button
                  variant="text"
                  size="small"
                  onClick={() => setIsWidgetOpen(true)}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Reservar Neurorehabilitación
                </M3Button>
              </div>
            </M3Card>

            <M3Card variant="elevated" className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8DEF8] text-[#4A4458] flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[#191C1C]">Reeducación Postural Global (RPG)</h3>
              <p className="text-xs text-[#3F4948] leading-relaxed">
                Tratamiento corporal global para escoliosis, rectificaciones cervicales, hernias discales y dolores crónicos de espalda.
              </p>
              <div className="pt-2">
                <M3Button
                  variant="text"
                  size="small"
                  onClick={() => setIsWidgetOpen(true)}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Reservar RPG
                </M3Button>
              </div>
            </M3Card>
          </div>
        </div>
      </section>

      {/* Floating Widget Trigger Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40">
        <M3Button
          variant="filled"
          size="large"
          className="shadow-xl"
          onClick={() => setIsWidgetOpen(!isWidgetOpen)}
          icon={<Calendar className="w-5 h-5 text-[#6FF7F6]" />}
        >
          Reservá tu Turno
        </M3Button>
      </div>

      {/* Floating Widget Overlay Modal */}
      {isWidgetOpen && (
        <div className="fixed inset-0 bg-[#191C1C]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl my-8">
            <button
              onClick={() => setIsWidgetOpen(false)}
              className="absolute -top-3 -right-3 z-50 w-9 h-9 rounded-full bg-[#191C1C] text-white hover:bg-[#2E3131] flex items-center justify-center shadow-lg border border-[#3F4948] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <BookingWidget
              onBookingComplete={(b) => {
                handleBookingFinished(b);
              }}
            />
          </div>
        </div>
      )}

      {/* Floating Success Notification */}
      {lastBookingNotification && (
        <div className="fixed top-6 right-6 z-50 bg-white border border-[#0A5327]/30 rounded-2xl p-4 shadow-2xl max-w-sm animate-slide-in text-[#191C1C] space-y-1">
          <div className="flex items-center gap-2 text-[#0A5327] font-bold text-xs">
            <CheckCircle className="w-4 h-4" />
            <span>¡Turno Confirmado con Éxito!</span>
          </div>
          <p className="text-xs text-[#3F4948]">
            Reserva <span className="font-semibold">{lastBookingNotification.id}</span> para <strong>{lastBookingNotification.patientName}</strong> el {lastBookingNotification.date} a las {lastBookingNotification.startTime} hs.
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-[#191C1C] text-[#BEC9C8] text-xs py-8 px-4 border-t border-[#3F4948]/30">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <span className="font-bold text-white">AkiNeuro V2.1.2</span> — Sistema SaaS de Reservas y Turnos Médicos.
          </div>
          <div>
            Desarrollado con Material 3, Google Calendar API, Mercado Pago y CRM.
          </div>
        </div>
      </footer>
    </div>
  );
};
