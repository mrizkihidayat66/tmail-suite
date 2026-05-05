FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

FROM base AS builder
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN apk add --no-cache openssl
RUN mkdir -p /root/.tmail-suite/db /root/.tmail-suite/attachments

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts/bootstrap.js ./scripts/bootstrap.js
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/root/.tmail-suite/db/tmail.db"
ENV ATTACHMENTS_DIR="/root/.tmail-suite/attachments"

CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push --skip-generate && node scripts/bootstrap.js && node server.js"]
