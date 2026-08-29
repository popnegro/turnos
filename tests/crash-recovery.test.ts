import { describe, it, expect, beforeEach } from 'vitest';
import { CrashRecoveryWorker, StoreState } from '../src/core/bookingEngine';
import { Booking } from '../src/types';

describe('Crash Recovery & Worker Idempotency Suite', () => {
  let store: StoreState;
  const DEFAULT_ORG_ID = 'org-akineuro-01';
  const profId = 'prof-gonzalez-01';

  beforeEach(() => {
    CrashRecoveryWorker.clearLocks();
    store = {
      organizations: new Map([[DEFAULT_ORG_ID, { id: DEFAULT_ORG_ID, name: 'AkiNeuro' }]]),
      professionals: new Map([
        [
          profId,
          {
            id: profId,
            organizationId: DEFAULT_ORG_ID,
            name: 'Lic. María González',
            email: 'mgonzalez@akineuro.com.ar',
            googleCalendarEmail: 'maria.gonzalez.kine@gmail.com'
          }
        ]
      ]),
      services: new Map(),
      bookingIntents: new Map(),
      payments: new Map(),
      bookings: new Map(),
      calendarEvents: new Map(),
      crmLeads: new Map(),
      auditLogs: new Map()
    };
  });

  it('recovers un-synced bookings post crash and sets status to CONFIRMED with Google Calendar event', async () => {
    const testBkId = 'bk-crash-test-01';

    // Simulate state where payment was approved before crash, but calendar sync was pending
    const crashedBooking: Booking = {
      id: testBkId,
      organizationId: DEFAULT_ORG_ID,
      intentId: 'intent-crash-01',
      patientId: 'pat-crash-01',
      patientName: 'Paciente Recuperado',
      patientPhone: '+54 11 3333-4444',
      patientEmail: 'recuperado@akineuro.com',
      serviceId: 'srv-kine-01',
      serviceName: 'Kinesiología y Fisiatría',
      professionalId: profId,
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

    store.bookings.set(testBkId, crashedBooking);

    // Trigger recovery worker
    const recoveryResult = await CrashRecoveryWorker.runRecovery(store);

    expect(recoveryResult.recoveredCount).toBe(1);

    const recovered = store.bookings.get(testBkId)!;
    expect(recovered.status).toBe('CONFIRMED');
    expect(recovered.calendarSyncStatus).toBe('CREATED');
    expect(recovered.googleEventId).toBe(`gcal_ev_${testBkId}`);

    // Verify Google Calendar event was created with deterministic ID
    const gcalEvent = store.calendarEvents.get(`gcal_ev_${testBkId}`);
    expect(gcalEvent).toBeDefined();
    expect(gcalEvent?.calendarId).toBe('maria.gonzalez.kine@gmail.com');
    expect(gcalEvent?.bookingId).toBe(testBkId);
  });

  it('guarantees idempotency when two recovery workers execute concurrently on the same booking', async () => {
    const testBkId = 'bk-concurrent-recovery-02';

    store.bookings.set(testBkId, {
      id: testBkId,
      organizationId: DEFAULT_ORG_ID,
      intentId: 'intent-conc-recov',
      patientId: 'pat-conc-02',
      patientName: 'Paciente Doble Worker',
      patientPhone: '+54 11 9999-0000',
      patientEmail: 'doble.worker@test.com',
      serviceId: 'srv-kine-01',
      serviceName: 'Kinesiología',
      professionalId: profId,
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

    // Run two recovery workers simultaneously
    const [w1, w2] = await Promise.all([
      CrashRecoveryWorker.runRecovery(store),
      CrashRecoveryWorker.runRecovery(store)
    ]);

    // Total recovered across workers must be 1
    expect(w1.recoveredCount + w2.recoveredCount).toBe(1);

    // Exactly 1 Google Calendar event exists for this booking
    const eventsForBooking = Array.from(store.calendarEvents.values()).filter(
      (e) => e.bookingId === testBkId || e.id === `gcal_ev_${testBkId}`
    );
    expect(eventsForBooking.length).toBe(1);
  });
});
