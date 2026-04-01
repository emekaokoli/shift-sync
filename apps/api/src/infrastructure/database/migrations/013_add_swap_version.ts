import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('swap_requests', 'version');

  if (!hasColumn) {
    await knex.schema.alterTable('swap_requests', (table) => {
      table.integer('version').defaultTo(1);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('swap_requests', (table) => {
    table.dropColumn('version');
  });
}
