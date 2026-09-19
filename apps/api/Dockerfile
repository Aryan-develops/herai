FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install --workspace=apps/api
COPY apps/api apps/api
RUN npm run build --workspace=apps/api

FROM node:22-slim
WORKDIR /app
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY apps/api/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/index.js"]
