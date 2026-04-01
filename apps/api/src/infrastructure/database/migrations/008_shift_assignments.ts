import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shift_assignments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('shift_id').notNullable().references('id').inTable('shifts').onDelete('CASCADE');
    table.uuid('staff_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('assigned_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('version').defaultTo(1);
    table.timestamps(true, true);
    table.unique(['shift_id', 'staff_id']);
    table.index('shift_id');
    table.index('staff_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('shift_assignments');
}
