# Digital Samba MCP Server - HTTP Mode
#
# Build: docker build -t digitalsamba-mcp .
# Run:   docker run -p 3000:3000 -e NODE_ENV=production digitalsamba-mcp
#
# For development (auth optional):
#   docker run -p 3000:3000 digitalsamba-mcp
#
# For production (auth required):
#   docker run -p 3000:3000 -e NODE_ENV=production digitalsamba-mcp

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/bin ./bin

# Set environment variables
ENV NODE_ENV=production
ENV TRANSPORT=http
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Health check (use 127.0.0.1 instead of localhost to force IPv4)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# Run the server
CMD ["node", "dist/src/index.js"]
