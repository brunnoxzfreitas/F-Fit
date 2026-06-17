FROM node:20-alpine

WORKDIR /app

# install dependencies (including devDeps so tsx can run)
COPY package.json package-lock.json* ./
RUN npm install --production=false

# copy app
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

# run server with tsx (keeps same behavior as local dev server)
CMD ["npm", "run", "dev"]
