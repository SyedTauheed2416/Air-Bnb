const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const { inferCategory } = require("../utils/categories.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  await Listing.deleteMany({});
  initData.data = initData.data.map((obj) => ({
    ...obj,
    category: obj.category || inferCategory(obj),
    owner: "6a96e0f98d24e4ce67fe26a2",
  }));
  await Listing.insertMany(initData.data);
  console.log("data was initialized");
};

initDB();
