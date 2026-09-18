FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY apps/api ./apps/api
COPY packages ./packages
COPY jeu-de-donnees-sujet-02-kenza ./jeu-de-donnees-sujet-02-kenza

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["npm", "run", "start"]
