const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const Category = require("../models/categoryModel");
const paypal = require("paypal-rest-sdk");
const Banner = require("../models/bannerModel");
const Coupon = require("../models/couponModel");
const { MessageContent } = require("../helpers/sendEmail");
const { OrderIdGenHelper } = require("../helpers/orderIdGenerator");
const Review = require("../models/reviewAndRating");
const Wishlist = require("../models/wishListModel");
const ITEMS_PER_PAGE = 12;

//GET HOME PAGE
const loadHome = async (req, res) => {
  try {
    const user = req.session.user; // Check if user session exists
    const totalNumberOfProducts = await Product.countDocuments({
      is_listed: true,
    });

    //TOP PICKS BY CUSTOMERS start
    const highRated = await Review.find({});
    const productCountMap = {};
    highRated.forEach((review) => {
      const productId = review.product.toString();
      productCountMap[productId] = (productCountMap[productId] || 0) + 1;
    });
    highRated.sort((a, b) => {
      const productA = a.product.toString();
      const productB = b.product.toString();
      const countComparison =
        productCountMap[productB] - productCountMap[productA];
      if (countComparison !== 0) {
        return countComparison;
      }
      return b._id.toString().localeCompare(a._id.toString());
    });
    const uniqueProductIds = [
      ...new Set(highRated.map((review) => review.product.toString())),
    ];
    const productDetails = [];
    for (const productId of uniqueProductIds) {
      const product = await Product.findOne({ _id: productId });
      if (product) {
        productDetails.push(product);
      } else {
        productDetails.push({ _id: productId, error: "Product not found" });
      }
    }
    //TOP PICKS BY CUSTOMERS end

    const products = await Product.find({ is_listed: true })
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order
      .skip(Math.max(0, totalNumberOfProducts - 8)) // Skip the appropriate number of products to get the last 9
      .limit(9) // Get only the last 9 products
      .populate("category");

    const banners = await Banner.find({ is_listed: true });
    res.render("home", {
      user,
      banners,
      product: products,
      productDetails: productDetails,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const loadSingle = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findOne({ _id: id }).populate("category");
    const user = req.session.user; // Check if user session exists
    const review = await Review.find({ product: id }).populate("user");
    res.render("single", { user, product: product, review: review });
  } catch (error) {
    console.log(error);
    res.send({ success: false, error: error.message });
  }
};

const ratingAndReview = async (req, res) => {
  try {
    const rating = req.body.rating;
    const review = req.body.review;
    const productId = req.body.productId;
    const user = req.session.user;

    if (!rating) {
      return res
        .status(400)
        .json({ status: "error", message: "Provide Rating" });
    }

    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate()}-${
      currentDate.getMonth() + 1
    }-${currentDate.getFullYear()}`;

    const reviewsAndRatings = new Review({
      rating: rating,
      review: review,
      user: user.id,
      product: productId,
      dateAdded: formattedDate,
    });

    await reviewsAndRatings.save();
    return res.status(200).json({ message: "Review Added Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const editReview = async (req, res) => {
  try {
    const rating = req.body.rating;
    const review = req.body.review;
    const user = req.session.user; // Check if user session exists
    const reviewId = req.query.id;

    const selectedReview = await Review.findOne({ _id: reviewId });
    if (user.id.toString() !== selectedReview.user.toString()) {
      return res
        .status(400)
        .json({ status: "error", message: "No Access To Others Data" });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { rating: rating, review: review, isEdited: true },
      { new: true }
    );

    await updatedReview.save();
    return res.status(200).json({ message: "Review Edited Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const user = req.session.user;
    const selectedReview = await Review.findOne({ _id: reviewId });

    if (!selectedReview) {
      return res
        .status(404)
        .json({ status: "error", message: "Review Not Found" });
    }

    if (!user || user.id.toString() !== selectedReview.user.toString()) {
      return res
        .status(403)
        .json({ status: "error", message: "No Access To Others Data" });
    }

    const reviewDeleted = await Review.findByIdAndDelete(reviewId);

    if (reviewDeleted) {
      res.status(200).json({
        status: "success",
        message: "Review deleted successfully.",
      });
    } else {
      res.status(404).json({ status: "error", message: "Review Not Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const reportReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const selectedReview = await Review.findOne({ _id: reviewId });

    if (!selectedReview) {
      return res
        .status(404)
        .json({ status: "error", message: "Review Not Found" });
    }

    const user = req.session.user; // Assuming user ID is stored in req.session.user._id

    if (selectedReview.reportedBy.includes(user._id)) {
      return res.status(400).json({
        status: "error",
        message: "You have already reported this review",
      });
    }

    selectedReview.isReported = true;
    selectedReview.reportedBy.push(user._id);
    await selectedReview.save();

    return res.status(200).json({
      message:
        "Thanks for reporting it. Our team will look into it at the earliest",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const loadShopPage = async (req, res) => {
  try {
    const user = req.session.user;

    const category = await Category.find({});
    const coupon = await Coupon.find({});

    const page = parseInt(req.query.page) || 1;
    const ITEMS_PER_PAGE = 12; // Define the number of items per page
    const skip = (page - 1) * ITEMS_PER_PAGE;

    // Fetch products with pagination
    const totalProducts = await Product.countDocuments({ is_listed: true });
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

    const products = await Product.find({ is_listed: true })
      .skip(skip)
      .limit(ITEMS_PER_PAGE)
      .populate("category");

    res.render("shop", {
      user,
      product: products, // Corrected variable name
      category,
      coupon,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error"); // Sending an error response to the client
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.session.userData?._id;
    const productId = req.params.id;
    const product_data = await Product.findById(productId);

    if (product_data.quantity < 1) {
      return res
        .status(400)
        .json({ status: "error", message: "Product is out of stock" });
    } else {
      let userCart = await Cart.findOne({ userId: userId });
      if (!userCart) {
        const newCart = new Cart({ userId: userId, products: [] });
        await newCart.save();
        userCart = newCart;
      }

      const productIndex = userCart.products.findIndex(
        (product) => product.productId == productId
      );

      if (productIndex === -1) {
        userCart.products.push({ productId, quantity: 1 });
      } else {
        if (product_data.quantity <= userCart.products[productIndex].quantity) {
          return res
            .status(400)
            .json({ status: "error", message: "Product is out of stock" });
        } else {
          userCart.products[productIndex].quantity += 1;
        }
      }
      await userCart.save();
      res
        .status(200)
        .json({ status: "success", message: "Product added to cart" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

const categoryPage = async (req, res) => {
  try {
    const user = req.session.user; // Check if user session exists

    const categoryId = req.query.id;
    const category = await Category.find({});
    // Find the selected category by its ID
    const selectedCategory = category.find(
      (cat) => cat._id.toString() === categoryId
    );
    const totalProducts = await Product.countDocuments({
      category: categoryId,
      is_listed: true,
    }); // Get the total number of products
    const product = await Product.find({
      category: categoryId,
      is_listed: true,
    }).populate("category");
    res.render("categoryShop", {
      user,
      product,
      category,
      totalProducts,
      categoryName: selectedCategory ? selectedCategory.name : "All",
      categoryDescription: selectedCategory.description
    });
  } catch (err) {
    console.log("category page error", err);
  }
};

const loadWishlist = async (req, res) => {
  const user = req.session.user;

  if (user) {
    try {
      const userId = req.session.userData?._id;

      // Find the wishlist document and populate the product information
      const wishlist = await Wishlist.findOne({ userId: userId }).populate(
        "products.productId"
      );

      if (wishlist) {
        const productCount = wishlist.products.length;

        if (productCount > 0) {
          // Extract the populated products from the wishlist
          const product = wishlist.products.map((product) => product.productId);

          res.render("wishlist", { User: user, user, product, productCount });
        } else {
          res.render("wishlist", { User: user, user });
        }
      } else {
        res.render("wishlist", { User: user, user });
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Some error occurred");
    }
  } else {
    res.render("cart", { msg: "You need to login first" });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.userData?._id;
    const productId = req.params.id;
    let userWishlist = await Wishlist.findOne({ userId: userId });
    if (!userWishlist) {
      const newWishlist = new Wishlist({ userId: userId, products: [] });
      await newWishlist.save();
      userWishlist = newWishlist;
    }
    const productIndex = userWishlist.products.findIndex(
      (product) => product.productId == productId
    );
    if (productIndex === -1) {
      userWishlist.products.push({ productId });
    }
    await userWishlist.save();
    res
      .status(200)
      .json({ status: "success", message: "Product added to wishlist" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

const deleteWishlist = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.session.userData?._id;
    const productDeleted = await Wishlist.findOneAndUpdate(
      { userId: userId },
      { $pull: { products: { productId: productId } } },
      { new: true }
    );
    if (productDeleted) {
      res.status(200).json({
        success: true,
        message: "Product deleted successfully.",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Product not found in the Wishlist.",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error." });
  }
};

const loadCart = async (req, res) => {
  const user = req.session.user; // Check if user session exists

  const User = req.session.user;
  if (User) {
    try {
      const userId = req.session.userData?._id;
      const cart = await Cart.findOne({ userId: userId }).populate(
        "products.productId"
      );
      if (cart) {
        const productCount = cart.products.length;

        if (productCount > 0) {
          const products = cart.products;

          res.render("cart", { User, user, products, productCount });
        } else {
          res.render("cart", { User, user });
        }
      } else {
        res.render("cart", { User, user });
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Some Error occurred");
    }
  } else {
    res.render("cart", { msg: "you need to Login first" });
  }
};

const incrementQuantity = async (req, res) => {
  const userId = req.session.userData?._id;
  const cartId = req.body.cartId;
  try {
    const cart = await Cart.findOne({ userId }).populate("products.productId");
    const cartIndex = cart.products.findIndex((item) =>
      item.productId.equals(cartId)
    );
    if (cartIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in cart" });
    }
    cart.products[cartIndex].quantity += 1;
    const result = await cart.save();
    const product = cart.products[cartIndex].productId;
    const remain = product.quantity - cart.products[cartIndex].quantity;
    const mess = remain > 0 ? remain : "out of stock";
    const total = cart.products[cartIndex].quantity * product.price;
    const quantity = cart.products[cartIndex].quantity;
    res.status(200).json({
      success: true,
      message: "Quantity updated",
      total,
      quantity,
      mess,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update quantity" });
  }
};

const decrementQuantity = async (req, res) => {
  const cartItemId = req.body.cartItemId;
  const userId = req.session.userData?._id;
  try {
    const cart = await Cart.findOne({ userId: userId }).populate(
      "products.productId"
    );
    const cartIndex = cart.products.findIndex((item) =>
      item.productId.equals(cartItemId)
    );
    if (cartIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }
    cart.products[cartIndex].quantity -= 1;
    await cart.save();
    const proId = cart.products[cartIndex].productId._id;
    const pro = await Product.findById(proId);
    const remain = pro.quantity - cart.products[cartIndex].quantity;
    let mess = "";
    if (remain > 0) {
      mess = remain;
    } else {
      mess = "out of stock";
    }
    const total =
      cart.products[cartIndex].quantity *
      cart.products[cartIndex].productId.price;
    const quantity = cart.products[cartIndex].quantity;
    res.status(200).json({
      success: true,
      message: "Quantity updated successfully",
      total,
      quantity,
      mess,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update quantity" });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.session.userData?._id;
    const productDeleted = await Cart.findOneAndUpdate(
      { userId: userId },
      { $pull: { products: { productId: productId } } },
      { new: true }
    );
    if (productDeleted) {
      res.status(200).json({
        success: true,
        message: "Product deleted successfully.",
      });
    } else {
      res
        .status(404)
        .json({ success: false, message: "Product not found in the cart." });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error." });
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

const addaddress = async (req, res) => {
  try {
    const userId = req.session.userData?._id;
    const { name, address, mobile, pincode, city, state, addressType } =
      req.body;
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (
      !name ||
      !address ||
      !mobile ||
      !pincode ||
      !city ||
      !state ||
      !addressType
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (/\d/.test(name)) {
      return res
        .status(500)
        .json({ message: "Name should not contain numbers" });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res
        .status(500)
        .json({ message: "Mobile number must be 10 digits" });
    }

    const existingAddress = user.address.find(
      (addr) => addr.address === address
    );
    if (existingAddress) {
      return res.status(400).json({ message: "Address already exists." });
    }

    user.address.push({
      name,
      address,
      mobile,
      pincode,
      city,
      state,
      addressType,
    });
    await user.save();
    res.status(200).json({ message: "Address added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error finding/updating user." });
  }
};

const checkout = async (req, res) => {
  try {
    const user = req.session.user; // Check if user session exists

    const userId = req.session.userData?._id;
    const data = await User.findOne({ _id: userId });
    const coupon = await Coupon.find({});
    const cart = await Cart.findOne({ userId: userId }).populate(
      "products.productId"
    );
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
    let totalPrice = 0;
    items.forEach((item) => {
      totalPrice += item.price * item.quantity;
    });
    const upcart = await Cart.findOneAndUpdate(
      { userId: userId },
      {
        total: totalPrice,
      }
    );
    if (cart) {
      const products = cart.products;
      let currentDate = new Date();
      currentDate = currentDate.toISOString().substr(0, 10);
      const productCount = products.length; // Total number of products in the cart
      await User.updateOne({ _id: userId }, { $set: { coupons: [] } });
      await Cart.updateOne({ userId: userId }, { $set: { discount: 0 } });
      res.render("checkout", {
        user,
        User,
        currentDate,
        upcart,
        products,
        data: data.address,
        productCount, // Pass the productCount variable to the rendered view
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Some error occurred");
  }
};

//payment
const payment = async (req, res) => {
  try {
    const id = req.query.id;
    const user_id = req.session.userData?._id;

    if (!user_id) {
      throw new Error("User not authenticated"); // Validation: Ensure the user is authenticated
    }

    const user = await User.findById(user_id);
    const cart = await Cart.findOne({ userId: user_id });
    const productCart = await Cart.findOne({ userId: user_id }).populate(
      "products.productId"
    );

    if (!cart) {
      throw new Error("Cart not found"); // Validation: Ensure the cart exists
    }

    const userDetails = await User.findOne(
      { _id: user_id },
      { address: { $elemMatch: { _id: id } } }
    );

    if (!userDetails) {
      throw new Error("Address not found"); // Validation: Ensure the address exists
    }

    const productCount = cart.products.length;

    let totalPrice = 0;
    productCart.products.forEach((item) => {
      const product = item.productId;
      const quantity = item.quantity;
      const price = product.price;
      if (!price) {
        throw new Error("Product price is required");
      }
      if (!product) {
        throw new Error("Product is required");
      }
      totalPrice += price * quantity;
    });

    const upcart = await Cart.findOneAndUpdate(
      { userId: user_id },
      { total: totalPrice }
    );

    const address = userDetails.address[0];

    res.render("payment", {
      user,
      data: user.address,
      cart,
      address,
      productCount,
      upcart,
      productCart, // Pass the productCart variable to the rendered view
      totalPrice, // Pass the totalPrice variable to the rendered view
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Some Error occurred");
  }
};

const editaddress = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.session.userData?._id;
    const user = await User.findById(userId);

    // Validate if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const addressIndex = user.address.findIndex(
      (address) => address._id.toString() === id
    );

    if (addressIndex === -1) {
      return res.status(404).json({ message: "Address not found." });
    }

    // Only update the provided fields
    const updatedFields = req.body;
    for (const field in updatedFields) {
      if (field in user.address[addressIndex]) {
        user.address[addressIndex][field] = updatedFields[field];
      }
    }

    // Save the updated user object
    await user.save();
    res.redirect(`/payment?id=${id}`);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const editProfileAddress = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.session.userData?._id;
    const user = await User.findById(userId);

    // Validate if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const addressIndex = user.address.findIndex(
      (address) => address._id.toString() === id
    );

    // Validate if address exists
    if (addressIndex === -1) {
      return res.status(404).json({ message: "Address not found." });
    }

    const updatedFields = req.body;
    // Update the address fields
    for (const field in updatedFields) {
      if (field in user.address[addressIndex]) {
        user.address[addressIndex][field] = updatedFields[field];
      }
    }

    // Save the updated user object
    await user.save();
    res.status(200).json({ message: "Address Edited Successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error Editing Address." });
  }
};

const deleteProfileAddress = async (req, res) => {
  try {
    const user = req.session.user; // Check if user session exists
    const data = await User.findById(user.id);
    const addressIdToDelete = req.params.id;
    const indexToDelete = data.address.findIndex(
      (address) => address._id.toString() === addressIdToDelete
    );
    if (indexToDelete !== -1) {
      data.address.splice(indexToDelete, 1);
      await data.save();
      return res.status(200).json({ message: "Address Deleted Successfully" });
    } else {
      return res.status(404).json({ message: "Address not Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error Deleting Address." });
  }
};

//Payment
let paypalTotal = 0;
const placeOrder = async (req, res) => {
  try {
    const id = req.query.id;
    const user = req.session.user; // Check if user session exists
    const UserDetails = req.session.user;
    const user_id = req.session.userData?._id;
    const payment_method = req.body.payment_method;
    const userSchema = await User.findById(user_id);
    const addressIndex = userSchema.address.findIndex((item) =>
      item._id.equals(id)
    );
    const specifiedAddress = userSchema.address[addressIndex];

    const cart = await Cart.findOne({ userId: user_id }).populate(
      "products.productId"
    );
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
      const quan = pro.quantity - item.quantity;
      await Product.findByIdAndUpdate(item.product, { quantity: quan });
    });
    let generatedCoupon = OrderIdGenHelper();

    let totalPrice = cart.total - cart.discount;
    let shipping_charge = 100;

    if (totalPrice > 3000) {
      shipping_charge = 0;
    }

    if (payment_method === "COD" || payment_method === "WALLET") {
      const order = new Order({
        user: user_id,
        items: items,
        discount: cart.discount,
        total: totalPrice,
        status: "Pending",
        payment_method: payment_method,
        createdAt: new Date(),
        shipping_charge: shipping_charge,
        address: specifiedAddress,
        Order_ID: generatedCoupon[0],
      });

      await order.save();
      // await Cart.deleteOne({ userId: user_id });
      if (payment_method === "WALLET") {
        const Twallet = userSchema.totalWallet - totalPrice;
        await User.findByIdAndUpdate(user_id, { totalWallet: Twallet });
      }
      if (payment_method === "COD") {
        MessageContent(req, res);
      }
      if (payment_method === "WALLET") {
        MessageContent(req, res);
      }
      res.render("confirm", {
        UserDetails,
        user_id,
        user,
        order,
        specifiedAddress,
        cart,
      });
    } else if (payment_method === "Paypal") {
      const order = new Order({
        user: user_id,
        items: items,
        discount: cart.discount,
        total: totalPrice,
        status: "Pending",
        payment_method: payment_method,
        createdAt: new Date(),
        shipping_charge: shipping_charge,
        address: specifiedAddress,
        Order_ID: generatedCoupon[0],
      });

      await order.save();
      if (payment_method === "Paypal") {
        MessageContent(req, res);
      }

      // await Cart.deleteOne({ userId: user_id });

      cart.products.forEach((element) => {
        paypalTotal += totalPrice + shipping_charge;
      });

      const createPayment = {
        intent: "sale",
        payer: { payment_method: "paypal" },
        redirect_urls: {
          return_url: `http://localhost:3080/paypal-success?id=${user_id}`, // Replace with your return URL
          cancel_url: `http://localhost:3080/paypal-err`, // Replace with your cancel URL
        },
        transactions: [
          {
            amount: {
              currency: "USD",
              total: (paypalTotal / 82).toFixed(2),
            },
            description: "Order Payment",
          },
        ],
      };

      paypal.payment.create(createPayment, (error, payment) => {
        if (error) {
          throw error;
        } else {
          for (let i = 0; i < payment.links.length; i++) {
            if (payment.links[i].rel === "approval_url") {
              res.redirect(payment.links[i].href);
              break;
            }
          }
        }
      });
    } else {
      throw new Error("Invalid payment method");
    }
  } catch (error) {
    res.status(500).send({
      message:
        error.message ||
        "Some error occurred while creating a create operation",
    });
  }
};

