import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("audit_logs", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("action").notNullable();
    table.string("entity_type").notNullable();
    table.uuid("entity_id").notNullable();
    table.jsonb("old_value");
    table.jsonb("new_value");
    table.timestamps(true, true);
    table.index("user_id");
    table.index(["entity_type", "entity_id"]);
    table.index("created_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("audit_logs");
}
