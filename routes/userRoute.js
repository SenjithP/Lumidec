const express = require("express");
const userRoute = express();
const session = require("express-session");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController")
const couponController = require("../controllers/couponController");
const validate = require('../middleware/authMiddleware');
const block = require('../middleware/blockMiddleware');



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
userRoute.all('*',validate.checkUser)

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
userRoute.get("/wishlist",block.checkBlocked,validate.requireAuth,userController.loadWishlist)
userRoute.get('/addToWishlist/:id',block.checkBlocked,validate.requireAuth,userController.addToWishlist)

//CART
userRoute.get("/cart",block.checkBlocked,validate.requireAuth,userController.loadCart)
userRoute.get('/addToCart/:id',block.checkBlocked,validate.requireAuth,userController.addToCart)
userRoute.get('/checkout',block.checkBlocked,validate.requireAuth,userController.checkout)
userRoute.get('/checkout/:id',block.checkBlocked,validate.requireAuth,userController.payment);

//order
userRoute.get('/confirm',block.checkBlocked,validate.requireAuth,userController.loadConfirm);
userRoute.get("/orders",block.checkBlocked,validate.requireAuth,userController.orderDetails)
userRoute.get("/orderDetailsPage",block.checkBlocked,validate.requireAuth,userController.orderdetailspage)
userRoute.get('/payment',block.checkBlocked,validate.requireAuth,userController.payment);
userRoute.get('/paypal-success',block.checkBlocked,validate.requireAuth,userController.paypal_success)
userRoute.get('/paypal-err',block.checkBlocked,validate.requireAuth,userController.paypal_err)

//SINGLE
userRoute.get('/single',userController.loadSingle)

//WALLET
userRoute.get('/wallet',block.checkBlocked,validate.requireAuth,userController.wallet)

//PROFILE
userRoute.get('/Profile',block.checkBlocked,validate.requireAuth,userController.profile)

//Invoice
userRoute.get('/invoice/:id',block.checkBlocked,validate.requireAuth,userController.invoice)

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
userRoute.post("/profilePassword",block.checkBlocked,validate.requireAuth, authController.profilePassword);

//CHECKOUT
userRoute.post('/addAddress',block.checkBlocked,validate.requireAuth,userController.addaddress)
userRoute.post('/edit_address/:id',block.checkBlocked,validate.requireAuth, userController.editaddress);         

//ORDER
userRoute.post('/placeOrder',block.checkBlocked,validate.requireAuth,userController.placeOrder);
userRoute.post("/order_cancel",block.checkBlocked,validate.requireAuth, userController.ordercancel);
userRoute.post('/ordereReturn',block.checkBlocked,validate.requireAuth,userController.returns);

//COUPON
userRoute.post("/applyCoupon",block.checkBlocked,validate.requireAuth, couponController.applycoupon);                
userRoute.post("/cancelCoupon",block.checkBlocked,validate.requireAuth, couponController.cancelcoupon);


//REVIEW
userRoute.post('/addReviews',block.checkBlocked,validate.requireAuth,userController.ratingAndReview)



module.exports = userRoute;
