import {
  Booking,
  BookingIntent,
  CalendarEvent,
  CrmLead,
  Payment,
  SlotStatus
} from '../types';

export interface SlotLockEntry {
  intentId: string;
  expiresAt: number; // Unix timestamp in ms
}

export interface AdminIdentity {
  id: string;
  username: string;
  role: 'SUPERADMIN' | 'TENANT_ADMIN' | 'STAFF';
  token: string;
  authorizedOrganizations: string[];
}

export interface StoreState {
  organizations: Map<string, any>;
  professionals: Map<string, any>;
  services: Map<string, any>;
  bookingIntents: Map<string, BookingIntent>;
  payments: Map<string, Payment>;
  bookings: Map<string, Booking>;
  calendarEvents: Map<string, CalendarEvent>;
  crmLeads: Map<string, CrmLead>;
  auditLogs: Map<string, any>;
}

// =========================================================================
// 1. SLOT LOCK & MUTEX ENGINE (CONCURRENCY & TTL)
// =========================================================================
export class SlotLockManager {
  private locks = new Map<string, SlotLockEntry>();

  public getLockKey(orgId: string, profId: string, isoStart: string): string {
    return `${orgId}:${profId}:${isoStart}`;
  }

  public acquireLock(
    orgId: string,
    profId: string,
    isoStart: string,
    intentId: string,
    ttlMs: number = 10 * 60 * 1000,
    now: number = Date.now()
  ): boolean {
    const key = this.getLockKey(orgId, profId, isoStart);
    const existing = this.locks.get(key);

    if (existing && existing.expiresAt > now && existing.intentId !== intentId) {
      return false; // Active lock held by another intent
    }

    this.locks.set(key, {
      intentId,
      expiresAt: now + ttlMs
    });
    return true;
  }

  public releaseLock(
    orgId: string,
    profId: string,
    isoStart: string,
    intentId?: string
  ): boolean {
    const key = this.getLockKey(orgId, profId, isoStart);
    const existing = this.locks.get(key);
    if (!existing) return false;

    if (!intentId || existing.intentId === intentId) {
      this.locks.delete(key);
      return true;
    }
    return false;
  }

  public isLocked(
    orgId: string,
    profId: string,
    isoStart: string,
    now: number = Date.now(),
    excludeIntentId?: string
  ): boolean {
    const key = this.getLockKey(orgId, profId, isoStart);
    const existing = this.locks.get(key);
    if (!existing) return false;
    if (existing.expiresAt <= now) {
      this.locks.delete(key);
      return false;
    }
    if (excludeIntentId && existing.intentId === excludeIntentId) {
      return false;
    }
    return true;
  }

  public cleanExpiredLocks(now: number = Date.now()): number {
    let freedCount = 0;
    for (const [key, entry] of this.locks.entries()) {
      if (entry.expiresAt <= now) {
        this.locks.delete(key);
        freedCount++;
      }
    }
    return freedCount;
  }

  public getLockCount(): number {
    return this.locks.size;
  }

  public clear(): void {
    this.locks.clear();
  }
}

// =========================================================================
// 2. MULTI-TENANT AUTHORIZATION ENGINE
// =========================================================================
export class MultiTenantAuthorizer {
  public static verifyAdminAuthorization(
    identity: AdminIdentity | null | undefined,
    targetOrgId: string
  ): { authorized: boolean; statusCode: number; reason?: string } {
    if (!identity) {
      return {
        authorized: false,
        statusCode: 401,
        reason: 'UNAUTHORIZED: Se requiere sesión o API Key de administrador válida.'
      };
    }

    if (identity.role === 'SUPERADMIN' || identity.authorizedOrganizations.includes(targetOrgId)) {
      return { authorized: true, statusCode: 200 };
    }

    return {
      authorized: false,
      statusCode: 403,
      reason: `TENANT_FORBIDDEN: La identidad (${identity.username}) no tiene autorización sobre la organización ${targetOrgId}.`
    };
  }

  public static verifyResourceTenant(
    resourceOrgId: string,
    requestTenantId: string
  ): { authorized: boolean; statusCode: number; reason?: string } {
    if (resourceOrgId === requestTenantId) {
      return { authorized: true, statusCode: 200 };
    }
    return {
      authorized: false,
      statusCode: 403,
      reason: 'TENANT_FORBIDDEN: El recurso solicitado pertenece a otra organización.'
    };
  }
}

// =========================================================================
// 3. EXTERNAL CALENDAR COLLISION DETECTOR
// =========================================================================
export class CalendarCollisionDetector {
  public static checkCollision(
    events: CalendarEvent[],
    targetCalendarId: string,
    isoStart: string,
    isoEnd: string
  ): { hasCollision: boolean; conflictingEvent?: CalendarEvent } {
    const conflictingEvent = events.find(
      (ev) =>
        ev.calendarId.toLowerCase() === targetCalendarId.toLowerCase() &&
        ev.start < isoEnd &&
        ev.end > isoStart
    );

    return {
      hasCollision: Boolean(conflictingEvent),
      conflictingEvent
    };
  }
}

