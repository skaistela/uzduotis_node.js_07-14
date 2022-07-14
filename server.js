const express = require("express");
const app = express();
const mysql = require("mysql");
const cors = require('cors');
const db = mysql.createPool({
  connectionLimit: 100,
  host: "127.0.0.1",
  user: "root",
  password: "root",
  database: "egzas",
  port: "3306",
});

app.listen(3000, () => console.log(`Server Started on port 3000...`));

db.getConnection((err, connection) => {
  if (err) throw err;
  console.log("DB connected successful: " + connection.threadId);
});


app.use(cors({
  origin: 'http://127.0.0.1:5500'
}));

const bcrypt = require("bcrypt");
app.use(express.json());
app.post("/register", async (req, res) => {
  console.log(req.body);
  const fullname = req.body.fullname;
  const email = req.body.email;
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "SELECT * FROM users WHERE email = ?";
    const search_query = mysql.format(sqlSearch, [email]);
    const sqlInsert = "INSERT INTO users VALUES (0,?,?,?,0)";
    const insert_query = mysql.format(sqlInsert, [
      fullname,
      email,
      hashedPassword,
    ]);
    await connection.query(search_query, async (err, result) => {
      if (err) throw err;
      console.log("Search Results");
      console.log(result.length);

      if (req.body.password != req.body.passwordRepeat) {
        connection.release();
        console.log("Passwords doesn't match!");
        res.send("Passwords doesn't match!");
      }

      if (result.length != 0) {
        connection.release();
        console.log("User already exists");
        res.status(409).send("User already exists");
      } else {
        await connection.query(insert_query, (err, result) => {
          connection.release();
          if (err) throw err;
          console.log("Created new User");
          console.log(result.insertId);
          res.status(201).send("Created new User");
        });
      }
    });
  });
});

app.post("/login", (req, res) => {

    console.log(req.body);
  const { email, password } = req.body;
  if (!(email && password)) {
    res.status(400).send("All input is required");
 }
  const jwt = require("jsonwebtoken");
  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "Select * from users where email = ?";
    const search_query = mysql.format(sqlSearch, [email]);
    await connection.query(search_query, async (err, result) => {
      connection.release();
      if (result.length == 0) {
        console.log("User does not exist");
        res.sendStatus(404);
      } else {
        const hashedPassword = result[0].password;
        if (await bcrypt.compare(password, hashedPassword)) {
          console.log("Login Successful");

          const token = jwt.sign(
            { user_id: result[0].id, email },
            "Saugusslaptažodis123",
            {
              expiresIn: "2h",
            }
          );
          console.log(token);
          res.status(200).json(token);
        } else {
          console.log("Password Incorrect");
          res.send("Password incorrect!");
        } 
      } 
    });
  });
});
