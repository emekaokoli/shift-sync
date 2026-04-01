import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('drop_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('shift_id').notNullable().references('id').inTable('shifts').onDelete('CASCADE');
    table.uuid('requester_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['PENDING', 'CLAIMED', 'EXPIRED', 'CANCELLED']).defaultTo('PENDING');
    table.timestamps(true, true);
    table.index('shift_id');
    table.index('requester_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('drop_requests');
}
