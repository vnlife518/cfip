# Dockerfile for running the CFIP Web Configurator itself
FROM node:18-slim AS builder

WORKDIR /app
COPY package*.json ./
# Use the high-speed npmmirror to speed up dependency installation and prevent hanging
RUN npm config set registry https://registry.npmmirror.com && npm install

COPY . .
RUN npm run build

FROM node:18-slim
WORKDIR /app

ENV NODE_ENV=production
COPY package*.json ./
# Use the high-speed npmmirror in production stage too
RUN npm config set registry https://registry.npmmirror.com && npm install --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["npm", "start"]
