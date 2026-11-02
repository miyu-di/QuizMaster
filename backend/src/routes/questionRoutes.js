const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateBody = require('../middlewares/validateBody');
const validateObjectId = require('../middlewares/validateObjectId');
const { updateQuestion, deleteQuestion } = require('../controllers/questionsController');
const { updateQuestionSchema } = require('../validators/questionValidators');

const router = express.Router();

/**
 * @swagger
 * /api/questions/{id}:
 *   patch:
 *     tags: [Questions]
 *     summary: Update a question (quiz owner only)
 *     description: |
 *       At least one field is required. `validAnswer` must match the id of one of the answers
 *       (the new ones if `answers` is sent, otherwise the stored ones).
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
 *               type: { type: string, enum: [single-choice, true-false] }
 *               time: { type: integer, minimum: 0, maximum: 3600 }
 *               description: { type: string, minLength: 8, maxLength: 128 }
 *               answers:
 *                 type: array
 *                 minItems: 2
 *                 maxItems: 6
 *                 items:
 *                   type: object
 *                   required: [id, text]
 *                   properties:
 *                     id: { type: string, maxLength: 64 }
 *                     text: { type: string, minLength: 1, maxLength: 128 }
 *               validAnswer: { type: string }
 *     responses:
 *       200:
 *         description: Updated question.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 question: { $ref: '#/components/schemas/Question' }
 *       400:
 *         description: Invalid id, empty body or validation failed (including validAnswer not matching any answer).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Not authenticated.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: The quiz of this question belongs to another user.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Question not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     tags: [Questions]
 *     summary: Delete a question (quiz owner only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Question deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Question deleted successfully }
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
 *         description: The quiz of this question belongs to another user.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Question not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch('/:id', authenticate, validateObjectId('id'), validateBody(updateQuestionSchema), updateQuestion);
router.delete('/:id', authenticate, validateObjectId('id'), deleteQuestion);

module.exports = router;
