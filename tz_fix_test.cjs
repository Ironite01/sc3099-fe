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
        // Check the ACTUAL column types (not what the schema says)
        const colInfo = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'devices' 
            AND column_name IN ('first_seen_at', 'last_seen_at')
        `);
        
        // Try the CORRECT fix: cast to timestamptz AT TIME ZONE 'UTC' first, then convert
        const fix1 = await client.query(`
            SELECT 
                first_seen_at::text as raw,
                TO_CHAR((first_seen_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD HH24:MI:SS') as fix_double_atz,
                TO_CHAR(first_seen_at + INTERVAL '8 hours', 'YYYY-MM-DD HH24:MI:SS') as fix_add_8h
            FROM devices ORDER BY last_seen_at DESC LIMIT 1
        `);

        const lines = [
            'COLUMN_TYPES: ' + JSON.stringify(colInfo.rows),
            'FIX_TEST: ' + JSON.stringify(fix1.rows[0]),
        ];
        const result = lines.join('\n');
        fs.writeFileSync('tz_fix_test.txt', result, 'utf8');
        console.log(result);
    } catch (e) {
        const err = 'ERROR: ' + e.message;
        fs.writeFileSync('tz_fix_test.txt', err, 'utf8');
        console.log(err);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
