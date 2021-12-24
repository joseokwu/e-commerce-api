const { createJWT, isTokenValid, attachCookieToResponse } = require('./jwt');
const createTokenUser = require('./createTokenUser');
const checkPermissions = require('./checkPermissions');

module.exports = {
  createJWT,
  isTokenValid,
  attachCookieToResponse,
  createTokenUser,
  checkPermissions,
};
