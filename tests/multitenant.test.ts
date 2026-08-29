import { describe, it, expect } from 'vitest';
import { MultiTenantAuthorizer, AdminIdentity, SlotLockManager } from '../src/core/bookingEngine';

describe('Multi-Tenant Isolation & Authorization Suite', () => {
  const TENANT_A = 'org-akineuro-01';
  const TENANT_B = 'org-belgrano-02';

  const adminTenantA: AdminIdentity = {
    id: 'usr-admin-a',
    username: 'admin.akineuro',
    role: 'TENANT_ADMIN',
    token: 'token-admin-tenant-a',
    authorizedOrganizations: [TENANT_A]
  };

  const adminTenantB: AdminIdentity = {
    id: 'usr-admin-b',
    username: 'admin.belgrano',
    role: 'TENANT_ADMIN',
    token: 'token-admin-tenant-b',
    authorizedOrganizations: [TENANT_B]
  };

  const superAdmin: AdminIdentity = {
    id: 'usr-superadmin',
    username: 'root.superadmin',
    role: 'SUPERADMIN',
    token: 'token-superadmin-secret',
    authorizedOrganizations: [TENANT_A, TENANT_B]
  };

  it('authorizes Tenant A admin to access Tenant A resources', () => {
    const auth = MultiTenantAuthorizer.verifyAdminAuthorization(adminTenantA, TENANT_A);
    expect(auth.authorized).toBe(true);
    expect(auth.statusCode).toBe(200);
  });

  it('strictly blocks Tenant A admin from accessing Tenant B resources (403 Forbidden)', () => {
    const auth = MultiTenantAuthorizer.verifyAdminAuthorization(adminTenantA, TENANT_B);
    expect(auth.authorized).toBe(false);
    expect(auth.statusCode).toBe(403);
    expect(auth.reason).toContain('TENANT_FORBIDDEN');
  });

  it('strictly blocks Tenant B admin from accessing Tenant A resources (403 Forbidden)', () => {
    const auth = MultiTenantAuthorizer.verifyAdminAuthorization(adminTenantB, TENANT_A);
    expect(auth.authorized).toBe(false);
    expect(auth.statusCode).toBe(403);
    expect(auth.reason).toContain('TENANT_FORBIDDEN');
  });

  it('allows SuperAdmin to access all tenant organizations', () => {
    const authA = MultiTenantAuthorizer.verifyAdminAuthorization(superAdmin, TENANT_A);
    const authB = MultiTenantAuthorizer.verifyAdminAuthorization(superAdmin, TENANT_B);
    expect(authA.authorized).toBe(true);
    expect(authB.authorized).toBe(true);
  });

  it('rejects unauthenticated requests without admin identity (401 Unauthorized)', () => {
    const auth = MultiTenantAuthorizer.verifyAdminAuthorization(null, TENANT_A);
    expect(auth.authorized).toBe(false);
    expect(auth.statusCode).toBe(401);
  });

  it('validates resource tenant ownership against request tenant ID', () => {
    const match = MultiTenantAuthorizer.verifyResourceTenant(TENANT_A, TENANT_A);
    expect(match.authorized).toBe(true);
    expect(match.statusCode).toBe(200);

    const mismatch = MultiTenantAuthorizer.verifyResourceTenant(TENANT_B, TENANT_A);
    expect(mismatch.authorized).toBe(false);
    expect(mismatch.statusCode).toBe(403);
  });

  it('isolates slot locks between distinct tenant organizations on the same date/time', () => {
    const lockManager = new SlotLockManager();
    const sameProfId = 'prof-shared-id-sample';
    const sameSlot = '2026-12-01T10:00:00';

    // Tenant A locks slot
    const lockA = lockManager.acquireLock(TENANT_A, sameProfId, sameSlot, 'intent-tenant-a');
    expect(lockA).toBe(true);

    // Tenant B locks the same slot representation under Tenant B -> should succeed independently
    const lockB = lockManager.acquireLock(TENANT_B, sameProfId, sameSlot, 'intent-tenant-b');
    expect(lockB).toBe(true);

    expect(lockManager.getLockCount()).toBe(2);
  });
});
