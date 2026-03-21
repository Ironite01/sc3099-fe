const fs = require('fs');

const d = new Date("2026-03-20T04:57:00.000Z");
const formatted = new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
}).format(d);

const output = `Input: 2026-03-20T04:57:00.000Z
Expected (SGT): 20 Mar 2026, 12:57 pm
Actual (Intl): ${formatted}`;

fs.writeFileSync('test_date_simple.txt', output, 'utf8');
console.log('Result written to test_date_simple.txt');
