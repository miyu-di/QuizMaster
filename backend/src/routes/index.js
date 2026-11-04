const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const quizRoutes = require('./quizRoutes');
const questionRoutes = require('./questionRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/quizzes', quizRoutes);
router.use('/questions', questionRoutes);

module.exports = router;
