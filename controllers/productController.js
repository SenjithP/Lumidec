const Product = require("../models/productModel");
const Category = require("../models/categoryModel");

const loadProducts = async (req, res) => {
  try {
    let categories = await Category.find({});

    res.render("addProduct", { category: categories });
  } catch (error) {
    console.log(error.message);
  }
};

const createProduct = async (req, res) => {
  const { name, aboutProduct, helpfulDetails, quantity, category, price } = req.body;
  const images = req.files.map((file) => file.filename);
  const updatedImages = images.length > 0 ? images : productData.images;
  let categories = await Category.find({});

  const newProduct = new Product({
    name,
    aboutProduct,
    helpfulDetails,
    images: updatedImages,
    quantity,
    category,
    price,
  });

  newProduct
    .save()
    .then(() => {
      res.render("addProduct", {
        message: "product added succesfully",
        category: categories,
      });
    })
    .catch((err) => {
      console.error("Error adding product:", err);
      res.status(500).send("Error adding product to the database");
    });
};

const loadProductList = async (req, res) => {
  try {
    const product = await Product.find({});
    res.render("productList", { product: product });
  } catch (error) {
    console.log(error.message);
  }
};

////editProductList

const editProductList = async (req, res) => {
  try {
    const id = req.query.id;
    const productData = await Product.find({ _id: id });
    const category = productData[0].category;
    const productCategory = await Category.find({ _id: category });
    const allCategory = await Category.find();

    res.render("editProductList", {
      productData,
      productCategory,
      allCategory,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const updateProductList = async (req, res) => {
  try {
    console.log("fvbbv.");

    const id = req.body.id;
    const name = req.body.name;
    const aboutProduct = req.body.aboutProduct;
    const helpfulDetails = req.body.helpfulDetails
    const price = req.body.price;
    const category = req.body.category;
    const status = req.body.status === "listed";
    const images = req.files.map((file) => file.filename);

    // Find the existing product data
    const productData = await Product.findById(id);

    // Check if new images are provided
    const updatedImages = images.length > 0 ? images : productData.images;
    const update = await Product.updateOne(
      { _id: id },
      {
        $set: {
          name: name,
          aboutProduct: aboutProduct,
          helpfulDetails:helpfulDetails,
          price: price,
          category: category,
          is_listed: status,
          images: updatedImages,
        },
      }
    );
    res.redirect("/admin/productList");
  } catch (error) {
    console.log(error.message);
  } 
};

module.exports = {
  loadProducts,
  createProduct,
  loadProductList,
  editProductList,
  updateProductList,
};
