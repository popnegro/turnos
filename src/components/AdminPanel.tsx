import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Layers,
  Settings,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  ExternalLink,
  ShieldCheck,
  CalendarCheck,
  Zap,
  Building2,
  UserCheck
} from 'lucide-react';
import { GoogleCalendarManager } from './GoogleCalendarManager';
import {
  M3Button,
  M3TextField,
  M3Card,
  M3Badge,
  M3Dialog,
  M3LinearProgress,
  M3SegmentedButton
} from './m3';
import type {
  Professional,
  Service,
  Booking,
  CrmLead,
  AdminStats,
  Organization,
  CalendarConnection
} from '../types';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'crm' | 'bookings' | 'google_calendar' | 'hardening' | 'audit' | 'professionals' | 'services' | 'concurrency' | 'settings'>('crm');
  const [loading, setLoading] = useState(false);

  // Hardening Suite States
  const [testResults, setTestResults] = useState<any[]>([]);
  const [suiteRunning, setSuiteRunning] = useState(false);
  const [singleRunning, setSingleRunning] = useState<string | null>(null);
  const [suiteStats, setSuiteStats] = useState<{ totalDurationMs?: number; suiteSuccess?: boolean } | null>(null);

  // Audit Logs States
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [retryingBookingId, setRetryingBookingId] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<{ id: string; text: string; success: boolean } | null>(null);

  // Data states
  const [stats, setStats] = useState<AdminStats>({
    totalLeads: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    pendingPaymentBookings: 0,
    totalRevenue: 0,
    conversionRate: 0
  });

  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);

  // Filters
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');

  // Modals & Forms
  const [showProfModal, setShowProfModal] = useState(false);
  const [editingProf, setEditingProf] = useState<Partial<Professional> | null>(null);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);

  // Concurrency Simulator State
  const [simDate, setSimDate] = useState(new Date().toISOString().split('T')[0]);
  const [simTime, setSimTime] = useState('10:30');
  const [simProfId, setSimProfId] = useState('');
  const [simServiceId, setSimServiceId] = useState('');
  const [simResults, setSimResults] = useState<Array<{ name: string; status: 'SUCCESS' | 'BLOCKED'; message: string; timestamp: string }>>([]);
  const [simulating, setSimulating] = useState(false);

  // Mock Calendar Event Form
  const [mockEventTitle, setMockEventTitle] = useState('Reunión médica externa');
  const [mockEventStart, setMockEventStart] = useState('14:00');
  const [mockEventEnd, setMockEventEnd] = useState('15:00');
  const [mockEventMsg, setMockEventMsg] = useState('');

  // Initial fetch
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const headers = { 'x-admin-session': 'active', 'Accept': 'application/json' };
      const [resStats, resLeads, resBookings, resPros, resServices, resCal, resOrg] = await Promise.all([
        fetch('/api/admin/stats', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/admin/crm-leads', { headers }).then((r) => r.json()).catch(() => []),
        fetch('/api/bookings', { headers }).then((r) => r.json()).catch(() => []),
        fetch('/api/professionals?active=false', { headers }).then((r) => r.json()).catch(() => []),
        fetch('/api/services?active=false', { headers }).then((r) => r.json()).catch(() => []),
        fetch('/api/google-calendar/connections', { headers }).then((r) => r.json()).catch(() => []),
        fetch('/api/organizations/org-akineuro-01', { headers }).then((r) => r.json()).catch(() => null)
      ]);

      if (resStats && typeof resStats === 'object' && !resStats.error) {
        setStats(resStats);
      }
      setLeads(Array.isArray(resLeads) ? resLeads : []);
      setBookings(Array.isArray(resBookings) ? resBookings : []);
      const prosList = Array.isArray(resPros) ? resPros : [];
      const servList = Array.isArray(resServices) ? resServices : [];
      setProfessionals(prosList);
      setServices(servList);
      setCalendarConnections(Array.isArray(resCal) ? resCal : []);
      if (resOrg && !resOrg.error) {
        setOrganization(resOrg);
      }

      if (prosList.length > 0 && !simProfId) setSimProfId(prosList[0].id);
      if (servList.length > 0 && !simServiceId) setSimServiceId(servList[0].id);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Status Badge formatting with Material 3 Badges
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <M3Badge tone="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            Confirmado
          </M3Badge>
        );
      case 'PENDING_PAYMENT':
        return (
          <M3Badge tone="warning" icon={<Clock className="w-3.5 h-3.5" />}>
            Pendiente Pago
          </M3Badge>
        );
      case 'CANCELLED':
        return (
          <M3Badge tone="neutral" icon={<XCircle className="w-3.5 h-3.5" />}>
            Cancelado
          </M3Badge>
        );
      case 'EXPIRED':
        return (
          <M3Badge tone="error" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
            Expirado
          </M3Badge>
        );
      default:
        return (
          <M3Badge tone="primary">
            Nuevo
          </M3Badge>
        );
    }
  };

  // Run Full Test Suite
  const handleRunFullTestSuite = async () => {
    try {
      setSuiteRunning(true);
      const res = await fetch('/api/tests/run-all');
      const data = await res.json();
      setTestResults(data.results || []);
      setSuiteStats({ totalDurationMs: data.totalDurationMs, suiteSuccess: data.suiteSuccess });
      loadAllData();
      fetchAuditLogs();
    } catch (err) {
      console.error('Error running test suite:', err);
    } finally {
      setSuiteRunning(false);
    }
  };

  // Run a single test
  const handleRunSingleTest = async (testEndpoint: string, testId: string) => {
    try {
      setSingleRunning(testId);
      const res = await fetch(testEndpoint, { method: 'POST' });
      const data = await res.json();
      setTestResults((prev) => {
        const filtered = prev.filter((t) => t.id !== testId && t.testId !== testId);
        return [...filtered, { ...data, id: testId, testId: data.testId || testId }];
      });
      loadAllData();
      fetchAuditLogs();
    } catch (err) {
      console.error(`Error running test ${testId}:`, err);
    } finally {
      setSingleRunning(null);
    }
  };

  // Fetch real audit logs
  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await fetch('/api/audit-logs?limit=50', {
        headers: { 'x-admin-session': 'active', 'Accept': 'application/json' }
      });
      const data = await res.json();
      setAuditLogs(Array.isArray(data?.logs) ? data.logs : []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  // Retry Google Calendar Sync for a booking
  const handleRetryCalendarSync = async (bookingId: string) => {
    try {
      setRetryingBookingId(bookingId);
      setRetryMessage(null);
      const res = await fetch(`/api/bookings/${bookingId}/retry-calendar-sync`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRetryMessage({ id: bookingId, text: `¡Sincronizado con éxito! Event ID: ${data.booking.googleEventId}`, success: true });
        loadAllData();
        fetchAuditLogs();
      } else {
        setRetryMessage({ id: bookingId, text: data.message || 'Error en reintento', success: false });
      }
    } catch (err: any) {
      setRetryMessage({ id: bookingId, text: err.message || 'Error de conexión', success: false });
    } finally {
      setRetryingBookingId(null);
    }
  };

  // Auto-fetch audit logs when tab opens
  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // Concurrency Test Execution: Fires two simultaneous requests for the exact same slot
  const handleRunConcurrencySimulation = async () => {
    if (!simProfId || !simServiceId) return;
    setSimulating(true);
    setSimResults([]);

    const payloadA = {
      serviceId: simServiceId,
      professionalId: simProfId,
      date: simDate,
      time: simTime,
      patient: {
        fullName: 'Paciente A (Simulación 1)',
        phone: '+5491111111111',
        email: 'pacienteA@simulacion.test',
        notes: 'Test concurrencia A'
      }
    };

    const payloadB = {
      serviceId: simServiceId,
      professionalId: simProfId,
      date: simDate,
      time: simTime,
      patient: {
        fullName: 'Paciente B (Simulación 2)',
        phone: '+5492222222222',
        email: 'pacienteB@simulacion.test',
        notes: 'Test concurrencia B'
      }
    };

    try {
      const [resA, resB] = await Promise.all([
        fetch('/api/booking-intents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadA)
        }),
        fetch('/api/booking-intents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadB)
        })
      ]);

      const dataA = await resA.json();
      const dataB = await resB.json();

      const results = [
        {
          name: 'Paciente A',
          status: (resA.ok ? 'SUCCESS' : 'BLOCKED') as 'SUCCESS' | 'BLOCKED',
          message: resA.ok ? `¡Turno bloqueado por 10 min! Intent ID: ${dataA.bookingIntent?.id}` : (dataA.message || 'Bloqueado por colisión'),
          timestamp: new Date().toLocaleTimeString()
        },
        {
          name: 'Paciente B',
          status: (resB.ok ? 'SUCCESS' : 'BLOCKED') as 'SUCCESS' | 'BLOCKED',
          message: resB.ok ? `¡Turno bloqueado por 10 min! Intent ID: ${dataB.bookingIntent?.id}` : (dataB.message || 'Bloqueado por colisión'),
          timestamp: new Date().toLocaleTimeString()
        }
      ];

      setSimResults(results);
      loadAllData();
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  // Mock Busy Block on Google Calendar
  const handleAddMockBusyEvent = async () => {
    if (!simProfId) return;
    try {
      const res = await fetch('/api/google-calendar/mock-busy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: simProfId,
          date: simDate,
          startTime: mockEventStart,
          endTime: mockEventEnd,
          title: mockEventTitle
        })
      });
      const data = await res.json();
      setMockEventMsg(data.message || 'Evento agregado');
      loadAllData();
      setTimeout(() => setMockEventMsg(''), 4000);
    } catch (err) {
      console.error('Error adding mock event:', err);
    }
  };

  // Save Professional
  const handleSaveProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProf) return;

    try {
      const isNew = !editingProf.id;
      const url = isNew ? '/api/professionals' : `/api/professionals/${editingProf.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProf)
      });

      if (res.ok) {
        setShowProfModal(false);
        setEditingProf(null);
        loadAllData();
      }
    } catch (err) {
      console.error('Error saving professional:', err);
    }
  };

  // Save Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      const isNew = !editingService.id;
      const url = isNew ? '/api/services' : `/api/services/${editingService.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingService)
      });

      if (res.ok) {
        setShowServiceModal(false);
        setEditingService(null);
        loadAllData();
      }
    } catch (err) {
      console.error('Error saving service:', err);
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (id: string) => {
    if (!confirm('¿Seguro que deseas cancelar esta reserva? Se liberará el turno en el calendario.')) return;
    try {
      await fetch(`/api/bookings/${id}/cancel`, { method: 'POST' });
      loadAllData();
    } catch (err) {
      console.error('Error cancelling booking:', err);
    }
  };

  const filteredLeads = (Array.isArray(leads) ? leads : []).filter((l) => {
    if (!l) return false;
    const matchesSearch =
      (l.fullName || '').toLowerCase().includes(leadSearch.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(leadSearch.toLowerCase()) ||
      (l.phone || '').includes(leadSearch) ||
      (l.serviceName || '').toLowerCase().includes(leadSearch.toLowerCase());
    const matchesStatus = leadStatusFilter === 'ALL' || l.status === leadStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredBookings = (Array.isArray(bookings) ? bookings : []).filter((b) => {
    if (!b) return false;
    return bookingStatusFilter === 'ALL' || b.status === bookingStatusFilter;
  });

  return (
    <div id="admin-panel" className="max-w-7xl mx-auto space-y-6">
      {/* Material 3 Top Header Card */}
      <M3Card variant="elevated" className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <M3Badge tone="primary">
                Panel Administrativo SaaS
              </M3Badge>
              <span className="text-xs text-[#6F7979] font-medium">• Multi-Tenant</span>
            </div>
            <h1 className="text-2xl font-bold text-[#191C1C]">
              {organization?.name || 'AkiNeuro'} — Gestión de Turnos & CRM
            </h1>
            <p className="text-xs text-[#3F4948]">
              Monitoreo en tiempo real de leads, agendas en Google Calendar y cobros con Mercado Pago.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <M3Button
              variant="outlined"
              size="small"
              onClick={loadAllData}
              disabled={loading}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              Actualizar
            </M3Button>
          </div>
        </div>
      </M3Card>

      {/* Material 3 KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <M3Card variant="filled" className="p-4 space-y-1">
          <span className="text-xs font-semibold text-[#4A607C] flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Total Leads
          </span>
          <p className="text-2xl font-extrabold text-[#191C1C]">{stats.totalLeads}</p>
          <span className="text-[10px] text-[#6F7979]">Capturados en widget</span>
        </M3Card>

        <M3Card variant="filled" className="p-4 space-y-1">
          <span className="text-xs font-semibold text-[#0A5327] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Confirmados
          </span>
          <p className="text-2xl font-extrabold text-[#0A5327]">{stats.confirmedBookings}</p>
          <span className="text-[10px] text-[#0A5327]">Pago MP aprobado</span>
        </M3Card>

        <M3Card variant="filled" className="p-4 space-y-1">
          <span className="text-xs font-semibold text-[#563E00] flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Pendientes
          </span>
          <p className="text-2xl font-extrabold text-[#563E00]">{stats.pendingPaymentBookings}</p>
          <span className="text-[10px] text-[#563E00]">Bloqueo temporal</span>
        </M3Card>

        <M3Card variant="filled" className="p-4 space-y-1">
          <span className="text-xs font-semibold text-[#006A6B] flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" /> Facturación
          </span>
          <p className="text-2xl font-extrabold text-[#006A6B]">${stats.totalRevenue.toLocaleString('es-AR')}</p>
          <span className="text-[10px] text-[#6F7979]">ARS acreditados</span>
        </M3Card>

        <M3Card variant="filled" className="p-4 space-y-1">
          <span className="text-xs font-semibold text-[#4A607C] flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> Conversión
          </span>
          <p className="text-2xl font-extrabold text-[#4A607C]">{stats.conversionRate}%</p>
          <span className="text-[10px] text-[#6F7979]">Lead a Pago</span>
        </M3Card>

        <M3Card variant="filled" className="p-4 space-y-1">
          <span className="text-xs font-semibold text-[#0A5327] flex items-center gap-1.5">
            <CalendarCheck className="w-4 h-4" /> Google Cal
          </span>
          <p className="text-2xl font-extrabold text-[#191C1C]">{calendarConnections.length}</p>
          <span className="text-[10px] text-[#0A5327]">Sincronizados</span>
        </M3Card>
      </div>

      {/* Navigation Segmented Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-[#BEC9C8]/60 shadow-xs flex flex-wrap gap-1.5">
        {[
          { id: 'crm', label: `CRM / Leads (${leads.length})`, icon: <Users className="w-4 h-4" /> },
          { id: 'bookings', label: `Reservas (${bookings.length})`, icon: <Calendar className="w-4 h-4" /> },
          { id: 'google_calendar', label: 'Google Calendar API', icon: <CalendarCheck className="w-4 h-4" /> },
          { id: 'hardening', label: 'Hardening & Tests V2.1', icon: <ShieldCheck className="w-4 h-4 text-[#BA1A1A]" /> },
          { id: 'audit', label: 'Auditoría & Logs', icon: <Clock className="w-4 h-4" /> },
          { id: 'professionals', label: `Profesionales (${professionals.length})`, icon: <UserCheck className="w-4 h-4" /> },
          { id: 'services', label: `Servicios (${services.length})`, icon: <Layers className="w-4 h-4" /> },
          { id: 'concurrency', label: 'Test Concurrencia & GCal', icon: <Zap className="w-4 h-4" /> },
          { id: 'settings', label: 'Configuración Tenant', icon: <Settings className="w-4 h-4" /> },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-[#006A6B] text-white shadow-sm'
                  : 'text-[#3F4948] hover:bg-[#EEF2F1] hover:text-[#191C1C]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================== */}
      {/* TAB 1: CRM & LEADS                         */}
      {/* ========================================== */}
      {activeTab === 'crm' && (
        <M3Card variant="elevated" className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#191C1C]">Leads & Registros de Pacientes</h2>
              <p className="text-xs text-[#3F4948]">
                Información completa capturada en el widget y estado de la reserva.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-[#6F7979] absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por paciente, email..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#BEC9C8] rounded-xl bg-white focus:border-[#006A6B] outline-none"
                />
              </div>

              <select
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                className="text-xs border border-[#BEC9C8] rounded-xl px-3 py-2 bg-white outline-none cursor-pointer"
              >
                <option value="ALL">Todos los estados</option>
                <option value="CONFIRMED">Confirmados</option>
                <option value="PENDING_PAYMENT">Pendientes de Pago</option>
                <option value="EXPIRED">Expirados</option>
                <option value="CANCELLED">Cancelados</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-[#BEC9C8]/40 rounded-2xl">
            <table className="w-full text-left text-xs text-[#191C1C]">
              <thead className="bg-[#FAFDFD] text-[#6F7979] font-bold border-b border-[#BEC9C8]/40 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">Servicio & Profesional</th>
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Importe</th>
                  <th className="py-3 px-4">Detalle / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#BEC9C8]/30">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#EEF2F1]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#191C1C]">{lead.fullName}</div>
                      <div className="text-[11px] text-[#3F4948]">{lead.phone}</div>
                      <div className="text-[11px] text-[#6F7979]">{lead.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#191C1C]">{lead.serviceName}</div>
                      <div className="text-[11px] text-[#006A6B] font-medium">{lead.professionalName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#191C1C]">{lead.date || '—'}</div>
                      <div className="text-[11px] text-[#6F7979]">{lead.time ? `${lead.time} hs` : '—'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(lead.status)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#191C1C]">
                      {lead.amount ? `$${lead.amount.toLocaleString('es-AR')}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#3F4948] max-w-xs truncate text-[11px]">
                      {lead.notes || '—'}
                    </td>
                  </tr>
                ))}

                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#6F7979]">
                      No se encontraron registros con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </M3Card>
      )}

      {/* ========================================== */}
      {/* TAB 2: RESERVAS & CALENDARIO               */}
      {/* ========================================== */}
      {activeTab === 'bookings' && (
        <M3Card variant="elevated" className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#191C1C]">Reservas Oficiales</h2>
              <p className="text-xs text-[#3F4948]">
                Turnos con estado de pago Mercado Pago y sincronización en Google Calendar.
              </p>
            </div>

            <select
              value={bookingStatusFilter}
              onChange={(e) => setBookingStatusFilter(e.target.value)}
              className="text-xs border border-[#BEC9C8] rounded-xl px-3 py-2 bg-white outline-none cursor-pointer"
            >
              <option value="ALL">Todas las reservas</option>
              <option value="CONFIRMED">Confirmadas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </div>

          <div className="overflow-x-auto border border-[#BEC9C8]/40 rounded-2xl">
            <table className="w-full text-left text-xs text-[#191C1C]">
              <thead className="bg-[#FAFDFD] text-[#6F7979] font-bold border-b border-[#BEC9C8]/40 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Código / Paciente</th>
                  <th className="py-3 px-4">Turno</th>
                  <th className="py-3 px-4">Profesional</th>
                  <th className="py-3 px-4">Estado & Pago MP</th>
                  <th className="py-3 px-4">Google Calendar Sync</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#BEC9C8]/30">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#EEF2F1]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] bg-[#EEF2F1] text-[#191C1C] px-1.5 py-0.5 rounded font-bold">
                        {b.id}
                      </span>
                      <div className="font-bold text-[#191C1C] mt-1">{b.patientName}</div>
                      <div className="text-[11px] text-[#6F7979]">{b.patientPhone}</div>
                      {b.correlationId && (
                        <div className="text-[9px] text-[#6F7979] font-mono mt-0.5">corr: {b.correlationId}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#191C1C]">{b.serviceName}</div>
                      <div className="text-[11px] text-[#006A6B] font-medium">{b.date} • {b.startTime} hs ({b.durationMinutes}m)</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#191C1C]">
                      {b.professionalName}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {renderStatusBadge(b.status)}
                        {b.mpPaymentId && (
                          <div className="text-[10px] text-[#6F7979] font-mono">
                            MP: {b.mpPaymentId}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        {b.calendarSyncStatus === 'CREATED' ? (
                          <M3Badge tone="success" icon={<CalendarCheck className="w-3.5 h-3.5" />}>
                            Sincronizado ({b.googleEventId})
                          </M3Badge>
                        ) : b.calendarSyncStatus === 'FAILED' ? (
                          <div className="flex flex-col gap-1 items-start">
                            <M3Badge tone="error" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
                              Sync Falló
                            </M3Badge>
                            <M3Button
                              variant="filled"
                              size="small"
                              onClick={() => handleRetryCalendarSync(b.id)}
                              disabled={retryingBookingId === b.id}
                              loading={retryingBookingId === b.id}
                              icon={<RefreshCw className="w-3 h-3" />}
                            >
                              Reintentar Sync
                            </M3Button>
                          </div>
                        ) : (
                          <M3Badge tone="warning" icon={<Clock className="w-3.5 h-3.5" />}>
                            Pendiente
                          </M3Badge>
                        )}
                        {retryMessage && retryMessage.id === b.id && (
                          <p className={`text-[10px] ${retryMessage.success ? 'text-[#0A5327]' : 'text-[#BA1A1A]'} font-medium`}>
                            {retryMessage.text}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {b.status === 'CONFIRMED' && (
                        <M3Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleCancelBooking(b.id)}
                        >
                          Cancelar
                        </M3Button>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#6F7979]">
                      No hay reservas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </M3Card>
      )}

      {/* ========================================== */}
      {/* TAB: GOOGLE CALENDAR API OFICIAL           */}
      {/* ========================================== */}
      {activeTab === 'google_calendar' && (
        <GoogleCalendarManager
          professionals={professionals}
          onSyncCompleted={loadAllData}
        />
      )}

      {/* ========================================== */}
      {/* TAB: HARDENING & RESILIENCIA V2.1          */}
      {/* ========================================== */}
      {activeTab === 'hardening' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-[#191C1C] text-white rounded-3xl p-6 shadow-md border border-[#4A6363]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6FF7F6]/20 text-[#6FF7F6] text-xs font-bold border border-[#6FF7F6]/30">
                <ShieldCheck className="w-4 h-4" />
                Suite de Validación de Producción V2.1.1
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Hardening Transaccional, Idempotencia & Crash Recovery
              </h2>
              <p className="text-xs text-[#BEC9C8] max-w-2xl">
                Batería automatizada de 7 tests de resiliencia backend: seguridad multi-tenant con autorización real, validación atómica contra Google Calendar, recuperación ante caída del servidor tras pago, idempotencia de workers y webhooks, expiración estricta de 10 min TTL y concurrencia extrema (100 reqs).
              </p>
            </div>

            <M3Button
              variant="filled"
              size="medium"
              onClick={handleRunFullTestSuite}
              disabled={suiteRunning}
              loading={suiteRunning}
              icon={<Zap className="w-4 h-4" />}
            >
              {suiteRunning ? 'Ejecutando Suite...' : 'Ejecutar Suite Completa (7 Tests)'}
            </M3Button>
          </div>

          {/* Stats Bar if Suite was Run */}
          {suiteStats && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
              suiteStats.suiteSuccess ? 'bg-[#C4EED0] border-[#0A5327]/30 text-[#0A5327]' : 'bg-[#FFDAD6] border-[#BA1A1A]/30 text-[#BA1A1A]'
            }`}>
              <div className="flex items-center gap-2">
                {suiteStats.suiteSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                <span>
                  {suiteStats.suiteSuccess ? 'TODOS LOS TESTS DE HARDENING APROBADOS (7/7)' : 'ALGUNOS TESTS FALLARON'}
                </span>
              </div>
              <span className="font-mono">
                Tiempo total: {suiteStats.totalDurationMs} ms
              </span>
            </div>
          )}

          {/* Test Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Test 1: Multi-Tenant Authorization */}
            <M3Card variant="elevated" className="p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <M3Badge tone="primary">Test 1: Multi-Tenant Real</M3Badge>
                  {testResults.find((t) => t.testId === 'test_1_multitenant_auth' || t.id === 'multi-tenant-isolation') && (
                    <M3Badge tone={testResults.find((t) => t.testId === 'test_1_multitenant_auth' || t.id === 'multi-tenant-isolation')?.passed ? 'success' : 'error'}>
                      {testResults.find((t) => t.testId === 'test_1_multitenant_auth' || t.id === 'multi-tenant-isolation')?.passed ? 'PASSED (403 Forbidden)' : 'FAILED'}
                    </M3Badge>
                  )}
                </div>
                <h3 className="font-bold text-sm text-[#191C1C]">Autorización & Aislamiento Estricto</h3>
                <p className="text-xs text-[#3F4948] leading-relaxed">
                  Tenant A intenta acceder o modificar profesionales, turnos y calendarios de Tenant B. Valida que se bloquee con 403 Forbidden.
                </p>
                {testResults.find((t) => t.testId === 'test_1_multitenant_auth' || t.id === 'multi-tenant-isolation') && (
                  <div className="p-3 bg-[#EEF2F1] rounded-xl text-[11px] font-mono text-[#191C1C] space-y-1">
                    <p className="font-bold">{testResults.find((t) => t.testId === 'test_1_multitenant_auth' || t.id === 'multi-tenant-isolation')?.details || testResults.find((t) => t.testId === 'test_1_multitenant_auth' || t.id === 'multi-tenant-isolation')?.message}</p>
                    <p className="text-[#6F7979]">Duración: {testResults.find((t) => t.testId === 'test_1_multitenant_auth' || t.id === 'multi-tenant-isolation')?.durationMs} ms</p>
                  </div>
                )}
              </div>
              <M3Button
                variant="filled"
                size="small"
                fullWidth
                onClick={() => handleRunSingleTest('/api/tests/multi-tenant-auth', 'test_1_multitenant_auth')}
                disabled={singleRunning === 'test_1_multitenant_auth' || suiteRunning}
                loading={singleRunning === 'test_1_multitenant_auth'}
                icon={<RefreshCw className="w-3 h-3" />}
              >
                {singleRunning === 'test_1_multitenant_auth' ? 'Verificando...' : 'Ejecutar Test Multi-Tenant'}
              </M3Button>
            </M3Card>

            {/* Test 2: External Calendar Race */}
            <M3Card variant="elevated" className="p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <M3Badge tone="secondary">Test 2: Carrera Google Calendar</M3Badge>
                  {testResults.find((t) => t.testId === 'test_2_external_calendar_race' || t.id === 'availability-race') && (
                    <M3Badge tone={testResults.find((t) => t.testId === 'test_2_external_calendar_race' || t.id === 'availability-race')?.passed ? 'success' : 'error'}>
                      {testResults.find((t) => t.testId === 'test_2_external_calendar_race' || t.id === 'availability-race')?.passed ? 'PASSED (409 Conflict)' : 'FAILED'}
                    </M3Badge>
                  )}
                </div>
                <h3 className="font-bold text-sm text-[#191C1C]">Evento Externo Superpuesto en Google Calendar</h3>
                <p className="text-xs text-[#3F4948] leading-relaxed">
                  Simula la creación de un evento externo en Google Calendar tras consultar disponibilidad. Valida rechazo con 409 Conflict.
                </p>
                {testResults.find((t) => t.testId === 'test_2_external_calendar_race' || t.id === 'availability-race') && (
                  <div className="p-3 bg-[#EEF2F1] rounded-xl text-[11px] font-mono text-[#191C1C] space-y-1">
                    <p className="font-bold">{testResults.find((t) => t.testId === 'test_2_external_calendar_race' || t.id === 'availability-race')?.details || testResults.find((t) => t.testId === 'test_2_external_calendar_race' || t.id === 'availability-race')?.message}</p>
                    <p className="text-[#6F7979]">Duración: {testResults.find((t) => t.testId === 'test_2_external_calendar_race' || t.id === 'availability-race')?.durationMs} ms</p>
                  </div>
                )}
              </div>
              <M3Button
                variant="filled"
                size="small"
                fullWidth
                onClick={() => handleRunSingleTest('/api/tests/external-calendar-race', 'test_2_external_calendar_race')}
                disabled={singleRunning === 'test_2_external_calendar_race' || suiteRunning}
                loading={singleRunning === 'test_2_external_calendar_race'}
                icon={<RefreshCw className="w-3 h-3" />}
              >
                {singleRunning === 'test_2_external_calendar_race' ? 'Verificando...' : 'Ejecutar Test Carrera'}
              </M3Button>
            </M3Card>

            {/* Test 3: Crash Recovery */}
            <M3Card variant="elevated" className="p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <M3Badge tone="warning">Test 3: Crash Recovery</M3Badge>
                  {testResults.find((t) => t.testId === 'test_3_crash_recovery' || t.id === 'calendar-failure') && (
                    <M3Badge tone={testResults.find((t) => t.testId === 'test_3_crash_recovery' || t.id === 'calendar-failure')?.passed ? 'success' : 'error'}>
                      {testResults.find((t) => t.testId === 'test_3_crash_recovery' || t.id === 'calendar-failure')?.passed ? 'PASSED (Worker Sync)' : 'FAILED'}
                    </M3Badge>
                  )}
                </div>
                <h3 className="font-bold text-sm text-[#191C1C]">Recuperación Post-Caída con Pago Aprobado</h3>
                <p className="text-xs text-[#3F4948] leading-relaxed">
                  Simula caída del proceso con pago APPROVED. El worker de fondo detecta el estado y crea el evento en Google Calendar.
                </p>
                {testResults.find((t) => t.testId === 'test_3_crash_recovery' || t.id === 'calendar-failure') && (
                  <div className="p-3 bg-[#EEF2F1] rounded-xl text-[11px] font-mono text-[#191C1C] space-y-1">
                    <p className="font-bold">{testResults.find((t) => t.testId === 'test_3_crash_recovery' || t.id === 'calendar-failure')?.details || testResults.find((t) => t.testId === 'test_3_crash_recovery' || t.id === 'calendar-failure')?.message}</p>
                    <p className="text-[#6F7979]">Duración: {testResults.find((t) => t.testId === 'test_3_crash_recovery' || t.id === 'calendar-failure')?.durationMs} ms</p>
                  </div>
                )}
              </div>
              <M3Button
                variant="filled"
                size="small"
                fullWidth
                onClick={() => handleRunSingleTest('/api/tests/crash-recovery', 'test_3_crash_recovery')}
                disabled={singleRunning === 'test_3_crash_recovery' || suiteRunning}
                loading={singleRunning === 'test_3_crash_recovery'}
                icon={<RefreshCw className="w-3 h-3" />}
              >
                {singleRunning === 'test_3_crash_recovery' ? 'Recuperando...' : 'Ejecutar Crash Recovery'}
              </M3Button>
            </M3Card>

            {/* Test 4: Duplicate Recovery Workers */}
            <M3Card variant="elevated" className="p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <M3Badge tone="tertiary">Test 4: Recovery Duplicado</M3Badge>
                  {testResults.find((t) => t.testId === 'test_4_duplicate_recovery') && (
                    <M3Badge tone={testResults.find((t) => t.testId === 'test_4_duplicate_recovery')?.passed ? 'success' : 'error'}>
                      {testResults.find((t) => t.testId === 'test_4_duplicate_recovery')?.passed ? 'PASSED (1 GCal Event)' : 'FAILED'}
                    </M3Badge>
                  )}
                </div>
                <h3 className="font-bold text-sm text-[#191C1C]">Ejecución Concurrente de Workers</h3>
                <p className="text-xs text-[#3F4948] leading-relaxed">
                  Dispara 2 workers en paralelo para la misma reserva. Valida que el locking y deterministic ID generen solo 1 evento de calendario.
                </p>
                {testResults.find((t) => t.testId === 'test_4_duplicate_recovery') && (
                  <div className="p-3 bg-[#EEF2F1] rounded-xl text-[11px] font-mono text-[#191C1C] space-y-1">
                    <p className="font-bold">{testResults.find((t) => t.testId === 'test_4_duplicate_recovery')?.details}</p>
                    <p className="text-[#6F7979]">Duración: {testResults.find((t) => t.testId === 'test_4_duplicate_recovery')?.durationMs} ms</p>
                  </div>
                )}
              </div>
              <M3Button
                variant="filled"
                size="small"
                fullWidth
                onClick={() => handleRunSingleTest('/api/tests/duplicate-recovery', 'test_4_duplicate_recovery')}
                disabled={singleRunning === 'test_4_duplicate_recovery' || suiteRunning}
                loading={singleRunning === 'test_4_duplicate_recovery'}
                icon={<RefreshCw className="w-3 h-3" />}
              >
                {singleRunning === 'test_4_duplicate_recovery' ? 'Verificando...' : 'Ejecutar Test Doble Worker'}
              </M3Button>
            </M3Card>

            {/* Test 5: Webhook Duplicado */}
            <M3Card variant="elevated" className="p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <M3Badge tone="primary">Test 5: Webhooks Repetidos (5x)</M3Badge>
                  {testResults.find((t) => t.testId === 'test_5_duplicate_webhook' || t.id === 'duplicate-payment') && (
                    <M3Badge tone={testResults.find((t) => t.testId === 'test_5_duplicate_webhook' || t.id === 'duplicate-payment')?.passed ? 'success' : 'error'}>
                      {testResults.find((t) => t.testId === 'test_5_duplicate_webhook' || t.id === 'duplicate-payment')?.passed ? 'PASSED (1 Record)' : 'FAILED'}
                    </M3Badge>
                  )}
                </div>
                <h3 className="font-bold text-sm text-[#191C1C]">5 Webhooks Idénticos de Mercado Pago</h3>
                <p className="text-xs text-[#3F4948] leading-relaxed">
                  Envía 5 veces el mismo webhook de pago aprobado. Valida exactamente 1 Payment, 1 Booking y 1 Evento en Google Calendar.
                </p>
                {testResults.find((t) => t.testId === 'test_5_duplicate_webhook' || t.id === 'duplicate-payment') && (
                  <div className="p-3 bg-[#EEF2F1] rounded-xl text-[11px] font-mono text-[#191C1C] space-y-1">
                    <p className="font-bold">{testResults.find((t) => t.testId === 'test_5_duplicate_webhook' || t.id === 'duplicate-payment')?.details || testResults.find((t) => t.testId === 'test_5_duplicate_webhook' || t.id === 'duplicate-payment')?.message}</p>
                    <p className="text-[#6F7979]">Duración: {testResults.find((t) => t.testId === 'test_5_duplicate_webhook' || t.id === 'duplicate-payment')?.durationMs} ms</p>
                  </div>
                )}
              </div>
              <M3Button
                variant="filled"
                size="small"
                fullWidth
                onClick={() => handleRunSingleTest('/api/tests/duplicate-webhook', 'test_5_duplicate_webhook')}
                disabled={singleRunning === 'test_5_duplicate_webhook' || suiteRunning}
                loading={singleRunning === 'test_5_duplicate_webhook'}
                icon={<RefreshCw className="w-3 h-3" />}
              >
                {singleRunning === 'test_5_duplicate_webhook' ? 'Enviando...' : 'Ejecutar Test Webhooks'}
              </M3Button>
            </M3Card>

            {/* Test 6: Expired Hold */}
            <M3Card variant="elevated" className="p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <M3Badge tone="warning">Test 6: Expiración 10 min TTL</M3Badge>
                  {testResults.find((t) => t.testId === 'test_6_expired_hold' || t.id === 'expiration') && (
                    <M3Badge tone={testResults.find((t) => t.testId === 'test_6_expired_hold' || t.id === 'expiration')?.passed ? 'success' : 'error'}>
                      {testResults.find((t) => t.testId === 'test_6_expired_hold' || t.id === 'expiration')?.passed ? 'PASSED (410 GONE)' : 'FAILED'}
                    </M3Badge>
                  )}
                </div>
                <h3 className="font-bold text-sm text-[#191C1C]">Rechazo de Hold Expirado & Liberación</h3>
                <p className="text-xs text-[#3F4948] leading-relaxed">
                  Intento de pago sobre un hold con TTL vencido. Valida que responda 410 Gone y libere el slot inmediatamente.
                </p>
                {testResults.find((t) => t.testId === 'test_6_expired_hold' || t.id === 'expiration') && (
                  <div className="p-3 bg-[#EEF2F1] rounded-xl text-[11px] font-mono text-[#191C1C] space-y-1">
                    <p className="font-bold">{testResults.find((t) => t.testId === 'test_6_expired_hold' || t.id === 'expiration')?.details || testResults.find((t) => t.testId === 'test_6_expired_hold' || t.id === 'expiration')?.message}</p>
                    <p className="text-[#6F7979]">Duración: {testResults.find((t) => t.testId === 'test_6_expired_hold' || t.id === 'expiration')?.durationMs} ms</p>
                  </div>
                )}
              </div>
              <M3Button
                variant="filled"
                size="small"
                fullWidth
                onClick={() => handleRunSingleTest('/api/tests/expired-hold', 'test_6_expired_hold')}
                disabled={singleRunning === 'test_6_expired_hold' || suiteRunning}
                loading={singleRunning === 'test_6_expired_hold'}
                icon={<RefreshCw className="w-3 h-3" />}
              >
                {singleRunning === 'test_6_expired_hold' ? 'Verificando...' : 'Ejecutar Test Expiración'}
              </M3Button>
            </M3Card>

            {/* Test 7: Concurrency 100 Requests */}
            <M3Card variant="elevated" className="p-5 space-y-3 flex flex-col justify-between md:col-span-2 lg:col-span-3">
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <M3Badge tone="error">Test 7: Concurrencia Extrema (100 Requests)</M3Badge>
                  {testResults.find((t) => t.testId === 'test_7_concurrency_100' || t.id === 'concurrency') && (
                    <M3Badge tone={testResults.find((t) => t.testId === 'test_7_concurrency_100' || t.id === 'concurrency')?.passed ? 'success' : 'error'}>
                      {testResults.find((t) => t.testId === 'test_7_concurrency_100' || t.id === 'concurrency')?.passed ? 'PASSED (1 HOLD / 99 409 Conflict)' : 'FAILED'}
                    </M3Badge>
                  )}
                </div>
                <h3 className="font-bold text-sm text-[#191C1C]">100 Peticiones Simultáneas al Mismo Slot</h3>
                <p className="text-xs text-[#3F4948] leading-relaxed">
                  Dispara 100 peticiones en el mismo milisegundo. Valida que el mutex del servidor otorgue exactamente 1 HOLD (201) y 99 reciban 409 Conflict.
                </p>
                {testResults.find((t) => t.testId === 'test_7_concurrency_100' || t.id === 'concurrency') && (
                  <div className="p-3 bg-[#EEF2F1] rounded-xl text-[11px] font-mono text-[#191C1C] space-y-1">
                    <p className="font-bold">{testResults.find((t) => t.testId === 'test_7_concurrency_100' || t.id === 'concurrency')?.details || testResults.find((t) => t.testId === 'test_7_concurrency_100' || t.id === 'concurrency')?.message}</p>
                    <p className="text-[#6F7979]">Duración: {testResults.find((t) => t.testId === 'test_7_concurrency_100' || t.id === 'concurrency')?.durationMs} ms</p>
                  </div>
                )}
              </div>
              <M3Button
                variant="filled"
                size="small"
                fullWidth
                onClick={() => handleRunSingleTest('/api/tests/concurrency', 'test_7_concurrency_100')}
                disabled={singleRunning === 'test_7_concurrency_100' || suiteRunning}
                loading={singleRunning === 'test_7_concurrency_100'}
                icon={<RefreshCw className="w-3 h-3" />}
              >
                {singleRunning === 'test_7_concurrency_100' ? 'Ejecutando 100 reqs...' : 'Ejecutar Test de Concurrencia Extrema'}
              </M3Button>
            </M3Card>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB: AUDITORÍA & LOGS DE CORRELACIÓN       */}
      {/* ========================================== */}
      {activeTab === 'audit' && (
        <M3Card variant="elevated" className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#191C1C]">Log de Auditoría & Trazabilidad</h2>
              <p className="text-xs text-[#3F4948]">
                Eventos transaccionales con Correlation ID y transiciones de estado en tiempo real.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[#6F7979] absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por Correlation ID..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="text-xs border border-[#BEC9C8] rounded-xl pl-9 pr-3 py-2 bg-white outline-none w-64 focus:border-[#006A6B]"
                />
              </div>
              <M3Button
                variant="outlined"
                size="small"
                onClick={fetchAuditLogs}
                disabled={auditLoading}
                loading={auditLoading}
                icon={<RefreshCw className="w-3 h-3" />}
              >
                Refrescar
              </M3Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#BEC9C8]/40 rounded-2xl max-h-[500px]">
            <table className="w-full text-left text-xs text-[#191C1C]">
              <thead className="bg-[#FAFDFD] text-[#6F7979] font-bold border-b border-[#BEC9C8]/40 sticky top-0 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Correlation ID</th>
                  <th className="py-2.5 px-3">Evento</th>
                  <th className="py-2.5 px-3">Transición de Estado</th>
                  <th className="py-2.5 px-3">Detalle / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#BEC9C8]/30">
                {auditLogs
                  .filter((log) => {
                    if (!auditSearch) return true;
                    const q = auditSearch.toLowerCase();
                    return (
                      log.correlationId?.toLowerCase().includes(q) ||
                      log.event?.toLowerCase().includes(q) ||
                      log.targetId?.toLowerCase().includes(q)
                    );
                  })
                  .map((log) => (
                    <tr key={log.id} className="hover:bg-[#EEF2F1]/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#6F7979] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString('es-AR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[10px] bg-[#EEF2F1] text-[#191C1C] px-2 py-0.5 rounded font-bold">
                          {log.correlationId}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold">
                        <M3Badge
                          tone={
                            log.event.includes('APPROVED') || log.event.includes('CREATED')
                              ? 'success'
                              : log.event.includes('FAILED') || log.event.includes('EXPIRED') || log.event.includes('CANCELLED')
                              ? 'error'
                              : 'tertiary'
                          }
                          size="small"
                        >
                          {log.event}
                        </M3Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        {log.previousStatus || log.newStatus ? (
                          <span className="text-[11px] text-[#3F4948] font-mono">
                            {log.previousStatus || 'INIT'} → <strong className="text-[#191C1C]">{log.newStatus}</strong>
                          </span>
                        ) : (
                          <span className="text-[#6F7979]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] font-mono text-[#3F4948] max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </td>
                    </tr>
                  ))}

                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#6F7979]">
                      No hay registros de auditoría aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </M3Card>
      )}

      {/* ========================================== */}
      {/* TAB 3: PROFESIONALES                       */}
      {/* ========================================== */}
      {activeTab === 'professionals' && (
        <M3Card variant="elevated" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#191C1C]">Equipo Profesional</h2>
              <p className="text-xs text-[#3F4948]">
                Cada profesional cuenta con su propio calendario de Google Calendar y configuración de servicios.
              </p>
            </div>
            <M3Button
              variant="filled"
              size="small"
              onClick={() => {
                setEditingProf({
                  name: '',
                  title: 'Lic. en Kinesiología y Fisiatría',
                  specialty: '',
                  email: '',
                  phone: '',
                  googleCalendarEmail: '',
                  durationMinutes: 30,
                  price: 18500,
                  serviceIds: ['srv-kine-01'],
                  active: true
                });
                setShowProfModal(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Nuevo Profesional
            </M3Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {professionals.map((prof) => {
              return (
                <M3Card key={prof.id} variant="outlined" className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={prof.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150'}
                      alt={prof.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-2xl object-cover border border-[#BEC9C8]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-[#191C1C] truncate">{prof.name}</h3>
                        <M3Badge tone={prof.active ? 'success' : 'neutral'} size="small">
                          {prof.active ? 'Activo' : 'Inactivo'}
                        </M3Badge>
                      </div>
                      <p className="text-xs text-[#6F7979] truncate">{prof.title}</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#3F4948] line-clamp-2 italic">{prof.specialty}</p>

                  <div className="text-xs space-y-1 pt-2 border-t border-[#BEC9C8]/40">
                    <div className="flex justify-between text-[#3F4948]">
                      <span>Precio base:</span>
                      <span className="font-bold text-[#191C1C]">${prof.price.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex justify-between text-[#3F4948]">
                      <span>Duración slot:</span>
                      <span className="font-medium text-[#191C1C]">{prof.durationMinutes} min</span>
                    </div>
                  </div>

                  {/* Google Calendar Connection Status */}
                  <div className="bg-[#EEF2F1] p-2.5 rounded-xl border border-[#BEC9C8]/40 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#191C1C] flex items-center gap-1">
                        <CalendarCheck className="w-3.5 h-3.5 text-[#006A6B]" /> Google Calendar
                      </span>
                      <M3Badge tone="success" size="small">Conectado</M3Badge>
                    </div>
                    <p className="text-[11px] text-[#6F7979] font-mono truncate">
                      {prof.googleCalendarEmail || prof.email}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <M3Button
                      variant="text"
                      size="small"
                      onClick={() => {
                        setEditingProf(prof);
                        setShowProfModal(true);
                      }}
                      icon={<Edit2 className="w-3 h-3" />}
                    >
                      Editar
                    </M3Button>
                  </div>
                </M3Card>
              );
            })}
          </div>
        </M3Card>
      )}

      {/* ========================================== */}
      {/* TAB 4: SERVICIOS                           */}
      {/* ========================================== */}
      {activeTab === 'services' && (
        <M3Card variant="elevated" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#191C1C]">Catálogo de Servicios</h2>
              <p className="text-xs text-[#3F4948]">
                Configuración de prestaciones kinésicas, duraciones y aranceles.
              </p>
            </div>
            <M3Button
              variant="filled"
              size="small"
              onClick={() => {
                setEditingService({
                  name: '',
                  category: 'Kinesiología General',
                  description: '',
                  durationMinutes: 30,
                  price: 18500,
                  active: true
                });
                setShowServiceModal(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Nuevo Servicio
            </M3Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((srv) => (
              <M3Card key={srv.id} variant="outlined" className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <M3Badge tone="primary">{srv.category}</M3Badge>
                  <M3Badge tone={srv.active ? 'success' : 'neutral'} size="small">
                    {srv.active ? 'Activo' : 'Inactivo'}
                  </M3Badge>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-[#191C1C]">{srv.name}</h3>
                  <p className="text-xs text-[#3F4948] mt-1 line-clamp-2">{srv.description}</p>
                </div>

                <div className="pt-2 border-t border-[#BEC9C8]/40 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#6F7979] block text-[10px]">Duración</span>
                    <span className="font-semibold text-[#191C1C]">{srv.durationMinutes} minutos</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#6F7979] block text-[10px]">Precio</span>
                    <span className="font-bold text-[#006A6B] text-sm">${srv.price.toLocaleString('es-AR')}</span>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <M3Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setEditingService(srv);
                      setShowServiceModal(true);
                    }}
                    icon={<Edit2 className="w-3 h-3" />}
                  >
                    Editar
                  </M3Button>
                </div>
              </M3Card>
            ))}
          </div>
        </M3Card>
      )}

      {/* ========================================== */}
      {/* TAB 5: CONCURRENCIA & TEST LIVE            */}
      {/* ========================================== */}
      {activeTab === 'concurrency' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Concurrency Simulator */}
          <M3Card variant="elevated" className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#563E00] font-bold text-base">
              <Zap className="w-5 h-5" />
              <span>Simulador de Doble Reserva (Locks Atómicos)</span>
            </div>
            <p className="text-xs text-[#3F4948] leading-relaxed">
              Prueba de estrés que envía 2 peticiones concurrentes en el mismo milisegundo para reservar el mismo slot.
              El backend garantiza con su candado de transacción que sólo 1 paciente bloquea el turno y el otro recibe el mensaje explícito <em>"Este horario acaba de ser reservado. Elegí otro horario disponible."</em>
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <M3TextField
                label="Fecha"
                type="date"
                value={simDate}
                onChange={(e) => setSimDate(e.target.value)}
              />
              <M3TextField
                label="Horario"
                type="text"
                value={simTime}
                onChange={(e) => setSimTime(e.target.value)}
                placeholder="Ej: 10:30"
              />
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#3F4948] block mb-1">
                  Profesional
                </label>
                <select
                  value={simProfId}
                  onChange={(e) => setSimProfId(e.target.value)}
                  className="w-full p-2.5 border border-[#BEC9C8] rounded-xl bg-white text-xs outline-none"
                >
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#3F4948] block mb-1">
                  Servicio
                </label>
                <select
                  value={simServiceId}
                  onChange={(e) => setSimServiceId(e.target.value)}
                  className="w-full p-2.5 border border-[#BEC9C8] rounded-xl bg-white text-xs outline-none"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <M3Button
              variant="filled"
              size="medium"
              fullWidth
              onClick={handleRunConcurrencySimulation}
              disabled={simulating}
              loading={simulating}
              icon={<Zap className="w-4 h-4" />}
            >
              {simulating ? 'Ejecutando peticiones simultáneas...' : 'Disparar 2 Reservas Simultáneas'}
            </M3Button>

            {/* Results */}
            {simResults.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-[#191C1C]">Resultado de la Transacción:</h4>
                {simResults.map((r, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                      r.status === 'SUCCESS'
                        ? 'bg-[#C4EED0] border-[#0A5327]/30 text-[#0A5327]'
                        : 'bg-[#FFDAD6] border-[#BA1A1A]/30 text-[#BA1A1A]'
                    }`}
                  >
                    {r.status === 'SUCCESS' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">{r.name}: {r.status === 'SUCCESS' ? 'BLOQUEO CONCEDIDO' : 'RECHAZADO POR CONFLICTO'}</p>
                      <p className="text-[11px] mt-0.5">{r.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </M3Card>

          {/* Google Calendar Busy Event Injector */}
          <M3Card variant="elevated" className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#006A6B] font-bold text-base">
              <CalendarCheck className="w-5 h-5" />
              <span>Sincronización Google Calendar (Ocupar Horario)</span>
            </div>
            <p className="text-xs text-[#3F4948] leading-relaxed">
              Agregá un evento externo en el calendario del profesional para comprobar en vivo cómo el widget elimina ese horario de la disponibilidad inmediatamente.
            </p>

            <div className="space-y-3 text-xs">
              <M3TextField
                label="Título del Evento Externo"
                value={mockEventTitle}
                onChange={(e) => setMockEventTitle(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <M3TextField
                  label="Hora Inicio (HH:MM)"
                  value={mockEventStart}
                  onChange={(e) => setMockEventStart(e.target.value)}
                />
                <M3TextField
                  label="Hora Fin (HH:MM)"
                  value={mockEventEnd}
                  onChange={(e) => setMockEventEnd(e.target.value)}
                />
              </div>

              <M3Button
                variant="filled"
                size="medium"
                fullWidth
                onClick={handleAddMockBusyEvent}
              >
                Inyectar Bloque Ocupado en Google Calendar
              </M3Button>

              {mockEventMsg && (
                <p className="text-xs text-[#0A5327] bg-[#C4EED0] p-2.5 rounded-xl border border-[#0A5327]/30 text-center font-medium">
                  {mockEventMsg}
                </p>
              )}
            </div>
          </M3Card>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 6: CONFIGURACIÓN TENANT                */}
      {/* ========================================== */}
      {activeTab === 'settings' && organization && (
        <M3Card variant="elevated" className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#191C1C]">Configuración de Organización (Multi-Tenant)</h2>
            <p className="text-xs text-[#3F4948]">
              AkiNeuro es un tenant independiente en la arquitectura del sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <M3TextField
              label="Nombre de la Clínica"
              value={organization.name}
              onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
            />

            <M3TextField
              label="Teléfono / WhatsApp de la Clínica"
              value={organization.phone}
              onChange={(e) => setOrganization({ ...organization, phone: e.target.value })}
            />

            <M3TextField
              label="Dirección"
              value={organization.address}
              onChange={(e) => setOrganization({ ...organization, address: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-2">
              <M3TextField
                label="Moneda"
                value={organization.currency}
                disabled
              />
              <M3TextField
                label="Zona Horaria"
                value={organization.timeZone}
                disabled
              />
            </div>
          </div>

          {/* Integrations Keys Card */}
          <M3Card variant="filled" className="p-4 space-y-3">
            <h3 className="font-bold text-xs text-[#191C1C] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#006A6B]" />
              Credenciales de Pagos y Calendario (Backend Server-Side)
            </h3>
            
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[#6F7979] block">Mercado Pago Public Key:</span>
                <code className="bg-white px-2.5 py-1 rounded-lg border border-[#BEC9C8]/60 text-[#191C1C] block font-mono text-[11px]">
                  {organization.mercadoPagoPublicKey}
                </code>
              </div>
              <div>
                <span className="text-[#6F7979] block">Google Calendar OAuth & Service Account:</span>
                <span className="inline-flex items-center gap-1 text-[#0A5327] font-semibold bg-[#C4EED0] px-2.5 py-1 rounded-full border border-[#0A5327]/30 mt-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conexión API Activa
                </span>
              </div>
            </div>
          </M3Card>
        </M3Card>
      )}

      {/* MODAL: PROFESSIONAL */}
      <M3Dialog
        open={showProfModal && Boolean(editingProf)}
        onClose={() => setShowProfModal(false)}
        title={editingProf?.id ? 'Editar Profesional' : 'Nuevo Profesional'}
        icon={<UserCheck className="w-5 h-5" />}
        actions={
          <>
            <M3Button
              variant="text"
              size="small"
              onClick={() => setShowProfModal(false)}
            >
              Cancelar
            </M3Button>
            <M3Button
              variant="filled"
              size="small"
              onClick={handleSaveProfessional}
            >
              Guardar
            </M3Button>
          </>
        }
      >
        {editingProf && (
          <form onSubmit={handleSaveProfessional} className="space-y-3 text-xs pt-2">
            <M3TextField
              label="Nombre Completo *"
              required
              value={editingProf.name || ''}
              onChange={(e) => setEditingProf({ ...editingProf, name: e.target.value })}
            />

            <M3TextField
              label="Título y Matrícula *"
              required
              value={editingProf.title || ''}
              onChange={(e) => setEditingProf({ ...editingProf, title: e.target.value })}
            />

            <M3TextField
              label="Email de Google Calendar *"
              type="email"
              required
              value={editingProf.googleCalendarEmail || ''}
              onChange={(e) => setEditingProf({ ...editingProf, googleCalendarEmail: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-2">
              <M3TextField
                label="Precio ($ ARS) *"
                type="number"
                required
                value={editingProf.price || 18500}
                onChange={(e) => setEditingProf({ ...editingProf, price: Number(e.target.value) })}
              />
              <M3TextField
                label="Duración (min) *"
                type="number"
                required
                value={editingProf.durationMinutes || 30}
                onChange={(e) => setEditingProf({ ...editingProf, durationMinutes: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="prof-active"
                checked={editingProf.active ?? true}
                onChange={(e) => setEditingProf({ ...editingProf, active: e.target.checked })}
                className="accent-[#006A6B] w-4 h-4 rounded"
              />
              <label htmlFor="prof-active" className="font-semibold text-[#191C1C]">
                Profesional Activo
              </label>
            </div>
          </form>
        )}
      </M3Dialog>

      {/* MODAL: SERVICE */}
      <M3Dialog
        open={showServiceModal && Boolean(editingService)}
        onClose={() => setShowServiceModal(false)}
        title={editingService?.id ? 'Editar Servicio' : 'Nuevo Servicio'}
        icon={<Layers className="w-5 h-5" />}
        actions={
          <>
            <M3Button
              variant="text"
              size="small"
              onClick={() => setShowServiceModal(false)}
            >
              Cancelar
            </M3Button>
            <M3Button
              variant="filled"
              size="small"
              onClick={handleSaveService}
            >
              Guardar
            </M3Button>
          </>
        }
      >
        {editingService && (
          <form onSubmit={handleSaveService} className="space-y-3 text-xs pt-2">
            <M3TextField
              label="Nombre del Servicio *"
              required
              value={editingService.name || ''}
              onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
            />

            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F4948]">
                Descripción
              </label>
              <textarea
                rows={2}
                value={editingService.description || ''}
                onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                className="w-full p-2.5 border border-[#6F7979]/60 rounded-xl bg-white text-xs outline-none focus:border-[#006A6B] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <M3TextField
                label="Precio ($ ARS) *"
                type="number"
                required
                value={editingService.price || 18500}
                onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
              />
              <M3TextField
                label="Duración (min) *"
                type="number"
                required
                value={editingService.durationMinutes || 30}
                onChange={(e) => setEditingService({ ...editingService, durationMinutes: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="srv-active"
                checked={editingService.active ?? true}
                onChange={(e) => setEditingService({ ...editingService, active: e.target.checked })}
                className="accent-[#006A6B] w-4 h-4 rounded"
              />
              <label htmlFor="srv-active" className="font-semibold text-[#191C1C]">
                Servicio Activo
              </label>
            </div>
          </form>
        )}
      </M3Dialog>
    </div>
  );
};
