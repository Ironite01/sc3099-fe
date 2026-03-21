import fs from 'fs';

async function testDeviceReg() {
    console.log("Testing POST /api/v1/auth/login");
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: 'student@example.com', /* Wait, does this user exist? I'll register it first */
            password: 'Password123!'
        })
    });
    
    let setCookie = loginRes.headers.get('set-cookie');
    console.log("Login Status:", loginRes.status);
    
    if (!loginRes.ok && loginRes.status !== 401) {
        console.log("Login failed:", await loginRes.text());
        return;
    }
    
    if (loginRes.status === 401) {
        console.log("User not found, registering first...");
        const regNewRes = await fetch('http://localhost:3000/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'testauth@example.com',
                password: 'Password123!',
                full_name: 'Test Auth User'
            })
        });
        console.log("Register User Status:", regNewRes.status);
        console.log("Register User Response:", await regNewRes.text());
        
        // Login again
        const loginRes2 = await fetch('http://localhost:3000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'testauth@example.com',
                password: 'Password123!'
            })
        });
        setCookie = loginRes2.headers.get('set-cookie');
        console.log("Login2 Status:", loginRes2.status);
    }
    
    console.log("Set-Cookie:", setCookie ? "Received" : "None");
    
    console.log("Testing POST /api/v1/devices/register");
    const regRes = await fetch('http://localhost:3000/api/v1/devices/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': setCookie || ''
        },
        body: JSON.stringify({
            device_fingerprint: 'test-fingerprint-123456789',
            device_name: 'Test Script',
            platform: 'web'
        })
    });
    
    console.log("Device Register Status:", regRes.status);
    console.log("Device Register Response:", await regRes.text());
}

testDeviceReg().catch(console.error);
