FROM node:16.4-alpine as base

WORKDIR "/app"

# dependencies
FROM base as dependencies

RUN apk update && apk add python3 alpine-sdk util-linux

COPY package.json package-lock.json ./
RUN npm install

# backend
FROM dependencies as backend

COPY . ./

RUN npm run build:backend

# frontend
FROM dependencies as frontend

COPY . ./

RUN npm run build:frontend

# release
FROM base as release

ENV NODE_ENV production

COPY --from=backend /app/dist/backend/ /app/dist/backend/
COPY --from=frontend /app/dist/frontend/ /app/dist/frontend/

# runtime dependencies
COPY package.json package-lock.json ./
RUN npm install

# code
COPY . ./

ENV PORT 3000
EXPOSE 3000

CMD ["npm", "run", "start"]
