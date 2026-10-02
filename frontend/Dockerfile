# ── Build stage ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps
RUN npm install --save-dev @types/react@^18.2.0 @types/react-dom@^18.2.0 typescript@^4.9.5
COPY . .
RUN npm run build

# ── Runtime stage ──
FROM nginx:stable-alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
