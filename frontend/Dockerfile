FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_OPEN_API_BASE=http://localhost:8000
ENV VITE_OPEN_API_BASE=$VITE_OPEN_API_BASE
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# SPA fallback so /aberto, /blog, ... work on refresh
RUN printf 'server { listen 80; root /usr/share/nginx/html; location / { try_files $uri /index.html; } }' > /etc/nginx/conf.d/default.conf
