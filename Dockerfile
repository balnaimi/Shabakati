# Multi-stage build for production
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY web/package*.json ./web/
COPY server/package*.json ./server/

# Install dependencies
RUN cd web && npm ci && cd ../server && npm ci

# Copy source files
COPY . .

# Build frontend
RUN cd web && npm run build

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built frontend from builder
COPY --from=builder /app/web/dist ./dist

# Application code only (server/node_modules must stay out of context — see .dockerignore)
COPY server/ ./

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Start server
CMD ["node", "server.js"]
