#################### BASE STAGE ####################
FROM node:20.13.1-alpine AS base
WORKDIR /app
COPY package*.json ./

#################### DEVELOPMENT STAGE ####################
# Installs ALL dependencies (including dev) to compile and run in development
FROM base AS development
RUN npm ci --ignore-scripts
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY eslint.config.mjs ./
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]

#################### BUILD STAGE ####################
FROM base AS build
# 1) Installs ALL dependencies (including dev) to have Nest CLI available for build
RUN npm ci --ignore-scripts

# 2) Copy source code and configuration
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY eslint.config.mjs ./

# 3) Compile (requires @nestjs/cli in devDependencies)
RUN npm run build

# 4) Prune dev dependencies: keep only production dependencies for runtime
RUN npm prune --omit=dev

#################### PRODUCTION STAGE ####################
FROM node:20.13.1-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy build artifacts and ONLY production dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

USER appuser
EXPOSE 3000
CMD ["node", "dist/main.js"]
