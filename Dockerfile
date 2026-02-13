FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN apk add --no-cache curl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src/ ./src/
COPY latex-compiler/templates/ ./templates/
RUN mkdir -p /app/uploads /app/logs && \
    chown -R appuser:appgroup /app && \
    chmod 777 /app/uploads /app/logs
USER appuser
EXPOSE 3000
CMD ["node", "src/index.js"]
