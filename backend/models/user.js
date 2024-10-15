const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize(process.env.DB_URL,
    {
        dialect: "mysql",
        logging: false
    }
); // Add your DB URL in the .env file

const User = sequelize.define("user", {
  phone: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contacts: {
    type: DataTypes.JSON, // Store contacts as JSON (array of phone numbers)
    allowNull: true,
    defaultValue: [],
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "offline",
  },
});

module.exports = User;
