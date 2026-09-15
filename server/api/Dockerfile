FROM node:22-alpine

WORKDIR /app
COPY server/api/package.json ./package.json
RUN npm install --omit=dev
COPY server/api/src ./src
COPY server/db ./db

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "src/server.js"]
