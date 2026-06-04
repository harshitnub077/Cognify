FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
# Prisma requires openssl
RUN apk add --no-cache openssl
RUN npm ci

# Copy source and prisma schema
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build || npx tsc

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["npm", "run", "start"]
