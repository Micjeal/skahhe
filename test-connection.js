const http = require('http');

const sectionId = 'contact'; // Test with the contact section
const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/website/section/${sectionId}`,
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

console.log(`Testing section endpoint for: ${sectionId}`);

console.log('Attempting to connect to server...');

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            console.log('Response Body:', JSON.parse(data));
        } catch (e) {
            console.log('Response Body:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Error making request:', error);
});

req.end();