const paypal_success = async (req, res) => {
  try {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    const user_id = req.query.id;
    const user = await User.findById(user_id);
    req.session.user = user;

    const execute_payment_json = {
      payer_id: payerId,
      transactions: [
        {
          amount: {
            currency: "USD",
            total: paypalTotal,
          },
        },
      ],
    };

    paypal.payment.execute(
      paymentId,
      execute_payment_json,
      function (error, payment) {
        if (error) {
          console.log(error.response);
          throw error;
        } else {
          res.render("paypalConfirm", { payment, user, user_id });
        }
      }
    );
  } catch (error) {
    console.log(error.message);
  }
};

const paypal_err = (req, res) => {
  console.log(req.query);
  res.send("payment error");
};

const loadConfirm = async (req, res) => {
  try {
    const user = req.session.user; // Assuming user ID is available in the session

    res.render("confirm", { user });
  } catch (error) {
    console.log(error.message);
  }
};

// order details
const orderDetails = async (req, res) => {
  try {
    const userId = req.session.user.id; // Assuming user ID is available in the session
    if (!userId) {
      // Handle the case when user ID is not available in the session
      return res.send({ message: "User ID not found in session" });
    }

    const order_data = await Order.find({ user: userId })
      .populate("items.product")
      .populate("items.quantity");
    const user = await User.findById(userId);
    res.render("orders", {
      order_data,
      user,
    });
  } catch (error) {
    console.error(error);
    res.send({ message: error.message });
  }
};

