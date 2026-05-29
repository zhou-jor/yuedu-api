FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY dist ./dist
RUN mkdir -p uploads
EXPOSE 3000
CMD ["node", "dist/server.js"]
