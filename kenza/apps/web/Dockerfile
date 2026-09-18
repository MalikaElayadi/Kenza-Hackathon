FROM node:20-alpine as builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY apps/web ./apps/web
COPY packages ./packages

WORKDIR /app/apps/web

RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/apps/web/dist ./dist

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
