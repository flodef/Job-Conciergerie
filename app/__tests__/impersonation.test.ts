import { impersonationToken, verifyImpersonationToken } from '@/app/db/session';
import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';

const secret = process.env.ID_ROTATION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const sign = (payload: string) => createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32);

describe('Impersonation token (C.5)', () => {
  it('roundtrips a valid token', () => {
    const token = impersonationToken('conciergerie', 'Calluna');
    expect(token).toBeTruthy();
    expect(verifyImpersonationToken(token)).toEqual({ userType: 'conciergerie', rowKey: 'Calluna' });
  });

  it('roundtrips an employee target', () => {
    const token = impersonationToken('employee', 'Jean Dupont');
    expect(verifyImpersonationToken(token)).toEqual({ userType: 'employee', rowKey: 'Jean Dupont' });
  });

  it('supports rowKeys containing |', () => {
    const token = impersonationToken('conciergerie', 'A|B');
    expect(verifyImpersonationToken(token)).toEqual({ userType: 'conciergerie', rowKey: 'A|B' });
  });

  it('rejects a tampered rowKey', () => {
    const token = impersonationToken('conciergerie', 'Calluna');
    const tampered = token.replace('Calluna', 'CMD Breizh');
    expect(verifyImpersonationToken(tampered)).toBeNull();
  });

  it('rejects a tampered userType', () => {
    const token = impersonationToken('conciergerie', 'Calluna');
    expect(verifyImpersonationToken(token.replace('conciergerie|', 'employee|'))).toBeNull();
  });

  it('rejects an expired token', () => {
    const exp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
    const payload = `impersonate|conciergerie|Calluna|${exp}`;
    const token = `conciergerie|Calluna|${exp}.${sign(payload)}`;
    expect(verifyImpersonationToken(token)).toBeNull();
  });

  it('rejects a wrong signature', () => {
    const token = impersonationToken('conciergerie', 'Calluna');
    const [payload] = [token.slice(0, token.lastIndexOf('.'))];
    expect(verifyImpersonationToken(`${payload}.${'0'.repeat(32)}`)).toBeNull();
  });

  it('rejects malformed values', () => {
    expect(verifyImpersonationToken(undefined)).toBeNull();
    expect(verifyImpersonationToken('')).toBeNull();
    expect(verifyImpersonationToken('no-dot-here')).toBeNull();
    expect(verifyImpersonationToken('conciergerie||123.abc')).toBeNull();
    expect(verifyImpersonationToken('admin|Calluna|9999999999.' + sign('x'))).toBeNull();
  });
});
