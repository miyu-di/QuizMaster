const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Quiz Platform API',
      version: '1.0.0',
      description: 'API documentation for authentication, users and quizzes.'
    },
    servers: [
      {
        url: process.env.API_BASE_URL || '/',
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
        Quiz: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '671234567890abcdef123456' },
            title: { type: 'string', minLength: 3, maxLength: 32, example: 'Space trivia' },
            owner: { type: 'string', example: '671234567890abcdef123457' },
            ageGroup: { type: 'string', enum: ['adults', 'children'], example: 'adults' },
            category: { type: 'string', example: '' },
            background: { type: 'string', example: '' },
            rating: { type: 'number', example: 0 },
            reviewsCount: { type: 'integer', example: 0 },
            passCount: { type: 'integer', example: 0 },
            createdAt: { type: 'string', format: 'date-time', description: 'ISO 8601 string in JSON' },
            updatedAt: { type: 'string', format: 'date-time', description: 'ISO 8601 string in JSON' },
            isFavorite: {
              type: 'boolean',
              example: false,
              description: 'Present only in GET /api/quizzes for an authenticated user; omitted for guests.'
            }
          }
        },
        QuizCollection: {
          type: 'object',
          required: ['quizzes', 'total', 'hasMore'],
          properties: {
            quizzes: { type: 'array', items: { $ref: '#/components/schemas/Quiz' } },
            total: { type: 'integer', example: 12, description: 'All quizzes of this age group' },
            hasMore: {
              type: 'boolean',
              example: true,
              description: 'True if there are more quizzes after this portion (page * limit < total). False on the last portion.'
            }
          }
        },
        Question: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '671234567890abcdef123458' },
            quiz: { type: 'string', example: '671234567890abcdef123456', description: 'Id of the quiz the question belongs to' },
            type: { type: 'string', enum: ['single-choice', 'true-false'], example: 'single-choice' },
            time: { type: 'integer', example: 30, description: 'Seconds to answer (0 = no limit)' },
            description: { type: 'string', example: 'What is the capital of France?' },
            image: { type: 'string', example: '' },
            answers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'a' },
                  text: { type: 'string', example: 'Paris' }
                }
              }
            },
            validAnswer: { type: 'string', description: 'Id of the correct answer option', example: 'a' }
          }
        },
        QuizDetails: {
          allOf: [
            { $ref: '#/components/schemas/Quiz' },
            {
              type: 'object',
              properties: {
                questions: { type: 'array', items: { $ref: '#/components/schemas/Question' } }
              }
            }
          ]
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
