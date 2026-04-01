import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shifts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('location_id')
      .notNullable()
      .references('id')
      .inTable('locations')
      .onDelete('CASCADE');
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time').notNullable();
    table
      .uuid('required_skill_id')
      .notNullable()
      .references('id')
      .inTable('skills')
      .onDelete('CASCADE');
    table.integer('headcount').defaultTo(1);
    table.enum('status', ['DRAFT', 'PUBLISHED', 'CANCELLED']).defaultTo('DRAFT');
    table.timestamp('published_at');
    table.timestamps(true, true);
    table.index('location_id');
    table.index('status');
    table.index('start_time');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('shifts');
}
