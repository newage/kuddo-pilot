FROM node:24-alpine

WORKDIR /app

# node_modules живе в іменованому томі; каталог має належати користувачу node
RUN mkdir -p /app/node_modules /app/.next && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["sh", "-c", "npm install && npm run db:migrate && npm run dev"]
