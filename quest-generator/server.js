require("dotenv").config();
console.log(process.env.DATABASE_URL);

const express = require("express");
const pool = require("./quest-db/db");

const app = express();

app.use(express.json());

app.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW()"
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database connection failed");
  }
});

app.listen(3000, () => {
  console.log("Server running");
});