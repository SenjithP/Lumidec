const Category = require("../models/categoryModel");

const loadCategory = async (req, res) => {
  try {
    const categories = await Category.find();
    res.render("page-categories", { categories });
  } catch (error) {
    console.error(error);
  }    
};

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if(!name || !description){
      alert("fill all");
    }
    
    const existingCategory = await Category.findOne({ name });

    if (existingCategory) {
      const categories = await Category.find();
       return res.render("page-categories", { message: "Name already exists", categories });
    } else {
      const category = new Category({ name, description });
      await category.save();
      res.redirect("/admin/loadCategory");
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to create category" });
  }
};

const changeStatus = async (req, res) => {
  try {
    const categoryId = req.query.id;
    const category = await Category.findById(categoryId);

    if (category) {
      category.isListed = !category.isListed; // Toggle the value
      await category.save();
    }

    res.redirect("/admin/loadCategory");
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to change category status" });
  }
};
 
const loadUpdateCategory = async (req, res) => {
  try {
    const categoryId = req.query.id;
    const category = await Category.findById(categoryId);
    res.render("editCategories", { category });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to load update category" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if(! name|| !description ){
    return res.status(500).json({ message: "Name & Description fields required" });
    }
    await Category.findByIdAndUpdate(id, { name, description });
    res.status(200).json({ message: "Category updated successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to update category" });
  }
};


const deleteCategory = async (req, res) => {        
  try {
    const categoryId = req.query.id;
    await Category.findByIdAndDelete(categoryId);
    res.redirect("/admin/loadCategory");
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to delete category" });
  }
};

module.exports = {
  loadCategory,
  createCategory,
  changeStatus,
  loadUpdateCategory,
  updateCategory,
  deleteCategory
};
