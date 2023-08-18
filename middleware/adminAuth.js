const Admin = require('../models/adminModel');


const requireAuth = (req, res, next) => {
  if (req.session.admin) {
    // User is authenticated, continue to the next middleware
    next();
  } else {
    res.redirect('/admin');
  }
};

const checkUser = async (req, res, next) => {
  if (req.session.admin) {
    try {
      const admin = await Admin.findById(req.session.admin.id);
      res.locals.admin = admin;
      next();
    } catch (err) {
      res.locals.admin = null;
      next();
    }
  } else {
    res.locals.admin = null;
    next();
  }
};

module.exports = { requireAuth, checkUser };
