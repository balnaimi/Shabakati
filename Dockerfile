# Multi-stage build for production
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci && cd server && npm ci

# Copy source files
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server/ ./

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Start server
CMD ["node", "server.js"]
