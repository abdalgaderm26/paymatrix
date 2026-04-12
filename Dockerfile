# Base image
FROM node:20-alpine AS builder

WORKDIR /app

# Enable npm workspaces
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/dashboard/package*.json ./apps/dashboard/

RUN npm install

# Copy all source
COPY . .

# Build API and Dashboard
RUN npm run build --workspace=apps/api
RUN npm run build --workspace=apps/dashboard

# Runner for API
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/.env ./apps/api/.env

EXPOSE 3000
CMD ["node", "apps/api/dist/main"]
