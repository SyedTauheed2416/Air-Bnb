const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const { getCategory } = require("../utils/categories.js");

const MONGO_URL =
  process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";

async function migrate() {
  await mongoose.connect(MONGO_URL);
  const listings = await Listing.find({});
  let updated = 0;

  for (const listing of listings) {
    if (!listing.category) {
      listing.category = getCategory(listing);
      await listing.save();
      updated += 1;
    }
  }

  console.log(`Category migration complete. Updated ${updated} listing(s).`);
  await mongoose.disconnect();
}

migrate().catch(async (err) => {
  console.error("Category migration failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
