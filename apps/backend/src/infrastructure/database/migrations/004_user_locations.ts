import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("user_locations", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.uuid("location_id").notNullable().references("id").inTable("locations").onDelete("CASCADE");
    table.boolean("is_manager").defaultTo(false);
    table.timestamps(true, true);
    table.unique(["user_id", "location_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("user_locations");
}
