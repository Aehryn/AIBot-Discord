FROM node:16.13.1-alpine3.12

# Create APP Directory
COPY . /app
WORKDIR /app

# Install Dependencies
COPY package*.json ./
RUN npm install discord.js@^13.0.1 openai dotenv

# Bundle Source
COPY . .

CMD ["npm", "run", "start"]
