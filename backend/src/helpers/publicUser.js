function toPublicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatarURL: user.avatarURL,
    favorites: user.favorites,
    results: user.results
  };
}

module.exports = toPublicUser;
