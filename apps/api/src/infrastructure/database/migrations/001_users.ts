import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("email").unique().notNullable();
    table.string("name").notNullable();
    table.string("password_hash").notNullable();
    table.enum("role", ["ADMIN", "MANAGER", "STAFF"]).defaultTo("STAFF");
    table.string("timezone").defaultTo("America/New_York");
    table.integer("desired_hours").defaultTo(40);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("users");
}
