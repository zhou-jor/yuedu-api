FROM node:20-slim
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --no-optional && pnpm store prune
COPY dist ./dist
RUN mkdir -p uploads
EXPOSE 3000
CMD ["node", "dist/server.js"]
