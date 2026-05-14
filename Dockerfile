# Stage 1: build the React app
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first to cache this layer
COPY package.json package-lock.json ./
RUN npm ci

# Copy the source and build
COPY . .

# Accept optional Firebase env vars at build time
ARG REACT_APP_FIREBASE_API_KEY
ARG REACT_APP_FIREBASE_AUTH_DOMAIN
ARG REACT_APP_PROJECT_ID
ENV REACT_APP_FIREBASE_API_KEY=$REACT_APP_FIREBASE_API_KEY
ENV REACT_APP_FIREBASE_AUTH_DOMAIN=$REACT_APP_FIREBASE_AUTH_DOMAIN
ENV REACT_APP_PROJECT_ID=$REACT_APP_PROJECT_ID

RUN npm run build

# Stage 2: serve with nginx
FROM nginx:alpine AS production
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
