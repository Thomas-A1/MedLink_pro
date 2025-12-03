FROM node:20-bullseye
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . ./
CMD ["npm", "run", "electron:dev"]
