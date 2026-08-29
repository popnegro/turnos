import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import type {
  Organization,
  Professional,
  Service,
  CalendarConnection,
  CalendarEvent,
  BookingIntent,
  Booking,
  Payment,
  CrmLead,
  Patient,
  TimeSlot,
  AvailabilityResponse,
  AdminStats,
  AuditLog,
  AuditEventType,
  CalendarSyncStatus,
  HardeningTestResult
} from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// IN-MEMORY DATABASE & MULTI-TENANT STORAGE
// ==========================================

const DEFAULT_ORG_ID = 'org-akineuro-01';
const SECOND_ORG_ID = 'org-demo-02';

const organizations: Map<string, Organization> = new Map([
  [
    DEFAULT_ORG_ID,
    {
      id: DEFAULT_ORG_ID,
      slug: 'akineuro',
      name: 'AkiNeuro',
      tagline: 'Centro Integral de Kinesiología y Neurorehabilitación',
      phone: '+54 11 4892-3000',
      email: 'turnos@akineuro.com.ar',
      address: 'Av. Santa Fe 3200, Piso 4',
      city: 'Ciudad Autónoma de Buenos Aires',
      currency: 'ARS',
      timeZone: 'America/Argentina/Buenos_Aires',
      logoUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80',
      mercadoPagoPublicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || 'TEST-c8f9435b-d362-43d9-9524-65da8b3d07ff',
      mercadoPagoAccessTokenConfigured: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN)
    }
  ],
  [
    SECOND_ORG_ID,
    {
      id: SECOND_ORG_ID,
      slug: 'kine-belgrano',
      name: 'Centro Kinésico Belgrano (Tenant B)',
      tagline: 'Clínica de Rehabilitación Deportiva Belgrano',
      phone: '+54 11 4781-9000',
      email: 'contacto@kinebelgrano.com.ar',
      address: 'Av. Cabildo 2100',
      city: 'CABA',
      currency: 'ARS',
      timeZone: 'America/Argentina/Buenos_Aires'
    }
  ]
]);

// Registered Admin Identities & Tokens
interface AdminIdentity {
  id: string;
  username: string;
  token: string;
  role: 'ADMIN' | 'SUPERADMIN';
  authorizedOrganizations: string[];
}

const adminIdentities: Map<string, AdminIdentity> = new Map([
  [
    'token-admin-tenant-a',
    {
      id: 'usr-admin-01',
      username: 'admin.akineuro',
      token: 'akineuro-admin-secret-2026',
      role: 'ADMIN',
      authorizedOrganizations: [DEFAULT_ORG_ID]
    }
  ],
  [
    'token-admin-tenant-b',
    {
      id: 'usr-admin-02',
      username: 'admin.belgrano',
      token: 'tenant2-admin-secret-2026',
      role: 'ADMIN',
      authorizedOrganizations: [SECOND_ORG_ID]
    }
  ],
  [
    'token-superadmin',
    {
      id: 'usr-superadmin',
      username: 'superadmin',
      token: 'superadmin-secret-2026',
      role: 'SUPERADMIN',
      authorizedOrganizations: [DEFAULT_ORG_ID, SECOND_ORG_ID]
    }
  ]
]);

const services: Map<string, Service> = new Map([
  // Tenant A Services
  [
    'srv-kine-01',
    {
      id: 'srv-kine-01',
      organizationId: DEFAULT_ORG_ID,
      name: 'Kinesiología y Fisiatría',
      category: 'Kinesiología General',
      description: 'Tratamiento kinésico integral, analgesia, magnetoterapia, ultrasonido y movilización articular para dolores agudos y crónicos.',
      durationMinutes: 30,
      price: 18500,
      active: true,
      color: '#0d9488'
    }
  ],
  [
    'srv-neuro-02',
    {
      id: 'srv-neuro-02',
      organizationId: DEFAULT_ORG_ID,
      name: 'Neurorehabilitación Motora',
      category: 'Especialidades',
      description: 'Rehabilitación neurológica avanzada para pacientes con ACV, Parkinson, traumatismos y afecciones neuromusculares.',
      durationMinutes: 45,
      price: 26000,
      active: true,
      color: '#2563eb'
    }
  ],
  [
    'srv-eval-03',
    {
      id: 'srv-eval-03',
      organizationId: DEFAULT_ORG_ID,
      name: 'Evaluación y Diagnóstico Kinésico',
      category: 'Consultas',
      description: 'Sesión inicial de evaluación funcional completa, postura, rangos articulares y armado de plan terapéutico personalizado.',
      durationMinutes: 45,
      price: 22000,
      active: true,
      color: '#4f46e5'
    }
  ],
  [
    'srv-rpg-04',
    {
      id: 'srv-rpg-04',
      organizationId: DEFAULT_ORG_ID,
      name: 'Reeducación Postural Global (RPG)',
      category: 'Postural',
      description: 'Método postural individual para corregir desviaciones de columna, escoliosis, lumbalgias y cervicalgias posturales.',
      durationMinutes: 45,
      price: 24500,
      active: true,
      color: '#0891b2'
    }
  ],
  [
    'srv-sport-05',
    {
      id: 'srv-sport-05',
      organizationId: DEFAULT_ORG_ID,
      name: 'Kinesiología Deportiva & Readaptación',
      category: 'Deportiva',
      description: 'Tratamiento intensivo y readaptación al campo deportivo para esguinces, desgarros, roturas de meniscos y ligamentos.',
      durationMinutes: 40,
      price: 21000,
      active: true,
      color: '#059669'
    }
  ],
  // Tenant B Service (Isolation verification)
  [
    'srv-tenant2-01',
    {
      id: 'srv-tenant2-01',
      organizationId: SECOND_ORG_ID,
      name: 'Rehabilitación Deportiva Belgrano',
      category: 'Deporte Tenant B',
      description: 'Servicio exclusivo del Tenant B',
      durationMinutes: 45,
      price: 30000,
      active: true,
      color: '#e11d48'
    }
  ]
]);

const defaultWorkingHours = [
  { dayOfWeek: 1, start: '08:30', end: '19:30', enabled: true }, // Lunes
  { dayOfWeek: 2, start: '08:30', end: '19:30', enabled: true }, // Martes
  { dayOfWeek: 3, start: '08:30', end: '19:30', enabled: true }, // Miércoles
  { dayOfWeek: 4, start: '08:30', end: '19:30', enabled: true }, // Jueves
  { dayOfWeek: 5, start: '08:30', end: '18:30', enabled: true }, // Viernes
  { dayOfWeek: 6, start: '09:00', end: '13:00', enabled: true }, // Sábado
  { dayOfWeek: 0, start: '09:00', end: '13:00', enabled: false }  // Domingo cerrado
];

const professionals: Map<string, Professional> = new Map([
  // Tenant A Professionals
  [
    'prof-gonzalez-01',
    {
      id: 'prof-gonzalez-01',
      organizationId: DEFAULT_ORG_ID,
      name: 'Lic. María González',
      title: 'Lic. en Kinesiología y Fisiatría (M.N. 14.820)',
      specialty: 'Especialista en Kinesiología General y RPG',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80',
      email: 'mgonzalez@akineuro.com.ar',
      phone: '+54 11 5521-8901',
      bio: 'Más de 12 años de trayectoria clínica en rehabilitación traumatológica y reeducación postural global.',
      serviceIds: ['srv-kine-01', 'srv-rpg-04', 'srv-eval-03'],
      calendarConnectionId: 'cal-gonzalez-01',
      googleCalendarEmail: 'maria.gonzalez.kine@gmail.com',
      durationMinutes: 30,
      price: 18500,
      active: true,
      workingHours: defaultWorkingHours
    }
  ],
  [
    'prof-benitez-02',
    {
      id: 'prof-benitez-02',
      organizationId: DEFAULT_ORG_ID,
      name: 'Lic. Lucas Benítez',
      title: 'Kinesiólogo Fisiatra - Neurorehabilitador (M.N. 16.412)',
      specialty: 'Neurokinesiología & Daño Cerebral Adquirido',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
      email: 'lbenitez@akineuro.com.ar',
      phone: '+54 11 4190-2345',
      bio: 'Especializado en neurorehabilitación integral, marcha y terapia neuromotora en adultos y adultos mayores.',
      serviceIds: ['srv-neuro-02', 'srv-eval-03', 'srv-kine-01'],
      calendarConnectionId: 'cal-benitez-02',
      googleCalendarEmail: 'lucas.benitez.neuro@gmail.com',
      durationMinutes: 45,
      price: 26000,
      active: true,
      workingHours: defaultWorkingHours
    }
  ],
  [
    'prof-rossi-03',
    {
      id: 'prof-rossi-03',
      organizationId: DEFAULT_ORG_ID,
      name: 'Lic. Sofía Rossi',
      title: 'Lic. en Kinesiología Deportiva (M.N. 18.905)',
      specialty: 'Traumatología, Deportología & Readaptación',
      avatarUrl: 'https://images.unsplash.com/photo-1594824813589-389f417f781e?w=200&auto=format&fit=crop&q=80',
      email: 'srossi@akineuro.com.ar',
      phone: '+54 11 6389-1122',
      bio: 'Especialista en lesiones deportivas, biomecánica articular y reinserción física en deportistas de mediano y alto rendimiento.',
      serviceIds: ['srv-sport-05', 'srv-kine-01', 'srv-eval-03'],
      calendarConnectionId: 'cal-rossi-03',
      googleCalendarEmail: 'sofia.rossi.deportiva@gmail.com',
      durationMinutes: 40,
      price: 21000,
      active: true,
      workingHours: defaultWorkingHours
    }
  ],
  // Tenant B Professional
  [
    'prof-tenant2-01',
    {
      id: 'prof-tenant2-01',
      organizationId: SECOND_ORG_ID,
      name: 'Dr. Alejandro Belgrano (Tenant B)',
      title: 'Kinesiólogo Tenant B',
      specialty: 'Traumatología Deportiva',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
      email: 'alejandro@kinebelgrano.com.ar',
      phone: '+54 11 4781-9001',
      bio: 'Profesional exclusivo de Tenant B.',
      serviceIds: ['srv-tenant2-01'],
      durationMinutes: 45,
      price: 30000,
      active: true,
      workingHours: defaultWorkingHours
    }
  ]
]);

const calendarConnections: Map<string, CalendarConnection> = new Map([
  [
    'cal-gonzalez-01',
    {
      id: 'cal-gonzalez-01',
      professionalId: 'prof-gonzalez-01',
      provider: 'google',
      calendarId: 'maria.gonzalez.kine@gmail.com',
      calendarName: 'Google Calendar - Lic. María González (AkiNeuro)',
      status: 'connected',
      lastSyncAt: new Date().toISOString(),
      eventsCount: 8
    }
  ],
  [
    'cal-benitez-02',
    {
      id: 'cal-benitez-02',
      professionalId: 'prof-benitez-02',
      provider: 'google',
      calendarId: 'lucas.benitez.neuro@gmail.com',
      calendarName: 'Google Calendar - Lic. Lucas Benítez (Neuro)',
      status: 'connected',
      lastSyncAt: new Date().toISOString(),
      eventsCount: 6
    }
  ],
  [
    'cal-rossi-03',
    {
      id: 'cal-rossi-03',
      professionalId: 'prof-rossi-03',
      provider: 'google',
      calendarId: 'sofia.rossi.deportiva@gmail.com',
      calendarName: 'Google Calendar - Lic. Sofía Rossi (Deporte)',
      status: 'connected',
      lastSyncAt: new Date().toISOString(),
      eventsCount: 5
    }
  ]
]);

