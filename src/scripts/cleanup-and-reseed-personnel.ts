import mongoose from 'mongoose';
import { Personnel, User, Role, Skill, Certification, Tenant } from '../lib/models';

// ----------------------------------------------------------------------

const TARGET_TENANT_ID = '68bab9ec5210bac65e6c9dbd';

// ----------------------------------------------------------------------

async function cleanupAndReseedPersonnel() {
  try {
    await mongoose.connect('mongodb://localhost:27017/field-service-automation');
    console.log('Connected to MongoDB');

    // Verify tenant exists
    const tenant = await Tenant.findById(TARGET_TENANT_ID);
    if (!tenant) {
      throw new Error(`Tenant ${TARGET_TENANT_ID} not found`);
    }
    console.log(`✓ Working with tenant: ${tenant.name} (${tenant.slug})`);

    // 1. Clear existing personnel for this tenant
    console.log('\n=== Cleaning up existing personnel ===');
    const deletedPersonnel = await Personnel.deleteMany({ tenantId: TARGET_TENANT_ID });
    console.log(`✓ Deleted ${deletedPersonnel.deletedCount} existing personnel`);

    // 2. Clear users for this tenant (except admin)
    const deletedUsers = await User.deleteMany({
      tenantId: TARGET_TENANT_ID,
      role: { $ne: 'admin' }, // Keep admin users
    });
    console.log(`✓ Deleted ${deletedUsers.deletedCount} non-admin users`);

    // 3. Ensure we have roles for this tenant
    console.log('\n=== Setting up roles ===');
    const existingRoles = await Role.find({ tenantId: TARGET_TENANT_ID });
    console.log(`Found ${existingRoles.length} existing roles`);

    const defaultRoles = [
      {
        name: 'Supervisor',
        color: '#f44336',
        permissions: ['view_personnel', 'create_personnel', 'edit_personnel'],
      },
      {
        name: 'Technician',
        color: '#2196f3',
        permissions: ['view_work_orders', 'edit_work_orders'],
      },
      {
        name: 'Sales',
        color: '#4caf50',
        permissions: ['view_customers', 'create_customers', 'edit_customers'],
      },
      { name: 'Manager', color: '#9c27b0', permissions: ['admin_access', 'manage_roles'] },
    ];

    const roles = [];
    for (const roleData of defaultRoles) {
      let role = existingRoles.find((r) => r.name === roleData.name);
      if (!role) {
        role = await Role.create({
          tenantId: TARGET_TENANT_ID,
          ...roleData,
          isDefault: true,
        });
        console.log(`✓ Created role: ${role.name}`);
      }
      roles.push(role);
    }

    // 4. Ensure we have skills for this tenant
    console.log('\n=== Setting up skills ===');
    const skillNames = [
      'Electrical Work',
      'Plumbing',
      'HVAC',
      'Carpentry',
      'Welding',
      'Diagnostics',
      'Troubleshooting',
      'Installation',
      'Maintenance',
      'Repair',
      'Safety Protocols',
      'Blueprint Reading',
      'Power Tools',
      'Hand Tools',
    ];

    const skills = [];
    for (const skillName of skillNames) {
      let skill = await Skill.findOne({ tenantId: TARGET_TENANT_ID, name: skillName });
      if (!skill) {
        skill = await Skill.create({
          tenantId: TARGET_TENANT_ID,
          name: skillName,
          description: `${skillName} expertise`,
          isActive: true,
        });
      }
      skills.push(skill);
    }
    console.log(`✓ Ensured ${skills.length} skills exist`);

    // 5. Ensure we have certifications for this tenant
    console.log('\n=== Setting up certifications ===');
    const certificationNames = [
      'OSHA-10',
      'OSHA-30',
      'EPA 608',
      'NATE Certified',
      'CompTIA A+',
      'Electrician License',
      'Plumbing License',
      'AWS Welding',
      'First Aid',
      'CPR Certified',
      'Forklift Operator',
      'Crane Operator',
    ];

    const certifications = [];
    for (const certName of certificationNames) {
      let cert = await Certification.findOne({ tenantId: TARGET_TENANT_ID, name: certName });
      if (!cert) {
        cert = await Certification.create({
          tenantId: TARGET_TENANT_ID,
          name: certName,
          description: `${certName} certification`,
          isActive: true,
        });
      }
      certifications.push(cert);
    }
    console.log(`✓ Ensured ${certifications.length} certifications exist`);

    // 6. Generate 50 new personnel
    console.log('\n=== Creating 50 new personnel ===');
    const firstNames = [
      'James',
      'Mary',
      'John',
      'Patricia',
      'Robert',
      'Jennifer',
      'Michael',
      'Linda',
      'David',
      'Elizabeth',
      'William',
      'Barbara',
      'Richard',
      'Susan',
      'Joseph',
      'Jessica',
      'Thomas',
      'Sarah',
      'Charles',
      'Karen',
      'Christopher',
      'Nancy',
      'Daniel',
      'Lisa',
      'Matthew',
      'Betty',
      'Anthony',
      'Helen',
      'Mark',
      'Sandra',
      'Donald',
      'Donna',
      'Steven',
      'Carol',
      'Paul',
      'Ruth',
      'Andrew',
      'Sharon',
      'Joshua',
      'Michelle',
      'Kenneth',
      'Laura',
      'Kevin',
      'Sarah',
      'Brian',
      'Kimberly',
      'George',
      'Deborah',
      'Timothy',
      'Dorothy',
      'Ronald',
      'Lisa',
      'Jason',
      'Nancy',
      'Edward',
      'Karen',
    ];

    const lastNames = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
      'Rodriguez',
      'Martinez',
      'Hernandez',
      'Lopez',
      'Gonzalez',
      'Wilson',
      'Anderson',
      'Thomas',
      'Taylor',
      'Moore',
      'Jackson',
      'Martin',
      'Lee',
      'Perez',
      'Thompson',
      'White',
      'Harris',
      'Sanchez',
      'Clark',
      'Ramirez',
      'Lewis',
      'Robinson',
      'Walker',
      'Young',
      'Allen',
      'King',
      'Wright',
      'Scott',
      'Torres',
      'Nguyen',
      'Hill',
      'Flores',
      'Green',
      'Adams',
      'Nelson',
      'Baker',
      'Hall',
      'Rivera',
      'Campbell',
      'Mitchell',
    ];

    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];

    const createdPersonnel = [];
    for (let i = 0; i < 50; i++) {
      // Create user first
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${tenant.slug}.com`;
      const phone = `555${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`;

      const user = await User.create({
        tenantId: TARGET_TENANT_ID,
        email,
        password: 'password123',
        firstName,
        lastName,
        phone,
        role: 'technician',
        permissions: [],
        isActive: true,
      });

      // Generate employee ID
      const employeeId = `EMP-${String(Math.floor(Math.random() * 900000 + 100000))}`;

      // Random role
      const randomRole = roles[Math.floor(Math.random() * roles.length)];

      // Random skills (2-5 skills)
      const numSkills = Math.floor(Math.random() * 4) + 2;
      const randomSkills = [];
      const shuffledSkills = [...skills].sort(() => 0.5 - Math.random());
      for (let j = 0; j < numSkills && j < shuffledSkills.length; j++) {
        randomSkills.push(shuffledSkills[j].name);
      }

      // Random certifications (1-3 certifications)
      const numCerts = Math.floor(Math.random() * 3) + 1;
      const randomCerts = [];
      const shuffledCerts = [...certifications].sort(() => 0.5 - Math.random());
      for (let j = 0; j < numCerts && j < shuffledCerts.length; j++) {
        randomCerts.push(shuffledCerts[j].name);
      }

      // Random availability
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const availability: any = {};
      days.forEach((day) => {
        const isWeekend = day === 'saturday' || day === 'sunday';
        availability[day] = {
          start: '09:00',
          end: '17:00',
          available: isWeekend ? Math.random() > 0.7 : Math.random() > 0.1,
        };
      });

      // Create personnel
      const personnel = await Personnel.create({
        tenantId: TARGET_TENANT_ID,
        userId: user._id,
        employeeId,
        roleId: randomRole._id,
        skills: randomSkills,
        certifications: randomCerts,
        hourlyRate: Math.floor(Math.random() * 50) + 20, // $20-$70/hour
        availability,
        location: {
          address: `${Math.floor(Math.random() * 9999) + 1} Main St, ${cities[Math.floor(Math.random() * cities.length)]}`,
        },
        notes:
          Math.random() > 0.7
            ? `Experienced ${randomRole.name.toLowerCase()} with ${numSkills} key skills`
            : '',
        isActive: true,
        status: Math.random() > 0.9 ? 'pending' : 'active',
      });

      createdPersonnel.push(personnel);
      if ((i + 1) % 10 === 0) {
        console.log(`✓ Created ${i + 1}/50 personnel`);
      }
    }

    console.log(
      `\n✅ Successfully created ${createdPersonnel.length} personnel for tenant ${tenant.name}`
    );

    // Summary
    console.log('\n=== Summary ===');
    const roleBreakdown = await Personnel.aggregate([
      { $match: { tenantId: TARGET_TENANT_ID } },
      { $lookup: { from: 'roles', localField: 'roleId', foreignField: '_id', as: 'role' } },
      { $unwind: '$role' },
      { $group: { _id: '$role.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    roleBreakdown.forEach((item) => {
      console.log(`${item._id}: ${item.count} personnel`);
    });

    await mongoose.disconnect();
    console.log('\n✓ Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
cleanupAndReseedPersonnel();
