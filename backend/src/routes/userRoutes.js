const express = require("express");
const authenticate = require("../middlewares/authenticate");
const { uploadSingle } = require("../middlewares/upload");
const {
  getCurrentUser,
  updateProfile,
  addFavorite,
  removeFavorite,
  uploadAvatar,
} = require("../controllers/usersController");

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
router.get("/current", authenticate, getCurrentUser);

/**
 * @swagger
 * /api/users:
 *   patch:
 *     tags: [Users]
 *     summary: Update the current user's profile (name, avatarURL)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 1, maxLength: 32 }
 *               avatarURL: { type: string, format: uri }
 *     responses:
 *       200:
 *         description: Updated public user data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/PublicUser' }
 *       400:
 *         description: Validation error.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Cookie missing, invalid, expired, or user not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch("/", authenticate, updateProfile);

/**
 * @swagger
 * /api/users/avatar:
 *   post:
 *     tags: [Users]
 *     summary: Upload the current user's avatar (jpg, png or webp, max 2 MB)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Updated public user data with the new avatarURL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/PublicUser' }
 *       400:
 *         description: File is missing, has a wrong type or is too large.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Cookie missing, invalid, expired, or user not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post("/avatar", authenticate, uploadSingle("avatar"), uploadAvatar);

/**
 * @swagger
 * /api/users/favorites/{quizId}:
 *   post:
 *     tags: [Users]
 *     summary: Add a quiz to the current user's favorites
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated list of favorite quiz ids (no duplicates).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 favorites:
 *                   type: array
 *                   items: { type: string }
 *       400:
 *         description: Invalid quiz id.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Cookie missing, invalid, expired, or user not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Quiz not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     tags: [Users]
 *     summary: Remove a quiz from the current user's favorites
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated list of favorite quiz ids.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 favorites:
 *                   type: array
 *                   items: { type: string }
 *       400:
 *         description: Invalid quiz id.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Cookie missing, invalid, expired, or user not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post("/favorites/:quizId", authenticate, addFavorite);
router.delete("/favorites/:quizId", authenticate, removeFavorite);

module.exports = router;
