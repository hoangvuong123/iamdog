const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');
const readline = require('readline');

const queryPath = path.join(__dirname, 'query.txt');
const queryData = fs.readFileSync(queryPath, 'utf8').trim().split('\n');

const processQuery = async (query_id, proxy, isUpgradeLv, index) => {
    await checkProxyIP(proxy);
    query_id = query_id.replace(/[\r\n]+/g, '');
    const user_id_match = query_id.match(/user=%7B%22id%22%3A(\d+)/);
    if (!user_id_match) {
        console.error('Không thể tìm thấy user_id trong query_id');
        return;
    }

    const payload = {
        taps: 1000,
        tapsWithBoost: 0
    };

    const proxyAgent = new HttpsProxyAgent(proxy);

    const config = {
        method: 'post',
        url: 'https://api.iamdog.io/claims/tap',
        headers: {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Origin": "https://app.iamdog.io",
            "Referer": "https://app.iamdog.io/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        },
        data: payload,
        httpsAgent: proxyAgent
    };

    const login = async (queryId) => {
        const url = `https://api.iamdog.io/auth/login?${queryId}`;
        try {
            const response = await axios.post(url, {}, {
                headers: { ...config.headers },
                httpsAgent: proxyAgent
            });
            if (response.status === 201 && response.data.status === 'success') {
                return response.data.api_token;
            } else {
                throw new Error('Login failed');
            }
        } catch (error) {
            console.log(`Login error: ${error.message}`, 'error');
            return null;
        }
    }

    const token = await login(query_id);
    if (token) {
        let configClaim = {
            ...config,
            headers: {
                ...config.headers,
                'Authorization': `Bearer ${token}`
            }
        }
        try {
            const res = await axios(configClaim)
            console.log(res.data.balance);
        } catch (error) {
            console.error('Lỗi khi gửi yêu cầu:');
        }
    }

};

const askUpgradeLV = async () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question('Có upgrade level không? (y/n): ', (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase() === 'y');
        });
    });
};

const stt = 0
const run = async () => {
    const isUpgradeLv = await askUpgradeLV()
    while (true) {
        await processQuery(queryData[stt], isUpgradeLv, stt);
        process.stdout.write(`Tiếp tục claim`);
    }
}

run();
