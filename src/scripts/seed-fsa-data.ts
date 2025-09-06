import { connectDB } from 'src/lib/db';
import {
  User,
  Task,
  Tenant,
  Project,
  Customer,
  WorkOrder,
  Technician,
  Assignment,
} from 'src/lib/models';

// ----------------------------------------------------------------------

const TECHNICIANS = [
  {
    name: 'John Smith',
    email: 'john.smith@fsa.com',
    phone: '+1-555-0101',
    skills: ['HVAC', 'Electrical', 'Plumbing'],
    certifications: ['HVAC Certified', 'Electrical License'],
    hourlyRate: 45,
    location: {
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
    },
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@fsa.com',
    phone: '+1-555-0102',
    skills: ['Fire Safety', 'Security Systems', 'General Maintenance'],
    certifications: ['Fire Safety Certified', 'Security Systems License'],
    hourlyRate: 50,
    location: {
      address: '456 Oak Ave',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'US',
    },
  },
  {
    name: 'Mike Davis',
    email: 'mike.davis@fsa.com',
    phone: '+1-555-0103',
    skills: ['Plumbing', 'HVAC', 'Emergency Repair'],
    certifications: ['Plumbing License', 'HVAC Certified'],
    hourlyRate: 42,
    location: {
      address: '789 Pine St',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'US',
    },
  },
  {
    name: 'Lisa Wilson',
    email: 'lisa.wilson@fsa.com',
    phone: '+1-555-0104',
    skills: ['Electrical', 'Data Cabling', 'Network Installation'],
    certifications: ['Electrical License', 'Network+ Certified'],
    hourlyRate: 48,
    location: {
      address: '321 Elm St',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      country: 'US',
    },
  },
  {
    name: 'David Brown',
    email: 'david.brown@fsa.com',
    phone: '+1-555-0105',
    skills: ['General Maintenance', 'Painting', 'Carpentry'],
    certifications: ['General Contractor License'],
    hourlyRate: 35,
    location: {
      address: '654 Maple Dr',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85001',
      country: 'US',
    },
  },
];

const CUSTOMERS = [
  {
    name: 'TechCorp Solutions',
    email: 'contact@techcorp.com',
    phone: '+1-555-0456',
    company: 'TechCorp Solutions Inc.',
    address: {
      street: '123 Business Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
    },
    contactPerson: {
      name: 'Robert Chen',
      email: 'robert.chen@techcorp.com',
      phone: '+1-555-0457',
    },
  },
  {
    name: 'ABC Manufacturing',
    email: 'info@abcmanufacturing.com',
    phone: '+1-555-0789',
    company: 'ABC Manufacturing Co.',
    address: {
      street: '456 Industrial Blvd',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'US',
    },
    contactPerson: {
      name: 'Maria Rodriguez',
      email: 'maria.rodriguez@abcmanufacturing.com',
      phone: '+1-555-0790',
    },
  },
  {
    name: 'XYZ Office Building',
    email: 'admin@xyzoffice.com',
    phone: '+1-555-0321',
    company: 'XYZ Office Building LLC',
    address: {
      street: '789 Corporate Dr',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'US',
    },
    contactPerson: {
      name: 'James Thompson',
      email: 'james.thompson@xyzoffice.com',
      phone: '+1-555-0322',
    },
  },
  {
    name: 'Safety First Corp',
    email: 'safety@safetyfirst.com',
    phone: '+1-555-0654',
    company: 'Safety First Corporation',
    address: {
      street: '321 Security St',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      country: 'US',
    },
    contactPerson: {
      name: 'Jennifer Lee',
      email: 'jennifer.lee@safetyfirst.com',
      phone: '+1-555-0655',
    },
  },
  {
    name: 'Green Energy Systems',
    email: 'info@greenenergy.com',
    phone: '+1-555-0987',
    company: 'Green Energy Systems Ltd.',
    address: {
      street: '555 Renewable Way',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      country: 'US',
    },
    contactPerson: {
      name: 'Alex Kumar',
      email: 'alex.kumar@greenenergy.com',
      phone: '+1-555-0988',
    },
  },
];

