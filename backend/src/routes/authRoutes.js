const express = require('express');
const { register, login, logout } = require('../controllers/authController');
const validateBody = require('../middlewares/validateBody');
const { registerSchema, loginSchema } = require('../validators/authValidators');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a user and immediately sign them in
 *     description: Registration creates the account, sets the HttpOnly JWT cookie, and returns the public user object (without password).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, minLength: 1, maxLength: 32, example: Alex }
 *               email: { type: string, format: email, example: alex@example.com }
 *               password: { type: string, minLength: 8, maxLength: 64, example: safe-demo-password }
 *     responses:
 *       201:
 *         description: User created and cookie set.
 *         headers:
 *           Set-Cookie:
 *             schema: { type: string }
 *             description: HttpOnly JWT cookie named token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/PublicUser' }
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Email already registered.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/register', validateBody(registerSchema), register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and set the JWT cookie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: alex@example.com }
 *               password: { type: string, minLength: 8, maxLength: 64, example: safe-demo-password }
 *     responses:
 *       200:
 *         description: Login succeeded and cookie was set.
 *         headers:
 *           Set-Cookie:
 *             schema: { type: string }
 *             description: HttpOnly JWT cookie named token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/PublicUser' }
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Email or password is incorrect.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/login', validateBody(loginSchema), login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out by clearing the JWT cookie
 *     responses:
 *       200:
 *         description: Cookie cleared.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Logged out successfully }
 */
router.post('/logout', logout);

module.exports = router;
