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

app.get("/");

app.get("/todays-chores", async (req, res) => {
  const NOT_DONE_CHORES = await Chore.find({
    status: "NOT_DONE",
    nextDue: {
      $gte: dayjs().subtract(7, "days").format("YYYY-MM-DD"),
      $lte: dayjs().format("YYYY-MM-DD"),
    },
  });

  const DONE_CHORES = await Chore.find({
    status: "DONE",
    lastDone: {
      $gte: dayjs().format("YYYY-MM-DD"),
      $lte: dayjs().format("YYYY-MM-DD"),
    },
  });

  const chores = [...NOT_DONE_CHORES, ...DONE_CHORES];

  return res.status(201).send(chores);
});

app.get("/upcoming-chores", async (req, res) => {
  const UPCOMING_CHORES = await Chore.find({
    status: "NOT_DONE",
    nextDue: {
      $gte: dayjs().add(1, "days").format("YYYY-MM-DD"),
      $lte: dayjs().add(7, "days").format("YYYY-MM-DD"),
    },
  });

  const DONE_CHORES = await Chore.find({
    status: "DONE",
    nextDue: {
      $gte: dayjs().add(1, "days").format("YYYY-MM-DD"),
      $lte: dayjs().add(7, "days").format("YYYY-MM-DD"),
    },
  });

  for (let i = 0; i < DONE_CHORES.length; i++) {
    const chore = DONE_CHORES[i];
    await Chore.updateOne(
      { _id: chore._id },
      { status: "NOT_DONE", lastDone: "" }
    );

    const upcomingChore = chore.toObject();
    upcomingChore.status = "NOT_DONE";
    upcomingChore.lastDone = "";
    UPCOMING_CHORES.push(upcomingChore);
  }

  return res.status(201).send([...UPCOMING_CHORES]);
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

app.put("/chores/:id", jsonParser, async (req, res) => {
  const choreId = req.params.id;
  const choreUpdates = req.body;

  try {
    const updatedChore = await Chore.findByIdAndUpdate(choreId, choreUpdates, {
      new: true,
    });

    if (!updatedChore) {
      return res.status(404).send("Chore not found");
    }

    return res.status(200).send(updatedChore);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error updating chore");
  }
});

const updateChoreStatus = async (req, res) => {
  const choreId = req.params.id;
  const chore = await Chore.findById(choreId);

  if (!chore) {
    res.status(404).send("Chore not found");
    return;
  }

  const updateChoreData = {
    status: chore.status === "DONE" ? "NOT_DONE" : "DONE",
    lastDone: chore.status === "DONE" ? "" : dayjs().format("YYYY-MM-DD"),
    nextDue: calculateNextDueDate(chore),
  };

  try {
    await Chore.updateOne({ _id: choreId }, updateChoreData);
    res.status(200).send("Chore updated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating chore");
  }
};

const calculateNextDueDate = (chore) => {
  if (chore.status === "DONE") {
    return dayjs().format("YYYY-MM-DD");
  }

  return chore.isOneTime
    ? undefined
    : dayjs().add(chore.repeatFrequencyDays, "days").format("YYYY-MM-DD");
};

app.get("/complete-chore/:id", jsonParser, updateChoreStatus);

app.delete("/chores/:id", jsonParser, async (req, res) => {
  const choreId = req.params.id;

  try {
    await Chore.deleteOne({ _id: choreId });
    res.status(200).send("Chore deleted");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting chore");
  }
});

app.listen(8000, () => {
  console.log("Server is up!");
});
