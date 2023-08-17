const express = require("express");
const adminRoute = express();
const adminController = require("../controllers/adminController");
const categoryController = require("../controllers/categoryController");
const productController = require("../controllers/productController");
const couponController = require("../controllers/couponController");
const bannerController = require("../controllers/bannerController");
const multer = require('../multer/multer')

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


//-----------------------------GET METHODS---------------------------------//

//DASHBOARD
adminRoute.get("/dashBoard",adminController.admin);

// LOGIN
adminRoute.get("/adminlogin", adminController.loadAdminLogin);

//USERLIST
adminRoute.get("/loadUserlist", adminController.loadUserlist);
adminRoute.get("/blockUser", adminController.blockUser);
adminRoute.get("/unBlockUser", adminController.unBlockUser);

//LOGOUT
adminRoute.get("/adminlogout", adminController.logout);

//REVIEW
adminRoute.get("/blockUsers", adminController.reviewBlockUsers);
adminRoute.get("/unBlockUsers", adminController.reviewUnBlockUsers);
adminRoute.get("/loadReviewlist", adminController.loadReviewlist);

//CATEGORY
adminRoute.get("/loadCategory", categoryController.loadCategory);
adminRoute.get("/changeStatus", categoryController.changeStatus);
adminRoute.get("/editCategory", categoryController.loadUpdateCategory);
adminRoute.get("/deleteCategory", categoryController.deleteCategory);

// PRODUCTS
adminRoute.get("/addProduct", productController.loadProducts);
adminRoute.get("/productList", productController.loadProductList);
adminRoute.get("/editProductList", productController.editProductList);
adminRoute.get("/order", adminController.orderStatus);

//COUPON
adminRoute.get("/addCoupon", couponController.addcouponpage);
adminRoute.get("/changeCouponStatus", couponController.changeCouponStatus);
adminRoute.get("/editCoupon", couponController.loadEditCoupon);
adminRoute.get("/deleteCoupon", couponController.deleteCoupon);

//BANNER
adminRoute.get("/addBanner", bannerController.loadBanner);
adminRoute.get("/listBanner", bannerController.loadBannerList);
adminRoute.get("/editBanner", bannerController.editBanner);
adminRoute.get("/deleteBanner", bannerController.deleteBanner);

//SALESREPORT
adminRoute.get("/salesreport",adminController.salesreport)


//-----------------------------PUT METHODS---------------------------------//
// CATEGORY
adminRoute.put("/editCategory/:id", categoryController.updateCategory);


//-----------------------------POST METHODS---------------------------------//

//LOGIN
adminRoute.post("/adminlogin", adminController.adminLogin);

//CATEGORY
adminRoute.post("/addCategory", categoryController.createCategory);

//PRODUCT
adminRoute.post("/addProduct", multer.upload, productController.createProduct);
adminRoute.post(
  "/updateProductList",
  multer.update,
  productController.updateProductList
);

//ORDER
adminRoute.post("/orderUpdate/:id", adminController.orderUpdate);
adminRoute.post("/orderRefund", adminController.refund);

//SALESREPORT
adminRoute.post("/filterorder",adminController.filterorder);

//REVIEW
adminRoute.post("/reviewUnreport/:id", adminController.reviewUnreport);
adminRoute.post("/deleteComment/:id", adminController.deleteComment);

//COUPON
adminRoute.post("/editCoupon", couponController.updateCoupon);
adminRoute.post("/addCoupon", couponController.addcoupon);

// BANNER
adminRoute.post("/addBanner", multer.addBannerupload, bannerController.addBanner);
adminRoute.post("/updateBanner", multer.editBannerupload, bannerController.updateBanner);




module.exports = adminRoute;
