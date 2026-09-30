FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV RITZY_DATA_DIR=/data
ENV RITZY_DATABASE_DRIVER=sqlite
ENV RITZY_FILE_DRIVER=local
ENV RITZY_EMAIL_DRIVER=off

EXPOSE 4765

CMD ["npm", "start"]
