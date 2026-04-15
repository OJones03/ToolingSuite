#!/bin/sh
set -e

# Only substitute ${API_BACKEND} and ${AUTH_BACKEND} — leaves nginx vars like $uri untouched.
envsubst '${API_BACKEND} ${AUTH_BACKEND}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# Start nginx in the foreground
exec nginx -g 'daemon off;'
