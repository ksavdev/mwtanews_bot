# Используем базовый образ Node.js 20 (Debian Bookworm)
FROM node:20-bookworm

# Обновляем apt и устанавливаем системные зависимости Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем рабочую директорию приложения
WORKDIR /app

# Копируем файлы зависимостей и устанавливаем продакшен-зависимости (без devDependencies)
COPY package.json package-lock.json ./ 
RUN npm ci --omit=dev

# Копируем скомпилированный код приложения (директорию dist)
COPY dist ./dist

# Запускаем приложение (пример запуска, команда может отличаться)
CMD ["node", "dist/index.js"]
