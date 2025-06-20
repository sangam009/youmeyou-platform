FROM node:18-alpine AS builder

# Define build arguments with defaults
ARG NODE_ENV=development

# Set environment variables
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

# Copy package.json and package-lock.json
COPY backend/package*.json ./

# Install dependencies based on environment
RUN if [ "$NODE_ENV" = "production" ] ; then \
        npm ci ; \
    else \
        npm install ; \
    fi

# Copy the rest of the application code
COPY backend/src ./src

# Build step for production (uncomment if needed)
# RUN if [ "$NODE_ENV" = "production" ] ; then \
#        npm run build ; \
#    fi

# For production, create a smaller image
FROM node:18-alpine AS final

# Define build arguments with defaults
ARG NODE_ENV=development
ARG PORT=4000
ARG USE_NON_ROOT_USER=false

# Set environment variables
ENV NODE_ENV=${NODE_ENV} \
    PORT=${PORT}

WORKDIR /app

# Copy package.json and package-lock.json
COPY backend/package*.json ./

# Install dependencies based on environment
RUN if [ "$NODE_ENV" = "production" ] ; then \
        npm ci --only=production ; \
    else \
        npm install ; \
    fi

# For development, copy all source
COPY backend/src ./src

# For production, copy from builder stage instead
# COPY --from=builder /app/dist ./dist

# For production, add non-root user
RUN if [ "$NODE_ENV" = "production" ] && [ "$USE_NON_ROOT_USER" = "true" ] ; then \
        addgroup -g 1001 -S nodejs && \
        adduser -S nodejs -u 1001 -G nodejs && \
        chown -R nodejs:nodejs /app && \
        # Switch to non-root user
        USER nodejs ; \
    fi

# Expose the application port
EXPOSE ${PORT}

# Add health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# Start the application based on environment
CMD if [ "$NODE_ENV" = "production" ] ; then \
        node src/app.js ; \
    else \
        npm run dev ; \
    fi 