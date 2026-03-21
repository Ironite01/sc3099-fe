const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/sc3099",
});

async function check() {
    try {
        const res = await pool.query('SHOW TIMEZONE');
        console.log('DB Timezone:', res.rows[0].timezone);
        
        const res2 = await pool.query('SELECT NOW()');
        console.log('NOW():', res2.rows[0].now);
        
        const res3 = await pool.query('SELECT current_setting(\'TIMEZONE\')');
        console.log('Current setting:', res3.rows[0].current_setting);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
