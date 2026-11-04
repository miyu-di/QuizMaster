const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateBody = require('../middlewares/validateBody');
const validateObjectId = require('../middlewares/validateObjectId');
const validateQuery = require('../middlewares/validateQuery');
const {
  getCategories,
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz
} = require('../controllers/quizzesController');
const { createQuizSchema, updateQuizSchema, listQuizzesSchema } = require('../validators/quizValidators');
const { createQuestion } = require('../controllers/questionsController');
const { createQuestionSchema } = require('../validators/questionValidators');

const router = express.Router();

/**
 * @swagger
 * /api/quizzes/categories:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get quiz categories for adults and children
 *     responses:
 *       200:
 *         description: Category lists per age group.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 adults: { type: array, items: { type: string }, example: [History, Science] }
 *                 children: { type: array, items: { type: string }, example: [Animals, Fairy tales] }
 */
router.get('/categories', getCategories);
router.get('/', validateQuery(listQuizzesSchema), getQuizzes);
// /categories оголошено вище, інакше :id перехопив би його.
router.get('/:id', validateObjectId('id'), getQuizById);

/**
 * @swagger
 * /api/quizzes:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get quizzes for adults and/or children
 *     description: |
 *       Public. Quizzes are split by age group. With `type=both` the response contains both
 *       collections, each limited to `limit` items. `total` inside a collection is the number of
 *       quizzes of that age group in the database; the top-level `total` is the sum over the
 *       returned collections. Only the requested collections are present in the response.
 *       Popularity is `passCount`. A `limit` outside 4-8 returns 400.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [adults, children, both], default: both }
 *       - in: query
 *         name: limit
 *         description: Items per collection (4-8). Values outside the range are rejected with 400.
 *         schema: { type: integer, minimum: 4, maximum: 8, default: 4 }
 *       - in: query
 *         name: sort
 *         description: popular = by passCount (desc), latest = by creation date (desc).
 *         schema: { type: string, enum: [popular, latest], default: popular }
 *       - in: query
 *         name: page
 *         description: Portion number, starting from 1.
 *         schema: { type: integer, minimum: 1, default: 1 }
 *     responses:
 *       200:
 *         description: Requested collections and total count.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [total]
 *               properties:
 *                 adults: { $ref: '#/components/schemas/QuizCollection' }
 *                 children: { $ref: '#/components/schemas/QuizCollection' }
 *                 total: { type: integer, example: 12 }
 *       400:
 *         description: Invalid query parameter (e.g. limit outside 4-8).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   post:
 *     tags: [Quizzes]
 *     summary: Register a new quiz
 *     description: Creates a quiz owned by the current user. Age group defaults to adults, category and background are empty until set with PATCH.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quizTheme]
 *             properties:
 *               quizTheme: { type: string, minLength: 3, maxLength: 32, example: Space trivia }
 *     responses:
 *       201:
 *         description: Quiz created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quiz: { $ref: '#/components/schemas/Quiz' }
 *                 categories:
 *                   type: array
 *                   description: Categories available for the quiz age group.
 *                   items: { type: string }
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Not authenticated.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', authenticate, validateBody(createQuizSchema), createQuiz);

/**
 * @swagger
 * /api/quizzes/{id}:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get a quiz with its questions
 *     description: Public. Questions are returned in creation order, including the correct answer and the time limit.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Quiz details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quiz: { $ref: '#/components/schemas/QuizDetails' }
 *       400:
 *         description: Invalid id.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Quiz not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   patch:
 *     tags: [Quizzes]
 *     summary: Update a quiz (owner only)
 *     description: At least one field is required. The category must belong to the quiz age group. If the age group changes and the current category does not fit it, the category is reset to an empty string.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quizTheme: { type: string, minLength: 3, maxLength: 32 }
 *               quizAgeGroup: { type: string, enum: [adults, children] }
 *               quizCategory: { type: string, example: History }
 *               quizBackground: { type: string, example: bg-1, description: Empty string clears the background. }
 *     responses:
 *       200:
 *         description: Updated quiz.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quiz: { $ref: '#/components/schemas/Quiz' }
 *       400:
 *         description: Invalid id, empty body or validation failed.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Not authenticated.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: The quiz belongs to another user.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Quiz not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     tags: [Quizzes]
 *     summary: Delete a quiz and all its questions (owner only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Quiz and its questions deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Quiz deleted successfully }
 *                 id: { type: string }
 *       400:
 *         description: Invalid id.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Not authenticated.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: The quiz belongs to another user.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Quiz not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch('/:id', authenticate, validateObjectId('id'), validateBody(updateQuizSchema), updateQuiz);
router.delete('/:id', authenticate, validateObjectId('id'), deleteQuiz);

/**
 * @swagger
 * /api/quizzes/{quizId}/questions:
 *   post:
 *     tags: [Questions]
 *     summary: Add a question to a quiz (owner only)
 *     description: |
 *       `description` 8-128 chars, 2-6 answers each with a unique `id` and `text` of 1-128 chars.
 *       `validAnswer` must equal the `id` of one of the answers, otherwise 400.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, description, answers, validAnswer]
 *             properties:
 *               type: { type: string, enum: [single-choice, true-false], example: single-choice }
 *               time: { type: integer, minimum: 0, maximum: 3600, default: 0, example: 30 }
 *               description: { type: string, minLength: 8, maxLength: 128, example: What is the capital of France? }
 *               answers:
 *                 type: array
 *                 minItems: 2
 *                 maxItems: 6
 *                 items:
 *                   type: object
 *                   required: [id, text]
 *                   properties:
 *                     id: { type: string, maxLength: 64, example: a }
 *                     text: { type: string, minLength: 1, maxLength: 128, example: Paris }
 *               validAnswer: { type: string, example: a }
 *     responses:
 *       201:
 *         description: Question created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 question: { $ref: '#/components/schemas/Question' }
 *       400:
 *         description: Invalid id or validation failed (including validAnswer not matching any answer).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Not authenticated.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: The quiz belongs to another user.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Quiz not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post(
  '/:quizId/questions',
  authenticate,
  validateObjectId('quizId'),
  validateBody(createQuestionSchema),
  createQuestion
);

module.exports = router;
