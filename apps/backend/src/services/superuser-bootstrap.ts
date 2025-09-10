import bcrypt from 'bcryptjs';
import { config } from '../config';
import { User } from '../models/User';

/**
 * Bootstrap superusers from environment variables.
 * Supports a single SUPERADMIN_* or a JSON array SUPERADMINS.
 * SUPERADMINS example:
 *   [{"name":"Super Admin","email":"info@progressnet.dev","password":"ProNet$!123"}]
 */
export async function ensureSuperUsers() {
  const single = {
    name: process.env.SUPERADMIN_NAME,
    email: process.env.SUPERADMIN_EMAIL,
    password: process.env.SUPERADMIN_PASSWORD,
  };

  let list: Array<{ name: string; email: string; password: string }> = [];

  if (single.email && single.password) {
    list.push({ name: single.name || 'Super Admin', email: single.email, password: single.password });
  }

  const json = process.env.SUPERADMINS;
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        parsed.forEach((u) => {
          if (u?.email && u?.password) {
            list.push({ name: u.name || 'Super Admin', email: u.email, password: u.password });
          }
        });
      }
    } catch (e) {
      console.warn('Invalid SUPERADMINS JSON');
    }
  }

  // dedupe by email
  const unique = new Map<string, { name: string; email: string; password: string }>();
  list.forEach((u) => unique.set(u.email.toLowerCase(), u));

  for (const u of unique.values()) {
    const existing = await User.findOne({ email: u.email.toLowerCase() });
    if (existing) continue;

    const [firstName, ...rest] = (u.name || 'Super Admin').split(' ');
    const lastName = rest.join(' ');
    const hashed = await bcrypt.hash(u.password, 12);

    await User.create({
      firstName,
      lastName,
      email: u.email.toLowerCase(),
      password: hashed,
      role: 'superuser',
      isActive: true,
      permissions: [],
      tenantId: '',
      isTenantOwner: false,
    });
    console.log(`👑 Created superuser ${u.email}`);
  }
}


