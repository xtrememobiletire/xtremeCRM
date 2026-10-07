FROM node:22-alpine

# Install OpenSSL for Prisma and build tools for bcrypt on Alpine
RUN apk add --no-cache openssl libc6-compat python3 make g++

WORKDIR /app

# Enable pnpm
RUN npm install -g pnpm@12

# Copy dependency definitions and prisma schema first
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies (including devDependencies required for Prisma and TypeScript build)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build TypeScript code to dist/
RUN pnpm run build

# Expose backend port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

# On container start, push database schema to postgres and start express
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/server.js"]
