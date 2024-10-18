const mysql = require("mysql");
      connection = mysql.createConnection({
          host: process.env.DBHOST,
          user:process.env.DBUSER,
          password: process.env.DBPASSWORD,
          database: process.env.DATABASE
      });
try {
  connection.connect(function (err) {
    if (err) {
      console.log('\x1b[31m%s\x1b[0m', `Database Connection Fail! :${err}`);
    } else {
      console.log('\x1b[36m%s\x1b[0m', 'Database Connected!');
    }
  });  
} catch (error) {
  console.log(error)
}


module.exports = ()=>{
    return connection;
}