const Admin = require("../models/adminModel");
const User = require("../models/userModel");
const Category = require("../models/categoryModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Review = require("../models/reviewAndRating");

//GET LOGIN PAGE
const loadAdminLogin = async (req, res) => {
  try {
    res.render("adminLogin");
  } catch (error) {
    console.log(error.message);
    res.render("error", { message: "An error occurred" });
  }
};

//ADMINLOGIN
const adminLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const adminData = await Admin.findOne({ email: email });
    if (adminData) {
      if (password === adminData.password) {
        req.session.admin = adminData._id;
        res.redirect("/admin/dashboard");
      } else {
        res.render("adminLogin", {
          message: "Email and Password are Incorrect",
        });
      }
    } else {
      res.render("adminLogin", { message: "Email and Password are Incorrect" });
    }
  } catch (error) {
    console.log(error.message);
    res.render("error", { message: "An error occurred" });
  }
};

//LOAD USERS
const loadUserlist = async (req, res) => {
  try {
    let search = "";
    if (req.query.search !== undefined && req.query.search !== "") {
      search = req.query.search;
    }

    const userData = await User.find({
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$mobile" },
              regex: ".*" + search + ".*",
            },
          },
        },
      ],
    });

    res.render("listUsers", { user: userData });
  } catch (error) {
    console.log(error.message);
  }
};

const blockUser = async (req, res) => {
  try {
    const id = req.query.id;

    // Block the user by updating the 'is_blocked' field
    await User.findByIdAndUpdate({ _id: id }, { $set: { is_blocked: true } });

    // Destroy the user's session
    req.session.destroy((err) => {
      if (err) {
        console.log("Error destroying session:", err);
      }

      // Redirect to the user list page after blocking and destroying the session
      res.redirect("/admin/loadUserlist");
    });
  } catch (error) {
    console.log(error);
  }
};

const unBlockUser = async (req, res) => {
  try {
    const id = req.query.id;
    await User.findByIdAndUpdate({ _id: id }, { $set: { is_blocked: false } });
    res.redirect("/admin/loadUserlist");
  } catch (error) {
    console.log(error);
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/admin/adminLogin");
  } catch (error) {
    console.log(error.message);
  }
};

const orderStatus = async (req, res) => {
  try {
    const order_data = await Order.find()
      .populate("user")
      .populate("items.product")
      .populate("items.quantity");
    const userData = await User.find({});
    res.render("orderStatus", {
      order_data: order_data,
      user: userData, // Initialize 'order_data' properly here
    });
  } catch (error) {
    console.error(error);
    res.send({ message: error.message });
  }
};

const orderUpdate = async (req, res) => {
  try {
    const orderId = req.params.id;
    const newStatus = req.body.status;

    // Update the order using findByIdAndUpdate
    await Order.findByIdAndUpdate(orderId, { status: newStatus });

    res.redirect("/admin/order");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const refund = async (req, res) => {
  try {
    const orderId = req.query.id;
    const newStatus = "Refunded";
    await Order.findByIdAndUpdate(orderId, { status: newStatus });
    const order = await Order.findById(orderId);
    const user = await User.findById(order.user);

    const user_id = req.session.userData?._id;
    const cart = await Cart.findOne({ userId: user_id }).populate(
      "products.productId"
    );
    console.log(cart);
    const items = cart.products.map((item) => {
      const product = item.productId;
      const quantity = item.quantity;
      const price = product.price;

      if (!price) {
        throw new Error("Product price is required");
      }
      if (!product) {
        throw new Error("Product is required");
      }

      return {
        product: product._id,
        quantity: quantity,
        price: price,
      };
    });

    items.forEach(async (item) => {
      const pro = await Product.findById(item.product);
      const quan = pro.quantity + item.quantity;
      await Product.findByIdAndUpdate(item.product, { quantity: quan });
    });

    const wallets = user.totalWallet + order.total;
    console.log(wallets);
    user.wallet.push(order.total);
    user.totalWallet = wallets;
    await user.save();
    res.redirect("/admin/order");
  } catch (error) {
    console.error(error);
    res.send(error);
  }
};

const admin = async (req, res) => {
  if (req.session.admin) {
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setMilliseconds(endOfDay.getMilliseconds() - 1);

    const orders = await Order.find(); // Fetching all orders from the database

    // Extracting necessary data for the chart
    const salesData = orders.map((order) => ({
      createdAt: order.createdAt.toISOString().split("T")[0], // Extracting date only
      total: order.total,
    }));

    // Calculating the total sales for each date
    const salesByDate = salesData.reduce((acc, curr) => {
      acc[curr.createdAt] = (acc[curr.createdAt] || 0) + curr.total;
      return acc;
    }, {});

    // Converting the sales data into separate arrays for chart labels and values
    const chartLabels = Object.keys(salesByDate);
    const chartData = Object.values(salesByDate);

    const todaySales = await Order.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });

    const totalsales = await Order.countDocuments({ status: "Delivered" });

    const todayRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay },
          payment_method: { $in: ["WALLET", "Paypal"] },
        },
      },
      { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
    ]);

    const revenue = todayRevenue.length > 0 ? todayRevenue[0].totalRevenue : 0;

    const TotalRevenue = await Order.aggregate([
      {
        $match: { status: "Delivered" },
      },
      { $group: { _id: null, Revenue: { $sum: "$total" } } },
    ]);

    const Revenue = TotalRevenue.length > 0 ? TotalRevenue[0].Revenue : 0;

    const Orderpending = await Order.countDocuments({ status: "Pending" });
    const OrderReturn = await Order.countDocuments({
      status: "Returned",
    });
    const Ordershipped = await Order.countDocuments({ status: "Shipped" });
    const OrderRefunted = await Order.countDocuments({ status: "Refunded" });
    const Ordercancelled = await Order.countDocuments({
      status: "cancelled",
    });

    const salesCountByMonth = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          year: "$_id.year",
          count: 1,
        },
      },
    ]);

    res.render("dashboard", {
      todaySales,
      totalsales,
      revenue,
      Revenue,
      Orderpending,
      Ordershipped,
      Ordercancelled,
      OrderRefunted,
      salesCountByMonth,
      OrderReturn,
      chartLabels: JSON.stringify(chartLabels),
      chartData: JSON.stringify(chartData),
    });
  } else {
    res.render("adminLogin");
  }
};

