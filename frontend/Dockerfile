# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@12

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Build argument for API URL & WebSocket
ARG VITE_API_BASE_URL=https://api.xtrememobiletire.com/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

ARG VITE_WS_URL=https://api.xtrememobiletire.com
ENV VITE_WS_URL=$VITE_WS_URL

ARG VITE_MAPBOX_ACCESS_TOKEN
ENV VITE_MAPBOX_ACCESS_TOKEN=$VITE_MAPBOX_ACCESS_TOKEN

RUN pnpm run build

# Production serve stage with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
