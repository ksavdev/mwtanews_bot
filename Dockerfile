# ───────────────────────────────────────────────
# 1) Базовый образ
FROM node:20-bookworm

# 2) Системные библиотеки, нужные Chromium
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation \
    libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnss3 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libxshmfence1 \
    xdg-utils \
 && rm -rf /var/lib/apt/lists/*

# 3) Рабочая директория
WORKDIR /app

# 4) Node-зависимости (здесь сработает postinstall Puppeteer, скачается Chrome)
COPY package*.json ./
RUN npm ci --omit=dev

# 5) Готовый JS-бандл
COPY dist ./dist

# 6) Запуск бота
CMD ["node", "dist/index.js"]
