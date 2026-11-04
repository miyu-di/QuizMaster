const toPublicUser = require('../helpers/publicUser');

function getCurrentUser(req, res) {
  res.status(200).json({ user: toPublicUser(req.user) });
}

module.exports = { getCurrentUser };
