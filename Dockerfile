FROM node:18-slim

# 1. Instalar dependencias: Chrome y GIT (Necesario para descargar la actualización)
RUN apt-get update \
    && apt-get install -y wget gnupg git \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Configurar carpeta
WORKDIR /usr/src/app

# 3. Copiar e instalar bot
COPY package*.json ./
RUN npm install
COPY . .

# 4. Iniciar
CMD [ "node", "index.js" ]
