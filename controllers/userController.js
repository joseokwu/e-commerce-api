const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const User = require('../models/User');
const {
  attachCookieToResponse,
  createTokenUser,
  checkPermissions,
} = require('../utils');

const getAllUsers = async (req, res) => {
  const users = await User.find({ role: 'user' }).select('-password');
  res.status(StatusCodes.OK).json({ users });
};

const getSingleUser = async (req, res) => {
  const { id: userId } = req.params;
  const user = await User.findOne({ _id: userId }).select('-password');
  if (!user) {
    throw new CustomError.NotFoundError('No user found');
  }
  checkPermissions(req.user, user._id);
  res.status(StatusCodes.OK).json({ user });
};

const showCurrentUser = (req, res) => {
  res.status(StatusCodes.OK).json({ user: req.user });
};

//update user with .save()
const updateUser = async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    throw new CustomError.BadRequestError('Name and email required');
  }
  const user = await User.findOne({ _id: req.user.userId });
  user.name = name;
  user.email = email;
  user.save();

  const tokenUser = createTokenUser(user);
  attachCookieToResponse({ res, tokenUser });
  res.status(StatusCodes.OK).json({ user: tokenUser });
};
//update user with findoneandupdate
// const updateUser = async (req, res) => {
//   const { name, email } = req.body;
//   if (!name || !email) {
//     throw new CustomError.BadRequestError('Name and email required');
//   }
//   const user = await User.findByIdAndUpdate(
//     { _id: req.user.userId },
//     { name, email },
//     { new: true, runValidators: true }
//   );
//   const tokenUser = createTokenUser(user);
//   attachCookieToResponse({ res, tokenUser });
//   res.status(StatusCodes.OK).json({ user: tokenUser });
// };

const updateUserPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new CustomError.BadRequestError('Old and new password are required');
  }
  const user = await User.findOne({ _id: req.user.userId });
  const isPasswordMatch = await user.comparePassword(oldPassword);
  if (!isPasswordMatch) {
    throw new CustomError.UnauthenticatedError('The password does not match');
  }
  user.password = newPassword;
  await user.save();
  res.status(StatusCodes.OK).json({ msg: 'Success! Password changed' });
};

module.exports = {
  getAllUsers,
  getSingleUser,
  showCurrentUser,
  updateUser,
  updateUserPassword,
};
