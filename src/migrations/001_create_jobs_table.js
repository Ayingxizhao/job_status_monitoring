/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('jobs', (table) => {
    table.string('id', 36).primary();
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('status', 20).defaultTo('pending');
    table.integer('progress').defaultTo(0);
    table.text('tags').defaultTo('[]');
    table.text('metadata').defaultTo('{}');
    table.bigint('ttl');
    table.text('error');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    
    // Indexes for performance
    table.index('status');
    table.index('created_at');
    table.index('updated_at');
    table.index('ttl');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('jobs');
};
