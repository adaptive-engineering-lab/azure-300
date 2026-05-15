import { serviceRoleClient } from './clients.js';

const TEST_EMAIL_PREFIX = 'test+';
const TEST_DOMAIN = 'ai300game.test';

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export async function createTestUser(label?: string): Promise<TestUser> {
  const admin = serviceRoleClient();
  const suffix = label ?? Math.random().toString(36).slice(2, 10);
  const email = `${TEST_EMAIL_PREFIX}${suffix}@${TEST_DOMAIN}`;
  const password = `Test-${suffix}-Az104!`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createTestUser failed: ${error.message}`);
  if (!data.user) throw new Error('createTestUser: no user returned');

  return { id: data.user.id, email, password };
}

/**
 * Idempotently delete any leftover test users (email starts with `test+`).
 * Safe to call at the start and end of a suite.
 */
export async function cleanupTestUsers(): Promise<number> {
  const admin = serviceRoleClient();
  let deleted = 0;
  let page = 1;
  // listUsers paginates; loop until empty.
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`cleanupTestUsers list failed: ${error.message}`);
    const users = data?.users ?? [];
    if (users.length === 0) break;
    for (const u of users) {
      if (u.email && u.email.startsWith(TEST_EMAIL_PREFIX) && u.email.endsWith(`@${TEST_DOMAIN}`)) {
        const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
        if (!delErr) deleted += 1;
      }
    }
    if (users.length < 200) break;
    page += 1;
  }
  return deleted;
}
