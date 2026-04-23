const { pool } = require('../src/lib/db');

async function test() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables:', tables);
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      const [count] = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`Table ${tableName}: ${count[0].count} records`);
    }
  } catch (err) {
    console.error('Database Error:', err);
  } finally {
    process.exit();
  }
}

test();
