const d1 = new Date("2026-03-20T04:57:00.000Z");
console.log("Input: 2026-03-20T04:57:00.000Z");
console.log("UTC:", d1.toUTCString());
console.log("SGT (Intl):", new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
}).format(d1));

const d2 = new Date("2026-03-20 04:57:00"); // Local (assumed if no Z and not ISO)
console.log("\nInput: 2026-03-20 04:57:00 (no Z)");
console.log("UTC:", d2.toUTCString());
console.log("SGT (Intl):", new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
}).format(d2));
