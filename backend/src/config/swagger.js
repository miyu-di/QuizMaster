const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Quiz Platform API',
      version: '1.0.0',
      description: 'API documentation for authentication and current-user endpoints.'
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Local development'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT is set by the API in an HttpOnly cookie after register/login.'
        }
      },
      schemas: {
        PublicUser: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '671234567890abcdef123456' },
            name: { type: 'string', example: 'Alex' },
            email: { type: 'string', format: 'email', example: 'alex@example.com' },
            avatarURL: { type: 'string', example: '' },
            favorites: { type: 'array', items: { type: 'string' } },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  quiz: { type: 'string' },
                  correctAnswers: { type: 'integer' },
                  totalQuestions: { type: 'integer' },
                  date: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          required: ['message'],
          properties: { message: { type: 'string', example: 'Invalid email or password' } }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options);