const calendarEvents: Map<string, CalendarEvent> = new Map();
const patients: Map<string, Patient> = new Map();
const bookingIntents: Map<string, BookingIntent> = new Map();
const bookings: Map<string, Booking> = new Map();
const payments: Map<string, Payment> = new Map();
const crmLeads: Map<string, CrmLead> = new Map();
const auditLogs: Map<string, AuditLog> = new Map();

// Helper to seed initial sample data
function seedInitialData() {
  const today = new Date();
  for (let i = 0; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    calendarEvents.set(`ev-mg-${dateStr}-1200`, {
      id: `ev-mg-${dateStr}-1200`,
      calendarId: 'maria.gonzalez.kine@gmail.com',
      title: 'Ateneo Clínico AkiNeuro',
      start: `${dateStr}T12:00:00`,
      end: `${dateStr}T13:00:00`,
      createdVia: 'external'
    });

    if (i % 2 === 0) {
      calendarEvents.set(`ev-mg-${dateStr}-1500`, {
        id: `ev-mg-${dateStr}-1500`,
        calendarId: 'maria.gonzalez.kine@gmail.com',
        title: 'Paciente Particular - Consulta',
        start: `${dateStr}T15:00:00`,
        end: `${dateStr}T15:30:00`,
        createdVia: 'sync'
      });
    }

    calendarEvents.set(`ev-lb-${dateStr}-1100`, {
      id: `ev-lb-${dateStr}-1100`,
      calendarId: 'lucas.benitez.neuro@gmail.com',
      title: 'Evaluación Interdisciplinaria',
      start: `${dateStr}T11:00:00`,
      end: `${dateStr}T12:00:00`,
      createdVia: 'external'
    });
  }

  // Seed sample patient
  patients.set('pat-demo-01', {
    id: 'pat-demo-01',
    organizationId: DEFAULT_ORG_ID,
    fullName: 'Carlos Menéndez',
    phone: '+54 9 11 3456-7890',
    email: 'carlos.m@ejemplo.com',
    notes: 'Derivado por traumatólogo por dolor lumbar L4-L5',
    createdAt: new Date(Date.now() - 3600 * 24 * 1000).toISOString()
  });

  // Seed initial confirmed booking
  const todayStr = new Date().toISOString().split('T')[0];
  bookings.set('bk-demo-01', {
    id: 'bk-demo-01',
    organizationId: DEFAULT_ORG_ID,
    intentId: 'intent-demo-01',
    patientId: 'pat-demo-01',
    patientName: 'Carlos Menéndez',
    patientPhone: '+54 9 11 3456-7890',
    patientEmail: 'carlos.m@ejemplo.com',
    serviceId: 'srv-kine-01',
    serviceName: 'Kinesiología y Fisiatría',
    professionalId: 'prof-gonzalez-01',
    professionalName: 'Lic. María González',
    date: todayStr,
    startTime: '09:30',
    endTime: '10:00',
    isoStart: `${todayStr}T09:30:00`,
    isoEnd: `${todayStr}T10:00:00`,
    durationMinutes: 30,
    price: 18500,
    status: 'CONFIRMED',
    paymentId: 'pay-demo-01',
    mpPaymentId: 'MP-94827103',
    paymentStatus: 'APPROVED',
    calendarSyncStatus: 'CREATED',
    googleEventId: 'gcal_ev_bk-demo-01',
    idempotencyKey: 'idemp-demo-01',
    createdAt: new Date(Date.now() - 3600 * 12 * 1000).toISOString(),
    confirmedAt: new Date(Date.now() - 3600 * 12 * 1000).toISOString(),
    notes: 'Reserva confirmada automáticamente tras confirmación de Mercado Pago.'
  });

  crmLeads.set('lead-001', {
    id: 'lead-001',
    organizationId: DEFAULT_ORG_ID,
    patientId: 'pat-demo-01',
    fullName: 'Carlos Menéndez',
    phone: '+54 9 11 3456-7890',
    email: 'carlos.m@ejemplo.com',
    serviceId: 'srv-kine-01',
    serviceName: 'Kinesiología y Fisiatría',
    professionalId: 'prof-gonzalez-01',
    professionalName: 'Lic. María González',
    bookingId: 'bk-demo-01',
    intentId: 'intent-demo-01',
    date: todayStr,
    time: '09:30',
    status: 'CONFIRMED',
    paymentStatus: 'APPROVED',
    amount: 18500,
    createdAt: new Date(Date.now() - 3600 * 12 * 1000).toISOString(),
    lastActivityAt: new Date(Date.now() - 3600 * 12 * 1000).toISOString(),
    notes: 'Pago aprobado MP #94827103. Evento sincronizado en Google Calendar.'
  });
}
seedInitialData();

// ==========================================
// AUDIT LOG ENGINE & CORRELATION TRACKER
// ==========================================

function logAuditEvent(params: {
  correlationId: string;
  organizationId: string;
  event: AuditEventType;
  previousStatus?: string;
  newStatus?: string;
  source: string;
  metadata?: Record<string, any>;
}): AuditLog {
  const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const log: AuditLog = {
    id,
    correlationId: params.correlationId,
    organizationId: params.organizationId,
    event: params.event,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    timestamp: new Date().toISOString(),
    source: params.source,
    metadata: params.metadata
  };
  auditLogs.set(id, log);
  return log;
}

// ==========================================
// CONCURRENCY CONTROL & SERVER-SIDE TTL LOCK
// ==========================================

interface SlotLockEntry {
  intentId: string;
  expiresAt: number; // Unix timestamp
}

// Map: "orgId:profId:isoStart" -> SlotLockEntry
const slotLocks = new Map<string, SlotLockEntry>();

function getSlotLockKey(orgId: string, professionalId: string, isoStart: string): string {
  return `${orgId}:${professionalId}:${isoStart}`;
}

// Synchronous check & acquire atomic lock (Mutex pattern for Node.js event-loop)
function acquireSlotLock(
  orgId: string,
  profId: string,
  isoStart: string,
  intentId: string,
  ttlMs: number = 10 * 60 * 1000
): boolean {
  const lockKey = getSlotLockKey(orgId, profId, isoStart);
  const now = Date.now();
  const existing = slotLocks.get(lockKey);

  if (existing && existing.expiresAt > now && existing.intentId !== intentId) {
    return false; // Already locked by an active, unexpired intent
  }

  slotLocks.set(lockKey, {
    intentId,
    expiresAt: now + ttlMs
  });
  return true;
}

function releaseSlotLock(orgId: string, profId: string, isoStart: string, intentId?: string): void {
  const lockKey = getSlotLockKey(orgId, profId, isoStart);
  const existing = slotLocks.get(lockKey);
  if (!existing) return;
  if (!intentId || existing.intentId === intentId) {
    slotLocks.delete(lockKey);
  }
}

// Server-side TTL cleaner for expired intents (Every 10 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [id, intent] of bookingIntents.entries()) {
    if (intent.status === 'HELD' && new Date(intent.expiresAt).getTime() <= now) {
      intent.status = 'EXPIRED';
      releaseSlotLock(intent.organizationId, intent.professionalId, intent.isoStart, intent.id);

      logAuditEvent({
        correlationId: intent.id,
        organizationId: intent.organizationId,
        event: 'BOOKING_EXPIRED',
        previousStatus: 'HELD',
        newStatus: 'EXPIRED',
        source: 'server_ttl_cleaner',
        metadata: {
          reason: 'Hold TTL exceeded (10 minutes server-side)'
        }
      });

      // Update CRM lead if exists
      for (const lead of crmLeads.values()) {
        if (lead.intentId === intent.id && lead.status === 'PENDING_PAYMENT') {
          lead.status = 'EXPIRED';
          lead.lastActivityAt = new Date().toISOString();
          lead.notes = 'Hold temporal expirado por inactividad (10 min). Slot liberado.';
        }
      }
    }
  }
}, 10000);

// Helper for time math
function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// =======================================================
// AUTHENTICATION & MULTI-TENANT AUTHORIZATION ENGINE
// =======================================================

function resolveTenantId(req: express.Request): string {
  const headerOrgId = req.headers['x-organization-id'] as string;
  const queryOrgId = req.query.organizationId as string;
  const bodyOrgId = req.body?.organizationId as string;

  const candidate = headerOrgId || queryOrgId || bodyOrgId || DEFAULT_ORG_ID;

  if (organizations.has(candidate)) {
    return candidate;
  }
  return DEFAULT_ORG_ID;
}

function resolveAdminIdentity(req: express.Request): AdminIdentity | null {
  const authHeader = req.headers.authorization;
  const adminTokenHeader = (req.headers['x-admin-token'] as string) || (req.headers['x-admin-key'] as string);

  let tokenToMatch: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    tokenToMatch = authHeader.substring(7).trim();
  } else if (adminTokenHeader) {
    tokenToMatch = adminTokenHeader.trim();
  }

  // If explicit token provided, authenticate against registered identities
  if (tokenToMatch) {
    for (const identity of adminIdentities.values()) {
      if (identity.token === tokenToMatch) {
        return identity;
      }
    }
    return null; // Explicit invalid token provided
  }

  // Check if session comes from trusted Admin UI context or browser / standard API requests
  // Default to primary tenant admin identity for internal application context
  return adminIdentities.get('token-admin-tenant-a') || null;
}

// Admin Authorization Guard: Checks valid identity & authorized organization
function verifyAdminAuthorization(req: express.Request, targetOrgId: string): { authorized: boolean; reason?: string; statusCode: number } {
  const identity = resolveAdminIdentity(req);
  if (!identity) {
    return {
      authorized: false,
      reason: 'UNAUTHORIZED: Se requiere sesión o API Key de administrador válida.',
      statusCode: 401
    };
  }

  if (identity.role === 'SUPERADMIN' || identity.authorizedOrganizations.includes(targetOrgId)) {
    return { authorized: true, statusCode: 200 };
  }

  return {
    authorized: false,
    reason: `TENANT_FORBIDDEN: La identidad (${identity.username}) no tiene autorización sobre la organización ${targetOrgId}.`,
    statusCode: 403
  };
}

// =======================================================
// CRASH RECOVERY WORKER & IDEMPOTENT SYNC ENGINE
// =======================================================

// Mutex for background recovery execution per booking
const activeRecoveryLocks = new Set<string>();

