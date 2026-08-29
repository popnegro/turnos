import { describe, it, expect, beforeEach } from 'vitest';
import { SlotLockManager } from '../src/core/bookingEngine';

describe('Concurrency & Slot Locking Suite (100 Concurrent Requests)', () => {
  let lockManager: SlotLockManager;

  beforeEach(() => {
    lockManager = new SlotLockManager();
  });

  it('allows exactly 1 acquisition out of 100 simultaneous requests for the same slot', async () => {
    const orgId = 'org-akineuro-01';
    const profId = 'prof-gonzalez-01';
    const isoStart = '2026-11-30T18:00:00';
    const totalRequests = 100;

    const results: Array<{ intentId: string; acquired: boolean }> = [];

    // Launch 100 concurrent promises competing for the same slot in the exact same tick
    const promises = Array.from({ length: totalRequests }, (_, index) => {
      return new Promise<void>((resolve) => {
        const intentId = `intent-conc-${index}-${Date.now()}`;
        const acquired = lockManager.acquireLock(orgId, profId, isoStart, intentId);
        results.push({ intentId, acquired });
        resolve();
      });
    });

    await Promise.all(promises);

    const acquiredCount = results.filter((r) => r.acquired).length;
    const rejectedCount = results.filter((r) => !r.acquired).length;

    expect(acquiredCount).toBe(1);
    expect(rejectedCount).toBe(99);
    expect(lockManager.getLockCount()).toBe(1);
  });

  it('allows same intentId to refresh/maintain its own lock without conflict', () => {
    const orgId = 'org-akineuro-01';
    const profId = 'prof-gonzalez-01';
    const isoStart = '2026-11-30T10:00:00';
    const intentId = 'intent-self-refresh';

    const firstAcquire = lockManager.acquireLock(orgId, profId, isoStart, intentId);
    expect(firstAcquire).toBe(true);

    // Same intent acquires again (e.g. extending or re-validating)
    const secondAcquire = lockManager.acquireLock(orgId, profId, isoStart, intentId);
    expect(secondAcquire).toBe(true);

    // Another intent attempts acquisition and fails
    const rivalAcquire = lockManager.acquireLock(orgId, profId, isoStart, 'intent-rival');
    expect(rivalAcquire).toBe(false);
  });

  it('allows independent slots and different professionals to be locked concurrently without cross-blocking', () => {
    const orgId = 'org-akineuro-01';
    const prof1 = 'prof-gonzalez-01';
    const prof2 = 'prof-benitez-02';
    const time1 = '2026-11-30T09:00:00';
    const time2 = '2026-11-30T09:30:00';

    expect(lockManager.acquireLock(orgId, prof1, time1, 'intent-1')).toBe(true);
    expect(lockManager.acquireLock(orgId, prof1, time2, 'intent-2')).toBe(true);
    expect(lockManager.acquireLock(orgId, prof2, time1, 'intent-3')).toBe(true);
    expect(lockManager.acquireLock(orgId, prof2, time2, 'intent-4')).toBe(true);

    expect(lockManager.getLockCount()).toBe(4);
  });

  it('correctly releases lock and allows subsequent intent to acquire immediately', () => {
    const orgId = 'org-akineuro-01';
    const profId = 'prof-gonzalez-01';
    const isoStart = '2026-11-30T11:00:00';
    const intentA = 'intent-user-a';
    const intentB = 'intent-user-b';

    expect(lockManager.acquireLock(orgId, profId, isoStart, intentA)).toBe(true);
    expect(lockManager.acquireLock(orgId, profId, isoStart, intentB)).toBe(false);

    // User A cancels or releases hold
    const released = lockManager.releaseLock(orgId, profId, isoStart, intentA);
    expect(released).toBe(true);

    // User B now acquires successfully
    expect(lockManager.acquireLock(orgId, profId, isoStart, intentB)).toBe(true);
  });
});
