const path = require('path');
const fs = require('fs');
const https = require('https');

// Manually parse .env.local because dotenv might not be installed or configured for this script
const envPath = path.join(__dirname, '../.env.local');
let TMAP_APP_KEY = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/NEXT_PUBLIC_TMAP_APP_KEY=(.*)/);
    if (match && match[1]) {
        TMAP_APP_KEY = match[1].trim();
        // Remove quotes if present
        TMAP_APP_KEY = TMAP_APP_KEY.replace(/^["']|["']$/g, '');
    }
} catch (e) {
    console.error('Failed to read .env.local:', e.message);
    process.exit(1);
}

if (!TMAP_APP_KEY) {
    console.error('TMAP_APP_KEY not found in .env.local');
    process.exit(1);
}

console.log('Found API Key (masked):', TMAP_APP_KEY.substring(0, 5) + '...');

const keyword = '도농중';
const url = `https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(keyword)}&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=10`;

console.log('Requesting:', url);

const req = https.request(url, {
    method: 'GET',
    headers: {
        'appKey': TMAP_APP_KEY,
        'Accept': 'application/json'
    }
}, (res) => {
    console.log('Status Code:', res.statusCode);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Body:', data.substring(0, 500));
        try {
            const json = JSON.parse(data);
            if (json.searchPoiInfo && json.searchPoiInfo.pois) {
                console.log('SUCCESS: Found POIs');
            } else {
                console.log('FAILURE: Unexpected JSON structure');
            }
        } catch (e) {
            console.error('Failed to parse JSON');
        }
    });
});

req.on('error', (e) => {
    console.error('Request Error:', e);
});

req.end();
