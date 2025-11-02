FROM node:18-alpine
WORKDIR /app
RUN npm i -g npm@8

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
EXPOSE 4000
CMD ["npm", "start"]