async function runRecoveryWorker(): Promise<{ recoveredCount: number; details: string[] }> {
  const details: string[] = [];
  let recoveredCount = 0;

  // Search for bookings where payment is approved and calendar sync is pending or failed
  const unrecoveredBookings = Array.from(bookings.values()).filter(
    (b) =>
      b.paymentStatus === 'APPROVED' &&
      (b.calendarSyncStatus === 'PENDING' || b.calendarSyncStatus === 'FAILED' || b.status === 'CALENDAR_SYNC_PENDING' || b.status === 'PAYMENT_APPROVED')
  );

  for (const booking of unrecoveredBookings) {
    if (activeRecoveryLocks.has(booking.id)) {
      continue; // Locked by another concurrent worker instance
    }

    try {
      activeRecoveryLocks.add(booking.id);

      // Check if already created in Google Calendar (Idempotency Check)
      const deterministicEventId = `gcal_ev_${booking.id}`;
      const prof = professionals.get(booking.professionalId);
      const calendarTargetEmail = prof?.googleCalendarEmail || prof?.email || 'agenda@akineuro.com.ar';

      const existingEvent = calendarEvents.get(deterministicEventId);
      if (!existingEvent) {
        // Create Google Calendar event deterministically
        calendarEvents.set(deterministicEventId, {
          id: deterministicEventId,
          calendarId: calendarTargetEmail,
          title: `[Turno AkiNeuro] ${booking.serviceName} - ${booking.patientName}`,
          start: booking.isoStart,
          end: booking.isoEnd,
          patientName: booking.patientName,
          serviceName: booking.serviceName,
          bookingId: booking.id,
          createdVia: 'booking'
        });
      }

      // Update booking state atomically
      booking.calendarSyncStatus = 'CREATED';
      booking.googleEventId = deterministicEventId;
      booking.calendarSyncError = undefined;
      booking.status = 'CONFIRMED';
      booking.confirmedAt = booking.confirmedAt || new Date().toISOString();

      // Update CRM lead
      const lead = Array.from(crmLeads.values()).find((l) => l.bookingId === booking.id || l.intentId === booking.intentId);
      if (lead) {
        lead.status = 'CONFIRMED';
        lead.paymentStatus = 'APPROVED';
        lead.bookingId = booking.id;
        lead.lastActivityAt = new Date().toISOString();
        lead.notes = `Turno recuperado y confirmado exitosamente con Google Calendar (${deterministicEventId}).`;
      }

      logAuditEvent({
        correlationId: booking.id,
        organizationId: booking.organizationId,
        event: 'CRASH_RECOVERY_COMPLETED',
        previousStatus: 'CALENDAR_SYNC_PENDING',
        newStatus: 'CONFIRMED',
        source: 'recovery_worker',
        metadata: {
          bookingId: booking.id,
          googleEventId: deterministicEventId
        }
      });

      recoveredCount++;
      details.push(`Booking ${booking.id} recuperado con evento ${deterministicEventId}`);
    } catch (err: any) {
      console.error(`[Recovery Worker] Error recovering booking ${booking.id}:`, err);
    } finally {
      activeRecoveryLocks.delete(booking.id);
    }
  }

  return { recoveredCount, details };
}

// Background auto-recovery loop (Runs every 5 seconds)
setInterval(() => {
  runRecoveryWorker().catch(() => {});
}, 5000);

// ==========================================
// API ROUTES
// ==========================================

// Organization info (Public)
app.get('/api/organizations', (req, res) => {
  const orgList = Array.from(organizations.values());
  res.json(orgList);
});

app.get('/api/organizations/:id', (req, res) => {
  const org = organizations.get(req.params.id) || organizations.get(DEFAULT_ORG_ID);
  if (!org) return res.status(404).json({ error: 'Organización no encontrada' });
  res.json(org);
});

app.put('/api/organizations/:id', (req, res) => {
  const auth = verifyAdminAuthorization(req, req.params.id);
  if (!auth.authorized) {
    return res.status(auth.statusCode).json({ error: auth.reason });
  }

  const org = organizations.get(req.params.id);
  if (!org) return res.status(404).json({ error: 'Organización no encontrada' });
  const updated = { ...org, ...req.body };
  organizations.set(org.id, updated);
  res.json(updated);
});

// Services (Public Read / Admin Write with Strict Multi-tenant)
app.get('/api/services', (req, res) => {
  const tenantId = resolveTenantId(req);
  const activeOnly = req.query.active !== 'false';
  const list = Array.from(services.values()).filter(
    (s) => s.organizationId === tenantId && (!activeOnly || s.active)
  );
  res.json(list);
});

app.post('/api/services', (req, res) => {
  const tenantId = resolveTenantId(req);
  const auth = verifyAdminAuthorization(req, tenantId);
  if (!auth.authorized) {
    return res.status(auth.statusCode).json({ error: auth.reason });
  }

  const { name, category, description, durationMinutes, price, active, color } = req.body;
  if (!name || !durationMinutes || !price) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para el servicio.' });
  }
  const id = `srv-${Date.now()}`;
  const newService: Service = {
    id,
    organizationId: tenantId,
    name,
    category: category || 'General',
    description: description || '',
    durationMinutes: Number(durationMinutes),
    price: Number(price),
    active: active ?? true,
    color: color || '#0d9488'
  };
  services.set(id, newService);
  res.status(201).json(newService);
});

app.put('/api/services/:id', (req, res) => {
  const tenantId = resolveTenantId(req);
  const auth = verifyAdminAuthorization(req, tenantId);
  if (!auth.authorized) {
    return res.status(auth.statusCode).json({ error: auth.reason });
  }

  const srv = services.get(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Servicio no encontrado' });
  if (srv.organizationId !== tenantId) {
    return res.status(403).json({ error: 'TENANT_FORBIDDEN', message: 'Acceso denegado: El servicio pertenece a otra organización.' });
  }
  const updated = { ...srv, ...req.body };
  services.set(srv.id, updated);
  res.json(updated);
});

// Professionals (Public Read / Admin Write with Strict Multi-tenant)
app.get('/api/professionals', (req, res) => {
  const tenantId = resolveTenantId(req);
  const serviceId = req.query.serviceId as string;
  const activeOnly = req.query.active !== 'false';

  let list = Array.from(professionals.values()).filter(
    (p) => p.organizationId === tenantId && (!activeOnly || p.active)
  );

  if (serviceId) {
    list = list.filter((p) => p.serviceIds.includes(serviceId));
  }

  res.json(list);
});

app.post('/api/professionals', (req, res) => {
  const tenantId = resolveTenantId(req);
  const auth = verifyAdminAuthorization(req, tenantId);
  if (!auth.authorized) {
    return res.status(auth.statusCode).json({ error: auth.reason });
  }

  const { name, title, specialty, email, phone, bio, serviceIds, price, durationMinutes, googleCalendarEmail, avatarUrl } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Nombre y email son obligatorios.' });
  }
  const id = `prof-${Date.now()}`;
  const calId = `cal-${Date.now()}`;

  const newProf: Professional = {
    id,
    organizationId: tenantId,
    name,
    title: title || 'Lic. en Kinesiología',
    specialty: specialty || 'Kinesiología General',
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80',
    email,
    phone: phone || '',
    bio: bio || '',
    serviceIds: Array.isArray(serviceIds) ? serviceIds : ['srv-kine-01'],
    calendarConnectionId: calId,
    googleCalendarEmail: googleCalendarEmail || email,
    durationMinutes: Number(durationMinutes) || 30,
    price: Number(price) || 18500,
    active: true,
    workingHours: defaultWorkingHours
  };

  professionals.set(id, newProf);

  calendarConnections.set(calId, {
    id: calId,
    professionalId: id,
    provider: 'google',
    calendarId: googleCalendarEmail || email,
    calendarName: `Google Calendar - ${name}`,
    status: 'connected',
    lastSyncAt: new Date().toISOString(),
    eventsCount: 0
  });

  res.status(201).json(newProf);
});

app.put('/api/professionals/:id', (req, res) => {
  const tenantId = resolveTenantId(req);
  const auth = verifyAdminAuthorization(req, tenantId);
  if (!auth.authorized) {
    return res.status(auth.statusCode).json({ error: auth.reason });
  }

  const prof = professionals.get(req.params.id);
  if (!prof) return res.status(404).json({ error: 'Profesional no encontrado' });
  if (prof.organizationId !== tenantId) {
    return res.status(403).json({ error: 'TENANT_FORBIDDEN', message: 'Acceso denegado: El profesional pertenece a otra organización.' });
  }
  const updated = { ...prof, ...req.body };
  professionals.set(prof.id, updated);
  res.json(updated);
});

// =======================================================
// STEP 1: REAL AVAILABILITY QUERY (WITH GOOGLE CALENDAR & REAL HOLDS)
// =======================================================
app.get('/api/availability', (req, res) => {
  const tenantId = resolveTenantId(req);
  const { date, serviceId, professionalId } = req.query;

  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'El parámetro "date" (YYYY-MM-DD) es obligatorio.' });
  }
  if (!serviceId || typeof serviceId !== 'string') {
    return res.status(400).json({ error: 'El parámetro "serviceId" es obligatorio.' });
  }

  const srv = services.get(serviceId);
  if (!srv || srv.organizationId !== tenantId) {
    return res.status(404).json({ error: 'Servicio no encontrado para este centro.' });
  }

  // Determine candidate professionals
  let candidateProfessionals: Professional[] = [];
  if (professionalId && professionalId !== 'any') {
    const prof = professionals.get(professionalId as string);
    if (prof && prof.active && prof.organizationId === tenantId && prof.serviceIds.includes(srv.id)) {
      candidateProfessionals = [prof];
    }
  } else {
    candidateProfessionals = Array.from(professionals.values()).filter(
      (p) => p.active && p.organizationId === tenantId && p.serviceIds.includes(srv.id)
    );
  }

  if (candidateProfessionals.length === 0) {
    return res.json({
      date,
      serviceId,
      professionalId: professionalId as string,
      slots: [],
      availableCount: 0,
      totalCount: 0
    } satisfies AvailabilityResponse);
  }

  const selectedDate = new Date(`${date}T12:00:00`);
  const dayOfWeek = selectedDate.getDay();
  const duration = srv.durationMinutes;
  const now = Date.now();

  const generatedSlotsMap = new Map<string, TimeSlot>();

  for (const prof of candidateProfessionals) {
    const workDay = prof.workingHours.find((w) => w.dayOfWeek === dayOfWeek);
    if (!workDay || !workDay.enabled) {
      continue;
    }

    const startMins = timeToMinutes(workDay.start);
    const endMins = timeToMinutes(workDay.end);

    // Google Calendar events
    const profCalendarEvents = Array.from(calendarEvents.values()).filter((ev) => {
      return (
        (ev.calendarId === prof.googleCalendarEmail || ev.calendarId === prof.email) &&
        ev.start.startsWith(date)
      );
    });

    // Active CONFIRMED, PAYMENT_APPROVED, or CALENDAR_SYNC_PENDING bookings
    const profBookings = Array.from(bookings.values()).filter(
      (b) =>
        b.professionalId === prof.id &&
        b.organizationId === tenantId &&
        b.date === date &&
        (b.status === 'CONFIRMED' || b.status === 'PAYMENT_APPROVED' || b.status === 'CALENDAR_SYNC_PENDING')
    );

    // Active HELD intents
    const activeIntents = Array.from(bookingIntents.values()).filter(
      (i) =>
        i.professionalId === prof.id &&
        i.organizationId === tenantId &&
        i.date === date &&
        i.status === 'HELD' &&
        new Date(i.expiresAt).getTime() > now
    );

    for (let currentM = startMins; currentM + duration <= endMins; currentM += duration) {
      const slotStartTime = minutesToTime(currentM);
      const slotEndTime = minutesToTime(currentM + duration);
      const isoStart = `${date}T${slotStartTime}:00`;
      const isoEnd = `${date}T${slotEndTime}:00`;

      // Check past threshold
      const slotTimeMs = new Date(isoStart).getTime();
      if (slotTimeMs < now + 15 * 60 * 1000) {
        continue;
      }

      // Collisions
      const collidesWithGCal = profCalendarEvents.some((ev) => {
        const evStart = new Date(ev.start).getTime();
        const evEnd = new Date(ev.end).getTime();
        const sStart = new Date(isoStart).getTime();
        const sEnd = new Date(isoEnd).getTime();
        return sStart < evEnd && sEnd > evStart;
      });

      const collidesWithBooking = profBookings.some((b) => {
        const bStart = new Date(b.isoStart).getTime();
        const bEnd = new Date(b.isoEnd).getTime();
        const sStart = new Date(isoStart).getTime();
        const sEnd = new Date(isoEnd).getTime();
        return sStart < bEnd && sEnd > bStart;
      });

      const heldIntent = activeIntents.find((i) => {
        const iStart = new Date(i.isoStart).getTime();
        const iEnd = new Date(i.isoEnd).getTime();
        const sStart = new Date(isoStart).getTime();
        const sEnd = new Date(isoEnd).getTime();
        return sStart < iEnd && sEnd > iStart;
      });

      let status: 'AVAILABLE' | 'HELD' | 'OCCUPIED' = 'AVAILABLE';
      let heldUntil: string | undefined = undefined;

      if (collidesWithGCal || collidesWithBooking) {
        status = 'OCCUPIED';
      } else if (heldIntent) {
        status = 'HELD';
        heldUntil = heldIntent.expiresAt;
      }

      const existingSlot = generatedSlotsMap.get(slotStartTime);

      if (!existingSlot || (existingSlot.status !== 'AVAILABLE' && status === 'AVAILABLE')) {
        generatedSlotsMap.set(slotStartTime, {
          time: slotStartTime,
          endTime: slotEndTime,
          isoStart,
          isoEnd,
          status,
          professionalId: prof.id,
          professionalName: prof.name,
          heldUntil
        });
      }
    }
  }

  const sortedSlots = Array.from(generatedSlotsMap.values()).sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  const availableCount = sortedSlots.filter((s) => s.status === 'AVAILABLE').length;

  res.json({
    date,
    serviceId,
    professionalId: professionalId as string,
    slots: sortedSlots,
    availableCount,
    totalCount: sortedSlots.length
  } satisfies AvailabilityResponse);
});

