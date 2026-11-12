FROM node:22-alpine
WORKDIR /app
COPY package.json servidor.js ./
COPY publico ./publico
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "servidor.js"]
