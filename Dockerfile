FROM node:20-bookworm
WORKDIR /app

# зависимости
COPY package*.json ./
RUN npm ci --omit=dev

# готовый JS
COPY dist ./dist

CMD ["node", "dist/index.js"]