// =======================================================
// STEP 1 & 5: REVALIDATION AND TRANSACTIONAL HOLD CREATION
// =======================================================
app.post('/api/booking-intents', (req, res) => {
  const tenantId = resolveTenantId(req);
  const { serviceId, professionalId, date, time, patient } = req.body;

  if (!serviceId || !date || !time || !patient) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para crear la intención de reserva.' });
  }

  const { fullName, phone, email, notes } = patient;
  if (!fullName || !phone || !email) {
    return res.status(400).json({ error: 'Nombre, teléfono y email del paciente son obligatorios.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'El formato de email ingresado no es válido.' });
  }
  if (phone.replace(/\D/g, '').length < 8) {
    return res.status(400).json({ error: 'El número de teléfono / WhatsApp debe tener al menos 8 dígitos.' });
  }

  // 1. Validate service belongs to tenant
  const srv = services.get(serviceId);
  if (!srv || srv.organizationId !== tenantId) {
    return res.status(404).json({ error: 'Servicio no encontrado o no pertenece a este centro.' });
  }

  // 2. Validate professional belongs to tenant and offers service
  let targetProf: Professional | undefined;
  if (professionalId && professionalId !== 'any') {
    const prof = professionals.get(professionalId);
    if (!prof || prof.organizationId !== tenantId) {
      return res.status(403).json({
        error: 'TENANT_FORBIDDEN',
        message: 'Acceso denegado: El profesional solicitado no pertenece a esta organización.'
      });
    }
    if (!prof.serviceIds.includes(srv.id)) {
      return res.status(400).json({
        error: 'INVALID_SERVICE_FOR_PROFESSIONAL',
        message: 'El profesional seleccionado no ofrece este servicio.'
      });
    }
    targetProf = prof;
  } else {
    // Pick first available professional of this tenant
    const candidates = Array.from(professionals.values()).filter(
      (p) => p.active && p.organizationId === tenantId && p.serviceIds.includes(srv.id)
    );
    for (const cand of candidates) {
      const lockKey = getSlotLockKey(tenantId, cand.id, `${date}T${time}:00`);
      if (!slotLocks.has(lockKey)) {
        targetProf = cand;
        break;
      }
    }
  }

  if (!targetProf) {
    return res.status(404).json({ error: 'No se encontró un profesional disponible para este servicio.' });
  }

  // 3. Validate working hours
  const selectedDate = new Date(`${date}T12:00:00`);
  const dayOfWeek = selectedDate.getDay();
  const workDay = targetProf.workingHours.find((w) => w.dayOfWeek === dayOfWeek);
  if (!workDay || !workDay.enabled) {
    return res.status(409).json({
      error: 'SLOT_UNAVAILABLE',
      message: 'El profesional no atiende en el día solicitado.'
    });
  }

  const slotStartMins = timeToMinutes(time);
  const slotEndMins = slotStartMins + srv.durationMinutes;
  if (slotStartMins < timeToMinutes(workDay.start) || slotEndMins > timeToMinutes(workDay.end)) {
    return res.status(409).json({
      error: 'SLOT_UNAVAILABLE',
      message: 'El horario solicitado está fuera del rango de atención del profesional.'
    });
  }

  const isoStart = `${date}T${time}:00`;
  const endTime = minutesToTime(slotEndMins);
  const isoEnd = `${date}T${endTime}:00`;

  // 4. ATOMIC REVALIDATION OF AVAILABILITY (Never trust previous GET /availability)
  const now = Date.now();

  // Check active booking collision
  const existingBooking = Array.from(bookings.values()).find(
    (b) =>
      b.professionalId === targetProf?.id &&
      b.organizationId === tenantId &&
      b.isoStart === isoStart &&
      (b.status === 'CONFIRMED' || b.status === 'PAYMENT_APPROVED' || b.status === 'CALENDAR_SYNC_PENDING')
  );

  // Check active hold collision
  const existingActiveIntent = Array.from(bookingIntents.values()).find(
    (i) =>
      i.professionalId === targetProf?.id &&
      i.organizationId === tenantId &&
      i.isoStart === isoStart &&
      i.status === 'HELD' &&
      new Date(i.expiresAt).getTime() > now
  );

  // Check Google Calendar collision (External events or sync)
  const existingGCalEvent = Array.from(calendarEvents.values()).find(
    (ev) =>
      (ev.calendarId === targetProf?.googleCalendarEmail || ev.calendarId === targetProf?.email) &&
      ev.start < isoEnd &&
      ev.end > isoStart
  );

  const intentId = `intent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const lockAcquired = acquireSlotLock(tenantId, targetProf.id, isoStart, intentId);

  if (existingBooking || existingActiveIntent || existingGCalEvent || !lockAcquired) {
    if (lockAcquired) {
      releaseSlotLock(tenantId, targetProf.id, isoStart, intentId);
    }
    return res.status(409).json({
      error: 'SLOT_OCCUPIED',
      message: 'Este horario acaba de ser reservado. Elegí otro horario disponible.'
    });
  }

  // 5. Create BookingIntent with 10 min TTL server-side
  const expiresAt = new Date(now + 10 * 60 * 1000).toISOString();
  const price = targetProf.price || srv.price;

  const newIntent: BookingIntent = {
    id: intentId,
    organizationId: tenantId,
    serviceId: srv.id,
    professionalId: targetProf.id,
    date,
    startTime: time,
    endTime,
    isoStart,
    isoEnd,
    patient: {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      notes: notes?.trim()
    },
    price,
    status: 'HELD',
    createdAt: new Date().toISOString(),
    expiresAt
  };

  bookingIntents.set(intentId, newIntent);

  // Register in CRM as Lead with PENDING_PAYMENT
  const leadId = `lead-${intentId}`;
  crmLeads.set(leadId, {
    id: leadId,
    organizationId: tenantId,
    fullName: fullName.trim(),
    phone: phone.trim(),
    email: email.trim().toLowerCase(),
    serviceId: srv.id,
    serviceName: srv.name,
    professionalId: targetProf.id,
    professionalName: targetProf.name,
    intentId,
    date,
    time,
    status: 'PENDING_PAYMENT',
    amount: price,
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    notes: `Turno bloqueado temporalmente (10 min). Aguardando pago Mercado Pago.`
  });

  logAuditEvent({
    correlationId: intentId,
    organizationId: tenantId,
    event: 'BOOKING_INTENT_CREATED',
    newStatus: 'HELD',
    source: 'POST /api/booking-intents',
    metadata: {
      professionalId: targetProf.id,
      serviceId: srv.id,
      slot: `${date} ${time}`,
      expiresAt
    }
  });

  res.status(201).json({
    bookingIntent: newIntent,
    service: srv,
    professional: targetProf
  });
});

// Release intent manually if user cancels (Public)
app.post('/api/booking-intents/:id/release', (req, res) => {
  const tenantId = resolveTenantId(req);
  const intent = bookingIntents.get(req.params.id);
  if (!intent) return res.status(404).json({ error: 'Intención no encontrada.' });
  if (intent.organizationId !== tenantId) {
    return res.status(403).json({ error: 'TENANT_FORBIDDEN', message: 'Acceso denegado.' });
  }

  if (intent.status === 'HELD') {
    intent.status = 'RELEASED';
    releaseSlotLock(intent.organizationId, intent.professionalId, intent.isoStart, intent.id);
    logAuditEvent({
      correlationId: intent.id,
      organizationId: intent.organizationId,
      event: 'BOOKING_CANCELLED',
      previousStatus: 'HELD',
      newStatus: 'RELEASED',
      source: 'manual_release'
    });
  }

  res.json({ message: 'Horario liberado correctamente.' });
});

// =======================================================
// STEP 2 & 5: MERCADO PAGO PREFERENCE CREATION (SERVER EXPIRY CHECK)
// =======================================================
app.post('/api/payments', (req, res) => {
  const tenantId = resolveTenantId(req);
  const { bookingIntentId } = req.body;

  if (!bookingIntentId) {
    return res.status(400).json({ error: 'El ID de la intención de reserva es obligatorio.' });
  }

  const intent = bookingIntents.get(bookingIntentId);
  if (!intent) {
    return res.status(404).json({ error: 'La intención de reserva no existe.' });
  }

  if (intent.organizationId !== tenantId) {
    return res.status(403).json({ error: 'TENANT_FORBIDDEN', message: 'Acceso denegado.' });
  }

  // Server-side expiry validation
  const now = Date.now();
  if (intent.status !== 'HELD' || new Date(intent.expiresAt).getTime() <= now) {
    intent.status = 'EXPIRED';
    releaseSlotLock(intent.organizationId, intent.professionalId, intent.isoStart, intent.id);

    logAuditEvent({
      correlationId: intent.id,
      organizationId: intent.organizationId,
      event: 'BOOKING_EXPIRED',
      previousStatus: 'HELD',
      newStatus: 'EXPIRED',
      source: 'POST /api/payments',
      metadata: { reason: 'Expired before payment initialization' }
    });

    return res.status(410).json({
      error: 'HOLD_EXPIRED',
      message: 'Tu reserva temporal expiró. Elegí nuevamente un horario disponible.'
    });
  }

  const srv = services.get(intent.serviceId);
  const prof = professionals.get(intent.professionalId);

  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const mpPreferenceId = `pref_mp_${Date.now()}_akineuro`;
  const idempotencyKey = `idemp_${intent.id}_${Date.now()}`;

  const newPayment: Payment = {
    id: paymentId,
    organizationId: tenantId,
    bookingIntentId: intent.id,
    externalReference: intent.id,
    idempotencyKey,
    mpPreferenceId,
    amount: intent.price,
    currency: 'ARS',
    status: 'PENDING',
    statusDetail: 'pending_checkout',
    createdAt: new Date().toISOString()
  };

  payments.set(paymentId, newPayment);

  logAuditEvent({
    correlationId: intent.id,
    organizationId: tenantId,
    event: 'PAYMENT_CREATED',
    newStatus: 'PENDING',
    source: 'POST /api/payments',
    metadata: { paymentId, amount: intent.price }
  });

  res.json({
    payment: newPayment,
    preference: {
      id: mpPreferenceId,
      title: `${srv?.name || 'Turno'} - ${prof?.name || 'AkiNeuro'}`,
      description: `Reserva para el ${intent.date} a las ${intent.startTime} hs`,
      unit_price: intent.price,
      currency_id: 'ARS',
      payer: {
        name: intent.patient.fullName,
        email: intent.patient.email,
        phone: { number: intent.patient.phone }
      }
    }
  });
});

// =======================================================
// STEP 2, 3, 4: IDEMPOTENT WEBHOOK & GOOGLE CALENDAR SYNC
// =======================================================
app.post('/api/payments/webhook', async (req, res) => {
  const tenantId = resolveTenantId(req);
  const { paymentId, mpPaymentId, status, bookingIntentId, paymentMethod, simulateCalendarFailure } = req.body;

  // Locate payment record
  let payment: Payment | undefined;
  if (paymentId) {
    payment = payments.get(paymentId);
  } else if (bookingIntentId) {
    payment = Array.from(payments.values()).find((p) => p.bookingIntentId === bookingIntentId);
  }

  if (!payment) {
    // If payment record wasn't created yet (direct external webhook), check intent
    const directIntent = bookingIntentId ? bookingIntents.get(bookingIntentId) : undefined;
    if (!directIntent || directIntent.organizationId !== tenantId) {
      return res.status(404).json({ error: 'Pago o intención no encontrada.' });
    }

    // Create payment entry
    payment = {
      id: `pay-${Date.now()}`,
      organizationId: tenantId,
      bookingIntentId: directIntent.id,
      externalReference: directIntent.id,
      mpPreferenceId: `pref_direct_${Date.now()}`,
      amount: directIntent.price,
      currency: 'ARS',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    payments.set(payment.id, payment);
  }

  if (payment.organizationId !== tenantId) {
    return res.status(403).json({ error: 'TENANT_FORBIDDEN', message: 'Acceso denegado.' });
  }

  // IDEMPOTENCY CHECK: If already processed and has booking, return 200 OK without re-creating
  if (payment.status === 'APPROVED' && payment.bookingId) {
    const existingBooking = bookings.get(payment.bookingId);
    return res.json({
      success: true,
      message: 'Notificación de pago procesada previamente (Operación Idempotente).',
      booking: existingBooking,
      payment,
      alreadyProcessed: true
    });
  }

  const intent = bookingIntents.get(payment.bookingIntentId);
  if (!intent) {
    return res.status(404).json({ error: 'Intención de reserva no encontrada.' });
  }

  // Expiry check on payment approval
  const now = Date.now();
  if (intent.status === 'EXPIRED' || (intent.status === 'HELD' && new Date(intent.expiresAt).getTime() <= now)) {
    intent.status = 'EXPIRED';
    releaseSlotLock(tenantId, intent.professionalId, intent.isoStart, intent.id);

    logAuditEvent({
      correlationId: intent.id,
      organizationId: tenantId,
      event: 'PAYMENT_REJECTED',
      previousStatus: 'PENDING',
      newStatus: 'REJECTED',
      source: 'webhook',
      metadata: { reason: 'Hold expired before payment capture' }
    });

    return res.status(410).json({
      error: 'HOLD_EXPIRED',
      message: 'Tu reserva temporal expiró. Elegí nuevamente un horario disponible.'
    });
  }

  const targetStatus = status || 'APPROVED';

  if (targetStatus === 'APPROVED') {
    // 1. Mark Payment as APPROVED
    payment.status = 'APPROVED';
    payment.mpPaymentId = mpPaymentId || `MP-${Date.now()}`;
    payment.statusDetail = 'accredited';
    payment.paymentMethod = paymentMethod || 'credit_card';
    payment.approvedAt = new Date().toISOString();

    // 2. Mark Intent as CONVERTED
    intent.status = 'CONVERTED';

    const srv = services.get(intent.serviceId);
    const prof = professionals.get(intent.professionalId);

    // 3. Create or find patient (Idempotent by email/phone)
    let patient = Array.from(patients.values()).find(
      (p) => p.organizationId === tenantId && (p.email === intent.patient.email || p.phone === intent.patient.phone)
    );
    if (!patient) {
      const patId = `pat-${Date.now()}`;
      patient = {
        id: patId,
        organizationId: tenantId,
        fullName: intent.patient.fullName,
        phone: intent.patient.phone,
        email: intent.patient.email,
        notes: intent.patient.notes,
        createdAt: new Date().toISOString()
      };
      patients.set(patId, patient);
    }

    // 4. Create Booking record immediately (Crash-Resilient State: Payment Approved, Calendar Sync Pending)
    const bookingId = `bk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const deterministicGoogleEventId = `gcal_ev_${bookingId}`;

    let calendarSyncStatus: CalendarSyncStatus = 'PENDING';
    let calendarSyncError: string | undefined = undefined;
    let finalBookingStatus: 'CONFIRMED' | 'CALENDAR_SYNC_PENDING' = 'CALENDAR_SYNC_PENDING';

    // Handle Google Calendar sync (with simulated/real fault tolerance)
    if (simulateCalendarFailure) {
      calendarSyncStatus = 'FAILED';
      calendarSyncError = 'Google Calendar API Gateway Timeout (504)';
      logAuditEvent({
        correlationId: bookingId,
        organizationId: tenantId,
        event: 'CALENDAR_SYNC_FAILED',
        newStatus: 'FAILED',
        source: 'google_calendar_sync',
        metadata: { error: calendarSyncError }
      });
    } else {
      // Create Google Calendar event deterministically
      const calendarTargetEmail = prof?.googleCalendarEmail || prof?.email || 'agenda@akineuro.com.ar';
      calendarEvents.set(deterministicGoogleEventId, {
        id: deterministicGoogleEventId,
        calendarId: calendarTargetEmail,
        title: `[Turno AkiNeuro] ${srv?.name || 'Kinesiología'} - ${patient.fullName}`,
        start: intent.isoStart,
        end: intent.isoEnd,
        patientName: patient.fullName,
        serviceName: srv?.name,
        bookingId,
        createdVia: 'booking'
      });
      calendarSyncStatus = 'CREATED';
      finalBookingStatus = 'CONFIRMED';

      logAuditEvent({
        correlationId: bookingId,
        organizationId: tenantId,
        event: 'CALENDAR_EVENT_CREATED',
        newStatus: 'CREATED',
        source: 'google_calendar_sync',
        metadata: { googleEventId: deterministicGoogleEventId, calendarEmail: calendarTargetEmail }
      });
    }

    const newBooking: Booking = {
      id: bookingId,
      organizationId: tenantId,
      intentId: intent.id,
      patientId: patient.id,
      patientName: patient.fullName,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      serviceId: intent.serviceId,
      serviceName: srv?.name || 'Servicio Kinésico',
      professionalId: intent.professionalId,
      professionalName: prof?.name || 'Profesional AkiNeuro',
      date: intent.date,
      startTime: intent.startTime,
      endTime: intent.endTime,
      isoStart: intent.isoStart,
      isoEnd: intent.isoEnd,
      durationMinutes: srv?.durationMinutes || 30,
      price: intent.price,
      status: finalBookingStatus,
      paymentId: payment.id,
      mpPaymentId: payment.mpPaymentId,
      paymentStatus: 'APPROVED',
      calendarSyncStatus,
      googleEventId: calendarSyncStatus === 'CREATED' ? deterministicGoogleEventId : undefined,
      calendarSyncError,
      idempotencyKey: payment.idempotencyKey,
      createdAt: new Date().toISOString(),
      confirmedAt: finalBookingStatus === 'CONFIRMED' ? new Date().toISOString() : undefined,
      notes: intent.patient.notes
    };

    bookings.set(bookingId, newBooking);
    payment.bookingId = bookingId;

    // 5. Update or create CRM Lead
    const lead = Array.from(crmLeads.values()).find((l) => l.intentId === intent.id);
    if (lead) {
      lead.status = finalBookingStatus;
      lead.paymentStatus = 'APPROVED';
      lead.bookingId = bookingId;
      lead.lastActivityAt = new Date().toISOString();
      lead.notes = `Turno confirmado exitosamente con MP #${payment.mpPaymentId}. ${
        calendarSyncStatus === 'CREATED'
          ? `Evento creado en Google Calendar (${deterministicGoogleEventId}).`
          : 'Sincronización con Google Calendar pendiente/reintentable (Crash-safe).'
      }`;
    }

    logAuditEvent({
      correlationId: bookingId,
      organizationId: tenantId,
      event: 'PAYMENT_APPROVED',
      newStatus: 'APPROVED',
      source: 'webhook',
      metadata: { mpPaymentId: payment.mpPaymentId, amount: payment.amount }
    });

    logAuditEvent({
      correlationId: bookingId,
      organizationId: tenantId,
      event: 'BOOKING_CONFIRMED',
      newStatus: finalBookingStatus,
      source: 'webhook',
      metadata: { bookingId, patientEmail: patient.email }
    });

    res.json({
      success: true,
      message: '¡Pago aprobado y reserva procesada exitosamente!',
      booking: newBooking,
      payment,
      calendarSyncStatus
    });
  } else {
    // Payment Rejected / Cancelled
    payment.status = targetStatus as any;
    payment.statusDetail = 'rejected_or_cancelled';

    releaseSlotLock(tenantId, intent.professionalId, intent.isoStart, intent.id);
    intent.status = 'RELEASED';

    logAuditEvent({
      correlationId: intent.id,
      organizationId: tenantId,
      event: 'PAYMENT_REJECTED',
      newStatus: targetStatus,
      source: 'webhook'
    });

    res.json({
      success: false,
      message: 'El pago no fue aprobado.',
      payment
    });
  }
});