const ordercancel = async (req, res) => {
  try {
    const orderId = req.body.orderId; // Read the orderId from the hidden input field
    const reason = req.body.reason;
    const cancelled = "cancelled";
    const orda = await Order.findById(orderId);

    // Update the order using findByIdAndUpdate
    await Order.findByIdAndUpdate(orderId, {
      status: cancelled,
      reason: reason,
    });

    const order_data = await Order.find({ user: orda.user })
      .populate("items.product")
      .populate("items.quantity");
    res.render("orders", { order_data });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const orderdetailspage = async (req, res) => {
  try {
    const id = req.query.id;
    const user = req.session.user;
    const users = await User.findById(user._id);
    const order_data = await Order.findOne({ _id: id })
      .populate("user")
      .populate("items.product")
      .populate("items.quantity");
    res.render("orderdetail", { order_data, users,user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const returns = async (req, res) => {
  try {
    const orderId = req.query.id;
    const returned = "Returned";
    const reason = req.body.reason;
    await Order.findByIdAndUpdate(orderId, {
      status: returned,
      reason: reason,
    });

    res.redirect("/orders");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const profile = async (req, res) => {
  try {
    const id = req.query.id;
    const user = await User.findById(id);
    if (user) {
      res.render("profile", { user });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const wallet = async (req, res) => {
  try {
    const user_id = req.query.id;
    const user = await User.findById(user_id);
    const referalWallet = user.walletAdded;
    const orderrefund = await Order.find({
      user: user_id,
      status: "Refunded",
    });
    const order_data = await Order.find({
      user: user_id,
      payment_method: "WALLET",
    });
    res.render("wallet", {
      user,
      order_data,
      orderrefund,
      referalWallet,
      user,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message:
        err.message || "Some error occurred while creating a create operation",
    });
  }
};

const searchProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    const pro = req.query.product;
    const productResults = await Product.find({
      name: { $regex: new RegExp(`^${pro}`, "i") },
    })
      .skip(skip)
      .limit(ITEMS_PER_PAGE);

    const category = await Category.find();
    const coupon = await Coupon.find({});

    const user = req.session.user;

    if (productResults.length > 0) {
      res.render("shop", {
        user,
        category,
        product: productResults,
        coupon: coupon,
        currentPage: page,
        totalPages,
      });
    } else {
      res.render("shop", {
        user,
        category,
        message: "No products found matching the search query.",
        product: productResults,
        coupon: coupon,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const pricerange = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    const category = await Category.find();
    const user = req.session.user;
    const min_price = req.query.min_price;
    const max_price = req.query.max_price;

    const product = await Product.find({
      price: { $gte: min_price, $lte: max_price },
    });
    const coupon = await Coupon.find({});

    const procount = await Product.find({
      price: { $gte: min_price, $lte: max_price },
    }).countDocuments();

    if (!procount) {
      const product2 = await Product.find().skip(skip).limit(ITEMS_PER_PAGE);
      res.render("shop", {
        user,
        category,
        product2,
        currentPage: page,
        totalPages,
        product,
        msg: "there is no products in this price range",
        coupon: coupon,
      });
    } else {
      const productss = await Product.find();
      res.render("shop", {
        user,
        category,
        product,
        product1: productss,
        coupon: coupon,
        currentPage: page,
        totalPages,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const sortProductsLowToHigh = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    const category = await Category.find();
    const user = req.session.user;
    const sortedProducts = await Product.find({})
      .sort({ price: 1 })
      .skip(skip)
      .limit(ITEMS_PER_PAGE);
    const coupon = await Coupon.find({});
    res.render("shop", {
      user,
      category,
      product: sortedProducts,
      coupon: coupon,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const sortProductsHighToLow = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    const category = await Category.find();
    const user = req.session.user;
    const sortedProducts = await Product.find({}).sort({ price: -1 });
    const coupon = await Coupon.find({}).skip(skip).limit(ITEMS_PER_PAGE);
    res.render("shop", {
      user,
      category,
      product: sortedProducts,
      coupon: coupon,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const invoice = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order_data = await Order.find({ _id: orderId })
      .populate("items.product")
      .populate("items.quantity");

    res.render("invoice", { order_data: order_data[0] });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  loadHome,
  loadShopPage,
  loadWishlist,
  addToWishlist,
  deleteWishlist,
  loadCart,
  addToCart,
  checkout,
  incrementQuantity,
  decrementQuantity,
  deleteCartItem,
  addaddress,
  editaddress,
  editProfileAddress,
  deleteProfileAddress,
  payment,
  placeOrder,
  loadConfirm,
  orderdetailspage,
  loadSingle,
  categoryPage,
  orderDetails,
  ordercancel,
  paypal_success,
  paypal_err,
  searchProduct,
  profile,
  wallet,
  returns,
  pricerange,
  sortProductsLowToHigh,
  sortProductsHighToLow,
  ratingAndReview,
  editReview,
  deleteReview,
  reportReview,
  invoice,
};
