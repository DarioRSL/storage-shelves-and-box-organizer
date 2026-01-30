# Production stage - uses pre-built dist from CI/CD
FROM node:22-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy pre-built application from CI/CD pipeline
# The dist folder must be built before running docker build
COPY dist ./dist

# Environment
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "./dist/server/entry.mjs"]