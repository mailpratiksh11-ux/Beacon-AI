# Beacon AI — Angular SPA, built then served by nginx.
#
# In Dokploy set:
#   Build Type  : Dockerfile
#   Build Path  : frontend
#   Dockerfile  : Dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Dev deps are needed here: the Angular compiler is one.
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build

FROM nginx:alpine
# Angular 21 emits to dist/<project>/browser.
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
