# Stage 1 – build the React client
FROM node:20-alpine AS client-build

WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2 – install server production dependencies
FROM node:20-alpine AS server-build

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./

# Stage 3 – final image: nginx serves the SPA, Node runs the auth server
FROM nginx:stable-alpine

# Add Node.js so we can run the auth server in the same container
RUN apk add --no-cache nodejs

# Copy built client and server
COPY --from=client-build /app/dist /usr/share/nginx/html
COPY --from=server-build /app/server /app/server

# Nginx config
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location = /login {\n\
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

# Startup: launch Node auth server in background, then nginx in foreground
RUN printf '#!/bin/sh\nnode /app/server/index.js &\nnginx -g "daemon off;"\n' \
    > /start.sh && chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
