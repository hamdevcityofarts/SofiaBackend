const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Sofia Smart Solutions API',
    version: '1.0.0',
    description: `
API officielle de Sofia Smart Solutions.
Documentation des services :
- Authentification
- Utilisateurs
- Livres
- Commandes
- Hôtels
- Services
    `,
    contact: {
      name: 'Sofia Smart Solutions',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Serveur local',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [
    './src/routes/**/*.js',
    './src/controllers/**/*.js',
    './app.js',
  ],
};

module.exports = swaggerJSDoc(options);
