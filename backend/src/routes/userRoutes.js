const express = require('express');
const authenticate = require('../middlewares/authenticate');
const { getCurrentUser } = require('../controllers/usersController');

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

module.exports = router;
