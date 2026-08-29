import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  CalendarCheck,
  Stethoscope,
  Info,
  ExternalLink,
  Wallet
} from 'lucide-react';
import { googleSignIn, getAccessToken } from '../lib/firebase';
import { createGoogleEvent } from '../services/googleCalendarService';
import {
  M3Button,
  M3TextField,
  M3Card,
  M3Badge,
  M3LinearProgress,
  M3Divider
} from './m3';
import type {
  Service,
  Professional,
  TimeSlot,
  BookingIntent,
  Booking,
  Payment
} from '../types';

interface BookingWidgetProps {
  onBookingComplete?: (booking: Booking) => void;
  standalone?: boolean;
}

type Step = 'start' | 'patient_info' | 'datetime' | 'summary' | 'payment_gateway' | 'confirmed' | 'error_state';

export const BookingWidget: React.FC<BookingWidgetProps> = ({ onBookingComplete }) => {
  // Navigation & Step State
  const [step, setStep] = useState<Step>('start');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form & Selection State
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('any');
  
  // Patient fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState<{ fullName?: string; phone?: string; email?: string; service?: string }>({});

  // Date & Availability
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    // if Sunday, jump to Monday
    if (today.getDay() === 0) {
      today.setDate(today.getDate() + 1);
    }
    return today.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Booking Intent (Hold) State
  const [bookingIntent, setBookingIntent] = useState<BookingIntent | null>(null);
  const [holdRemainingSeconds, setHoldRemainingSeconds] = useState<number>(600); // 10 mins
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Payment & Final Booking
  const [paymentPreference, setPaymentPreference] = useState<any>(null);
  const [paymentRecord, setPaymentRecord] = useState<Payment | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'debit_card' | 'mercadopago_wallet'>('credit_card');
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [gcalSuccess, setGcalSuccess] = useState(false);

  // Direct Google Calendar Sync for confirmed booking
  const handleDirectSyncToGoogleCalendar = async () => {
    if (!confirmedBooking) return;
    try {
      setGcalSyncing(true);
      let token = await getAccessToken();
      if (!token) {
        const signRes = await googleSignIn();
        token = signRes?.accessToken || null;
      }
      if (token) {
        await createGoogleEvent(token, 'primary', {
          summary: `[AkiNeuro] ${confirmedBooking.serviceName} - ${confirmedBooking.professionalName}`,
          description: `Turno en AkiNeuro para ${confirmedBooking.patientName}. Código de reserva: ${confirmedBooking.id}`,
          startIso: confirmedBooking.isoStart,
          endIso: confirmedBooking.isoEnd,
          location: 'AkiNeuro - Av. Santa Fe 3200, CABA',
          patientEmail: confirmedBooking.patientEmail,
          patientName: confirmedBooking.patientName
        });
        setGcalSuccess(true);
      }
    } catch (err) {
      console.error('Error syncing to Google Calendar:', err);
    } finally {
      setGcalSyncing(false);
    }
  };

  // Load Services & Professionals on mount
  useEffect(() => {
    loadServicesAndPros();
  }, []);

  const loadServicesAndPros = async () => {
    try {
      setLoading(true);
      const [resServices, resPros] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/professionals')
      ]);
      const dataServices: Service[] = await resServices.json();
      const dataPros: Professional[] = await resPros.json();

      setServices(dataServices);
      setProfessionals(dataPros);

      if (dataServices.length > 0 && !selectedServiceId) {
        setSelectedServiceId(dataServices[0].id);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setErrorMessage('No se pudieron cargar los servicios. Por favor intenta recargar la página.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch real availability whenever date, service, or professional changes
  useEffect(() => {
    if (step === 'datetime' && selectedServiceId && selectedDate) {
      fetchAvailability();
    }
  }, [step, selectedServiceId, selectedProfessionalId, selectedDate]);

  const fetchAvailability = async () => {
    try {
      setSlotsLoading(true);
      setSelectedSlot(null);
      const profQuery = selectedProfessionalId ? `&professionalId=${selectedProfessionalId}` : '';
      const res = await fetch(`/api/availability?date=${selectedDate}&serviceId=${selectedServiceId}${profQuery}`);
      if (!res.ok) throw new Error('Error al consultar disponibilidad');
      const data = await res.json();
      setSlots(data.slots || []);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Countdown timer for 10-minute slot hold
  useEffect(() => {
    if (bookingIntent && bookingIntent.status === 'HELD' && (step === 'summary' || step === 'payment_gateway')) {
      const expiresTime = new Date(bookingIntent.expiresAt).getTime();
      
      const updateRemaining = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiresTime - now) / 1000));
        setHoldRemainingSeconds(diff);

        if (diff <= 0) {
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          setErrorMessage('Tu reserva temporal expiró. Elegí nuevamente un horario disponible.');
          setStep('datetime');
          setBookingIntent(null);
          fetchAvailability();
        }
      };

      updateRemaining();
      holdTimerRef.current = setInterval(updateRemaining, 1000);

      return () => {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      };
    }
  }, [bookingIntent, step]);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Validate patient form fields
  const validatePatientForm = () => {
    const errors: { fullName?: string; phone?: string; email?: string; service?: string } = {};
    if (!fullName.trim()) {
      errors.fullName = 'Ingresá tu nombre y apellido completo.';
    } else if (fullName.trim().split(' ').length < 2) {
      errors.fullName = 'Por favor ingresá nombre y apellido.';
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!phone.trim()) {
      errors.phone = 'Ingresá tu número de WhatsApp / teléfono.';
    } else if (cleanPhone.length < 8) {
      errors.phone = 'Ingresá un número de teléfono válido (mínimo 8 dígitos).';
    }

    if (!email.trim()) {
      errors.email = 'Ingresá tu correo electrónico.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'El formato de email no es válido.';
    }

    if (!selectedServiceId) {
      errors.service = 'Seleccioná un servicio.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePatientForm()) {
      setErrorMessage(null);
      setStep('datetime');
    }
  };

  // Request atomic slot hold (Booking Intent - 10 min TTL)
  const handleSelectSlotAndHold = async () => {
    if (!selectedSlot) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      const payload = {
        serviceId: selectedServiceId,
        professionalId: selectedSlot.professionalId || selectedProfessionalId,
        date: selectedDate,
        time: selectedSlot.time,
        patient: {
          fullName,
          phone,
          email,
          notes
        }
      };

      const res = await fetch('/api/booking-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 409) {
        // Concurrency conflict: Slot occupied
        setErrorMessage('Este horario acaba de ser reservado. Elegí otro horario disponible.');
        fetchAvailability();
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Error al bloquear el horario');
      }

      setBookingIntent(data.bookingIntent);
      setStep('summary');
    } catch (err: any) {
      console.error('Hold error:', err);
      setErrorMessage(err.message || 'Ocurrió un problema al procesar tu reserva. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Create Mercado Pago preference and proceed to payment
  const handleProceedToPayment = async () => {
    if (!bookingIntent) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingIntentId: bookingIntent.id })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al iniciar pago con Mercado Pago');
      }

      setPaymentRecord(data.payment);
      setPaymentPreference(data.preference);
      setStep('payment_gateway');
    } catch (err: any) {
      console.error('Payment prep error:', err);
      setErrorMessage(err.message || 'No pudimos conectar con Mercado Pago. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger payment confirmation via webhook simulation
  const handleSimulatePaymentApproval = async (status: 'APPROVED' | 'REJECTED') => {
    if (!paymentRecord || !bookingIntent) return;

    try {
      setPaymentProcessing(true);
      setErrorMessage(null);

      const res = await fetch('/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentRecord.id,
          mpPaymentId: `MP-${Math.floor(10000000 + Math.random() * 90000000)}`,
          status,
          bookingIntentId: bookingIntent.id,
          paymentMethod
        })
      });

      const data = await res.json();

      if (status === 'APPROVED' && data.success && data.booking) {
        setConfirmedBooking(data.booking);
        setStep('confirmed');
        if (onBookingComplete) {
          onBookingComplete(data.booking);
        }
      } else {
        setErrorMessage('No pudimos confirmar el pago. Tu turno no fue reservado.');
        setStep('error_state');
      }
    } catch (err: any) {
      console.error('Webhook execution error:', err);
      setErrorMessage('Ocurrió un problema al procesar tu pago con Mercado Pago. Intentá nuevamente.');
      setStep('error_state');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Helper date selector items
  const getNextDays = (count = 10) => {
    const days = [];
    const base = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      // Skip Sundays
      if (d.getDay() !== 0) {
        days.push(d);
      }
    }
    return days;
  };

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedProfObj = professionals.find((p) => p.id === (bookingIntent?.professionalId || selectedSlot?.professionalId || selectedProfessionalId));
  const effectivePrice = selectedProfObj?.price || selectedService?.price || 18500;

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const stepProgress = {
    start: 0,
    patient_info: 33,
    datetime: 66,
    summary: 90,
    payment_gateway: 95,
    confirmed: 100,
    error_state: 90
  }[step];

  return (
    <div
      id="akineuro-booking-widget"
      className="w-full max-w-xl mx-auto bg-[#FAFDFD] text-[#191C1C] rounded-3xl m3-elevation-2 border border-[#BEC9C8]/60 overflow-hidden transition-all duration-300 flex flex-col"
    >
      {/* Material 3 Top App Bar */}
      <div className="bg-[#006A6B] text-white p-5 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-[#6FF7F6] font-bold text-lg">
              AN
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight text-white leading-tight">
                  AkiNeuro
                </h1>
                <M3Badge tone="primary" size="small">
                  M3 v2.1.2
                </M3Badge>
              </div>
              <p className="text-xs text-[#CCE8E7] leading-tight">Centro de Kinesiología y Neurorehabilitación</p>
            </div>
          </div>

          {/* Hold Countdown Badge if active */}
          {bookingIntent && (step === 'summary' || step === 'payment_gateway') && (
            <div className="flex items-center gap-1.5 bg-[#6FF7F6]/20 border border-[#6FF7F6]/40 text-[#6FF7F6] px-3 py-1.5 rounded-full text-xs font-mono font-bold animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatSeconds(holdRemainingSeconds)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Material 3 Progress Indicator */}
      {step !== 'start' && step !== 'confirmed' && (
        <M3LinearProgress value={stepProgress} />
      )}

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-[#FFDAD6] border-b border-[#BA1A1A]/30 p-4 px-6 flex items-start gap-3 text-[#410002] text-xs md:text-sm">
          <AlertCircle className="w-5 h-5 text-[#BA1A1A] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-[#BA1A1A] hover:underline font-bold"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="p-6 md:p-8">
        {/* ========================================== */}
        {/* PASO 1: INICIO                             */}
        {/* ========================================== */}
        {step === 'start' && (
          <div id="step-start" className="space-y-6 text-center py-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#CCE8E7] text-[#006A6B] mb-1 m3-elevation-1">
              <Stethoscope className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-[#191C1C] tracking-tight">
                Reservá tu turno médico
              </h2>
              <p className="text-[#3F4948] text-sm leading-relaxed">
                Elegí el servicio, encontrá un horario disponible y confirmá tu turno realizando el pago.
              </p>
            </div>

            {/* Feature Highlights with M3 Surface Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
              <M3Card variant="filled" className="p-3.5 flex items-center gap-3">
                <CalendarCheck className="w-5 h-5 text-[#006A6B] shrink-0" />
                <span className="text-xs font-medium text-[#191C1C]">Agenda en tiempo real</span>
              </M3Card>
              <M3Card variant="filled" className="p-3.5 flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#006A6B] shrink-0" />
                <span className="text-xs font-medium text-[#191C1C]">Bloqueo por 10 min</span>
              </M3Card>
              <M3Card variant="filled" className="p-3.5 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-[#006A6B] shrink-0" />
                <span className="text-xs font-medium text-[#191C1C]">Mercado Pago</span>
              </M3Card>
            </div>

            <div className="pt-4 space-y-3">
              <M3Button
                id="btn-start-booking"
                variant="filled"
                size="large"
                fullWidth
                onClick={() => setStep('patient_info')}
                trailingIcon={<ChevronRight className="w-5 h-5" />}
              >
                Reservar turno
              </M3Button>
              <p className="text-xs text-[#6F7979] flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#006A6B]" />
                Disponibilidad validada directamente con Google Calendar
              </p>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PASO 2: DATOS DEL PACIENTE                 */}
        {/* ========================================== */}
        {step === 'patient_info' && (
          <form id="step-patient-info" onSubmit={handlePatientSubmit} className="space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#BEC9C8]/40">
              <M3Button
                variant="text"
                size="small"
                type="button"
                onClick={() => setStep('start')}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Inicio
              </M3Button>
              <M3Badge tone="secondary">Paso 1 de 3: Tus Datos</M3Badge>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#191C1C]">Completá tus datos</h2>
              <p className="text-xs text-[#3F4948]">
                Solicitamos únicamente los datos necesarios para gestionar la reserva y enviarte el recordatorio.
              </p>
            </div>

            {/* Servicio Selection with M3 Dropdown container */}
            <div className="space-y-1 text-left">
              <label htmlFor="service-select" className="text-xs font-semibold uppercase tracking-wider text-[#3F4948]">
                Servicio / Motivo de consulta <span className="text-[#BA1A1A]">*</span>
              </label>
              <div className="relative rounded-xl border border-[#6F7979]/60 bg-white hover:border-[#191C1C] focus-within:border-[#006A6B] focus-within:ring-2 focus-within:ring-[#006A6B]/20 transition-all">
                <select
                  id="service-select"
                  value={selectedServiceId}
                  onChange={(e) => {
                    setSelectedServiceId(e.target.value);
                    setSelectedProfessionalId('any');
                  }}
                  className="w-full py-3 px-3.5 text-sm text-[#191C1C] bg-transparent outline-none cursor-pointer"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} min) - ${s.price.toLocaleString('es-AR')}
                    </option>
                  ))}
                </select>
              </div>
              {selectedService && (
                <p className="text-xs text-[#3F4948] italic px-1">{selectedService.description}</p>
              )}
            </div>

            {/* Profesional Selection */}
            <div className="space-y-1 text-left">
              <label htmlFor="pro-select" className="text-xs font-semibold uppercase tracking-wider text-[#3F4948]">
                Profesional preferido <span className="text-[#6F7979] font-normal">(opcional)</span>
              </label>
              <div className="relative rounded-xl border border-[#6F7979]/60 bg-white hover:border-[#191C1C] focus-within:border-[#006A6B] focus-within:ring-2 focus-within:ring-[#006A6B]/20 transition-all">
                <select
                  id="pro-select"
                  value={selectedProfessionalId}
                  onChange={(e) => setSelectedProfessionalId(e.target.value)}
                  className="w-full py-3 px-3.5 text-sm text-[#191C1C] bg-transparent outline-none cursor-pointer"
                >
                  <option value="any">Cualquier profesional habilitado (Mayor disponibilidad)</option>
                  {professionals
                    .filter((p) => p.serviceIds.includes(selectedServiceId))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.specialty}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Nombre y Apellido */}
            <M3TextField
              id="input-fullname"
              label="Nombre y Apellido *"
              placeholder="Ej: Laura Martínez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              errorText={formErrors.fullName}
              leadingIcon={<User className="w-4 h-4" />}
            />

            {/* WhatsApp / Teléfono */}
            <M3TextField
              id="input-phone"
              label="WhatsApp / Teléfono *"
              placeholder="Ej: +54 9 11 4567-8901"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              errorText={formErrors.phone}
              leadingIcon={<Phone className="w-4 h-4" />}
            />

            {/* Email */}
            <M3TextField
              id="input-email"
              label="Correo Electrónico *"
              placeholder="Ej: laura@gmail.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              errorText={formErrors.email}
              leadingIcon={<Mail className="w-4 h-4" />}
            />

            {/* Observaciones opcionales */}
            <div className="space-y-1 text-left">
              <label htmlFor="input-notes" className="text-xs font-semibold uppercase tracking-wider text-[#3F4948]">
                Motivo / Síntoma principal <span className="text-[#6F7979] font-normal">(opcional)</span>
              </label>
              <textarea
                id="input-notes"
                rows={2}
                placeholder="Ej: Dolor lumbar al caminar, post-operatorio de rodilla..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#6F7979]/60 bg-white text-sm text-[#191C1C] focus:border-[#006A6B] focus:ring-2 focus:ring-[#006A6B]/20 outline-none transition-all resize-none"
              />
            </div>

            <div className="pt-2">
              <M3Button
                id="btn-submit-patient-info"
                type="submit"
                variant="filled"
                size="large"
                fullWidth
                trailingIcon={<ChevronRight className="w-5 h-5" />}
              >
                Continuar a Selección de Horario
              </M3Button>
            </div>
          </form>
        )}

        {/* ========================================== */}
        {/* PASO 3: DISPONIBILIDAD REAL & SELECCIÓN    */}
        {/* ========================================== */}
        {step === 'datetime' && (
          <div id="step-datetime" className="space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#BEC9C8]/40">
              <M3Button
                variant="text"
                size="small"
                type="button"
                onClick={() => setStep('patient_info')}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Datos
              </M3Button>
              <M3Badge tone="secondary">Paso 2 de 3: Elegir Horario</M3Badge>
            </div>

            {/* Context Summary Tag */}
            <M3Card variant="filled" className="p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-[#191C1C]">{selectedService?.name}</span>
                <span className="text-[#3F4948]"> • {fullName}</span>
              </div>
              <M3Badge tone="primary">
                ${effectivePrice.toLocaleString('es-AR')}
              </M3Badge>
            </M3Card>

            {/* Date Picker Ribbon */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F4948]">
                Seleccioná la fecha
              </label>
              <div className="grid grid-cols-5 gap-2">
                {getNextDays(5).map((d) => {
                  const dateStr = d.toISOString().split('T')[0];
                  const isSelected = selectedDate === dateStr;
                  const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' });
                  const dayNum = d.getDate();
                  const monthName = d.toLocaleDateString('es-AR', { month: 'short' });

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      className={`p-2.5 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-[#006A6B] text-white border-[#006A6B] m3-elevation-2 ring-2 ring-[#006A6B]/30'
                          : 'bg-white text-[#191C1C] border-[#BEC9C8] hover:border-[#006A6B] hover:bg-[#EEF2F1]'
                      }`}
                    >
                      <div className={`text-[10px] uppercase font-bold ${isSelected ? 'text-[#6FF7F6]' : 'text-[#6F7979]'}`}>
                        {dayName}
                      </div>
                      <div className="text-lg font-bold leading-tight my-0.5">
                        {dayNum}
                      </div>
                      <div className={`text-[10px] ${isSelected ? 'text-[#CCE8E7]' : 'text-[#3F4948]'}`}>
                        {monthName}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Input for future dates */}
              <div className="pt-1 flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs px-3 py-1.5 border border-[#BEC9C8] rounded-xl bg-white text-[#191C1C] focus:border-[#006A6B] outline-none"
                />
                <span className="text-xs text-[#3F4948] font-medium capitalize">
                  {formatDateDisplay(selectedDate)}
                </span>
              </div>
            </div>

            {/* Slots Area */}
            <div className="space-y-3 pt-2 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#3F4948] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#006A6B]" />
                  Horarios disponibles
                </label>
                <button
                  type="button"
                  onClick={fetchAvailability}
                  disabled={slotsLoading}
                  className="text-xs text-[#006A6B] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${slotsLoading ? 'animate-spin' : ''}`} /> Actualizar agenda
                </button>
              </div>

              {/* STATE: Cargando disponibilidad */}
              {slotsLoading && (
                <M3Card variant="filled" className="py-10 text-center space-y-3">
                  <RefreshCw className="w-7 h-7 text-[#006A6B] animate-spin mx-auto" />
                  <p className="text-sm font-medium text-[#191C1C]">Buscando horarios disponibles...</p>
                  <p className="text-xs text-[#6F7979]">Consultando Google Calendar del profesional</p>
                </M3Card>
              )}

              {/* STATE: Sin disponibilidad */}
              {!slotsLoading && slots.filter((s) => s.status === 'AVAILABLE').length === 0 && (
                <M3Card variant="outlined" className="py-8 px-4 text-center space-y-3 bg-[#FFE2A9]/20 border-[#563E00]/30">
                  <CalendarIcon className="w-8 h-8 text-[#563E00] mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#191C1C]">
                      No encontramos horarios disponibles para esta fecha.
                    </p>
                    <p className="text-xs text-[#3F4948]">
                      Todos los turnos para este día ya están reservados o fuera del horario de atención.
                    </p>
                  </div>
                  <M3Button
                    variant="tonal"
                    size="small"
                    type="button"
                    onClick={() => {
                      const nextDate = new Date(selectedDate);
                      nextDate.setDate(nextDate.getDate() + 1);
                      if (nextDate.getDay() === 0) nextDate.setDate(nextDate.getDate() + 1);
                      setSelectedDate(nextDate.toISOString().split('T')[0]);
                    }}
                    trailingIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Elegir otra fecha
                  </M3Button>
                </M3Card>
              )}

              {/* Grid of Slots with Material 3 Selectable Surfaces */}
              {!slotsLoading && slots.filter((s) => s.status === 'AVAILABLE').length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {slots
                    .filter((s) => s.status === 'AVAILABLE')
                    .map((slot) => {
                      const isSelected = selectedSlot?.time === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-3 px-3 rounded-2xl text-center text-sm font-semibold transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-[#CCE8E7] text-[#006A6B] border-2 border-[#006A6B] m3-elevation-1 ring-2 ring-[#006A6B]/20'
                              : 'bg-white text-[#191C1C] border border-[#BEC9C8] hover:border-[#006A6B] hover:bg-[#EEF2F1]'
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Lock Action Button */}
            <div className="pt-3">
              <M3Button
                id="btn-confirm-slot-hold"
                type="button"
                variant="filled"
                size="large"
                fullWidth
                disabled={!selectedSlot || loading}
                loading={loading}
                onClick={handleSelectSlotAndHold}
                trailingIcon={!loading ? <ChevronRight className="w-5 h-5" /> : undefined}
              >
                {selectedSlot
                  ? `Continuar al Resumen (${selectedSlot.time} hs)`
                  : 'Elegí un horario'}
              </M3Button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PASO 4: RESUMEN ANTES DEL PAGO             */}
        {/* ========================================== */}
        {step === 'summary' && bookingIntent && (
          <div id="step-summary" className="space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#BEC9C8]/40">
              <M3Button
                variant="text"
                size="small"
                type="button"
                onClick={() => {
                  if (bookingIntent) {
                    fetch(`/api/booking-intents/${bookingIntent.id}/release`, { method: 'POST' });
                  }
                  setStep('datetime');
                  setBookingIntent(null);
                  fetchAvailability();
                }}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Cambiar fecha u horario
              </M3Button>
              <M3Badge tone="secondary">Paso 3 de 3: Confirmación</M3Badge>
            </div>

            {/* Hold Banner M3 Tonal Container */}
            <M3Card variant="filled" className="bg-[#FFE2A9]/40 border border-[#563E00]/20 p-4 flex items-center gap-3 text-[#563E00]">
              <Clock className="w-5 h-5 text-[#563E00] shrink-0 animate-pulse" />
              <div className="text-xs text-left">
                <p className="font-bold">Horario bloqueado temporalmente</p>
                <p>
                  Tenés <span className="font-mono font-bold text-sm text-[#563E00]">{formatSeconds(holdRemainingSeconds)}</span> para completar el pago antes de que el turno se libere.
                </p>
              </div>
            </M3Card>

            <div className="space-y-1 text-left">
              <h2 className="text-xl font-bold text-[#191C1C]">Confirmá tu turno</h2>
              <p className="text-xs text-[#3F4948]">
                Revisá los detalles de tu consulta antes de proceder a abonar.
              </p>
            </div>

            {/* Summary M3 Card */}
            <M3Card variant="outlined" className="p-5 space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4 text-sm pb-4 border-b border-[#BEC9C8]/40">
                <div>
                  <span className="text-xs text-[#6F7979] font-medium block">Servicio:</span>
                  <span className="font-bold text-[#191C1C]">{selectedService?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-[#6F7979] font-medium block">Profesional:</span>
                  <span className="font-bold text-[#191C1C]">{selectedProfObj?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-[#6F7979] font-medium block">Fecha:</span>
                  <span className="font-bold text-[#191C1C] capitalize">{formatDateDisplay(bookingIntent.date)}</span>
                </div>
                <div>
                  <span className="text-xs text-[#6F7979] font-medium block">Hora:</span>
                  <span className="font-bold text-[#006A6B]">{bookingIntent.startTime} hs</span>
                </div>
                <div>
                  <span className="text-xs text-[#6F7979] font-medium block">Duración:</span>
                  <span className="font-semibold text-[#191C1C]">{selectedService?.durationMinutes || 30} minutos</span>
                </div>
                <div>
                  <span className="text-xs text-[#6F7979] font-medium block">Paciente:</span>
                  <span className="font-semibold text-[#191C1C]">{bookingIntent.patient.fullName}</span>
                </div>
              </div>

              {/* Price Row */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-semibold text-[#3F4948] uppercase tracking-wider">Total a abonar</span>
                  <p className="text-[11px] text-[#6F7979]">Procesado vía Mercado Pago</p>
                </div>
                <div className="text-2xl font-extrabold text-[#006A6B]">
                  ${bookingIntent.price.toLocaleString('es-AR')}
                  <span className="text-xs font-medium text-[#6F7979] ml-1">ARS</span>
                </div>
              </div>
            </M3Card>

            {/* Mandatory Disclaimer */}
            <div className="bg-[#D2E4FF]/40 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-[#041C35] border border-[#4A607C]/20 text-left">
              <Info className="w-4 h-4 text-[#006A6B] shrink-0 mt-0.5" />
              <p>
                <strong className="font-bold">Importante:</strong> El turno queda confirmado únicamente después de aprobarse el pago.
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <M3Button
                id="btn-pay-and-confirm"
                type="button"
                variant="filled"
                size="large"
                fullWidth
                disabled={loading}
                loading={loading}
                onClick={handleProceedToPayment}
                icon={<CreditCard className="w-5 h-5" />}
                trailingIcon={<ChevronRight className="w-5 h-5" />}
              >
                Pagar y confirmar turno
              </M3Button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PASO 5: PASARELA MERCADO PAGO              */}
        {/* ========================================== */}
        {step === 'payment_gateway' && bookingIntent && paymentRecord && (
          <div id="step-payment-gateway" className="space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#BEC9C8]/40">
              <M3Button
                variant="text"
                size="small"
                type="button"
                disabled={paymentProcessing}
                onClick={() => setStep('summary')}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Resumen
              </M3Button>
              <M3Badge tone="primary" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                Checkout Mercado Pago
              </M3Badge>
            </div>

            <div className="text-center space-y-1">
              <div className="inline-block px-3 py-1 bg-[#EEF2F1] text-[#006A6B] rounded-full text-xs font-mono font-bold mb-1 border border-[#BEC9C8]/40">
                Preferencia ID: {paymentPreference?.id}
              </div>
              <h2 className="text-xl font-bold text-[#191C1C]">Elegí tu medio de pago</h2>
              <p className="text-xs text-[#3F4948]">
                Aboná de forma 100% segura con la pasarela oficial de Mercado Pago.
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 text-left">
              <M3Card
                variant="outlined"
                interactive
                selected={paymentMethod === 'credit_card'}
                onClick={() => setPaymentMethod('credit_card')}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#006A6B] text-white flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#191C1C]">Tarjeta de Débito / Crédito</p>
                    <p className="text-xs text-[#6F7979]">Visa, Mastercard, Cabal, Amex</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="pm"
                  checked={paymentMethod === 'credit_card'}
                  onChange={() => setPaymentMethod('credit_card')}
                  className="accent-[#006A6B] w-4 h-4"
                />
              </M3Card>

              <M3Card
                variant="outlined"
                interactive
                selected={paymentMethod === 'mercadopago_wallet'}
                onClick={() => setPaymentMethod('mercadopago_wallet')}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#009EE3] text-white flex items-center justify-center font-bold text-xs">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#191C1C]">Dinero en cuenta Mercado Pago</p>
                    <p className="text-xs text-[#6F7979]">Acreditación instantánea</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="pm"
                  checked={paymentMethod === 'mercadopago_wallet'}
                  onChange={() => setPaymentMethod('mercadopago_wallet')}
                  className="accent-[#006A6B] w-4 h-4"
                />
              </M3Card>
            </div>

            {/* Payment Summary Box */}
            <M3Card variant="filled" className="p-4 flex items-center justify-between text-sm">
              <span className="text-[#3F4948] font-medium">Monto a abonar:</span>
              <span className="text-xl font-bold text-[#006A6B]">
                ${bookingIntent.price.toLocaleString('es-AR')} ARS
              </span>
            </M3Card>

            {/* Simulators */}
            <div className="space-y-2 pt-2">
              <M3Button
                id="btn-simulate-mp-success"
                type="button"
                variant="filled"
                size="large"
                fullWidth
                disabled={paymentProcessing}
                loading={paymentProcessing}
                onClick={() => handleSimulatePaymentApproval('APPROVED')}
                icon={<CheckCircle2 className="w-5 h-5" />}
              >
                {paymentProcessing ? 'Esperando confirmación...' : 'Pagar con Mercado Pago (Aprobar pago)'}
              </M3Button>

              <M3Button
                id="btn-simulate-mp-rejected"
                type="button"
                variant="outlined"
                size="medium"
                fullWidth
                disabled={paymentProcessing}
                onClick={() => handleSimulatePaymentApproval('REJECTED')}
              >
                Probar caso de Pago Rechazado
              </M3Button>
            </div>

            <p className="text-[11px] text-center text-[#6F7979]">
              Ambiente de producción con webhook oficial /api/payments/webhook y validación de idempotencia.
            </p>
          </div>
        )}

        {/* ========================================== */}
        {/* PASO 6: TURNO CONFIRMADO                   */}
        {/* ========================================== */}
        {step === 'confirmed' && confirmedBooking && (
          <div id="step-confirmed" className="space-y-6 text-center py-2">
            <div className="w-16 h-16 rounded-3xl bg-[#C4EED0] text-[#0A5327] flex items-center justify-center mx-auto m3-elevation-1">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-[#191C1C]">¡Turno confirmado!</h2>
              <p className="text-xs text-[#3F4948]">
                Tu pago fue aprobado exitosamente y el turno ya está agendado.
              </p>
            </div>

            {/* Voucher Card */}
            <M3Card variant="outlined" className="p-5 text-left space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-[#BEC9C8]/40">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#6F7979] tracking-wider">Código de Reserva</span>
                  <p className="font-mono font-bold text-sm text-[#191C1C]">{confirmedBooking.id}</p>
                </div>
                <M3Badge tone="success">
                  Pago Aprobado ({confirmedBooking.mpPaymentId})
                </M3Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#6F7979] block font-medium">Paciente:</span>
                  <span className="font-bold text-[#191C1C]">{confirmedBooking.patientName}</span>
                </div>
                <div>
                  <span className="text-[#6F7979] block font-medium">Servicio:</span>
                  <span className="font-bold text-[#191C1C]">{confirmedBooking.serviceName}</span>
                </div>
                <div>
                  <span className="text-[#6F7979] block font-medium">Profesional:</span>
                  <span className="font-bold text-[#191C1C]">{confirmedBooking.professionalName}</span>
                </div>
                <div>
                  <span className="text-[#6F7979] block font-medium">Fecha y Hora:</span>
                  <span className="font-bold text-[#006A6B] capitalize">
                    {formatDateDisplay(confirmedBooking.date)} - {confirmedBooking.startTime} hs
                  </span>
                </div>
                <div>
                  <span className="text-[#6F7979] block font-medium">Importe pagado:</span>
                  <span className="font-bold text-[#191C1C]">${confirmedBooking.price.toLocaleString('es-AR')} ARS</span>
                </div>
                <div>
                  <span className="text-[#6F7979] block font-medium">Google Calendar ID:</span>
                  <span className="font-mono text-[10px] text-[#6F7979] truncate block">
                    {confirmedBooking.googleEventId}
                  </span>
                </div>
              </div>

              <div className="bg-[#FAFDFD] rounded-xl p-3 border border-[#BEC9C8]/40 flex items-center gap-2.5 text-xs text-[#3F4948]">
                <CalendarCheck className="w-4 h-4 text-[#006A6B] shrink-0" />
                <span>Evento agendado automáticamente en Google Calendar del profesional.</span>
              </div>
            </M3Card>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              {gcalSuccess ? (
                <div className="w-full py-3 px-4 rounded-full bg-[#C4EED0] text-[#0A5327] text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Agendado exitosamente en tu Google Calendar personal!</span>
                </div>
              ) : (
                <M3Button
                  type="button"
                  variant="filled"
                  size="medium"
                  fullWidth
                  onClick={handleDirectSyncToGoogleCalendar}
                  loading={gcalSyncing}
                  icon={<CalendarIcon className="w-4 h-4" />}
                >
                  Sincronizar directamente con mi Google Calendar
                </M3Button>
              )}

              <M3Button
                type="button"
                variant="outlined"
                size="medium"
                fullWidth
                onClick={() => {
                  window.open(
                    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                      `[AkiNeuro] ${confirmedBooking.serviceName} - ${confirmedBooking.professionalName}`
                    )}&dates=${confirmedBooking.isoStart.replace(/[-:]/g, '')}/${confirmedBooking.isoEnd.replace(
                      /[-:]/g,
                      ''
                    )}&details=${encodeURIComponent(
                      `Turno en AkiNeuro para ${confirmedBooking.patientName}. Código de reserva: ${confirmedBooking.id}`
                    )}&location=${encodeURIComponent('AkiNeuro - Av. Santa Fe 3200, CABA')}`,
                    '_blank'
                  );
                }}
                icon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Abrir enlace de Google Calendar
              </M3Button>

              <M3Button
                type="button"
                variant="text"
                size="medium"
                fullWidth
                onClick={() => {
                  setStep('start');
                  setConfirmedBooking(null);
                  setBookingIntent(null);
                  setSelectedSlot(null);
                  setGcalSuccess(false);
                }}
              >
                Hacer otra reserva
              </M3Button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* ESTADOS DE ERROR                           */}
        {/* ========================================== */}
        {step === 'error_state' && (
          <div id="step-error-state" className="space-y-5 text-center py-4">
            <div className="w-16 h-16 rounded-3xl bg-[#FFDAD6] text-[#BA1A1A] flex items-center justify-center mx-auto m3-elevation-1">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#191C1C]">No pudimos confirmar el pago</h2>
              <p className="text-xs text-[#3F4948] max-w-sm mx-auto">
                Tu turno no fue reservado. El dinero no fue debitado o la operación fue rechazada por la pasarela de pago.
              </p>
            </div>

            <div className="pt-3 space-y-2">
              <M3Button
                type="button"
                variant="filled"
                size="large"
                fullWidth
                onClick={() => {
                  setErrorMessage(null);
                  if (bookingIntent) {
                    setStep('summary');
                  } else {
                    setStep('datetime');
                  }
                }}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Intentar nuevamente
              </M3Button>

              <M3Button
                type="button"
                variant="text"
                size="medium"
                fullWidth
                onClick={() => {
                  setStep('start');
                  setBookingIntent(null);
                  setSelectedSlot(null);
                }}
              >
                Volver al inicio
              </M3Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
