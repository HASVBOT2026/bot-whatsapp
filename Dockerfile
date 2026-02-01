FROM node:18-slim

# Configuramos la carpeta
WORKDIR /usr/src/app

# Copiamos archivos e instalamos (Sin Chrome, sin Git pesado)
COPY package*.json ./
RUN npm install

# Copiamos el resto del bot
COPY . .

# Encendemos
CMD [ "node", "index.js" ]
