const express = require('express');
const { getTotalStats } = require('../controllers/statsController');

const router = express.Router();

/**
 * @swagger
 * /api/stats:
 *   get:
 *     tags: [Stats]
 *     summary: Total number of quiz passes (for the Stats block on the main page)
 *     description: |
 *       Public; no cookie needed. `passedCount` is the sum of `passCount` of all quizzes, i.e. every
 *       submission to `POST /api/quizzes/{id}/stats` (guests and authenticated users, repeated passes included).
 *       Passes of a quiz that was later deleted are no longer counted. No quizzes: `passedCount: 0`.
 *     responses:
 *       200:
 *         description: Total number of passed quizzes.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [passedCount]
 *               properties:
 *                 passedCount: { type: integer, minimum: 0, example: 128 }
 */
router.get('/', getTotalStats);

module.exports = router;
