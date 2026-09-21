FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY shared/package.json shared/package.json
RUN npm ci
COPY tsconfig.base.json ./
COPY shared shared
COPY backend backend
RUN npm run build -w backend

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=:: SERVE_FRONTEND=false
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/backend/package.json backend/package.json
COPY --from=build /app/frontend/package.json frontend/package.json
COPY --from=build /app/shared/package.json shared/package.json
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/src/db/migrations backend/src/db/migrations
USER node
CMD ["npm", "run", "start", "-w", "backend"]
