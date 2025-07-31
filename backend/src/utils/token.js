const jwt = require('jsonwebtoken');

function verifyToken(token, secret, options = {}) {
  try {
    return jwt.verify(token, secret, options);
  } catch (err) {
    throw err;
  }
}

module.exports = {
  verifyToken
};
