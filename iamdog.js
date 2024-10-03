const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const queryPath = path.join(__dirname, 'query.txt');
const queryData = fs.readFileSync(queryPath, 'utf8').trim().split('\n');

const processQuery = async (query_id, isUpgradeLv, index) => {
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
    };

    const login = async (queryId) => {
        const url = `https://api.iamdog.io/auth/login?${queryId}`;
        try {
            const response = await axios.post(url, {}, {
                headers: { ...config.headers },
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

    const checkAndUpgradeMeme = async (token) => {
        try {
            const userMemeResponse = await axios.get(`https://api.iamdog.io/users/memes?page=1&limit=10`, {
                headers: {
                    ...config.headers,
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const primaryMeme = userMemeResponse.data.primaryMeme;
            console.log(`Đang sử dụng ${primaryMeme.name} level ${primaryMeme.level}`, 'info');
    
            const memeInfoResponse = await axios.get(`https://api.iamdog.io/meme?page=1&limit=50`, {
                headers: {
                    ...config.headers,
                    'Authorization': `Bearer ${token}`
                }
            });
    
            const memeInfo = memeInfoResponse.data.data.find(meme => meme.key === primaryMeme.key);
            const nextLevel = primaryMeme.level + 1;
            const nextLevelInfo = memeInfo.levels[nextLevel];
    
            if (!nextLevelInfo) {
                console.log(`Đã đạt level tối đa cho ${primaryMeme.name}`, 'info');
                return;
            }
            if (userInfo.balance >= nextLevelInfo.amount) {
                const upgradeResponse = await axios.post(
                    `https://api.iamdog.io/users/meme/upgrade/${primaryMeme._id}`,
                    {},
                    {
                        headers: {
                            ...console.headers,
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );
    
                const upgradedMeme = upgradeResponse.data;
                console.log(`Đã mua ${upgradedMeme.name} level ${upgradedMeme.level}`, 'success');
            } else {
                console.log(`Không đủ balance để nâng cấp. Cần: ${nextLevelInfo.amount}, Hiện có: ${userInfo.balance}`, 'warning');
            }
        } catch (error) {
            console.log(`Lỗi khi kiểm tra/nâng cấp Meme: ${error.message}`, 'error');
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

        if(isUpgradeLv){
            await checkAndUpgradeMeme(token)
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