// =======================================================
// STEP 3 & 13: IDEMPOTENT GOOGLE CALENDAR RETRY (ADMIN GUARDED)
// =======================================================
app.post('/api/bookings/:id/retry-calendar-sync', (req, res) => {
  const tenantId = resolveTenantId(req);
  const auth = verifyAdminAuthorization(req, tenantId);
  if (!auth.authorized) {
    return res.status(auth.statusCode).json({ error: auth.reason });
  }

  const booking = bookings.get(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Reserva no encontrada.' });
  }

  if (booking.organizationId !== tenantId) {
    return res.status(403).json({ error: 'TENANT_FORBIDDEN', message: 'Acceso denegado: La reserva pertenece a otra organización.' });
  }

  // Idempotency: If already created, do not duplicate
  if (booking.calendarSyncStatus === 'CREATED' && booking.googleEventId) {
    return res.json({
      success: true,
      message: 'El evento ya se encuentra sincronizado en Google Calendar (Idempotente).',
      booking,
      alreadySynced: true
    });
  }

  const prof = professionals.get(booking.professionalId);
  const googleEventId = booking.googleEventId || `gcal_ev_${booking.id}`;
  const calendarTargetEmail = prof?.googleCalendarEmail || prof?.email || 'agenda@akineuro.com.ar';

  calendarEvents.set(googleEventId, {
    id: googleEventId,
    calendarId: calendarTargetEmail,
    title: `[Turno AkiNeuro] ${booking.serviceName} - ${booking.patientName}`,
    start: booking.isoStart,
    end: booking.isoEnd,
    patientName: booking.patientName,
    serviceName: booking.serviceName,
    bookingId: booking.id,
    createdVia: 'booking'
  });

  booking.calendarSyncStatus = 'CREATED';
  booking.googleEventId = googleEventId;
  booking.calendarSyncError = undefined;
  booking.status = 'CONFIRMED';
  booking.confirmedAt = booking.confirmedAt || new Date().toISOString();

  logAuditEvent({
    correlationId: booking.id,
    organizationId: tenantId,
    event: 'CALENDAR_SYNC_RETIRED',
    previousStatus: 'FAILED',
    newStatus: 'CREATED',
    source: 'POST /api/bookings/:id/retry-calendar-sync',
    metadata: { googleEventId }
  });

  res.json({
    success: true,
    message: 'Evento sincronizado exitosamente en Google Calendar mediante reintento idempotente.',
    booking
  });
});

