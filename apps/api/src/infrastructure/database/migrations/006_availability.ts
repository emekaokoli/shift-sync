import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('availability', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('day_of_week').checkBetween([0, 6]);
    table.string('start_time').notNullable();
    table.string('end_time').notNullable();
    table.boolean('is_recurring').defaultTo(true);
    table.timestamp('specific_date');
    table.timestamps(true, true);
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('availability');
}
