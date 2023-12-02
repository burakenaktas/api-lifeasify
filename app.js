const express = require("express");
require("dotenv").config();
const cors = require("cors");
const bodyParser = require("body-parser");
const Chore = require("./schemas/Chore");

const { default: mongoose } = require("mongoose");
const dayjs = require("dayjs");

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
mongoose.connect(process.env.MONGODB_URL).catch((err) => {
  console.log(err);
});

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const jsonParser = bodyParser.json();

app.get("/", (req, res) => {
  res.send("Merhaba, dünya!");
});

app.get("/todays-chores", async (req, res) => {
  const chores = await Chore.find({
    nextDue: {
      $gte: dayjs().format("YYYY-MM-DD"),
      $lte: dayjs().format("YYYY-MM-DD"),
    },
  });

  return res.status(201).send(chores);
});

app.post("/add-chore", jsonParser, async (req, res) => {
  const chore = req.body;
  chore.status = "NOT_DONE";
  chore.lastDone = "";

  if (!chore.name) {
    res.status(400).send("Missing chore title or description");
    return;
  }

  const savedChore = await Chore.create(chore);
  return res.status(201).send(savedChore);
});

app.listen(8000, () => {
  console.log("Uygulama başlatıldı!");
});
