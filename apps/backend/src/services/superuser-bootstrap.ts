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
  console.log('🔍 Starting superuser bootstrap...');

  // Debug: Log what environment variables we're seeing
  console.log('🔍 Environment variables check:');
  console.log('SUPERADMIN_NAME:', process.env.SUPERADMIN_NAME ? '✅ Set' : '❌ Not set');
  console.log('SUPERADMIN_EMAIL:', process.env.SUPERADMIN_EMAIL ? '✅ Set' : '❌ Not set');
  console.log('SUPERADMIN_PASSWORD:', process.env.SUPERADMIN_PASSWORD ? '✅ Set' : '❌ Not set');
  console.log('SUPERADMINS:', process.env.SUPERADMINS ? '✅ Set' : '❌ Not set');

  const single = {
    name: process.env.SUPERADMIN_NAME,
    email: process.env.SUPERADMIN_EMAIL,
    password: process.env.SUPERADMIN_PASSWORD,
  };

  console.log('🔍 Single superadmin config:', {
    name: single.name || '(not set)',
    email: single.email || '(not set)',
    password: single.password ? '***' : '(not set)'
  });

  let list: Array<{ name: string; email: string; password: string }> = [];

  if (single.email && single.password) {
    console.log('📋 Found individual SUPERADMIN_* variables');
    list.push({ name: single.name || 'Super Admin', email: single.email, password: single.password });
  }

  const json = process.env.SUPERADMINS;
  if (json) {
    console.log('📋 Found SUPERADMINS JSON, attempting to parse...');
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        console.log(`📋 Parsed ${parsed.length} superadmin(s) from JSON`);
        parsed.forEach((u) => {
          if (u?.email && u?.password) {
            list.push({ name: u.name || 'Super Admin', email: u.email, password: u.password });
          }
        });
      } else {
        console.warn('⚠️ SUPERADMINS is not an array');
      }
    } catch (e) {
      console.error('❌ Invalid SUPERADMINS JSON:', e);
      console.log('Raw SUPERADMINS value:', json);
    }
  }

  if (list.length === 0) {
    console.log('⚠️ No superadmin users configured in environment variables');
    return;
  }

  // dedupe by email
  const unique = new Map<string, { name: string; email: string; password: string }>();
  list.forEach((u) => unique.set(u.email.toLowerCase(), u));

  console.log(`🔄 Processing ${unique.size} unique superadmin(s)...`);

  for (const u of unique.values()) {
    try {
      console.log(`🔍 Checking if superuser ${u.email} already exists...`);
      const existing = await User.findOne({ email: u.email.toLowerCase() });
      if (existing) {
        console.log(`✅ Superuser ${u.email} already exists, skipping`);
        continue;
      }

      console.log(`👤 Creating superuser ${u.email}...`);
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
      console.log(`👑 Successfully created superuser ${u.email}`);
    } catch (error) {
      console.error(`❌ Failed to create superuser ${u.email}:`, error);
    }
  }
}


