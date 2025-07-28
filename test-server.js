const http = require('http');

// Test the health endpoint
http.get('http://localhost:3000/api/health', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Health endpoint response:');
        console.log('Status:', res.statusCode);
        console.log('Headers:', JSON.stringify(res.headers, null, 2));
        console.log('Body:', data);
        
        // If health check passes, test the section endpoint
        if (res.statusCode === 200) {
            console.log('\nTesting section endpoint...');
            http.get('http://localhost:3000/api/website/section/home', (sectionRes) => {
                let sectionData = '';
                sectionRes.on('data', (chunk) => sectionData += chunk);
                
                sectionRes.on('end', () => {
                    console.log('\nSection endpoint response:');
                    console.log('Status:', sectionRes.statusCode);
                    console.log('Headers:', JSON.stringify(sectionRes.headers, null, 2));
                    console.log('Body:', sectionData);
                });
            }).on('error', (err) => {
                console.error('Error testing section endpoint:', err);
            });
        }
    });
}).on('error', (err) => {
    console.error('Error testing health endpoint:', err);
});
