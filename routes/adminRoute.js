const express = require("express");
const adminRoute = express();
const adminController = require("../controllers/adminController");
const categoryController = require("../controllers/categoryController");
const productController = require("../controllers/productController");
const couponController = require("../controllers/couponController");
const bannerController = require("../controllers/bannerController");
const multer = require('../multer/multer')
const validate = require('../middleware/adminAuth');


const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const store = new MongoDBStore({
  uri: process.env.DB, // Update the environment variable name for MongoDB connection string if needed
  collection: "sessions" 
});
store.on("error", function (error) {
  console.log("MongoDB session store connection error: ", error);
});

adminRoute.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: store    
  })
);

// Set view engine and views directory
adminRoute.set("view engine", "ejs");
adminRoute.set("views", "./views/admin");
adminRoute.get('*',validate.checkUser)


//-----------------------------GET METHODS---------------------------------//

//DASHBOARD
adminRoute.get("/dashBoard",adminController.admin);

// LOGIN
adminRoute.get("/adminlogin", adminController.loadAdminLogin);

//USERLIST
adminRoute.get("/loadUserlist",validate.requireAuth, adminController.loadUserlist);
adminRoute.get("/blockUser",validate.requireAuth, adminController.blockUser);
adminRoute.get("/unBlockUser", validate.requireAuth,adminController.unBlockUser);

//LOGOUT
adminRoute.get("/adminlogout", adminController.logout);

//REVIEW
adminRoute.get("/blockUsers",validate.requireAuth, adminController.reviewBlockUsers);
adminRoute.get("/unBlockUsers",validate.requireAuth, adminController.reviewUnBlockUsers);
adminRoute.get("/loadReviewlist",validate.requireAuth, adminController.loadReviewlist);

//CATEGORY
adminRoute.get("/loadCategory",validate.requireAuth, categoryController.loadCategory);
adminRoute.get("/changeStatus",validate.requireAuth, categoryController.changeStatus);
adminRoute.get("/editCategory",validate.requireAuth, categoryController.loadUpdateCategory);
adminRoute.get("/deleteCategory",validate.requireAuth, categoryController.deleteCategory);

// PRODUCTS
adminRoute.get("/addProduct",validate.requireAuth, productController.loadProducts);
adminRoute.get("/productList",validate.requireAuth, productController.loadProductList);
adminRoute.get("/editProductList",validate.requireAuth, productController.editProductList);
adminRoute.get("/order",validate.requireAuth, adminController.orderStatus);

//COUPON
adminRoute.get("/addCoupon",validate.requireAuth, couponController.addcouponpage);
adminRoute.get("/changeCouponStatus",validate.requireAuth, couponController.changeCouponStatus);
adminRoute.get("/editCoupon",validate.requireAuth, couponController.loadEditCoupon);
adminRoute.get("/deleteCoupon",validate.requireAuth, couponController.deleteCoupon);

//BANNER
adminRoute.get("/addBanner",validate.requireAuth, bannerController.loadBanner);
adminRoute.get("/listBanner",validate.requireAuth, bannerController.loadBannerList);
adminRoute.get("/editBanner",validate.requireAuth, bannerController.editBanner);
adminRoute.get("/deleteBanner",validate.requireAuth, bannerController.deleteBanner);

//SALESREPORT
adminRoute.get("/salesreport",validate.requireAuth,adminController.salesreport)

//ORDERS
adminRoute.get('/orderDetails/:id',adminController.orderDetails)


//-----------------------------PUT METHODS---------------------------------//
// CATEGORY
adminRoute.put("/editCategory/:id",validate.requireAuth, categoryController.updateCategory);


//-----------------------------POST METHODS---------------------------------//

//LOGIN
adminRoute.post("/adminlogin", adminController.adminLogin);

//CATEGORY
adminRoute.post("/addCategory",validate.requireAuth, categoryController.createCategory);

//PRODUCT 
adminRoute.post("/addProduct",validate.requireAuth, multer.upload, productController.createProduct);
adminRoute.post(
  "/updateProductList",
  multer.update,validate.requireAuth,
  productController.updateProductList
);

//ORDER
adminRoute.post("/orderUpdate/:id",validate.requireAuth, adminController.orderUpdate);
adminRoute.post("/orderRefund",validate.requireAuth, adminController.refund);

//SALESREPORT
adminRoute.post("/filterorder",validate.requireAuth,adminController.filterorder);

//REVIEW
adminRoute.post("/reviewUnreport/:id",validate.requireAuth, adminController.reviewUnreport);
adminRoute.post("/deleteComment/:id",validate.requireAuth, adminController.deleteComment);

//COUPON
adminRoute.post("/editCoupon",validate.requireAuth, couponController.updateCoupon);
adminRoute.post("/addCoupon",validate.requireAuth, couponController.addcoupon);

// BANNER
adminRoute.post("/addBanner",validate.requireAuth, multer.addBannerupload, bannerController.addBanner);
adminRoute.post("/updateBanner",validate.requireAuth, multer.editBannerupload, bannerController.updateBanner);




module.exports = adminRoute;
