const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5434,
    user: 'saiv',
    password: 'saiv_password',
    database: 'saiv',
});

async function check() {
    const client = await pool.connect();
    try {
        const tz = await client.query('SHOW TIMEZONE');
        const now = await client.query("SELECT NOW()::text as now_text");
        const raw = await client.query("SELECT first_seen_at::text as raw_ts, last_seen_at::text as raw_ls FROM devices ORDER BY last_seen_at DESC LIMIT 1");
        const conv = await client.query("SELECT TO_CHAR(first_seen_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD HH24:MI:SS') as sgt_ts FROM devices ORDER BY last_seen_at DESC LIMIT 1");
        
        const lines = [
            'PG_TIMEZONE: ' + JSON.stringify(tz.rows[0]),
            'NOW_TEXT: ' + JSON.stringify(now.rows[0]),
            'RAW_TIMESTAMPS: ' + JSON.stringify(raw.rows[0]),
            'SGT_CONVERTED: ' + JSON.stringify(conv.rows[0]),
        ];
        const result = lines.join('\n');
        fs.writeFileSync('tz_result.txt', result, 'utf8');
        console.log(result);
    } catch (e) {
        const err = 'ERROR: ' + e.message;
        fs.writeFileSync('tz_result.txt', err, 'utf8');
        console.log(err);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
