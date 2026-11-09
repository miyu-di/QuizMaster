const createError = require('http-errors');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const User = require('../models/User');
const toPublicQuiz = require('../helpers/publicQuiz');
const toPublicQuestion = require('../helpers/publicQuestion');
const findOwnedQuiz = require('../helpers/findOwnedQuiz');
const { getSkip, hasMorePages } = require('../helpers/pagination');
const { AGE_GROUPS, CATEGORIES, DEFAULT_AGE_GROUP } = require('../config/quizOptions');

const SORTS = {
  popular: { passCount: -1, createdAt: -1, _id: -1 },
  latest: { createdAt: -1, _id: -1 }
};

async function fetchCollection(ageGroup, { limit, page, sort }, favoriteIds) {
  const filter = { ageGroup };
  const [quizzes, total] = await Promise.all([
    Quiz.find(filter)
      .sort(SORTS[sort])
      .skip(getSkip({ page, limit }))
      .limit(limit)
      .lean(),
    Quiz.countDocuments(filter)
  ]);

  return {
    // Стрілка потрібна: map передав би індекс другим аргументом, а це isFavorite.
    quizzes: quizzes.map((quiz) =>
      toPublicQuiz(quiz, favoriteIds ? favoriteIds.has(String(quiz._id)) : undefined)
    ),
    total,
    hasMore: hasMorePages({ page, limit, total })
  };
}

async function getQuizzes(req, res, next) {
  try {
    const { type, ...options } = req.validatedQuery;
    const ageGroups = type === 'both' ? AGE_GROUPS : [type];

    // ObjectId у favorites і _id тесту порівнюємо як рядки (так вони й ідуть у JSON).
    const favoriteIds = req.user ? new Set(req.user.favorites.map(String)) : null;

    const collections = await Promise.all(
      ageGroups.map((group) => fetchCollection(group, options, favoriteIds))
    );

    const body = {};
    ageGroups.forEach((group, index) => {
      body[group] = collections[index];
    });
    body.total = collections.reduce((sum, collection) => sum + collection.total, 0);
    body.hasMore = collections.some((collection) => collection.hasMore);

    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
}

async function getQuizById(req, res, next) {
  try {
    const quiz = await Quiz.findById(req.params.id).lean();
    if (!quiz) {
      throw createError(404, 'Quiz not found');
    }

    const questions = await Question.find({ quiz: quiz._id }).sort({ createdAt: 1, _id: 1 }).lean();

    res.status(200).json({
      quiz: { ...toPublicQuiz(quiz), questions: questions.map(toPublicQuestion) }
    });
  } catch (error) {
    next(error);
  }
}

function getCategories(req, res) {
  res.status(200).json({ adults: CATEGORIES.adults, children: CATEGORIES.children });
}

async function createQuiz(req, res, next) {
  try {
    const quiz = await Quiz.create({
      title: req.body.quizTheme,
      owner: req.user._id,
      ageGroup: DEFAULT_AGE_GROUP
    });

    res.status(201).json({
      quiz: toPublicQuiz(quiz),
      categories: CATEGORIES[quiz.ageGroup]
    });
  } catch (error) {
    next(error);
  }
}

async function updateQuiz(req, res, next) {
  try {
    const quiz = await findOwnedQuiz(req.params.id, req.user._id);
    const { quizTheme, quizAgeGroup, quizCategory, quizBackground } = req.body;

    const nextAgeGroup = quizAgeGroup ?? quiz.ageGroup;
    const allowedCategories = CATEGORIES[nextAgeGroup];
    const update = {};

    if (quizTheme !== undefined) update.title = quizTheme;
    if (quizAgeGroup !== undefined) update.ageGroup = quizAgeGroup;
    if (quizBackground !== undefined) update.background = quizBackground;

    if (quizCategory !== undefined) {
      if (!allowedCategories.includes(quizCategory)) {
        throw createError(400, `Category "${quizCategory}" is not available for ${nextAgeGroup}`);
      }
      update.category = quizCategory;
    } else if (quizAgeGroup !== undefined && quiz.category && !allowedCategories.includes(quiz.category)) {
      update.category = '';
    }

    const updated = await Quiz.findOneAndUpdate(
      { _id: quiz._id, owner: req.user._id },
      update,
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw createError(404, 'Quiz not found');
    }

    res.status(200).json({ quiz: toPublicQuiz(updated) });
  } catch (error) {
    next(error);
  }
}

async function deleteQuiz(req, res, next) {
  try {
    const quiz = await findOwnedQuiz(req.params.id, req.user._id);

    await Question.deleteMany({ quiz: quiz._id });
    await Quiz.deleteOne({ _id: quiz._id, owner: req.user._id });

    await User.updateMany(
      { $or: [{ favorites: quiz._id }, { 'results.quiz': quiz._id }] },
      { $pull: { favorites: quiz._id, results: { quiz: quiz._id } } }
    );

    res.status(200).json({ message: 'Quiz deleted successfully', id: quiz._id });
  } catch (error) {
    next(error);
  }
}

module.exports = { getCategories, getQuizzes, getQuizById, createQuiz, updateQuiz, deleteQuiz };