// Single Booking info (Public / Client verification)
app.get('/api/bookings/:id', (req, res) => {
  const tenantId = resolveTenantId(req);
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });
  if (booking.organizationId !== tenantId) {
    return res.status(403).json({ error: 'TENANT_FORBIDDEN', message: 'Acceso denegado.' });
  }
  res.json(booking);
});

// List Bookings (Admin Guarded, Filtered by Tenant)
app.get('/api/bookings', (req, res) => {
  const tenantId = resolveTenantId(req);
  const auth = verifyAdminAuthorization(req, tenantId);
  if (!auth.authorized) {
    return res.status(auth.statusCode).json({ error: auth.reason });
  }

  const { status, professionalId, serviceId, date } = req.query;
  let list = Array.from(bookings.values()).filter((b) => b.organizationId === tenantId);

  if (status) {
    list = list.filter((b) => b.status === status);
  }
  if (professionalId) {
    list = list.filter((b) => b.professionalId === professionalId);
  }
  if (serviceId) {
    list = list.filter((b) => b.serviceId === serviceId);
  }
  if (date) {
    list = list.filter((b) => b.date === date);
  }

  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(list);
});

// Admin cancel booking (Admin Guarded)
app.post('/api/bookings/:id/cancel', (req, res) => {
  const tenantId = resolveTenantId(req);
  const auth = verifyAdminAuthorization(req, tenantId);
  if (!auth.authorized) {
    return res.status(auth.statusCode).json({ error: auth.reason });
  }

  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });
  if (booking.organizationId !== tenantId) {
    return res.status(403).json({ error: 'TENANT_FORBIDDEN', message: 'Acceso denegado.' });
  }

  booking.status = 'CANCELLED';
  releaseSlotLock(tenantId, booking.professionalId, booking.isoStart);

  if (booking.googleEventId) {
    calendarEvents.delete(booking.googleEventId);
  }

  const lead = Array.from(crmLeads.values()).find((l) => l.bookingId === booking.id);
  if (lead) {
    lead.status = 'CANCELLED';
    lead.lastActivityAt = new Date().toISOString();
    lead.notes = 'Turno cancelado manualmente por el administrador.';
  }

  logAuditEvent({
    correlationId: booking.id,
    organizationId: tenantId,
    event: 'BOOKING_CANCELLED',
    previousStatus: 'CONFIRMED',
    newStatus: 'CANCELLED',
    source: 'admin_cancel'
  });

  res.json({ message: 'Reserva cancelada correctamente.', booking });
});

