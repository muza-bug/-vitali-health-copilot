# =============================================================================
# Vitali Health AI — container image
# Builds the SPA and runs the self-hosted server (server/index.ts) which serves
# the static app AND the /api/llm endpoint. Pair with docker-compose.yml to run
# alongside a local Ollama and/or AnythingLLM for a fully self-hosted AI stack.
# =============================================================================

FROM node:22-slim

WORKDIR /app

# Install deps first for better layer caching.
COPY package.json ./
RUN npm install --no-audit --no-fund

# Build the front-end bundle.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# tsx runs the TypeScript server directly — no separate compile step.
CMD ["npm", "start"]
