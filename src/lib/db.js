import mysql from 'mysql2/promise';

// Configuração centralizada para conexão com o MySQL
export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 23273,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Banco guarda tudo em UTC (session tz = UTC). 'Z' faz o mysql2 ler/gravar como UTC
  // independentemente do fuso do servidor Node — sem isso, rodar em máquina -03 empurra +3h.
  timezone: 'Z',
  // DATE (ex.: delivery_date) volta como 'YYYY-MM-DD' cru — evita virar meia-noite UTC e deslocar o dia.
  dateStrings: ['DATE'],
  // ponytail: SSL ligado por padrão (MySQL remoto/prod); desligar no local com MYSQL_SSL=false
  ssl: process.env.MYSQL_SSL === 'false' ? undefined : { rejectUnauthorized: false }
});
