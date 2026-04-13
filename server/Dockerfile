FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENV JWT_SECRET=toolingsuite-secret-change-me-in-prod
ENV AUTH_USERNAME=admin
ENV AUTH_PASSWORD=password123
ENV PORT=4001

EXPOSE 4001
CMD ["node", "index.js"]
