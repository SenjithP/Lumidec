const Banner = require("../models/bannerModel");

const loadBannerList = async (req, res) => {
  try {
    const banner = await Banner.find();
    res.render("showBanner", { banner });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message:
        err.message || "Some error occurred while creating a create operation",
    });
  }
};

const loadBanner = async (req, res) => {
  try {
    res.render("addBanner");
  } catch (error) {
    console.log(error.message);
  }
};

const addBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.render("addBanner", { message: "Please upload Image" });
    }
    const banner = new Banner({
      bannerName: req.body.bannerName,
      description: req.body.bannerDescription,
      photo: req.file.filename, // use req.file.buffer to get the file buffer
    });

    await banner.save();
    res.render("addBanner", { message: "Banner added succesfully" });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message:
        err.message || "Some error occurred while creating a create operation",
    });
  }
};

const editBanner = async (req, res) => {
  try {
    const id = req.query.id;
    const bannerData = await Banner.find({ _id: id });
    res.render("editBanner", {
      bannerData,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const updateBanner = async (req, res) => {
  try {
    const id = req.body.id;
    const bannerName = req.body.bannerName;
    const description = req.body.description;
    const status = req.body.status === "listed";
    const image = req.file ? req.file.filename : null;

    // Find the existing product data
    const bannerData = await Banner.findById(id);

    // Check if a new image is provided
    const updatedImage = image ? image : bannerData.photo; // Use the existing image if no new image is provided

    const update = await Banner.updateOne(                
      { _id: id },
      {
        $set: {
          bannerName: bannerName,
          description: description,
          is_listed: status,
          photo: updatedImage, // Store the single image as a string
        },
      }
    );

    res.redirect("/admin/listBanner");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const deleteBanner = async (req, res) => {
  try {
    const id = req.query.id;
    const banner = await Banner.findByIdAndDelete(id);
    res.redirect("/admin/listBanner");
  } catch (error) {
    console.log(error.message);
    
  }
};

module.exports = {
  loadBannerList,
  loadBanner,
  addBanner,
  updateBanner,
  editBanner,
  deleteBanner,
};
