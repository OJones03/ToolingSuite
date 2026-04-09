# Stage 1 – build client
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2 – prepare server
FROM node:20-alpine AS server-deps

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev 2>/dev/null || true
COPY server/ ./

# Stage 3 – serve
FROM nginx:stable-alpine

# Install Node.js for the auth server
RUN apk add --no-cache nodejs

COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=server-deps /app/server /app/server

# Nginx config — serves static files, proxies /api/ to device API,
# and proxies /login + /auth to the Node auth server (port 4000).
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location /login {\n\
        proxy_pass http://127.0.0.1:4000;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
    }\n\
    location /auth/ {\n\
        proxy_pass http://127.0.0.1:4000;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
    }\n\
    location /api/ {\n\
        proxy_pass http://device-tracking-api:8001/;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
    }\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

# Startup script — run Node auth server then start Nginx in foreground
RUN printf '#!/bin/sh\nnode /app/server/index.js &\nnginx -g "daemon off;"\n' > /start.sh \
 && chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
