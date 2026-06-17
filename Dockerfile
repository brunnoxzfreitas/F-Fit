FROM node:20-alpine AS builder

WORKDIR /app

# install dependencies (including devDependencies) for build
COPY package.json package-lock.json* ./
RUN npm install --production=false

# copy source and build frontend
COPY . .
RUN npm run build

# bundle server.ts to plain JS with esbuild (installed transiently)
RUN npm install --no-save esbuild && npx esbuild server.ts --bundle --platform=node --format=esm --external:better-sqlite3 --outfile=dist/server.js

FROM node:20-alpine AS runner
# runner stage uses built node_modules from builder to preserve native modules
WORKDIR /app
COPY package.json package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules

# copy built frontend and bundled server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads

EXPOSE 3000
ENV NODE_ENV=production

# run the bundled server
CMD ["node", "dist/server.js"]
