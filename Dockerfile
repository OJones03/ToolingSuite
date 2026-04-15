# Build stage — React frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage — nginx
FROM nginx:alpine

# Copy built React app
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config template and entrypoint
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /app-entrypoint.sh
RUN chmod +x /app-entrypoint.sh

# Default values — override via environment variables
ENV API_BACKEND=http://device-tracking-api:8001/
ENV AUTH_BACKEND=http://auth:4000

EXPOSE 80
ENTRYPOINT ["/app-entrypoint.sh"]
