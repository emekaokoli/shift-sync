import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("swap_requests", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("shift_id").notNullable().references("id").inTable("shifts").onDelete("CASCADE");
    table.uuid("requester_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.uuid("target_id").references("id").inTable("users").onDelete("CASCADE");
    table.enum("type", ["SWAP", "DROP"]).defaultTo("SWAP");
    table.enum("status", ["PENDING", "ACCEPTED", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED"]).defaultTo("PENDING");
    table.text("response_reason");
    table.uuid("responded_by").references("id").inTable("users").onDelete("SET NULL");
    table.integer("version").defaultTo(1);
    table.timestamps(true, true);
    table.index("shift_id");
    table.index("requester_id");
    table.index("status");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("swap_requests");
}
