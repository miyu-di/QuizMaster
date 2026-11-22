const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateQuery = require('../middlewares/validateQuery');
const { getCurrentUser, getFavorites, getUserStats } = require('../controllers/usersController');
const { privateListSchema } = require('../validators/quizValidators');

const router = express.Router();

/**
 * @swagger
 * /api/users/current:
 *   get:
 *     tags: [Users]
 *     summary: Get the currently authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Public user data (password is never returned).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/PublicUser' }
 *       401:
 *         description: Cookie missing, invalid, expired, or user not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/current', authenticate, getCurrentUser);

/**
 * @swagger
 * /api/users/favorites:
 *   get:
 *     tags: [Users]
 *     summary: Favorite quizzes of the current user
 *     description: |
 *       Private. The most recently added favorite comes first. Items have the same fields as
 *       `GET /api/quizzes/filter`; `isFavorite` is always true. Quizzes that no longer exist are skipped.
 *
 *       Pagination: `limit` 4-8 (default 8), `page` from 1. `total` is the number of favorites,
 *       `hasMore` is `page * limit < total`. No favorites: `quizzes: []`, `total: 0`.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         description: Portion size (4-8).
 *         schema: { type: integer, minimum: 4, maximum: 8, default: 8 }
 *     responses:
 *       200:
 *         description: One portion of favorite quizzes.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [quizzes, total, hasMore]
 *               properties:
 *                 quizzes:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/FilteredQuiz' }
 *                 total: { type: integer, example: 3 }
 *                 hasMore: { type: boolean, example: false }
 *       400:
 *         description: Invalid query parameter (page below 1, limit outside 4-8).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Not authenticated.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/favorites', authenticate, validateQuery(privateListSchema), getFavorites);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     tags: [Users]
 *     summary: Pass statistics of the current user (for UserStats on the home page)
 *     description: |
 *       Private. Calculated from the quiz results saved in the profile (one best result per quiz,
 *       see `POST /api/quizzes/{id}/stats`).
 *
 *       - `passedCount` - number of different quizzes the user has passed.
 *       - `successRate` - percentage of those quizzes passed successfully, rounded to an integer.
 *         A pass is successful when at least 50% of the answers are correct.
 *
 *       No results yet: `passedCount: 0`, `successRate: 0`.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Statistics of the current user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [passedCount, successRate]
 *               properties:
 *                 passedCount: { type: integer, minimum: 0, example: 8 }
 *                 successRate: { type: integer, minimum: 0, maximum: 100, example: 75 }
 *       401:
 *         description: Not authenticated.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/stats', authenticate, getUserStats);

module.exports = router;
