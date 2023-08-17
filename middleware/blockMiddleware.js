const User = require('../models/userModel');

const checkBlocked = async (req, res, next) => {
  if (req.session.user) {
    try {
      const user = await User.findById(req.session.user.id);

      if (user.is_blocked) {
        req.session.destroy((err) => {
          if (err) {
            console.log(err);
          }
          res.redirect('/');
        });
      } else {
        next();
      }
    } catch (err) {
      console.log(err);
      res.redirect('/');
    }
  } else {
    next();
  }
};

module.exports = {
  checkBlocked
};
