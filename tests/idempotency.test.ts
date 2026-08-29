import { describe, it, expect, beforeEach } from 'vitest';
import { SlotLockManager, WebhookProcessor, StoreState } from '../src/core/bookingEngine';

describe('Idempotency & Duplicate Webhook Processing Suite', () => {
  let lockManager: SlotLockManager;
  let store: StoreState;

  const DEFAULT_ORG_ID = 'org-akineuro-01';
  const testIntentId = 'intent-idemp-test-01';
  const testProfId = 'prof-gonzalez-01';
  const testServiceId = 'srv-kine-01';
  const testSlot = '2026-11-28T16:00:00';

  beforeEach(() => {
    lockManager = new SlotLockManager();
    store = {
      organizations: new Map([[DEFAULT_ORG_ID, { id: DEFAULT_ORG_ID, name: 'AkiNeuro Central' }]]),
      professionals: new Map([
        [
          testProfId,
          {
            id: testProfId,
            organizationId: DEFAULT_ORG_ID,
            name: 'Lic. María González',
            email: 'mgonzalez@akineuro.com.ar',
            googleCalendarEmail: 'maria.gonzalez.kine@gmail.com'
          }
        ]
      ]),
      services: new Map([
        [
          testServiceId,
          {
            id: testServiceId,
            organizationId: DEFAULT_ORG_ID,
            name: 'Kinesiología y Fisiatría',
            durationMinutes: 30,
            price: 18500
          }
        ]
      ]),
      bookingIntents: new Map([
        [
          testIntentId,
          {
            id: testIntentId,
            organizationId: DEFAULT_ORG_ID,
            serviceId: testServiceId,
            professionalId: testProfId,
            date: '2026-11-28',
            startTime: '16:00',
            endTime: '16:30',
            isoStart: testSlot,
            isoEnd: '2026-11-28T16:30:00',
            patient: {
              fullName: 'Paciente Idempotencia',
              phone: '+54 11 5555-6666',
              email: 'idempotencia@akineuro.com'
            },
            price: 18500,
            status: 'HELD',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
          }
        ]
      ]),
      payments: new Map(),
      bookings: new Map(),
      calendarEvents: new Map(),
      crmLeads: new Map(),
      auditLogs: new Map()
    };

    // Pre-lock slot with intent
    lockManager.acquireLock(DEFAULT_ORG_ID, testProfId, testSlot, testIntentId);
  });

  it('guarantees exactly 1 Booking, 1 Payment, 1 Calendar Event and 1 CRM Lead when 5 identical webhooks arrive', () => {
    const mpPaymentId = 'MP-PAYMENT-IDEMP-9988';
    const webhookResults: any[] = [];

    // Send 5 identical webhook deliveries
    for (let i = 0; i < 5; i++) {
      const res = WebhookProcessor.processPaymentWebhook(
        {
          tenantId: DEFAULT_ORG_ID,
          mpPaymentId,
          bookingIntentId: testIntentId,
          status: 'APPROVED',
          paymentMethod: 'Tarjeta de Débito Visa'
        },
        store,
        lockManager
      );
      webhookResults.push(res);
    }

    // 1. All 5 responses return 200 OK
    expect(webhookResults.every((r) => r.statusCode === 200)).toBe(true);

    // 2. First webhook processed the payment, next 4 recognized duplicate
    expect(webhookResults[0].alreadyProcessed).toBe(false);
    expect(webhookResults[1].alreadyProcessed).toBe(true);
    expect(webhookResults[2].alreadyProcessed).toBe(true);
    expect(webhookResults[3].alreadyProcessed).toBe(true);
    expect(webhookResults[4].alreadyProcessed).toBe(true);

    // 3. All 5 return the exact same bookingId
    const firstBookingId = webhookResults[0].bookingId;
    expect(firstBookingId).toBeDefined();
    for (const r of webhookResults) {
      expect(r.bookingId).toBe(firstBookingId);
    }

    // 4. Exact record counts in store
    const bookingsForMp = Array.from(store.bookings.values()).filter((b) => b.mpPaymentId === mpPaymentId);
    expect(bookingsForMp.length).toBe(1);

    const paymentsForMp = Array.from(store.payments.values()).filter((p) => p.mpPaymentId === mpPaymentId);
    expect(paymentsForMp.length).toBe(1);
    expect(paymentsForMp[0].status).toBe('APPROVED');

    const calendarEventsForBooking = Array.from(store.calendarEvents.values()).filter(
      (e) => e.bookingId === firstBookingId
    );
    expect(calendarEventsForBooking.length).toBe(1);

    const crmLeadsForIntent = Array.from(store.crmLeads.values()).filter((l) => l.intentId === testIntentId);
    expect(crmLeadsForIntent.length).toBe(1);
    expect(crmLeadsForIntent[0].status).toBe('CONFIRMED');
    expect(crmLeadsForIntent[0].paymentStatus).toBe('APPROVED');
  });

  it('rejects webhooks with mismatched tenant IDs', () => {
    const res = WebhookProcessor.processPaymentWebhook(
      {
        tenantId: 'org-tenant-b-mismatched',
        mpPaymentId: 'MP-MISMATCH-123',
        bookingIntentId: testIntentId,
        status: 'APPROVED'
      },
      store,
      lockManager
    );

    expect(res.statusCode).toBe(404);
    expect(res.alreadyProcessed).toBe(false);
  });
});
