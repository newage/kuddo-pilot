FROM node:24-alpine

WORKDIR /app

# node_modules lives in a named volume; the directory must belong to the node user
RUN mkdir -p /app/node_modules /app/.next && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["sh", "-c", "npm install && npm run db:migrate && npm run dev"]
