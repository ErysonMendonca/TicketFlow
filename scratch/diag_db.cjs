const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'mysql-507edcd-tynketech.b.aivencloud.com',
  user: 'avnadmin',
  password: 'AVNS_N6tZvYxcB1KKuNDVgN0',
  database: 'defaultdb',
  port: 23273,
  ssl: {
    rejectUnauthorized: false
  }
});

async function test() {
  try {
    const [dbs] = await pool.query('SHOW DATABASES');
    console.log('Databases:', dbs);
    
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables in current DB (defaultdb):', tables);
    
    // Check if ticketflow_db exists
    const hasTargetDb = dbs.some(d => d.Database === 'ticketflow_db');
    if (hasTargetDb) {
        console.log('Switching to ticketflow_db...');
        await pool.query('USE ticketflow_db');
        const [tables2] = await pool.query('SHOW TABLES');
        console.log('Tables in ticketflow_db:', tables2);
    }
    
  } catch (err) {
    console.error('Database Error:', err);
  } finally {
    process.exit();
  }
}

test();
