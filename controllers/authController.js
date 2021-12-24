const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const User = require('../models/User');
const { attachCookieToResponse, createTokenUser } = require('../utils');

const register = async (req, res) => {
  const { name, email, password } = req.body;
  const ifEmailExists = await User.findOne({ email });
  if (ifEmailExists) {
    throw new CustomError.BadRequestError('Email already exists');
  }
  //first registered user as an admin
  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? 'admin' : 'user';

  const user = await User.create({ name, email, password, role });
  const tokenUser = createTokenUser(user);
  attachCookieToResponse({ res, tokenUser });
  res.status(StatusCodes.CREATED).json({ user: tokenUser });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new CustomError.BadRequestError('Please provide email and password');
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new CustomError.UnauthenticatedError(
      'User with this email does not exist'
    );
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new CustomError.UnauthenticatedError('Invalid password');
  }
  const tokenUser = createTokenUser(user);
  attachCookieToResponse({ res, tokenUser });
  res.status(StatusCodes.OK).json({ user: tokenUser });
};

const logout = async (req, res) => {
  res.cookie('token', 'logout', {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.status(StatusCodes.OK).json({ msg: 'User logged out' });
};

module.exports = { register, login, logout };
