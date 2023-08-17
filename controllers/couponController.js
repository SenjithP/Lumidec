const Coupon = require("../models/couponModel.js");
const User = require("../models/userModel.js");
const Cart = require("../models/cartModel.js");

//Coupon
const addcouponpage = async (req, res) => {
  const availableCoupons = await Coupon.find({});
  try {
    res.render("addCoupon", { availableCoupons });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const addcoupon = async (req, res) => {
  if (
    !req.body.code ||
    !req.body.discount ||
    !req.body.min_purchase ||
    !req.body.max_discount ||
    !req.body.expiry
  ) {
    return res.render("addCoupon", { msg: "All fields required" });
  }
  if (new Date(req.body.expiry) <= new Date()) {
    return res.render("addCoupon", { msg: "Invalid Date" });
  }

  let existingCode = await Coupon.find({});
  if (existingCode.couponCode == req.body.code) {
    return res.render("addCoupon", { msg: "Coupon Exists." });
  }

  if (req.body.discount < 1 || req.body.discount > 90) {
    return res.render("addCoupon", {
      msg: "Discount should be in percentage max upto 90.",
    });
  }

  const newCoupon = new Coupon({
    couponCode: req.body.code,
    discount: req.body.discount,
    minPurchase: req.body.min_purchase,
    maxDiscount: req.body.max_discount,
    expires: req.body.expiry,
    statusEnable: true,
  });
  await newCoupon.save();
  res.redirect("/admin/addCoupon");
};

const changeCouponStatus = async (req, res) => {
  try {
    const couponId = req.query.id;
    const coupon = await Coupon.findById(couponId);
    if (coupon) {
      coupon.statusEnable = !coupon.statusEnable; // Toggle the value
      await coupon.save();
    }
    res.redirect("/admin/addCoupon");
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to change coupon status" });
  }
};

const loadEditCoupon = async (req, res) => {
  try {
    const couponId = req.query.id;
    const coupon = await Coupon.findById(couponId);
    res.render("editCoupon", { coupon });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to load update category" });
  }
};

const updateCoupon = async (req, res) => {
  try {
    let id = req.body.id;
    let couponCode = req.body.code;
    let discount = req.body.discount;
    let minPurchase = req.body.min_purchase;
    let maxDiscount = req.body.max_discount;
    let expires = req.body.expiry;

    if (!couponCode || !discount || !minPurchase || !maxDiscount || !expires) {
      return res.render("editCoupon", { msg: "All fields required" });
    }
    if (new Date(expires) <= new Date()) {
      return res.render("editCoupon", { msg: "Invalid Date" });
    }

    let existingCode = await Coupon.find({});
    if (existingCode.couponCode == couponCode) {
      return res.render("editCoupon", { msg: "Coupon Exists." });
    }

    if (discount < 1 || discount > 90) {
      return res.render("editCoupon", {
        msg: "Discount should be in percentage max upto 90.",
      });
    }
    await Coupon.findByIdAndUpdate(id, {
      couponCode,
      discount,
      minPurchase,
      maxDiscount,
      expires,
    });
    res.redirect("/admin/addCoupon");
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to update Coupon" });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.query.id;
    await Coupon.findByIdAndDelete(couponId);
    res.redirect("/admin/addCoupon");
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to delete coupon" });
  }
};

let couponApplied = false;
const applycoupon = async (req, res) => {
  try {
    const user_id = req.session.userData?._id;
    const code = req.body.coupon;
    const coupon = await Coupon.findOne({ couponCode: code });
    const user = await User.findById(user_id);

    if (!coupon) {
      res.status(404).json({
        status: "error",
        code: "INVALID_COUPON",
        message: "Invalid coupon",
      });
      return;
    }
    const currentDate = new Date();
    const expDate = new Date(coupon.expires);
    const couponIndex = user.coupons.findIndex((item) => item === code);
    const foundcoup = user.coupons[couponIndex];
    if (currentDate > expDate) {
      res.status(400).json({
        status: "error",
        code: "COUPON_EXPIRED",
        message: "Coupon expired",
      });
      return;
    } else if (foundcoup) {
      res.status(400).json({
        status: "error",
        code: "COUPON_ALREADY_USED",
        message: "Coupon already used",
      });
      return;
    } else {
      const cart = await Cart.findOne({ userId: user_id }).populate(
        "products.productId"
      );

      if (cart.total < coupon.minPurchase) {
        res.status(400).json({
          status: "error",
          code: "MIN_PURCHASE_REQUIRED",
          message: `Minimum purchase of ${coupon.minPurchase} required to apply this coupon`,
        });
        return;
      }

      let discount = cart.total * (coupon.discount / 100);
      if (discount > coupon.maxDiscount) {
        // If discount exceeds the maximum allowed discount, limit it to the maxDiscount
        discount = coupon.maxDiscount;
      }

      if (!coupon.statusEnable) {
        res.status(400).json({
          status: "error",
          code: "NOT_AVAILABLE",
          message: `Coupon currently not available`,
        });
        return;
      }

      if (couponApplied) {
        res.status(400).json({                                      
          status: "error",
          code: "MIN_PURCHASE_REQUIRED",
          message: `Cancel the Current Coupon before applying new!`,
        });
        return;
      }

      await Cart.findOneAndUpdate({ userId: user_id }, { discount: discount });
      user.coupons.push(coupon.couponCode);
      await user.save();
      if (user.coupons.length == 0) {
        couponApplied = false;
      } else {
        couponApplied = true;
      }
      res.status(200).json({
        status: "success",
        code: "COUPON_ADDED",
        message: "Coupon added",
        discount: discount.toFixed(2),
        stotal: (cart.total - discount).toFixed(2),
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const cancelcoupon = async (req, res) => {
  try {
    const user_id = req.session.userData?._id;
    await Cart.findOneAndUpdate({ userId: user_id }, { discount: 0 });
    const user = await User.findById(user_id);
    const code = req.body.coupon;
    const coupon = await Coupon.findOne({ couponCode: code });
    if (!coupon) {
      return res.status(404).json({
        status: "error",
        code: "COUPON_NOT_FOUND",
        message: "Enter the current Coupon again",
      });
    }
    if (!user.coupons.includes(code)) {
      return res.status(404).json({
        status: "error",
        code: "COUPON_NOT_FOUND",
        message: "Coupon already cancelled ",
      });
    }
    user.coupons.pull(coupon.couponCode);
    couponApplied = false;
    await user.save();
    res.status(200).json({
      status: "success",
      code: "COUPON_DELETED",
      message: "Coupon Cancelled",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      code: "SERVER_ERROR",
      message: "An error occurred on the server",
    });
  }
};

module.exports = {
  addcouponpage,
  addcoupon,
  changeCouponStatus,
  updateCoupon,
  loadEditCoupon,
  deleteCoupon,
  applycoupon,
  cancelcoupon,
};
