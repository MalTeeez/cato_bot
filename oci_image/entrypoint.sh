#/usr/bin/bash
sed -i 's/"token": "",/"token": "$BOT_TOKEN",/g' /home/discord_bot/config.json
sed -i 's/"clientId": "",/"clientId": "$BOT_ID",/g' /home/discord_bot/config.json

echo "Starting node process with node $(node -v)"
cd /home/discord_bot/
node index.js