#!/bin/sh
set -e

# Only substitute ${API_BACKEND} and ${AUTH_BACKEND} — leaves nginx vars like $uri untouched.
envsubst '${API_BACKEND} ${AUTH_BACKEND}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# Start auth service in the background
node /auth/index.js &
AUTH_PID=$!

# Wait until auth service is accepting connections (up to 10s)
echo "Waiting for auth service to start..."
for i in $(seq 1 20); do
  if wget -q -O /dev/null http://localhost:4000/auth/verify 2>/dev/null; then
    echo "Auth service ready."
    break
  fi
  # Also check the process is still alive
  if ! kill -0 $AUTH_PID 2>/dev/null; then
    echo "Auth service exited unexpectedly. Check JWT_SECRET and other env vars."
    exit 1
  fi
  sleep 0.5
done

# Start nginx in the foreground
exec nginx -g 'daemon off;'