const salesreport = async (req, res) => {
  try {
    const preDate = "";
    const postDate = "";
    const order_data = await Order.find()
      .populate("user")
      .populate("items.product")
      .populate("items.quantity");
    res.render("salesreport", { order_data, preDate, postDate });
  } catch (err) {
    res.status(500).send(err.message); // Send error response with status code 500
  }
};

const filterorder = async (req, res) => {
  try {
    const preDate = new Date(req.body.preDate);
    const postDate = new Date(req.body.postDate);

    const order_data = await Order.find({
      createdAt: { $gte: preDate, $lte: postDate },
    })
      .populate("user")
      .populate("items.product")
      .populate("items.quantity");
    res.render("salesreport", {
      order_data,
      preDate: req.body.preDate,
      postDate: req.body.postDate,
    });
  } catch (error) {
    console.error(error);
    res.send(error);
  }
};

const loadReviewlist = async (req, res) => {
  try {
    const allReviews = await Review.find({})
      .populate("user")
      .populate("product");

    res.render("reviewManagement", { allReviews: allReviews });
  } catch (error) {
    console.log(error.message);
  }
};

const reviewUnreport = async (req, res) => {
  try {
    const reviewId = req.params.id;

    // Update the review using findByIdAndUpdate
    await Review.findByIdAndUpdate(reviewId, { isReported: false });

    res.redirect("/admin/loadReviewlist");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.id;

    // Delete the comment using findByIdAndDelete
    await Review.findByIdAndDelete(commentId);

    res.redirect("/admin/loadReviewlist"); 
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const reviewBlockUsers = async (req, res) => {
  try {
    const id = req.query.id;

    // Block the user by updating the 'is_blocked' field
    await User.findByIdAndUpdate({ _id: id }, { $set: { is_blocked: true } });

    // Destroy the user's session
    req.session.destroy((err) => {
      if (err) {
        console.log("Error destroying session:", err);
      }

      // Redirect to the user list page after blocking and destroying the session
      res.redirect("/admin/loadReviewlist");
    });
  } catch (error) {
    console.log(error);
  }
};

const reviewUnBlockUsers = async (req, res) => {
  try {
    const id = req.query.id;
    await User.findByIdAndUpdate({ _id: id }, { $set: { is_blocked: false } });
    res.redirect("/admin/loadReviewlist");
  } catch (error) {
    console.log(error);
  }
};

const orderDetails = async(req,res)=>{
  try{
    const id = req.params.id;
    const order_data = await Order.findOne({_id: id}).populate("user").populate("items.product").populate("items.quantity")
   res.render('orderDetails',{order_data})
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}
module.exports = {
  admin,
  loadAdminLogin,
  adminLogin,
  loadUserlist,
  blockUser,
  unBlockUser,
  logout,
  orderStatus,
  orderUpdate,
  refund,
  salesreport,
  filterorder,
  loadReviewlist,
  reviewUnreport,
  deleteComment,
  reviewBlockUsers,
  reviewUnBlockUsers,
  orderDetails
};
