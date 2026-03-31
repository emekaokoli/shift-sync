import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('audit_logs').del();
  await knex('notifications').del();
  await knex('drop_requests').del();
  await knex('swap_requests').del();
  await knex('shift_assignments').del();
  await knex('shifts').del();
  await knex('availability').del();
  await knex('user_skills').del();
  await knex('user_locations').del();
  await knex('skills').del();
  await knex('locations').del();
  await knex('users').del();

  // Create skills
  const skills = await knex('skills')
    .insert([
      { name: 'Server', description: 'Food and beverage service' },
      { name: 'Host', description: 'Guest greeting and seating' },
      { name: 'Bartender', description: 'Bar service' },
      { name: 'Cook', description: 'Food preparation' },
      { name: 'Cashier', description: 'Point of sale' },
      { name: 'Busser', description: 'Table clearing' },
      { name: 'Expo', description: 'Food runner' },
      { name: 'Manager', description: 'Shift management' },
    ])
    .returning('*');

  const skillMap = Object.fromEntries(skills.map((s) => [s.name, s.id]));

  // Create locations
  const locations = await knex('locations')
    .insert([
      {
        name: 'Coastal Eats - Downtown',
        address: '123 Main Street, City, ST 12345',
        timezone: 'America/New_York',
        cutoff_hours: 48,
      },
      {
        name: 'Coastal Eats - Waterfront',
        address: '456 Ocean Drive, City, ST 12345',
        timezone: 'America/New_York',
        cutoff_hours: 48,
      },
      {
        name: 'Coastal Eats - Airport',
        address: '789 Airport Blvd, City, ST 12345',
        timezone: 'America/Chicago',
        cutoff_hours: 24,
      },
    ])
    .returning('*');

  const locationMap = Object.fromEntries(locations.map((l) => [l.name, l.id]));

  // Create users
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = await knex('users')
    .insert([
      {
        email: 'admin@coastaleats.com',
        name: 'Admin User',
        password_hash: passwordHash,
        role: 'ADMIN',
        timezone: 'America/New_York',
        desired_hours: 40,
      },
      {
        email: 'manager1@coastaleats.com',
        name: 'Sarah Johnson',
        password_hash: passwordHash,
        role: 'MANAGER',
        timezone: 'America/New_York',
        desired_hours: 40,
      },
      {
        email: 'manager2@coastaleats.com',
        name: 'Mike Chen',
        password_hash: passwordHash,
        role: 'MANAGER',
        timezone: 'America/New_York',
        desired_hours: 40,
      },
      {
        email: 'staff1@coastaleats.com',
        name: 'Emily Davis',
        password_hash: passwordHash,
        role: 'STAFF',
        timezone: 'America/New_York',
        desired_hours: 32,
      },
      {
        email: 'staff2@coastaleats.com',
        name: 'James Wilson',
        password_hash: passwordHash,
        role: 'STAFF',
        timezone: 'America/New_York',
        desired_hours: 24,
      },
      {
        email: 'staff3@coastaleats.com',
        name: 'Lisa Brown',
        password_hash: passwordHash,
        role: 'STAFF',
        timezone: 'America/New_York',
        desired_hours: 40,
      },
      {
        email: 'staff4@coastaleats.com',
        name: 'David Lee',
        password_hash: passwordHash,
        role: 'STAFF',
        timezone: 'America/New_York',
        desired_hours: 20,
      },
      {
        email: 'staff5@coastaleats.com',
        name: 'Amy Martinez',
        password_hash: passwordHash,
        role: 'STAFF',
        timezone: 'America/New_York',
        desired_hours: 35,
      },
    ])
    .returning('*');

  const userMap = Object.fromEntries(users.map((u) => [u.email, u.id]));

  // Assign managers to locations
  await knex('user_locations').insert([
    {
      user_id: userMap['manager1@coastaleats.com'],
      location_id: locationMap['Coastal Eats - Downtown'],
      is_manager: true,
    },
    {
      user_id: userMap['manager2@coastaleats.com'],
      location_id: locationMap['Coastal Eats - Waterfront'],
      is_manager: true,
    },
    {
      user_id: userMap['manager2@coastaleats.com'],
      location_id: locationMap['Coastal Eats - Airport'],
      is_manager: true,
    },
  ]);

  // Assign staff to locations
  await knex('user_locations').insert([
    {
      user_id: userMap['staff1@coastaleats.com'],
      location_id: locationMap['Coastal Eats - Downtown'],
      is_manager: false,
    },
    {
      user_id: userMap['staff2@coastaleats.com'],
      location_id: locationMap['Coastal Eats - Downtown'],
      is_manager: false,
    },
    {
      user_id: userMap['staff3@coastaleats.com'],
      location_id: locationMap['Coastal Eats - Waterfront'],
      is_manager: false,
    },
    {
      user_id: userMap['staff4@coastaleats.com'],
      location_id: locationMap['Coastal Eats - Waterfront'],
      is_manager: false,
    },
    {
      user_id: userMap['staff5@coastaleats.com'],
      location_id: locationMap['Coastal Eats - Airport'],
      is_manager: false,
    },
  ]);

  // Assign skills to staff
  await knex('user_skills').insert([
    // Emily - Server, Host, Expo
    {
      user_id: userMap['staff1@coastaleats.com'],
      skill_id: skillMap['Server'],
    },
    { user_id: userMap['staff1@coastaleats.com'], skill_id: skillMap['Host'] },
    { user_id: userMap['staff1@coastaleats.com'], skill_id: skillMap['Expo'] },
    // James - Bartender, Server
    {
      user_id: userMap['staff2@coastaleats.com'],
      skill_id: skillMap['Bartender'],
    },
    {
      user_id: userMap['staff2@coastaleats.com'],
      skill_id: skillMap['Server'],
    },
    // Lisa - Cook
    { user_id: userMap['staff3@coastaleats.com'], skill_id: skillMap['Cook'] },
    // David - Busser, Cashier
    {
      user_id: userMap['staff4@coastaleats.com'],
      skill_id: skillMap['Busser'],
    },
    {
      user_id: userMap['staff4@coastaleats.com'],
      skill_id: skillMap['Cashier'],
    },
    // Amy - Server, Host, Bartender
    {
      user_id: userMap['staff5@coastaleats.com'],
      skill_id: skillMap['Server'],
    },
    { user_id: userMap['staff5@coastaleats.com'], skill_id: skillMap['Host'] },
    {
      user_id: userMap['staff5@coastaleats.com'],
      skill_id: skillMap['Bartender'],
    },
  ]);

  // Create shifts for next 2 weeks
  const shifts = [];
  const downtownId = locationMap['Coastal Eats - Downtown'];
  const waterfrontId = locationMap['Coastal Eats - Waterfront'];
  const airportId = locationMap['Coastal Eats - Airport'];

  for (let day = 0; day < 14; day++) {
    const date = dayjs().add(day, 'day');
    const dateStr = date.format('YYYY-MM-DD');

    // Downtown - Morning shift
    shifts.push({
      location_id: downtownId,
      start_time: `${dateStr}T09:00:00Z`,
      end_time: `${dateStr}T17:00:00Z`,
      required_skill_id: skillMap['Host'],
      headcount: 1,
      status: day < 3 ? 'PUBLISHED' : 'DRAFT',
      published_at: day < 3 ? new Date() : null,
    });

    // Downtown - Evening shift
    shifts.push({
      location_id: downtownId,
      start_time: `${dateStr}T17:00:00Z`,
      end_time: `${dateStr}T23:00:00Z`,
      required_skill_id: skillMap['Server'],
      headcount: 2,
      status: day < 3 ? 'PUBLISHED' : 'DRAFT',
      published_at: day < 3 ? new Date() : null,
    });

    // Waterfront - Lunch shift
    shifts.push({
      location_id: waterfrontId,
      start_time: `${dateStr}T11:00:00Z`,
      end_time: `${dateStr}T19:00:00Z`,
      required_skill_id: skillMap['Server'],
      headcount: 2,
      status: day < 3 ? 'PUBLISHED' : 'DRAFT',
      published_at: day < 3 ? new Date() : null,
    });

    // Waterfront - Dinner shift
    shifts.push({
      location_id: waterfrontId,
      start_time: `${dateStr}T18:00:00Z`,
      end_time: `${dateStr}T23:00:00Z`,
      required_skill_id: skillMap['Cook'],
      headcount: 2,
      status: day < 3 ? 'PUBLISHED' : 'DRAFT',
      published_at: day < 3 ? new Date() : null,
    });

    // Airport - Day shift
    shifts.push({
      location_id: airportId,
      start_time: `${dateStr}T08:00:00Z`,
      end_time: `${dateStr}T16:00:00Z`,
      required_skill_id: skillMap['Bartender'],
      headcount: 1,
      status: day < 3 ? 'PUBLISHED' : 'DRAFT',
      published_at: day < 3 ? new Date() : null,
    });
  }

  const createdShifts = await knex('shifts').insert(shifts).returning('*');

  // Assign staff to first few shifts
  const assignments = [
    {
      shift_id: createdShifts[0].id,
      staff_id: userMap['staff1@coastaleats.com'],
      assigned_by: userMap['manager1@coastaleats.com'],
    },
    {
      shift_id: createdShifts[1].id,
      staff_id: userMap['staff2@coastaleats.com'],
      assigned_by: userMap['manager1@coastaleats.com'],
    },
    {
      shift_id: createdShifts[2].id,
      staff_id: userMap['staff3@coastaleats.com'],
      assigned_by: userMap['manager2@coastaleats.com'],
    },
    {
      shift_id: createdShifts[5].id,
      staff_id: userMap['staff5@coastaleats.com'],
      assigned_by: userMap['manager2@coastaleats.com'],
    },
  ];

  await knex('shift_assignments').insert(assignments);

  console.log('Seed data created successfully!');
  console.log('Users created:');
  console.log('  Admin: admin@coastaleats.com / password123');
  console.log('  Manager: manager1@coastaleats.com / password123');
  console.log('  Staff: staff1@coastaleats.com / password123');
}
