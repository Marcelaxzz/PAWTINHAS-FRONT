# Etapa 1: build do site com o Vite
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Variáveis VITE_ entram no build (o Railway repassa as variáveis do serviço como build args).
ARG VITE_API_URL=/api
ARG VITE_WHATSAPP=
ENV VITE_API_URL=$VITE_API_URL VITE_WHATSAPP=$VITE_WHATSAPP

RUN npm run build

# Etapa 2: o Caddy entrega o site e repassa /api para a API (mesmo domínio, por causa dos cookies)
FROM caddy:2.10-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

ENV PORT=8080
EXPOSE 8080
