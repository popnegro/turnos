export type SlotStatus = 'AVAILABLE' | 'HELD' | 'OCCUPIED';

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_APPROVED'
  | 'CALENDAR_SYNC_PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED';

export type IntentStatus = 'HELD' | 'PENDING_PAYMENT' | 'EXPIRED' | 'CONVERTED' | 'RELEASED';

export type CalendarSyncStatus = 'NOT_CREATED' | 'PENDING' | 'CREATED' | 'FAILED';

export type AuditEventType =
  | 'BOOKING_INTENT_CREATED'
  | 'SLOT_HELD'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'CALENDAR_SYNC_PENDING'
  | 'CALENDAR_EVENT_CREATED'
  | 'CALENDAR_SYNC_FAILED'
  | 'CALENDAR_SYNC_RETIRED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_EXPIRED'
  | 'BOOKING_CANCELLED'
  | 'SECURITY_VIOLATION_BLOCKED'
  | 'RECOVERY_WORKER_EXECUTED'
  | 'CRASH_RECOVERY_COMPLETED';

export interface AuditLog {
  id: string;
  correlationId: string;
  organizationId: string;
  event: AuditEventType;
  previousStatus?: string;
  newStatus?: string;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  currency: string;
  timeZone: string;
  logoUrl?: string;
  mercadoPagoPublicKey?: string;
  mercadoPagoAccessTokenConfigured?: boolean;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  start: string; // ISO String
  end: string;   // ISO String
  patientName?: string;
  serviceName?: string;
  bookingId?: string;
  createdVia: 'sync' | 'booking' | 'external';
}

export interface CalendarConnection {
  id: string;
  professionalId: string;
  provider: 'google';
  calendarId: string;
  calendarName: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSyncAt: string;
  eventsCount: number;
}

export interface Service {
  id: string;
  organizationId: string;
  name: string;
  category: string;
  description: string;
  durationMinutes: number;
  price: number;
  active: boolean;
  color?: string;
}

export interface WorkingHours {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start: string;     // "08:30"
  end: string;       // "19:00"
  enabled: boolean;
}

export interface Professional {
  id: string;
  organizationId: string;
  name: string;
  title: string; // e.g. "Lic. en Kinesiología y Fisiatría (M.N. 14.820)"
  specialty: string;
  avatarUrl: string;
  email: string;
  phone: string;
  bio: string;
  serviceIds: string[];
  calendarConnectionId?: string;
  googleCalendarEmail?: string;
  durationMinutes: number; // default duration if not specified by service
  price: number;           // base price
  active: boolean;
  workingHours: WorkingHours[];
}

export interface Patient {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string;
  notes?: string;
  createdAt: string;
}

export interface TimeSlot {
  time: string;           // "09:00"
  endTime: string;        // "09:30"
  isoStart: string;       // "2026-09-01T09:00:00"
  isoEnd: string;         // "2026-09-01T09:30:00"
  status: SlotStatus;
  professionalId: string;
  professionalName: string;
  heldUntil?: string;     // ISO timestamp if held
  reason?: string;
}

export interface AvailabilityResponse {
  date: string;
  serviceId: string;
  professionalId?: string;
  slots: TimeSlot[];
  availableCount: number;
  totalCount: number;
}

export interface BookingIntent {
  id: string;
  organizationId: string;
  serviceId: string;
  professionalId: string;
  date: string;          // "2026-09-01"
  startTime: string;     // "10:30"
  endTime: string;       // "11:00"
  isoStart: string;
  isoEnd: string;
  patient: {
    fullName: string;
    phone: string;
    email: string;
    notes?: string;
  };
  price: number;
  status: IntentStatus;
  createdAt: string;
  expiresAt: string;     // 10 minutes TTL
}

export interface Payment {
  id: string;
  organizationId: string;
  bookingIntentId: string;
  bookingId?: string;
  externalReference?: string;
  idempotencyKey?: string;
  mpPreferenceId: string;
  mpPaymentId?: string;
  initPoint?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  statusDetail?: string;
  paymentMethod?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface Booking {
  id: string;
  organizationId: string;
  intentId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  date: string;
  startTime: string;
  endTime: string;
  isoStart: string;
  isoEnd: string;
  durationMinutes: number;
  price: number;
  status: BookingStatus;
  paymentId?: string;
  mpPaymentId?: string;
  paymentStatus: PaymentStatus;
  calendarSyncStatus: CalendarSyncStatus;
  googleEventId?: string;
  calendarSyncError?: string;
  idempotencyKey?: string;
  createdAt: string;
  confirmedAt?: string;
  notes?: string;
}

export interface HardeningTestResult {
  testId: string;
  name: string;
  description: string;
  passed: boolean;
  durationMs: number;
  details: string;
  metrics?: Record<string, any>;
  timestamp: string;
}

export interface CrmLead {
  id: string;
  organizationId: string;
  patientId?: string;
  fullName: string;
  phone: string;
  email: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  bookingId?: string;
  intentId?: string;
  date?: string;
  time?: string;
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
  amount?: number;
  createdAt: string;
  lastActivityAt: string;
  notes?: string;
}

export interface AdminStats {
  totalLeads: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingPaymentBookings: number;
  totalRevenue: number;
  conversionRate: number;
}