// =========================================================================
// 4. HOLD & TTL EXPIRATION ENGINE
// =========================================================================
export class HoldExpirationEngine {
  public static validateHold(
    intent: BookingIntent | undefined,
    lockManager: SlotLockManager,
    now: number = Date.now()
  ): { valid: boolean; statusCode: number; error?: string; message?: string } {
    if (!intent) {
      return {
        valid: false,
        statusCode: 404,
        error: 'INTENT_NOT_FOUND',
        message: 'La intención de reserva no existe.'
      };
    }

    if (intent.status !== 'HELD') {
      return {
        valid: false,
        statusCode: 400,
        error: 'INVALID_STATUS',
        message: `La intención está en estado ${intent.status}, no puede procesarse.`
      };
    }

    const expiresAtTime = new Date(intent.expiresAt).getTime();
    if (expiresAtTime <= now) {
      // Auto-expire
      intent.status = 'EXPIRED';
      lockManager.releaseLock(intent.organizationId, intent.professionalId, intent.isoStart, intent.id);
      return {
        valid: false,
        statusCode: 410,
        error: 'HOLD_EXPIRED',
        message: 'Tu reserva temporal expiró. Elegí nuevamente un horario disponible.'
      };
    }

    return { valid: true, statusCode: 200 };
  }
}

