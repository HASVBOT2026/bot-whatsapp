FROM node:18-slim

# 1. Instalamos Git y herramientas de compilación (OBLIGATORIO para evitar errores rojos)
RUN apt-get update && apt-get install -y git python3 make g++

# 2. Configuramos la carpeta
WORKDIR /usr/src/app

# 3. Copiamos archivos de configuración
COPY package*.json ./

# 4. Instalamos las dependencias
RUN npm install

# 5. Copiamos el resto del bot
COPY . .

# 6. Encendemos
CMD [ "node", "index.js" ]
