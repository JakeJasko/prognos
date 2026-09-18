FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json vite.config.ts ./
RUN npm install

# Build client bundle
COPY index.html ./
COPY public/ ./public/
COPY src/ ./src/
COPY server/ ./server/
RUN npm run build

# Production runner stage
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json tsconfig.json ./
RUN npm install --omit=dev && npm install tsx

COPY --from=builder /app/dist ./dist
COPY server/ ./server/

# Data volume for SQLite persistence
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["npx", "tsx", "server/index.ts"]
