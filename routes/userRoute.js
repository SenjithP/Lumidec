const express = require("express");
const userRoute = express();
const session = require("express-session");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController")
const couponController = require("../controllers/couponController");

const MongoDBStore = require("connect-mongodb-session")(session);

const nocache = require("nocache");
userRoute.use(nocache());

// Configure MongoDB session store
const store = new MongoDBStore({
  uri: process.env.DB, // Update the environment variable name for MongoDB connection string if needed
  collection: "sessions" 
});

store.on("error", function (error) {
  console.log("MongoDB session store connection error: ", error);
}); 
 
userRoute.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: store
  })
);


userRoute.set("view engine", "ejs");
userRoute.set("views", "./views/user");

//--------------------------------GET REQUESTS---------------------------------------------//

//LOGIN // REGISTER // FORGOTPASSWORD
userRoute.get("/register", authController.loadRegister);
userRoute.get("/login", authController.loginLoad);
userRoute.get("/forgot-password", authController.loadForgotPassword);
userRoute.get("/logout", authController.userLogout);

//USER SIDE //SHOP PAGE //SINGLE PRODUCTPAGE
userRoute.get("/", userController.loadHome);   
userRoute.get("/home", userController.loadHome);
userRoute.get("/shop", userController.loadShopPage);
userRoute.get('/categoryShop',userController.categoryPage)

//WISHLIST
userRoute.get("/wishlist",userController.loadWishlist)
userRoute.get('/addToWishlist/:id',userController.addToWishlist)

//CART
userRoute.get("/cart",userController.loadCart)
userRoute.get('/addToCart/:id',userController.addToCart)
userRoute.get('/checkout',userController.checkout)
userRoute.get('/checkout/:id',userController.payment);

//order
userRoute.get('/confirm',userController.loadConfirm);
userRoute.get("/orders",userController.orderDetails)
userRoute.get("/orderDetailsPage",userController.orderdetailspage)
userRoute.get('/payment',userController.payment);
userRoute.get('/paypal-success',userController.paypal_success)
userRoute.get('/paypal-err',userController.paypal_err)

//SINGLE
userRoute.get('/single',userController.loadSingle)

//WALLET
userRoute.get('/wallet',userController.wallet)

//PROFILE
userRoute.get('/Profile',userController.profile)

//Invoice
userRoute.get('/invoice/:id',userController.invoice)

//SEARCH
userRoute.get('/searchProduct',userController.searchProduct);
userRoute.get('/pricerange',userController.pricerange);
userRoute.get('/sortProductsLowToHigh',userController.sortProductsLowToHigh);
userRoute.get('/sortProductsHighToLow',userController.sortProductsHighToLow);


//--------------------------------DELETE METHODS-----------------------------------//

//REVIEW
userRoute.delete('/deleteReview/:id', userController.deleteReview);

//CART
userRoute.delete('/deleteCartItem/:id',userController.deleteCartItem);

//WISHLIST
userRoute.delete('/deleteWishlistItem/:id',userController.deleteWishlist);

//PROFILE
userRoute.delete('/deleteProfileAddress/:id', userController.deleteProfileAddress);


//--------------------------------PATCH METHODS-----------------------------------//

//CART
userRoute.patch('/incrementQuantity', userController.incrementQuantity)
userRoute.patch('/decrementQuantity', userController.decrementQuantity)

//PROFILE
userRoute.patch('/editProfileAddress/:id', userController.editProfileAddress);

//REVIEW
userRoute.patch('/editReview', userController.editReview);


//--------------------------------PUT METHODS-----------------------------------//

//RESET PASSWORD
userRoute.put("/reset-password", authController.resetPassword);

//PROFILE
userRoute.put("/updateProfile", authController.updateProfile);

//REVIEW
userRoute.put('/reportReview/:id', userController.reportReview);


//--------------------------------POST METHODS-----------------------------------//

//LOGIN // REGISTER // FORGOTPASSWORD
userRoute.post("/register", authController.insertUser);
userRoute.post("/sendOTP", authController.sendOTP); 
userRoute.post("/verifyOTP", authController.verifyOTP);
userRoute.post("/verifyreferalId", authController.verifyreferalId);
userRoute.post("/login", authController.verifyLogin);
userRoute.post("/forgot-password", authController.forgotPassword);

//PROFILE
userRoute.post("/profilePassword", authController.profilePassword);

//CHECKOUT
userRoute.post('/addAddress',userController.addaddress)
userRoute.post('/edit_address/:id', userController.editaddress);         

//ORDER
userRoute.post('/placeOrder',userController.placeOrder);
userRoute.post("/order_cancel", userController.ordercancel);
userRoute.post('/ordereReturn',userController.returns);

//COUPON
userRoute.post("/applyCoupon", couponController.applycoupon);                
userRoute.post("/cancelCoupon", couponController.cancelcoupon);


//REVIEW
userRoute.post('/addReviews',userController.ratingAndReview)



module.exports = userRoute;
