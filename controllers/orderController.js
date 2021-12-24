const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { checkPermissions } = require('../utils');

const fakeStripeApi = async ({ amount, currency }) => {
  const client_secret = 'someRandomValue';
  return { client_secret, amount };
};

const getAllOrders = async (req, res) => {
  const orders = await Order.find({});
  res.status(StatusCodes.OK).json({ orders, count: orders.length });
};

const getSingleOrder = async (req, res) => {
  const { id: orderId } = req.params;
  const order = await Order.findOne({ _id: orderId });
  if (!order) {
    throw new CustomError.NotFoundError(
      `Order with orderId: ${orderId} does not exist`
    );
  }
  checkPermissions(req.user, order.user);
  res.status(StatusCodes.OK).json({ order });
};

const getCurrentUserOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user.userId });
  res.status(StatusCodes.OK).json({ orders, count: orders.length });
};

const updateOrder = async (req, res) => {
  const { id: orderId } = req.params;
  const { paymentIntentId } = req.body;

  const order = await Order.findOne({ _id: orderId });
  if (!order) {
    throw new CustomError.NotFoundError(
      `Order with orderId: ${orderId} does not exist`
    );
  }
  checkPermissions(req.user, order.user);

  order.paymentIntentId = paymentIntentId;
  order.status = 'paid';
  await order.save();

  res.status(StatusCodes.OK).json({ order });
};

const createOrder = async (req, res) => {
  const { items: cartItems, tax, shippingFee } = req.body;
  if (!cartItems || cartItems.length < 1) {
    throw new CustomError.BadRequestError('No items in cart');
  }
  if (!tax || !shippingFee) {
    throw new CustomError.BadRequestError(
      'Please provide tax and shipping fee'
    );
  }

  let orderItems = [];
  let subtotal = 0;

  for (const item of cartItems) {
    const dbProduct = await Product.findOne({ _id: item.product });
    if (!dbProduct) {
      throw new CustomError.NotFoundError(
        `No product with productId: ${item.product}`
      );
    }
    const { name, price, image, _id } = dbProduct;
    const singleOrderItem = {
      amount: item.amount,
      name,
      price,
      image,
      product: _id,
    };
    //add item to order
    orderItems = [...orderItems, singleOrderItem];
    //calculate subtotal
    subtotal += item.amount * price;
  }

  //calculate total
  const total = tax + shippingFee + subtotal;
  //get client secret
  const paymentIntent = await fakeStripeApi({
    amount: total,
    currency: 'usd',
  });

  const order = await Order.create({
    orderItems,
    total,
    subtotal,
    tax,
    shippingFee,
    clientSecret: paymentIntent.client_secret,
    user: req.user.userId,
  });
  res
    .status(StatusCodes.CREATED)
    .json({ order, clientSecret: order.clientSecret });
};

const deleteOrder = async (req, res) => {
  const { id: orderId } = req.params;
  const checkOrder = await Order.findOne({ _id: orderId });
  if (!checkOrder) {
    throw new CustomError.NotFoundError(
      `Order with orderId: ${orderId} does not exist`
    );
  }
  checkPermissions(req.user, checkOrder.user);

  const order = await Order.findOneAndDelete({ _id: orderId });

  res.status(StatusCodes.OK).json({ msg: 'Order removed' });
};

module.exports = {
  getAllOrders,
  getSingleOrder,
  getCurrentUserOrders,
  updateOrder,
  createOrder,
  deleteOrder,
};
