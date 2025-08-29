/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('webhook_deliveries', (table) => {
    table.string('id', 36).primary();
    table.string('webhook_id', 36);
    table.string('job_id', 36);
    table.string('event_type', 50).notNullable();
    table.text('payload').notNullable();
    table.integer('status_code');
    table.text('response_body');
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('delivered_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('webhook_id');
    table.index('job_id');
    table.index('event_type');
    table.index('created_at');
    table.index('status_code');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('webhook_deliveries');
};
