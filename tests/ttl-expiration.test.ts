import { describe, it, expect, beforeEach } from 'vitest';
import { HoldExpirationEngine, SlotLockManager } from '../src/core/bookingEngine';
import { BookingIntent } from '../src/types';

describe('TTL & Expired Hold Suite (10-Minute Timeout)', () => {
  let lockManager: SlotLockManager;
  const DEFAULT_ORG_ID = 'org-akineuro-01';
  const profId = 'prof-gonzalez-01';
  const testSlot = '2026-11-29T17:00:00';

  beforeEach(() => {
    lockManager = new SlotLockManager();
  });

  it('permits payment processing when hold is within 10-minute TTL', () => {
    const now = Date.now();
    const intent: BookingIntent = {
      id: 'intent-active-ttl',
      organizationId: DEFAULT_ORG_ID,
      serviceId: 'srv-kine-01',
      professionalId: profId,
      date: '2026-11-29',
      startTime: '17:00',
      endTime: '17:30',
      isoStart: testSlot,
      isoEnd: '2026-11-29T17:30:00',
      patient: {
        fullName: 'Paciente Activo',
        phone: '+54 11 1111-2222',
        email: 'activo@akineuro.com'
      },
      price: 18500,
      status: 'HELD',
      createdAt: new Date(now - 2 * 60 * 1000).toISOString(),
      expiresAt: new Date(now + 8 * 60 * 1000).toISOString() // 8 minutes remaining
    };

    lockManager.acquireLock(DEFAULT_ORG_ID, profId, testSlot, intent.id);

    const validation = HoldExpirationEngine.validateHold(intent, lockManager, now);

    expect(validation.valid).toBe(true);
    expect(validation.statusCode).toBe(200);
    expect(intent.status).toBe('HELD');
    expect(lockManager.isLocked(DEFAULT_ORG_ID, profId, testSlot, now)).toBe(true);
  });

  it('rejects expired holds with 410 Gone, marks intent EXPIRED and automatically releases slot lock', () => {
    const now = Date.now();
    const intent: BookingIntent = {
      id: 'intent-expired-ttl',
      organizationId: DEFAULT_ORG_ID,
      serviceId: 'srv-kine-01',
      professionalId: profId,
      date: '2026-11-29',
      startTime: '17:00',
      endTime: '17:30',
      isoStart: testSlot,
      isoEnd: '2026-11-29T17:30:00',
      patient: {
        fullName: 'Paciente Expirado',
        phone: '+54 11 0000-1111',
        email: 'expirado@akineuro.com'
      },
      price: 18500,
      status: 'HELD',
      createdAt: new Date(now - 20 * 60 * 1000).toISOString(),
      expiresAt: new Date(now - 10 * 60 * 1000).toISOString() // Expired 10 min ago
    };

    lockManager.acquireLock(DEFAULT_ORG_ID, profId, testSlot, intent.id);

    const validation = HoldExpirationEngine.validateHold(intent, lockManager, now);

    expect(validation.valid).toBe(false);
    expect(validation.statusCode).toBe(410);
    expect(validation.error).toBe('HOLD_EXPIRED');
    expect(intent.status).toBe('EXPIRED');

    // Slot is now freed
    expect(lockManager.isLocked(DEFAULT_ORG_ID, profId, testSlot, now)).toBe(false);

    // Another user can immediately acquire the slot
    const newAcquire = lockManager.acquireLock(DEFAULT_ORG_ID, profId, testSlot, 'intent-new-user');
    expect(newAcquire).toBe(true);
  });

  it('cleans expired locks during periodic sweep', () => {
    const now = Date.now();
    lockManager.acquireLock(DEFAULT_ORG_ID, profId, '2026-11-29T09:00:00', 'intent-old-1', 1000, now - 5000);
    lockManager.acquireLock(DEFAULT_ORG_ID, profId, '2026-11-29T09:30:00', 'intent-old-2', 1000, now - 5000);
    lockManager.acquireLock(DEFAULT_ORG_ID, profId, '2026-11-29T10:00:00', 'intent-active', 600000, now);

    expect(lockManager.getLockCount()).toBe(3);

    const freed = lockManager.cleanExpiredLocks(now);
    expect(freed).toBe(2);
    expect(lockManager.getLockCount()).toBe(1);
  });
});
