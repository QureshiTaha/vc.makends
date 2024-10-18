const User = require("../models/user");

// Export all user Functions
module.exports = {
  getUser: async (phone) => {
    if (!phone) return;
    const user = await User.findOne({ where: { phone } });
    return user;
  },
  createUser: async (phone) => {
    if (!phone) return;
    const user = await User.create({ phone });
    return user;
  },
  updateUser: async (phone, username) => {
    if (!phone) return;
    const user = await User.update({ username }, { where: { phone } });
    return user;
  },
  updateStatus: async (phone, status) => {
    if (!phone || !status) return;
    const user = await User.update({ status }, { where: { phone } });
    return user;
  },
};
