const Joi = require("joi");
const createError = require("http-errors");
const { isValidObjectId } = require("mongoose");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const toPublicUser = require("../helpers/publicUser");
const { uploadImage } = require("../helpers/uploadImage");

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(1).max(32),
  avatarURL: Joi.string().uri().allow("", null),
}).min(1);

function getCurrentUser(req, res) {
  res.status(200).json({ user: toPublicUser(req.user) });
}

async function updateProfile(req, res, next) {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) throw createError(400, error.message);

    const user = await User.findByIdAndUpdate(req.user._id, value, {
      new: true,
    });

    res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

async function addFavorite(req, res, next) {
  try {
    const { quizId } = req.params;
    if (!isValidObjectId(quizId)) throw createError(400, "Invalid quiz id");

    const quizExists = await Quiz.exists({ _id: quizId });
    if (!quizExists) throw createError(404, "Quiz not found");

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { favorites: quizId } }, 
      { new: true },
    );

    res.status(200).json({ favorites: user.favorites });
  } catch (error) {
    next(error);
  }
}

async function removeFavorite(req, res, next) {
  try {
    const { quizId } = req.params;
    if (!isValidObjectId(quizId)) throw createError(400, "Invalid quiz id");

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { favorites: quizId } },
      { new: true },
    );

    res.status(200).json({ favorites: user.favorites });
  } catch (error) {
    next(error);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) throw createError(400, "Avatar file is required");

    const { url } = await uploadImage(req.file.buffer, {
      folder: "quizmaster/avatars",
      transformation: [
        { width: 200, height: 200, crop: "fill" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatarURL: url },
      { new: true },
    );

    res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCurrentUser,
  updateProfile,
  addFavorite,
  removeFavorite,
  uploadAvatar,
};
