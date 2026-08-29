import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Plus,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clock,
  User,
  Mail,
  CalendarCheck,
  LogOut
} from 'lucide-react';
import {
  googleSignIn,
  logoutGoogle,
  initAuth,
  getAccessToken
} from '../lib/firebase';
import {
  listUserCalendars,
  listGoogleEvents,
  createGoogleEvent,
  deleteGoogleEvent,
  syncLiveGoogleEventsToBackend,
  GoogleCalendarItem,
  GoogleEventResource
} from '../services/googleCalendarService';
import {
  M3Button,
  M3TextField,
  M3Card,
  M3Badge,
  M3Dialog,
  M3Snackbar,
  M3Divider
} from './m3';
import type { Professional } from '../types';

interface GoogleCalendarManagerProps {
  professionals?: Professional[];
  onSyncCompleted?: () => void;
}

export const GoogleCalendarManager: React.FC<GoogleCalendarManagerProps> = ({
  professionals = [],
  onSyncCompleted
}) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarItem[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
  const [events, setEvents] = useState<GoogleEventResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // New Event Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('Consulta Médica AkiNeuro');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventStart, setNewEventStart] = useState('11:00');
  const [newEventEnd, setNewEventEnd] = useState('11:45');
  const [newEventPatientEmail, setNewEventPatientEmail] = useState('');
  const [newEventPatientName, setNewEventPatientName] = useState('');

  // Delete Confirmation Modal State (MANDATORY per Workspace skill guidelines)
  const [eventToDelete, setEventToDelete] = useState<GoogleEventResource | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        // onAuthFailure
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch calendars and events when token is present
  useEffect(() => {
    if (accessToken) {
      loadCalendarData(accessToken);
    }
  }, [accessToken, selectedCalendarId]);

  const loadCalendarData = async (token: string) => {
    try {
      setLoading(true);
      const [cals, evs] = await Promise.all([
        listUserCalendars(token).catch((err) => {
          console.warn('Could not list calendarList, fallback to primary:', err);
          return [{ id: 'primary', summary: 'Calendario Principal (Google)', primary: true }];
        }),
        listGoogleEvents(token, selectedCalendarId)
      ]);

      setCalendars(Array.isArray(cals) ? cals : []);
      setEvents(Array.isArray(evs) ? evs : []);
    } catch (err: any) {
      console.error('Error loading Google Calendar events:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'No se pudieron cargar los eventos de Google Calendar.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setStatusMessage(null);
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        setStatusMessage({
          type: 'success',
          text: `Conectado exitosamente con Google Calendar (${res.user.email})`
        });
        loadCalendarData(res.accessToken);
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'No se pudo completar el inicio de sesión con Google.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setCurrentUser(null);
    setAccessToken(null);
    setEvents([]);
    setCalendars([]);
    setStatusMessage({
      type: 'info',
      text: 'Sesión de Google Calendar cerrada correctamente.'
    });
  };

  // Sync real events from Google Calendar to clinic availability matrix
  const handleSyncToBackend = async () => {
    if (!events.length || !currentUser?.email) return;

    try {
      setSyncing(true);
      const matchedProf = professionals.find(
        (p) => p.email.toLowerCase() === currentUser.email.toLowerCase()
      ) || professionals[0];

      if (!matchedProf) {
        throw new Error('No se encontró un profesional asociado a la cuenta de Google conectada.');
      }

      const res = await syncLiveGoogleEventsToBackend(
        matchedProf.id,
        currentUser.email,
        events
      );

      setStatusMessage({
        type: 'success',
        text: `Sincronización completada. Se importaron ${res.syncedEventsCount} bloqueos/eventos para ${matchedProf.name}.`
      });

      if (onSyncCompleted) {
        onSyncCompleted();
      }
    } catch (err: any) {
      console.error('Sync to backend failed:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Falló la sincronización con la base de datos de AkiNeuro.'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Create new event in real Google Calendar
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    try {
      setLoading(true);
      const startIso = `${newEventDate}T${newEventStart}:00`;
      const endIso = `${newEventDate}T${newEventEnd}:00`;

      await createGoogleEvent(accessToken, selectedCalendarId, {
        summary: newEventTitle,
        description: `Consulta médica para ${newEventPatientName || 'Paciente'} (${newEventPatientEmail || 'Sin email'})`,
        startIso,
        endIso,
        location: 'AkiNeuro - Av. Santa Fe 3200, CABA',
        patientEmail: newEventPatientEmail,
        patientName: newEventPatientName
      });

      setShowCreateModal(false);
      setStatusMessage({
        type: 'success',
        text: `Evento "${newEventTitle}" creado exitosamente en Google Calendar.`
      });

      // Reload events & re-sync
      await loadCalendarData(accessToken);
      await handleSyncToBackend();
    } catch (err: any) {
      console.error('Error creating Google Calendar event:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'No se pudo crear el evento en Google Calendar.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete event with explicit confirmation
  const handleConfirmDelete = async () => {
    if (!accessToken || !eventToDelete) return;

    try {
      setDeleting(true);
      await deleteGoogleEvent(accessToken, selectedCalendarId, eventToDelete.id);
      setStatusMessage({
        type: 'success',
        text: `Evento "${eventToDelete.summary || 'Sin título'}" eliminado de Google Calendar.`
      });
      setEventToDelete(null);
      await loadCalendarData(accessToken);
      await handleSyncToBackend();
    } catch (err: any) {
      console.error('Error deleting Google event:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'No se pudo eliminar el evento de Google Calendar.'
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatEventTime = (dateTimeStr?: string, dateStr?: string) => {
    if (dateTimeStr) {
      const d = new Date(dateTimeStr);
      return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }
    if (dateStr) {
      return 'Todo el día';
    }
    return '--:--';
  };

  const formatEventDate = (dateTimeStr?: string, dateStr?: string) => {
    const raw = dateTimeStr || dateStr;
    if (!raw) return '';
    const d = new Date(raw);
    return d.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Auth Connection */}
      <M3Card variant="elevated" className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#D2E4FF] text-[#4A607C] flex items-center justify-center m3-elevation-1">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#191C1C]">Integración Google Calendar (Workspace)</h3>
                {currentUser ? (
                  <M3Badge tone="success" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                    Conectado en Vivo
                  </M3Badge>
                ) : (
                  <M3Badge tone="neutral">No Conectado</M3Badge>
                )}
              </div>
              <p className="text-xs text-[#3F4948]">
                Sincronización bidireccional de turnos y bloqueos de agenda con Google Calendar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <M3Button
                  variant="filled"
                  size="small"
                  onClick={handleSyncToBackend}
                  disabled={syncing || loading}
                  loading={syncing}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Sincronizar Disponibilidad
                </M3Button>
                <M3Button
                  variant="outlined"
                  size="small"
                  onClick={handleGoogleLogout}
                  icon={<LogOut className="w-3.5 h-3.5" />}
                >
                  Desconectar
                </M3Button>
              </>
            ) : (
              <M3Button
                variant="filled"
                size="medium"
                onClick={handleGoogleLogin}
                loading={loading}
                icon={<ShieldCheck className="w-4 h-4" />}
              >
                Conectar Cuenta Google Workspace
              </M3Button>
            )}
          </div>
        </div>

        {/* User profile row if logged in */}
        {currentUser && (
          <div className="mt-4 pt-4 border-t border-[#BEC9C8]/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#6F7979]">Profesional Google:</span>
              <span className="font-bold text-[#191C1C]">{currentUser.displayName || currentUser.email}</span>
              <span className="text-[#6F7979]">({currentUser.email})</span>
            </div>

            {/* Calendar Selector */}
            {calendars.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[#6F7979] font-medium">Calendario:</span>
                <select
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value)}
                  className="px-3 py-1 text-xs rounded-xl border border-[#BEC9C8] bg-white text-[#191C1C] focus:border-[#006A6B] outline-none cursor-pointer"
                >
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.summary} {c.primary ? '(Principal)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </M3Card>

      {/* Status Notification */}
      {statusMessage && (
        <M3Snackbar
          message={statusMessage.text}
          type={statusMessage.type}
          onClose={() => setStatusMessage(null)}
        />
      )}

      {/* Events Table and Controls */}
      {currentUser && (
        <M3Card variant="outlined" className="overflow-hidden">
          <div className="p-4 px-6 bg-[#EEF2F1] border-b border-[#BEC9C8]/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#006A6B]" />
              <h4 className="text-sm font-bold text-[#191C1C]">
                Eventos y Turnos en Google Calendar ({events.length})
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <M3Button
                variant="outlined"
                size="small"
                onClick={() => accessToken && loadCalendarData(accessToken)}
                disabled={loading}
                icon={<RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />}
              >
                Actualizar
              </M3Button>
              <M3Button
                variant="filled"
                size="small"
                onClick={() => setShowCreateModal(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Nuevo Evento Google
              </M3Button>
            </div>
          </div>

          {/* Table List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFDFD] border-b border-[#BEC9C8]/40 text-[#6F7979] uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Título / Resumen</th>
                  <th className="px-6 py-3.5">Fecha</th>
                  <th className="px-6 py-3.5">Horario</th>
                  <th className="px-6 py-3.5">Asistentes / Paciente</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#BEC9C8]/30">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-[#6F7979]">
                      {loading ? 'Cargando eventos de Google Calendar...' : 'No hay eventos agendados para este período en tu Google Calendar.'}
                    </td>
                  </tr>
                ) : (
                  events.map((ev) => {
                    const isAkiNeuro = ev.summary?.includes('[AkiNeuro]') || ev.description?.includes('AkiNeuro');
                    return (
                      <tr key={ev.id} className="hover:bg-[#EEF2F1]/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#191C1C]">{ev.summary || '(Sin título)'}</span>
                            {isAkiNeuro && (
                              <M3Badge tone="primary" size="small">
                                AkiNeuro
                              </M3Badge>
                            )}
                          </div>
                          {ev.location && (
                            <span className="text-[11px] text-[#6F7979] block truncate max-w-xs">
                              {ev.location}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 font-medium text-[#191C1C]">
                          {formatEventDate(ev.start?.dateTime, ev.start?.date)}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-[#006A6B] font-bold">
                          {formatEventTime(ev.start?.dateTime, ev.start?.date)} - {formatEventTime(ev.end?.dateTime, ev.end?.date)}
                        </td>
                        <td className="px-6 py-3.5 text-[#3F4948]">
                          {ev.attendees && ev.attendees.length > 0 ? (
                            ev.attendees.map((a) => a.email).join(', ')
                          ) : (
                            <span className="text-[#6F7979] italic">Sin invitados</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-2">
                          {ev.htmlLink && (
                            <a
                              href={ev.htmlLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex p-1 text-[#6F7979] hover:text-[#006A6B] rounded-lg transition-colors"
                              title="Abrir en Google Calendar Web"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setEventToDelete(ev)}
                            className="inline-flex p-1 text-[#BA1A1A] hover:bg-[#FFDAD6] rounded-lg transition-colors cursor-pointer"
                            title="Eliminar de Google Calendar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </M3Card>
      )}

      {/* CREATE EVENT MODAL */}
      <M3Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Agendar Evento en Google Calendar"
        icon={<CalendarIcon className="w-5 h-5" />}
        actions={
          <>
            <M3Button
              variant="text"
              size="small"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </M3Button>
            <M3Button
              variant="filled"
              size="small"
              onClick={handleCreateEvent}
              loading={loading}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Guardar en Google Calendar
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleCreateEvent} className="space-y-4 pt-2">
          <M3TextField
            label="Título de la consulta *"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <M3TextField
              label="Fecha *"
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              required
            />
            <M3TextField
              label="Hora inicio *"
              type="time"
              value={newEventStart}
              onChange={(e) => setNewEventStart(e.target.value)}
              required
            />
            <M3TextField
              label="Hora fin *"
              type="time"
              value={newEventEnd}
              onChange={(e) => setNewEventEnd(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <M3TextField
              label="Nombre del Paciente"
              placeholder="Ej: Marcos Gómez"
              value={newEventPatientName}
              onChange={(e) => setNewEventPatientName(e.target.value)}
            />
            <M3TextField
              label="Email del Paciente"
              type="email"
              placeholder="marcos@gmail.com"
              value={newEventPatientEmail}
              onChange={(e) => setNewEventPatientEmail(e.target.value)}
            />
          </div>
        </form>
      </M3Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <M3Dialog
        open={Boolean(eventToDelete)}
        onClose={() => setEventToDelete(null)}
        title="Confirmar eliminación de Google Calendar"
        icon={<AlertCircle className="w-5 h-5 text-[#BA1A1A]" />}
        actions={
          <>
            <M3Button
              variant="text"
              size="small"
              onClick={() => setEventToDelete(null)}
              disabled={deleting}
            >
              Cancelar
            </M3Button>
            <M3Button
              variant="filled"
              size="small"
              onClick={handleConfirmDelete}
              loading={deleting}
              className="bg-[#BA1A1A] text-white hover:bg-[#93000A]"
            >
              Eliminar Definitivamente
            </M3Button>
          </>
        }
      >
        <p className="text-sm text-[#3F4948]">
          ¿Estás seguro de que deseas eliminar permanentemente el evento{' '}
          <strong className="text-[#191C1C]">"{eventToDelete?.summary || 'Sin título'}"</strong> de Google Calendar?
        </p>
        <p className="text-xs text-[#6F7979] mt-2">
          Esta acción liberará el horario en la matriz de turnos de AkiNeuro.
        </p>
      </M3Dialog>
    </div>
  );
};
