FROM node:22-alpine
WORKDIR /app
COPY package.json seed.mjs ./
CMD ["npm", "run", "seed"]