const PROJECTS = [
  {
    name: 'Office Building HVAC Upgrade',
    description: 'Complete HVAC system upgrade for 50-story office building',
    status: 'active',
    priority: 'high',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-06-30'),
    budget: 250000,
    progress: 35,
    tags: ['HVAC', 'Upgrade', 'Large Project'],
  },
  {
    name: 'Fire Safety System Installation',
    description: 'Install comprehensive fire safety systems across manufacturing facility',
    status: 'active',
    priority: 'urgent',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-04-15'),
    budget: 180000,
    progress: 60,
    tags: ['Fire Safety', 'Installation', 'Compliance'],
  },
  {
    name: 'Electrical Infrastructure Modernization',
    description: 'Modernize electrical systems and install smart building controls',
    status: 'planning',
    priority: 'medium',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-08-31'),
    budget: 320000,
    progress: 5,
    tags: ['Electrical', 'Smart Building', 'Modernization'],
  },
  {
    name: 'Emergency Response System',
    description: 'Install emergency response and communication systems',
    status: 'completed',
    priority: 'high',
    startDate: new Date('2023-10-01'),
    endDate: new Date('2023-12-31'),
    budget: 95000,
    actualCost: 92000,
    progress: 100,
    tags: ['Emergency', 'Communication', 'Safety'],
  },
  {
    name: 'Green Energy Integration',
    description: 'Integrate solar panels and energy management systems',
    status: 'on-hold',
    priority: 'low',
    startDate: new Date('2024-05-01'),
    endDate: new Date('2024-12-31'),
    budget: 450000,
    progress: 10,
    tags: ['Solar', 'Energy Management', 'Sustainability'],
  },
];

const WORK_ORDERS = [
  {
    title: 'HVAC Unit Repair - Floor 15',
    description: 'Repair malfunctioning HVAC unit on 15th floor. Unit not cooling properly.',
    status: 'in-progress',
    priority: 'high',
    category: 'HVAC Maintenance',
    location: {
      address: '123 Business Ave, Floor 15',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
    },
    scheduledDate: new Date('2024-01-20T09:00:00Z'),
    estimatedDuration: 240,
    notes: 'Customer reported temperature issues. Check refrigerant levels and compressor.',
  },
  {
    title: 'Fire Alarm System Test',
    description: 'Quarterly fire alarm system testing and maintenance',
    status: 'assigned',
    priority: 'medium',
    category: 'Fire Safety',
    location: {
      address: '456 Industrial Blvd',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
    },
    scheduledDate: new Date('2024-01-25T08:00:00Z'),
    estimatedDuration: 180,
    notes: 'Full building fire alarm test. Coordinate with building management.',
  },
  {
    title: 'Electrical Panel Upgrade',
    description: 'Upgrade electrical panel to support increased load requirements',
    status: 'created',
    priority: 'urgent',
    category: 'Electrical Work',
    location: {
      address: '789 Corporate Dr, Basement',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
    },
    scheduledDate: new Date('2024-01-30T07:00:00Z'),
    estimatedDuration: 480,
    notes: 'Power outage required. Schedule with building management for weekend work.',
  },
  {
    title: 'Plumbing Leak Repair',
    description: 'Repair water leak in main supply line',
    status: 'completed',
    priority: 'urgent',
    category: 'Plumbing',
    location: {
      address: '321 Security St',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
    },
    scheduledDate: new Date('2024-01-18T10:00:00Z'),
    estimatedDuration: 120,
    notes: 'Emergency repair completed. Monitor for any additional leaks.',
  },
  {
    title: 'Network Cabling Installation',
    description: 'Install new network cabling for office expansion',
    status: 'in-progress',
    priority: 'medium',
    category: 'General Maintenance',
    location: {
      address: '555 Renewable Way, Floor 3',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
    },
    scheduledDate: new Date('2024-01-22T09:00:00Z'),
    estimatedDuration: 360,
    notes: 'Install CAT6 cabling for 20 new workstations.',
  },
];

// ----------------------------------------------------------------------

