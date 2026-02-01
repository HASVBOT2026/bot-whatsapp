FROM node:18-slim

# Configuramos la carpeta
WORKDIR /usr/src/app

# Instalamos Git (SOLO PARA EVITAR ERRORES DE INSTALACIÓN)
RUN apt-get update && apt-get install -y git

# Copiamos archivos e instalamos
COPY package*.json ./
RUN npm install

# Copiamos el resto del bot
COPY . .

# Encendemos
CMD [ "node", "index.js" ]