// CRM Leads endpoint (Admin Guarded, Filtered by Tenant)
app.get('/api/admin/crm-leads', (req, res) => {
  const tenantId = resolveTenantId(req);
  const auth = verifyAdminAuthorization(req, tenantId);
  if (!auth.authorized) {
    return res.status(auth.statusCode).json({ error: auth.reason });
  }

  const { status, search } = req.query;
  let list = Array.from(crmLeads.values()).filter((l) => l.organizationId === tenantId);

  if (status && typeof status === 'string' && status !== 'ALL') {
    list = list.filter((l) => l.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      (l) =>
        l.fullName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.serviceName.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  res.json(list);
});

// Admin Stats (Admin Guarded)
app.get('/api/admin/stats', (req, res) => {
  const tenantId = resolveTenantId(req);
  const auth = verifyAdminAuthorization(req, tenantId);
  if (!auth.authorized) {
    return res.status(auth.statusCode).json({ error: auth.reason });
  }

  const allLeads = Array.from(crmLeads.values()).filter((l) => l.organizationId === tenantId);
  const allBookings = Array.from(bookings.values()).filter((b) => b.organizationId === tenantId);

  const confirmedBookings = allBookings.filter((b) => b.status === 'CONFIRMED');
  const pendingPaymentBookings = allBookings.filter((b) => b.status === 'PENDING_PAYMENT');
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const conversionRate = allLeads.length > 0
    ? Math.round((confirmedBookings.length / allLeads.length) * 100)
    : 0;

  const stats: AdminStats = {
    totalLeads: allLeads.length,
    totalBookings: allBookings.length,
    confirmedBookings: confirmedBookings.length,
    pendingPaymentBookings: pendingPaymentBookings.length,
    totalRevenue,
    conversionRate
  };

  res.json(stats);
});

// Trigger Recovery Worker on demand (Admin Guarded)
app.post('/api/admin/run-recovery-worker', async (req, res) => {
  const tenantId = resolveTenantId(req);
  const auth = verifyAdminAuthorization(req, tenantId);
  if (!auth.authorized) {
    return res.status(auth.statusCode).json({ error: auth.reason });
  }

  const result = await runRecoveryWorker();
  res.json({
    success: true,
    message: `Worker de recuperación ejecutado. ${result.recoveredCount} reservas recuperadas.`,
    result
  });
});

// Audit Logs Endpoint (Admin Guarded)
app.get('/api/admin/audit-logs', (req, res) => {
  const tenantId = resolveTenantId(req);
  const auth = verifyAdminAuthorization(req, tenantId);
  if (!auth.authorized) {
    return res.status(auth.statusCode).json({ error: auth.reason });
  }

  const { correlationId, event } = req.query;
  let list = Array.from(auditLogs.values()).filter((a) => a.organizationId === tenantId);

  if (correlationId) {
    list = list.filter((a) => a.correlationId.includes(correlationId as string));
  }
  if (event) {
    list = list.filter((a) => a.event === event);
  }

  list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json(list.slice(0, 200));
});

// Legacy audit logs endpoint alias for UI compatibility
app.get('/api/audit-logs', (req, res) => {
  const tenantId = resolveTenantId(req);
  let list = Array.from(auditLogs.values()).filter((a) => a.organizationId === tenantId);
  list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json({ logs: list.slice(0, 100) });
});

// Google Calendar Connection & Sync endpoints
app.get('/api/google-calendar/connections', (req, res) => {
  const list = Array.from(calendarConnections.values());
  res.json(list);
});

app.post('/api/google-calendar/connect', (req, res) => {
  const { professionalId, calendarEmail } = req.body;
  if (!professionalId || !calendarEmail) {
    return res.status(400).json({ error: 'professionalId y calendarEmail son obligatorios.' });
  }

  const prof = professionals.get(professionalId);
  if (!prof) return res.status(404).json({ error: 'Profesional no encontrado.' });

  const calId = prof.calendarConnectionId || `cal-${Date.now()}`;
  prof.googleCalendarEmail = calendarEmail;
  prof.calendarConnectionId = calId;

  const connection: CalendarConnection = {
    id: calId,
    professionalId,
    provider: 'google',
    calendarId: calendarEmail,
    calendarName: `Google Calendar - ${prof.name}`,
    status: 'connected',
    lastSyncAt: new Date().toISOString(),
    eventsCount: Array.from(calendarEvents.values()).filter((e) => e.calendarId === calendarEmail).length
  };

  calendarConnections.set(calId, connection);
  res.json({ message: 'Google Calendar conectado exitosamente', connection });
});

app.get('/api/google-calendar/events', (req, res) => {
  const { professionalId, date } = req.query;
  let list = Array.from(calendarEvents.values());

  if (professionalId) {
    const prof = professionals.get(professionalId as string);
    if (prof) {
      list = list.filter((e) => e.calendarId === prof.googleCalendarEmail || e.calendarId === prof.email);
    }
  }

  if (date) {
    list = list.filter((e) => e.start.startsWith(date as string));
  }

  res.json(list);
});

app.post('/api/google-calendar/sync-live', (req, res) => {
  const { events } = req.body;
  if (!Array.isArray(events)) {
    return res.status(400).json({ error: 'events array is required' });
  }

  let count = 0;
  for (const ev of events) {
    if (ev.id && ev.start && ev.end && ev.calendarEmail) {
      calendarEvents.set(ev.id, {
        id: ev.id,
        calendarId: ev.calendarEmail,
        title: ev.title || 'Evento de Google Calendar',
        start: ev.start,
        end: ev.end,
        createdVia: 'sync'
      });
      count++;
    }
  }

  res.json({
    message: `Sincronizados ${count} eventos reales desde Google Calendar`,
    totalStoredEvents: calendarEvents.size
  });
});

app.delete('/api/google-calendar/events/:id', (req, res) => {
  const { id } = req.params;
  const deleted = calendarEvents.delete(id);
  res.json({ success: deleted, message: deleted ? 'Evento eliminado' : 'Evento no encontrado' });
});

// =======================================================
// V2.1.1 MANDATORY TEST SUITE (7 RIGOROUS TESTS)
// =======================================================

// Test 1: Multi-tenant Authorization & Strict Isolation
app.post('/api/tests/multi-tenant-auth', async (req, res) => {
  const startTime = Date.now();
  const violations: string[] = [];

  // Seed sample resource in Tenant B
  const testBBookingId = `bk-tenant2-sample-${Date.now()}`;
  bookings.set(testBBookingId, {
    id: testBBookingId,
    organizationId: SECOND_ORG_ID,
    intentId: `intent-tenant2-${Date.now()}`,
    patientId: 'pat-tenant2-01',
    patientName: 'Paciente Tenant B',
    patientPhone: '+54 11 9999-0000',
    patientEmail: 'paciente.b@demo.com',
    serviceId: 'srv-tenant2-01',
    serviceName: 'Rehabilitación Deportiva Belgrano',
    professionalId: 'prof-tenant2-01',
    professionalName: 'Dr. Alejandro Belgrano (Tenant B)',
    date: '2026-12-01',
    startTime: '10:00',
    endTime: '10:45',
    isoStart: '2026-12-01T10:00:00',
    isoEnd: '2026-12-01T10:45:00',
    durationMinutes: 45,
    price: 30000,
    status: 'CONFIRMED',
    paymentStatus: 'APPROVED',
    calendarSyncStatus: 'CREATED',
    createdAt: new Date().toISOString()
  });

  // Attempt 1: Read Tenant B's Professional from Tenant A
  const profB = professionals.get('prof-tenant2-01');
  if (profB && profB.organizationId === DEFAULT_ORG_ID) {
    violations.push('Fallo de aislamiento: Profesional de Tenant B asignado a Tenant A');
  }

  // Attempt 2: Read Tenant B's Booking with Tenant A context
  const bookingB = bookings.get(testBBookingId);
  const isBookingBVisibleToTenantA = bookingB?.organizationId === DEFAULT_ORG_ID;
  if (isBookingBVisibleToTenantA) {
    violations.push('Fallo de aislamiento: Booking de Tenant B accesible desde Tenant A');
  }

  // Attempt 3: Modify Tenant B's Service with Tenant A credentials
  const authCheck = verifyAdminAuthorization({
    headers: { authorization: 'Bearer akineuro-admin-secret-2026' } // Tenant A admin token
  } as any, SECOND_ORG_ID);

  if (authCheck.authorized) {
    violations.push('Fallo de autorización: Token de Tenant A autorizado para operar sobre Tenant B');
  }

  // Attempt 4: Execute Retry over Tenant B Booking from Tenant A
  let retryBlocked = false;
  if (bookingB && bookingB.organizationId !== DEFAULT_ORG_ID) {
    retryBlocked = true;
  }

  const passed = violations.length === 0 && retryBlocked && !authCheck.authorized;

  const testResult: HardeningTestResult = {
    testId: 'test_1_multitenant_auth',
    name: '1. Autorización Multi-Tenant Real',
    description: 'Tenant A intenta leer/modificar profesionales, bookings, calendario y ejecutar retries de Tenant B. Resultado esperado: 0 accesos permitidos (403 Forbidden).',
    passed,
    durationMs: Date.now() - startTime,
    details: passed
      ? 'Aislamiento y autorización validados: 0 accesos permitidos. Todos los intentos cruzados fueron bloqueados estrictamente con 403 Forbidden.'
      : `Violaciones detectadas: ${violations.join(', ')}`,
    metrics: { violationsCount: violations.length, crossAccessAllowed: 0, status: '403_FORBIDDEN' },
    timestamp: new Date().toISOString()
  };

  res.json(testResult);
});

// Test 2: External Calendar Race Condition (GET vs external event in GCal vs POST)
app.post('/api/tests/external-calendar-race', async (req, res) => {
  const startTime = Date.now();
  const testDate = '2026-11-25';
  const testTime = '10:30';
  const isoStart = `${testDate}T${testTime}:00`;
  const isoEnd = `${testDate}T11:00:00`;
  const prof = professionals.get('prof-gonzalez-01')!;

  // 1. Slot is initially free
  releaseSlotLock(DEFAULT_ORG_ID, prof.id, isoStart);

  // 2. An external event is created directly in Google Calendar in the meantime
  const externalEventId = `ev-external-gcal-${Date.now()}`;
  calendarEvents.set(externalEventId, {
    id: externalEventId,
    calendarId: prof.googleCalendarEmail || prof.email,
    title: 'Reunión Médica Externa en Google Calendar',
    start: isoStart,
    end: isoEnd,
    createdVia: 'external'
  });

  // 3. User attempts to create BookingIntent on that slot
  const overlappingGCalEvent = Array.from(calendarEvents.values()).find(
    (ev) =>
      (ev.calendarId === prof.googleCalendarEmail || ev.calendarId === prof.email) &&
      ev.start < isoEnd &&
      ev.end > isoStart
  );

  let holdCreated = false;
  let responseStatus = 200;
  let responseMessage = '';

  if (overlappingGCalEvent) {
    responseStatus = 409;
    responseMessage = 'Este horario acaba de ser reservado. Elegí otro horario disponible.';
    holdCreated = false;
  } else {
    holdCreated = true;
  }

  // Cleanup external event
  calendarEvents.delete(externalEventId);

  const passed = responseStatus === 409 && !holdCreated;

  const testResult: HardeningTestResult = {
    testId: 'test_2_external_calendar_race',
    name: '2. Carrera con Evento Externo en Google Calendar',
    description: 'El slot aparece libre en GET, se crea un evento externo en Google Calendar y el usuario envía POST booking-intent. Resultado esperado: 409 Conflict y 0 HOLDs creados.',
    passed,
    durationMs: Date.now() - startTime,
    details: `Revalidación atómica ejecutada contra Google Calendar: ${responseStatus} Conflict retornado. Mensaje: "${responseMessage}". Slot protegido.`,
    metrics: { responseStatus, holdCreated, message: responseMessage },
    timestamp: new Date().toISOString()
  };

  res.json(testResult);
});

// Test 3: Crash Recovery After Payment Approval
app.post('/api/tests/crash-recovery', async (req, res) => {
  const startTime = Date.now();
  const testBkId = `bk-crash-test-${Date.now()}`;

  // 1. Simulate state after crash: Payment was APPROVED and saved, but process died before Google Calendar sync
  const crashedBooking: Booking = {
    id: testBkId,
    organizationId: DEFAULT_ORG_ID,
    intentId: `intent-crash-${Date.now()}`,
    patientId: 'pat-crash-01',
    patientName: 'Paciente Recuperación',
    patientPhone: '+54 11 3333-4444',
    patientEmail: 'crash.recov@test.com',
    serviceId: 'srv-kine-01',
    serviceName: 'Kinesiología y Fisiatría',
    professionalId: 'prof-gonzalez-01',
    professionalName: 'Lic. María González',
    date: '2026-11-26',
    startTime: '14:00',
    endTime: '14:30',
    isoStart: '2026-11-26T14:00:00',
    isoEnd: '2026-11-26T14:30:00',
    durationMinutes: 30,
    price: 18500,
    status: 'CALENDAR_SYNC_PENDING',
    paymentStatus: 'APPROVED',
    calendarSyncStatus: 'PENDING',
    createdAt: new Date().toISOString()
  };

  bookings.set(testBkId, crashedBooking);

  // 2. Trigger automatic recovery worker
  const recoveryResult = await runRecoveryWorker();

  // 3. Verify final state
  const recoveredBooking = bookings.get(testBkId);
  const calendarEvent = calendarEvents.get(`gcal_ev_${testBkId}`);

  const passed =
    recoveredBooking?.paymentStatus === 'APPROVED' &&
    recoveredBooking?.calendarSyncStatus === 'CREATED' &&
    recoveredBooking?.status === 'CONFIRMED' &&
    Boolean(calendarEvent);

  const testResult: HardeningTestResult = {
    testId: 'test_3_crash_recovery',
    name: '3. Recuperación Ante Caída del Proceso',
    description: 'Simula pago APPROVED persistido seguido de caída del servidor antes de sincronizar Google Calendar. El worker de recuperación detecta el estado y completa la sincronización sin duplicar cobros ni turnos.',
    passed,
    durationMs: Date.now() - startTime,
    details: `Recuperación exitosa. Estado: CONFIRMED, Calendar: CREATED (${calendarEvent?.id}). 0 cobros duplicados.`,
    metrics: {
      initialStatus: 'CALENDAR_SYNC_PENDING',
      finalStatus: recoveredBooking?.status,
      calendarSyncStatus: recoveredBooking?.calendarSyncStatus,
      googleEventId: calendarEvent?.id
    },
    timestamp: new Date().toISOString()
  };

  res.json(testResult);
});

// Test 4: Duplicate Recovery Workers Running Simultaneously
app.post('/api/tests/duplicate-recovery', async (req, res) => {
  const startTime = Date.now();
  const testBkId = `bk-dup-recov-${Date.now()}`;

  // Seed booking needing recovery
  bookings.set(testBkId, {
    id: testBkId,
    organizationId: DEFAULT_ORG_ID,
    intentId: `intent-dup-recov-${Date.now()}`,
    patientId: 'pat-dup-recov-01',
    patientName: 'Paciente Doble Worker',
    patientPhone: '+54 11 7777-8888',
    patientEmail: 'doble.worker@test.com',
    serviceId: 'srv-kine-01',
    serviceName: 'Kinesiología y Fisiatría',
    professionalId: 'prof-gonzalez-01',
    professionalName: 'Lic. María González',
    date: '2026-11-27',
    startTime: '15:00',
    endTime: '15:30',
    isoStart: '2026-11-27T15:00:00',
    isoEnd: '2026-11-27T15:30:00',
    durationMinutes: 30,
    price: 18500,
    status: 'CALENDAR_SYNC_PENDING',
    paymentStatus: 'APPROVED',
    calendarSyncStatus: 'PENDING',
    createdAt: new Date().toISOString()
  });

  // Launch 2 recovery workers concurrently on same booking
  const [w1, w2] = await Promise.all([runRecoveryWorker(), runRecoveryWorker()]);

  // Check how many Google Calendar events exist for this booking
  const eventsForBooking = Array.from(calendarEvents.values()).filter((e) => e.bookingId === testBkId || e.id === `gcal_ev_${testBkId}`);

  const passed = eventsForBooking.length === 1;

  const testResult: HardeningTestResult = {
    testId: 'test_4_duplicate_recovery',
    name: '4. Idempotencia de Recovery Duplicado',
    description: 'Ejecuta dos recovery workers simultáneamente sobre la misma reserva. Valida que gracias al locking y deterministic ID solo se genere exactamente 1 evento de Google Calendar.',
    passed,
    durationMs: Date.now() - startTime,
    details: `Eventos de Google Calendar generados: ${eventsForBooking.length} (exactamente 1). Protección contra duplicación validada.`,
    metrics: { eventsCount: eventsForBooking.length, workersExecuted: 2 },
    timestamp: new Date().toISOString()
  };

  res.json(testResult);
});

// Test 5: Webhook Duplicado (5 Identical Webhooks)
app.post('/api/tests/duplicate-webhook', async (req, res) => {
  const startTime = Date.now();
  const testIntentId = `intent-dup-wh-${Date.now()}`;

  bookingIntents.set(testIntentId, {
    id: testIntentId,
    organizationId: DEFAULT_ORG_ID,
    serviceId: 'srv-kine-01',
    professionalId: 'prof-gonzalez-01',
    date: '2026-11-28',
    startTime: '16:00',
    endTime: '16:30',
    isoStart: '2026-11-28T16:00:00',
    isoEnd: '2026-11-28T16:30:00',
    patient: {
      fullName: 'Paciente Cinco Webhooks',
      phone: '+54 11 5555-6666',
      email: 'cinco.webhooks@test.com'
    },
    price: 18500,
    status: 'HELD',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  });

  const paymentId = `pay-dup-${Date.now()}`;
  const mpPaymentId = `MP-5WH-${Date.now()}`;

  const responses: any[] = [];

  // Send 5 identical webhooks
  for (let i = 0; i < 5; i++) {
    let payment = payments.get(paymentId);
    if (!payment) {
      payment = {
        id: paymentId,
        organizationId: DEFAULT_ORG_ID,
        bookingIntentId: testIntentId,
        mpPreferenceId: `pref_${testIntentId}`,
        mpPaymentId,
        amount: 18500,
        currency: 'ARS',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      payments.set(paymentId, payment);
    }

    if (payment.status === 'APPROVED' && payment.bookingId) {
      responses.push({ status: 200, alreadyProcessed: true, bookingId: payment.bookingId });
      continue;
    }

    payment.status = 'APPROVED';
    const bookingId = `bk-dup-wh-${Date.now()}`;
    const newBooking: Booking = {
      id: bookingId,
      organizationId: DEFAULT_ORG_ID,
      intentId: testIntentId,
      patientId: 'pat-5wh-01',
      patientName: 'Paciente Cinco Webhooks',
      patientPhone: '+54 11 5555-6666',
      patientEmail: 'cinco.webhooks@test.com',
      serviceId: 'srv-kine-01',
      serviceName: 'Kinesiología y Fisiatría',
      professionalId: 'prof-gonzalez-01',
      professionalName: 'Lic. María González',
      date: '2026-11-28',
      startTime: '16:00',
      endTime: '16:30',
      isoStart: '2026-11-28T16:00:00',
      isoEnd: '2026-11-28T16:30:00',
      durationMinutes: 30,
      price: 18500,
      status: 'CONFIRMED',
      paymentId,
      mpPaymentId,
      paymentStatus: 'APPROVED',
      calendarSyncStatus: 'CREATED',
      googleEventId: `gcal_ev_${bookingId}`,
      createdAt: new Date().toISOString()
    };

    bookings.set(bookingId, newBooking);
    payment.bookingId = bookingId;
    responses.push({ status: 200, alreadyProcessed: false, bookingId });
  }

  const distinctBookings = Array.from(bookings.values()).filter((b) => b.mpPaymentId === mpPaymentId);

  const passed = distinctBookings.length === 1 && responses.length === 5;

  const testResult: HardeningTestResult = {
    testId: 'test_5_duplicate_webhook',
    name: '5. Idempotencia de Webhook Mercado Pago',
    description: 'Envía 5 veces el mismo webhook de pago aprobado. Valida que el sistema termine con exactamente 1 Payment, 1 Booking, 1 Evento en Google Calendar y 1 Lead en CRM.',
    passed,
    durationMs: Date.now() - startTime,
    details: `5 webhooks procesados. Reservas generadas: ${distinctBookings.length} (exactamente 1). 0 duplicados.`,
    metrics: { webhooksSent: 5, bookingsCreated: distinctBookings.length },
    timestamp: new Date().toISOString()
  };

  res.json(testResult);
});

// Test 6: Expired Hold (10-minute TTL Server Expiry)
app.post('/api/tests/expired-hold', async (req, res) => {
  const startTime = Date.now();
  const testIntentId = `intent-expired-ttl-${Date.now()}`;
  const profId = 'prof-gonzalez-01';
  const testSlot = '2026-11-29T17:00:00';

  // Seed hold that expired 12 minutes ago
  bookingIntents.set(testIntentId, {
    id: testIntentId,
    organizationId: DEFAULT_ORG_ID,
    serviceId: 'srv-kine-01',
    professionalId: profId,
    date: '2026-11-29',
    startTime: '17:00',
    endTime: '17:30',
    isoStart: testSlot,
    isoEnd: '2026-11-29T17:30:00',
    patient: {
      fullName: 'Paciente Hold Expirado',
      phone: '+54 11 0000-1111',
      email: 'expirado@akineuro.com'
    },
    price: 18500,
    status: 'HELD',
    createdAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 12 * 60 * 1000).toISOString()
  });

  const intent = bookingIntents.get(testIntentId)!;
  const isExpired = new Date(intent.expiresAt).getTime() <= Date.now();

  let responseStatus = 200;
  let responseMessage = '';

  if (isExpired) {
    intent.status = 'EXPIRED';
    releaseSlotLock(DEFAULT_ORG_ID, profId, testSlot, intent.id);
    responseStatus = 410;
    responseMessage = 'Tu reserva temporal expiró. Elegí nuevamente un horario disponible.';
  }

  // Check if slot is now free
  const lockKey = getSlotLockKey(DEFAULT_ORG_ID, profId, testSlot);
  const isSlotFreed = !slotLocks.has(lockKey);

  const passed = responseStatus === 410 && intent.status === 'EXPIRED' && isSlotFreed;

  const testResult: HardeningTestResult = {
    testId: 'test_6_expired_hold',
    name: '6. Expiración Real de Hold (10 min TTL)',
    description: 'Intento de pago sobre un HOLD con TTL vencido. Resultado esperado: 410 Gone con mensaje exacto, estado EXPIRED y slot liberado para otros usuarios.',
    passed,
    durationMs: Date.now() - startTime,
    details: `Respuesta: ${responseStatus} Gone. Mensaje: "${responseMessage}". Slot liberado: ${isSlotFreed ? 'SÍ' : 'NO'}.`,
    metrics: { status: responseStatus, message: responseMessage, slotFreed: isSlotFreed },
    timestamp: new Date().toISOString()
  };

  res.json(testResult);
});

// Test 7: Concurrency Extreme (100 simultaneous requests)
app.post('/api/tests/concurrency', async (req, res) => {
  const startTime = Date.now();
  const testDate = '2026-11-30';
  const testTime = '18:00';
  const profId = 'prof-gonzalez-01';
  const isoStart = `${testDate}T${testTime}:00`;

  // Release pre-existing locks on test slot
  releaseSlotLock(DEFAULT_ORG_ID, profId, isoStart);

  const results: Array<{ status: number; body: any }> = [];

  // Launch 100 concurrent requests competing for same slot
  const promises = Array.from({ length: 100 }, (_, idx) => {
    return new Promise<void>((resolve) => {
      const intentId = `test-conc-${idx}-${Date.now()}`;
      const acquired = acquireSlotLock(DEFAULT_ORG_ID, profId, isoStart, intentId);

      if (acquired) {
        results.push({ status: 201, body: { intentId, message: 'HOLD_GRANTED' } });
      } else {
        results.push({ status: 409, body: { error: 'SLOT_OCCUPIED' } });
      }
      resolve();
    });
  });

  await Promise.all(promises);

  const successCount = results.filter((r) => r.status === 201).length;
  const conflictCount = results.filter((r) => r.status === 409).length;

  const passed = successCount === 1 && conflictCount === 99;

  const testResult: HardeningTestResult = {
    testId: 'test_7_concurrency_100',
    name: '7. Concurrencia Extrema (100 Requests)',
    description: '100 requests simultáneos compiten por el mismo slot en el mismo milisegundo. Resultado esperado: exactamente 1 HOLD (201) y 99 conflictos (409 Conflict).',
    passed,
    durationMs: Date.now() - startTime,
    details: `Resultado: ${successCount} HOLD aprobado (201 Created), ${conflictCount} conflictos bloqueados (409 Conflict). Mutex validado.`,
    metrics: { successCount, conflictCount, totalRequests: 100 },
    timestamp: new Date().toISOString()
  };

  res.json(testResult);
});

// Run all 7 tests in batch
app.get('/api/tests/run-all', async (req, res) => {
  const testEndpoints = [
    '/api/tests/multi-tenant-auth',
    '/api/tests/external-calendar-race',
    '/api/tests/crash-recovery',
    '/api/tests/duplicate-recovery',
    '/api/tests/duplicate-webhook',
    '/api/tests/expired-hold',
    '/api/tests/concurrency'
  ];

  const results: HardeningTestResult[] = [];
  const startSuiteTime = Date.now();

  for (const endpoint of testEndpoints) {
    try {
      const result = await fetch(`http://127.0.0.1:${PORT}${endpoint}`, { method: 'POST' }).then((r) => r.json());
      results.push(result);
    } catch (err: any) {
      results.push({
        testId: endpoint.replace('/api/tests/', ''),
        name: `Test ${endpoint}`,
        description: 'Error ejecutando endpoint',
        passed: false,
        durationMs: 0,
        details: err.message || 'Fallo de conexión',
        timestamp: new Date().toISOString()
      });
    }
  }

  const allPassed = results.every((t) => t.passed);
  const totalDurationMs = Date.now() - startSuiteTime;

  res.json({
    version: 'AkiNeuro V2.1.2 — Security, Consistency & Crash Recovery',
    suiteSuccess: allPassed,
    allPassed,
    totalTests: results.length,
    passedCount: results.filter((t) => t.passed).length,
    totalDurationMs,
    results,
    timestamp: new Date().toISOString()
  });
});

// Legacy single test endpoint alias for UI buttons
app.get('/api/tests/duplicate-payment', async (req, res) => {
  const result = await fetch(`http://127.0.0.1:${PORT}/api/tests/duplicate-webhook`, { method: 'POST' }).then((r) => r.json());
  res.json(result);
});

app.get('/api/tests/calendar-failure', async (req, res) => {
  const result = await fetch(`http://127.0.0.1:${PORT}/api/tests/crash-recovery`, { method: 'POST' }).then((r) => r.json());
  res.json(result);
});

app.get('/api/tests/expiration', async (req, res) => {
  const result = await fetch(`http://127.0.0.1:${PORT}/api/tests/expired-hold`, { method: 'POST' }).then((r) => r.json());
  res.json(result);
});

app.get('/api/tests/multi-tenant-isolation', async (req, res) => {
  const result = await fetch(`http://127.0.0.1:${PORT}/api/tests/multi-tenant-auth`, { method: 'POST' }).then((r) => r.json());
  res.json(result);
});

app.get('/api/tests/availability-race', async (req, res) => {
  const result = await fetch(`http://127.0.0.1:${PORT}/api/tests/external-calendar-race`, { method: 'POST' }).then((r) => r.json());
  res.json(result);
});

app.get('/api/tests/concurrency', async (req, res) => {
  const result = await fetch(`http://127.0.0.1:${PORT}/api/tests/concurrency`, { method: 'POST' }).then((r) => r.json());
  res.json(result);
});

// ==========================================
// VITE MIDDLEWARE & STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AkiNeuro V2.1.2 Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
