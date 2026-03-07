# Développement
FROM node:18-alpine AS development

WORKDIR /usr/src/app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Créer le répertoire pour les logs
RUN mkdir -p logs/uploads/backups && \
    chown -R node:node logs/uploads/backups

# Changer d'utilisateur
USER node

# Exposer le port
EXPOSE 5000

# Commande de démarrage
CMD ["npm", "run", "dev"]

# Production
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production
RUN npm ci --only=production

FROM node:18-alpine AS production

# Installer mongodb-tools pour les backups
RUN apk add --no-cache mongodb-tools

WORKDIR /usr/src/app

# Copier les dépendances et le code source
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY . .

# Créer les répertoires nécessaires
RUN mkdir -p logs/uploads/backups && \
    chown -R node:node logs/uploads/backups

# Changer d'utilisateur
USER node

# Exposer le port
EXPOSE 5000

# Commande de démarrage
CMD ["npm", "start"]