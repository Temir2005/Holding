FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json docker-entrypoint.sh ./
# Installs and leaves the lock hash in node_modules, so a fresh volume filled from the image
# starts without a second install.
RUN sh docker-entrypoint.sh
COPY . .
# Keeps the node_modules volume in step with package-lock.json (see docker-entrypoint.sh).
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
