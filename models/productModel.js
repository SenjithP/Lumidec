const mongoose = require('mongoose');
const Category = require('./categoryModel');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  aboutProduct: {
    type: String,
    required: true,
  },
  helpfulDetails: {
    type: String,
    required: true,
  },
  quantity:{
    type:Number,
    required:true, 
},
  images: {
    type: Array,
    required:true
  },
  category: {     
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  price:{
    type:Number,
    required:true
  },
  is_listed:{

    type:Boolean,
    default:true

  }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
