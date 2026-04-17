# Build stage — React frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Auth service deps
FROM node:20-alpine AS auth-deps
WORKDIR /auth
COPY auth-service/package.json auth-service/package-lock.json ./
RUN npm ci --omit=dev

# Production stage — nginx + auth service
FROM nginx:alpine

# Install Node.js so we can run the auth service
RUN apk add --no-cache nodejs

# Copy built React app
COPY --from=build /app/dist /usr/share/nginx/html

# Copy auth service
COPY --from=auth-deps /auth/node_modules /auth/node_modules
COPY auth-service/index.js /auth/index.js

# Create data directory for user store and declare it as a volume mount point
RUN mkdir -p /auth/data
VOLUME ["/auth/data"]

# Copy nginx config template and entrypoint
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /app-entrypoint.sh
RUN chmod +x /app-entrypoint.sh

# Auth runs on localhost inside the container
ENV API_BACKEND=http://device-tracking-api:8001/
ENV AUTH_BACKEND=http://localhost:4000
ENV JWT_SECRET=change-me-to-a-random-secret

EXPOSE 80
ENTRYPOINT ["/app-entrypoint.sh"]