async function seedFSAData() {
  try {
    await connectDB();
    console.log('Connected to database');

    // Get or create tenant
    let tenant = await Tenant.findOne({ slug: 'fsa-demo' });
    if (!tenant) {
      tenant = new Tenant({
        name: 'FSA Demo Company',
        slug: 'fsa-demo',
        email: 'admin@fsa-demo.com',
        phone: '+1-555-0000',
        address: {
          street: '1000 Service Ave',
          city: 'Demo City',
          state: 'DC',
          zipCode: '00000',
          country: 'US',
        },
        settings: {
          timezone: 'America/New_York',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
        },
      });
      await tenant.save();
      console.log('Created tenant:', tenant.name);
    }

    // Get admin user
    let adminUser = await User.findOne({
      tenantId: tenant._id,
      role: 'admin',
    });

    if (!adminUser) {
      console.log('Admin user not found. Creating admin user...');
      const { hashPassword } = await import('src/lib/auth/jwt');
      adminUser = new User({
        tenantId: tenant._id,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@fsa-demo.com',
        password: await hashPassword('admin123'),
        role: 'admin',
        isEmailVerified: true,
      });
      await adminUser.save();
      console.log('Admin user created successfully!');
    }

    // Clear existing data
    await Promise.all([
      Customer.deleteMany({ tenantId: tenant._id }),
      Technician.deleteMany({ tenantId: tenant._id }),
      WorkOrder.deleteMany({ tenantId: tenant._id }),
      Project.deleteMany({ tenantId: tenant._id }),
      Task.deleteMany({ tenantId: tenant._id }),
      Assignment.deleteMany({ tenantId: tenant._id }),
    ]);
    console.log('Cleared existing FSA data');

    // Create customers
    const customers = await Promise.all(
      CUSTOMERS.map((customerData) => {
        const customer = new Customer({
          ...customerData,
          tenantId: tenant._id,
        });
        return customer.save();
      })
    );
    console.log(`Created ${customers.length} customers`);

    // Create or find technician users
    const technicianUsers = await Promise.all(
      TECHNICIANS.map(async (technicianData, index) => {
        let user = await User.findOne({
          tenantId: tenant._id,
          email: technicianData.email,
        });

        if (!user) {
          const { hashPassword } = await import('src/lib/auth/jwt');
          user = new User({
            tenantId: tenant._id,
            firstName: technicianData.name.split(' ')[0],
            lastName: technicianData.name.split(' ')[1] || '',
            email: technicianData.email,
            password: await hashPassword('technician123'),
            role: 'technician',
            permissions: [],
          });
          await user.save();
        }
        return user;
      })
    );

    // Create technicians
    const technicians = await Promise.all(
      TECHNICIANS.map((technicianData, index) => {
        const technician = new Technician({
          tenantId: tenant._id,
          userId: technicianUsers[index]._id,
          employeeId: `EMP-${String(index + 1).padStart(3, '0')}`,
          skills: technicianData.skills,
          certifications: technicianData.certifications,
          hourlyRate: technicianData.hourlyRate,
          availability: {
            monday: { start: '08:00', end: '17:00', available: true },
            tuesday: { start: '08:00', end: '17:00', available: true },
            wednesday: { start: '08:00', end: '17:00', available: true },
            thursday: { start: '08:00', end: '17:00', available: true },
            friday: { start: '08:00', end: '17:00', available: true },
            saturday: { start: '09:00', end: '15:00', available: false },
            sunday: { start: '09:00', end: '15:00', available: false },
          },
          location: technicianData.location
            ? {
                latitude: 0,
                longitude: 0,
                address: `${technicianData.location.address}, ${technicianData.location.city}, ${technicianData.location.state}`,
                lastUpdated: new Date(),
              }
            : undefined,
          isActive: true,
        });
        return technician.save();
      })
    );
    console.log(`Created ${technicians.length} technicians`);

    // Create projects
    const projects = await Promise.all(
      PROJECTS.map((projectData, index) => {
        const project = new Project({
          ...projectData,
          tenantId: tenant._id,
          customerId: customers[index % customers.length]._id,
          managerId: adminUser._id,
        });
        return project.save();
      })
    );
    console.log(`Created ${projects.length} projects`);

    // Create work orders
    const workOrders = await Promise.all(
      WORK_ORDERS.map((workOrderData, index) => {
        const workOrder = new WorkOrder({
          ...workOrderData,
          tenantId: tenant._id,
          customerId: customers[index % customers.length]._id,
          createdBy: adminUser._id,
          workOrderNumber: `WO-${String(index + 1).padStart(6, '0')}`,
        });
        return workOrder.save();
      })
    );
    console.log(`Created ${workOrders.length} work orders`);

    // Create tasks
    const tasks = [
      {
        title: 'Inspect HVAC Unit',
        description: 'Thorough inspection of HVAC unit components',
        status: 'in-progress',
        priority: 'high',
        workOrderId: workOrders[0]._id,
        assignedTo: technicians[0]._id,
        dueDate: new Date('2024-01-21'),
        estimatedHours: 2,
        tags: ['HVAC', 'Inspection'],
      },
      {
        title: 'Test Fire Alarm Zones',
        description: 'Test all fire alarm zones in the building',
        status: 'todo',
        priority: 'medium',
        workOrderId: workOrders[1]._id,
        assignedTo: technicians[1]._id,
        dueDate: new Date('2024-01-26'),
        estimatedHours: 3,
        tags: ['Fire Safety', 'Testing'],
      },
      {
        title: 'Install New Electrical Panel',
        description: 'Install and configure new electrical panel',
        status: 'todo',
        priority: 'urgent',
        workOrderId: workOrders[2]._id,
        assignedTo: technicians[3]._id,
        dueDate: new Date('2024-01-31'),
        estimatedHours: 8,
        tags: ['Electrical', 'Installation'],
      },
      {
        title: 'Project Planning Meeting',
        description: 'Initial planning meeting for HVAC upgrade project',
        status: 'done',
        priority: 'medium',
        projectId: projects[0]._id,
        assignedTo: technicians[0]._id,
        dueDate: new Date('2024-01-16'),
        estimatedHours: 1,
        actualHours: 1.5,
        tags: ['Planning', 'Meeting'],
      },
      {
        title: 'Site Survey',
        description: 'Conduct site survey for fire safety installation',
        status: 'done',
        priority: 'high',
        projectId: projects[1]._id,
        assignedTo: technicians[1]._id,
        dueDate: new Date('2024-02-02'),
        estimatedHours: 4,
        actualHours: 3.5,
        tags: ['Survey', 'Fire Safety'],
      },
    ];

    const createdTasks = await Promise.all(
      tasks.map((taskData) => {
        const task = new Task({
          ...taskData,
          tenantId: tenant._id,
          createdBy: adminUser._id,
        });
        return task.save();
      })
    );
    console.log(`Created ${createdTasks.length} tasks`);

    // Create assignments
    const assignments = [
      {
        workOrderId: workOrders[0]._id,
        technicianId: technicians[0]._id,
        status: 'in-progress',
        scheduledStartDate: new Date('2024-01-20T09:00:00Z'),
        scheduledEndDate: new Date('2024-01-20T13:00:00Z'),
        estimatedHours: 4,
        actualHours: 2.5,
        notes: 'Technician started work on time. Found refrigerant leak.',
      },
      {
        workOrderId: workOrders[1]._id,
        technicianId: technicians[1]._id,
        status: 'assigned',
        scheduledStartDate: new Date('2024-01-25T08:00:00Z'),
        scheduledEndDate: new Date('2024-01-25T11:00:00Z'),
        estimatedHours: 3,
        notes: 'Fire alarm testing scheduled for next week.',
      },
      {
        workOrderId: workOrders[2]._id,
        technicianId: technicians[3]._id,
        status: 'assigned',
        scheduledStartDate: new Date('2024-01-30T07:00:00Z'),
        scheduledEndDate: new Date('2024-01-30T15:00:00Z'),
        estimatedHours: 8,
        notes: 'Weekend work scheduled. Power outage required.',
      },
    ];

    const createdAssignments = await Promise.all(
      assignments.map((assignmentData) => {
        const assignment = new Assignment({
          ...assignmentData,
          tenantId: tenant._id,
          assignedBy: adminUser._id,
        });
        return assignment.save();
      })
    );
    console.log(`Created ${createdAssignments.length} assignments`);

    console.log('\n✅ FSA data seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - ${customers.length} customers`);
    console.log(`   - ${technicians.length} technicians`);
    console.log(`   - ${projects.length} projects`);
    console.log(`   - ${workOrders.length} work orders`);
    console.log(`   - ${createdTasks.length} tasks`);
    console.log(`   - ${createdAssignments.length} assignments`);
  } catch (error) {
    console.error('Error seeding FSA data:', error);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seedFSAData();
