const { pool } = require('../src/lib/db');

async function test() {
  try {
    const [dbs] = await pool.query('SHOW DATABASES');
    console.log('Databases:', dbs);
    
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables in current DB:', tables);
    
  } catch (err) {
    console.error('Database Error:', err);
  } finally {
    process.exit();
  }
}

test();
