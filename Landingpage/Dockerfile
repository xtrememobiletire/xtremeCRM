# ==============================================================================
# Build stage for Next.js Landing Page
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm v12 (matches repo standard)
RUN npm install -g pnpm@12

# Copy dependency manifests and install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Build arguments for public URLs (configurable in Dokploy)
ARG NEXT_PUBLIC_APP_URL=https://app.xtrememobiletire.com
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

ARG NEXT_PUBLIC_BACKEND_URL=https://api.xtrememobiletire.com
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

ARG NEXT_PUBLIC_API_URL=https://api.xtrememobiletire.com/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compile Next.js production bundle
RUN pnpm run build

# Remove development dependencies to minimize container footprint
RUN pnpm prune --prod

# ==============================================================================
# Production runtime stage
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4000
ENV HOSTNAME="0.0.0.0"

# Run as non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy runtime assets and dependencies
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 4000

CMD ["node_modules/.bin/next", "start", "-p", "4000"]
