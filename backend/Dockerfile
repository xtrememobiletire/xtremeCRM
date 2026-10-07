FROM node:22-alpine

# Install OpenSSL for Prisma and build tools for bcrypt on Alpine
RUN apk add --no-cache openssl libc6-compat python3 make g++

WORKDIR /app

# Enable pnpm
RUN npm install -g pnpm@12

# Copy dependency definitions, workspace config, npmrc, and prisma schema first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* .npmrc* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies (with approved builds for bcrypt, prisma, esbuild)
RUN pnpm install --frozen-lockfile

# Provide build-time fallback URL for schema code generation (overridden at runtime by Dokploy)
ENV DIRECT_URL="postgresql://postgres:postgres@localhost:5432/db"
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/db"

# Generate Prisma Client via pnpm exec
RUN pnpm exec prisma generate

# Copy the rest of the application
COPY . .

# Build TypeScript code to dist/
RUN pnpm run build

# Expose backend port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

# On container start, push database schema to postgres and start express
CMD ["sh", "-c", "pnpm exec prisma db push --accept-data-loss && node dist/server.js"]
