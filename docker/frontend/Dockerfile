FROM node:24-bookworm-slim

WORKDIR /app

COPY frontend/package*.json ./

RUN npm ci

COPY frontend .

EXPOSE 5173

ENTRYPOINT [ "npm", "run", "dev", "--", "--host" ]
