FROM node:16.13.1-alpine3.12

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

CMD ["sh", "-c", "npm run start -- --token $TOKEN --api_key $API_KEY --guild_id $GUILD_ID --channel_id $CHANNEL_ID"]