// =========================================================================
// 5. IDEMPOTENT MERCADO PAGO WEBHOOK PROCESSOR
// =========================================================================
export class WebhookProcessor {
  public static processPaymentWebhook(
    payload: {
      tenantId: string;
      paymentId?: string;
      mpPaymentId: string;
      bookingIntentId?: string;
      status: 'APPROVED' | 'REJECTED' | 'PENDING';
      paymentMethod?: string;
    },
    store: StoreState,
    lockManager: SlotLockManager
  ): {
    statusCode: number;
    alreadyProcessed: boolean;
    bookingId?: string;
    payment?: Payment;
    error?: string;
  } {
    const { tenantId, paymentId, mpPaymentId, bookingIntentId, status, paymentMethod } = payload;

    // 1. Check if already processed by mpPaymentId (Global idempotency check)
    const existingBookingWithMp = Array.from(store.bookings.values()).find(
      (b) => b.mpPaymentId === mpPaymentId && b.organizationId === tenantId
    );

    if (existingBookingWithMp) {
      return {
        statusCode: 200,
        alreadyProcessed: true,
        bookingId: existingBookingWithMp.id,
        payment: Array.from(store.payments.values()).find((p) => p.mpPaymentId === mpPaymentId)
      };
    }

    // 2. Locate or create payment record
    let payment: Payment | undefined;
    if (paymentId) {
      payment = store.payments.get(paymentId);
    } else if (bookingIntentId) {
      payment = Array.from(store.payments.values()).find((p) => p.bookingIntentId === bookingIntentId);
    }

    const intentId = payment?.bookingIntentId || bookingIntentId;
    if (!intentId) {
      return { statusCode: 400, alreadyProcessed: false, error: 'Missing bookingIntentId' };
    }

    const intent = store.bookingIntents.get(intentId);
    if (!intent || intent.organizationId !== tenantId) {
      return { statusCode: 404, alreadyProcessed: false, error: 'Intent not found or tenant mismatch' };
    }

    if (!payment) {
      payment = {
        id: `pay-${Date.now()}`,
        organizationId: tenantId,
        bookingIntentId: intent.id,
        mpPreferenceId: `pref_${intent.id}`,
        mpPaymentId,
        amount: intent.price,
        currency: 'ARS',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      store.payments.set(payment.id, payment);
    }

    // If payment already marked approved and has booking, return idempotent 200
    if (payment.status === 'APPROVED' && payment.bookingId) {
      return {
        statusCode: 200,
        alreadyProcessed: true,
        bookingId: payment.bookingId,
        payment
      };
    }

    payment.mpPaymentId = mpPaymentId;
    payment.paymentMethod = paymentMethod || 'Mercado Pago Checkout';

    if (status === 'APPROVED') {
      payment.status = 'APPROVED';
      payment.approvedAt = new Date().toISOString();
      intent.status = 'CONVERTED';

      const bookingId = `bk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const prof = store.professionals.get(intent.professionalId);
      const srv = store.services.get(intent.serviceId);

      const deterministicEventId = `gcal_ev_${bookingId}`;

      const newBooking: Booking = {
        id: bookingId,
        organizationId: tenantId,
        intentId: intent.id,
        patientId: `pat-${Date.now()}`,
        patientName: intent.patient.fullName,
        patientPhone: intent.patient.phone,
        patientEmail: intent.patient.email,
        serviceId: intent.serviceId,
        serviceName: srv?.name || 'Servicio Kinesiología',
        professionalId: intent.professionalId,
        professionalName: prof?.name || 'Profesional AkiNeuro',
        date: intent.date,
        startTime: intent.startTime,
        endTime: intent.endTime,
        isoStart: intent.isoStart,
        isoEnd: intent.isoEnd,
        durationMinutes: srv?.durationMinutes || 30,
        price: intent.price,
        status: 'CONFIRMED',
        paymentId: payment.id,
        mpPaymentId,
        paymentStatus: 'APPROVED',
        calendarSyncStatus: 'CREATED',
        googleEventId: deterministicEventId,
        createdAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString()
      };

      store.bookings.set(bookingId, newBooking);
      payment.bookingId = bookingId;

      // Sync Google Calendar event deterministically
      const calendarTargetEmail = prof?.googleCalendarEmail || prof?.email || 'agenda@akineuro.com.ar';
      store.calendarEvents.set(deterministicEventId, {
        id: deterministicEventId,
        calendarId: calendarTargetEmail,
        title: `Turno: ${intent.patient.fullName} - ${srv?.name || 'Kinesiología'}`,
        start: intent.isoStart,
        end: intent.isoEnd,
        patientName: intent.patient.fullName,
        serviceName: srv?.name,
        bookingId,
        createdVia: 'booking'
      });

      // Update or create CRM Lead
      const existingLead = Array.from(store.crmLeads.values()).find((l) => l.intentId === intent.id);
      if (existingLead) {
        existingLead.status = 'CONFIRMED';
        existingLead.paymentStatus = 'APPROVED';
        existingLead.bookingId = bookingId;
        existingLead.lastActivityAt = new Date().toISOString();
      } else {
        const leadId = `lead-${Date.now()}`;
        store.crmLeads.set(leadId, {
          id: leadId,
          organizationId: tenantId,
          fullName: intent.patient.fullName,
          phone: intent.patient.phone,
          email: intent.patient.email,
          serviceId: intent.serviceId,
          serviceName: srv?.name || 'Kinesiología',
          professionalId: intent.professionalId,
          professionalName: prof?.name || 'Profesional',
          bookingId,
          intentId: intent.id,
          date: intent.date,
          time: intent.startTime,
          status: 'CONFIRMED',
          paymentStatus: 'APPROVED',
          amount: intent.price,
          createdAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString()
        });
      }

      // Slot remains occupied, lock freed
      lockManager.releaseLock(tenantId, intent.professionalId, intent.isoStart, intent.id);

      return {
        statusCode: 200,
        alreadyProcessed: false,
        bookingId,
        payment
      };
    } else {
      payment.status = status;
      return {
        statusCode: 200,
        alreadyProcessed: false,
        payment
      };
    }
  }
}

// =========================================================================
// 6. CRASH RECOVERY WORKER ENGINE (IDEMPOTENT EVENT GENERATION)
// =========================================================================
export class CrashRecoveryWorker {
  private static activeRecoveryLocks = new Set<string>();

  public static async runRecovery(store: StoreState): Promise<{
    recoveredCount: number;
    details: string[];
  }> {
    const details: string[] = [];
    let recoveredCount = 0;

    const unrecovered = Array.from(store.bookings.values()).filter(
      (b) =>
        b.paymentStatus === 'APPROVED' &&
        (b.calendarSyncStatus === 'PENDING' ||
          b.calendarSyncStatus === 'FAILED' ||
          b.status === 'CALENDAR_SYNC_PENDING' ||
          b.status === 'PAYMENT_APPROVED')
    );

    for (const booking of unrecovered) {
      if (this.activeRecoveryLocks.has(booking.id)) {
        continue; // Prevent concurrent execution
      }

      try {
        this.activeRecoveryLocks.add(booking.id);

        const deterministicEventId = `gcal_ev_${booking.id}`;
        const prof = store.professionals.get(booking.professionalId);
        const calendarTargetEmail = prof?.googleCalendarEmail || prof?.email || 'agenda@akineuro.com.ar';

        const existingEvent = store.calendarEvents.get(deterministicEventId);
        if (!existingEvent) {
          store.calendarEvents.set(deterministicEventId, {
            id: deterministicEventId,
            calendarId: calendarTargetEmail,
            title: `Turno: ${booking.patientName} - ${booking.serviceName}`,
            start: booking.isoStart,
            end: booking.isoEnd,
            patientName: booking.patientName,
            serviceName: booking.serviceName,
            bookingId: booking.id,
            createdVia: 'sync'
          });
        }

        booking.calendarSyncStatus = 'CREATED';
        booking.googleEventId = deterministicEventId;
        booking.status = 'CONFIRMED';
        booking.confirmedAt = booking.confirmedAt || new Date().toISOString();

        recoveredCount++;
        details.push(`Reserva ${booking.id} recuperada exitosamente.`);
      } finally {
        this.activeRecoveryLocks.delete(booking.id);
      }
    }

    return { recoveredCount, details };
  }

  public static clearLocks(): void {
    this.activeRecoveryLocks.clear();
  }
}
