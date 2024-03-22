const User = require('../models/userModel');

const requireAuth = (req, res, next) => {
  if (req.session.user) {
    console.log(req.session.user)    
    // User is authenticated, continue to the next middleware
    next();
  } else {
    res.redirect('/login');
  }
};

const checkUser = async (req, res, next) => {
  if (req.session.user) {
    try {
      const user = await User.findById(req.session.user.id);
      res.locals.user = user;
      next();
    } catch (err) {
      res.locals.user = null;
      next();
    }
  } else {
    res.locals.user = null;
    next();
  }
};

module.exports = { requireAuth, checkUser };
