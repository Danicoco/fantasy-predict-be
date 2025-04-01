const https = require("https");

function initiateTransfer(secretKey, source, reason, amount, recipient) {
    return new Promise((resolve, reject) => {
        console.log('dee');

        const { source, reason, amount, recipient } = requestBody;
        const params = JSON.stringify({
            "source": source,
            "reason": reason,
            "amount": amount,
            "recipient": recipient
        });

        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: '/transfer',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, res => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on('error', error => {
            reject(error);
        });

        req.write(params);
        req.end();
    });
}