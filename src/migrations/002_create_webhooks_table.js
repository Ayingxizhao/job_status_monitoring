/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('webhooks', (table) => {
    table.string('id', 36).primary();
    table.string('url', 500).notNullable();
    table.text('events').notNullable();
    table.text('headers').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.integer('retry_count').defaultTo(0);
    table.timestamp('last_triggered');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('is_active');
    table.index('url');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('webhooks');
};
