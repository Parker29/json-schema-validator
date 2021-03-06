FROM node:carbon

# Create app directory
RUN mkdir /app
WORKDIR /app

ADD src ./src
COPY package*.json ./

RUN npm install
CMD ["node", "./src/server.js"]
