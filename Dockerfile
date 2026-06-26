# ─── Stage 1: Build ───────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for compilation)
RUN npm ci

# Copy codebase
COPY . .

# Generate Prisma Client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# ─── Stage 2: Runtime ─────────────────────────────────────────────────
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install only production-level dependencies
RUN npm ci --omit=dev

# Copy compiled JavaScript output from the builder stage
COPY --from=builder /app/dist ./dist

# Generate Prisma Client in the production stage (reads target query engine)
RUN npx prisma generate

EXPOSE 3000

# Run server
CMD ["node", "dist/server.js"]
