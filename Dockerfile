FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads
EXPOSE 3000
CMD ["node", "dist/server.js"]
