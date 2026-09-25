const Listing = require("../models/listing");
const axios = require("axios");
const { categories, categoryKeywords } = require("../utils/categories");

async function geocodeWithRetry(query, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: query, format: "json", limit: 1 },
        headers: { "User-Agent": "Wanderlust/1.0 (your-email@example.com)" },
        timeout: 5000,
      });
    } catch (err) {
      if (err.response?.status === 429 && i < retries) {
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

module.exports.index = async (req, res) => {
  let { q = "", category = "", minPrice = "", maxPrice = "" } = req.query;
  let filter = {};

  if (q) {
    let regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { title: regex },
      { description: regex },
      { location: regex },
      { country: regex },
    ];
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (category && categoryKeywords[category]) {
    let regex = new RegExp(categoryKeywords[category].join("|"), "i");
    filter.$and = [
      {
        $or: [
          { category: category },
          { title: regex },
          { description: regex },
          { location: regex },
          { country: regex },
        ],
      },
    ];
  }

  let allListings = await Listing.find(filter);
  res.render("listings/index.ejs", {
    allListings,
    categories,
    filters: { q, category, minPrice, maxPrice },
  });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs", { categories });
};

module.exports.showListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");

  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
  try {
    let response;
    try {
      response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
          q: req.body.listing.location,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "Wanderlust/1.0 (tauheedsyed9092@gmail.com)",
        },
        timeout: 5000,
      });
    } catch (geoErr) {
      if (geoErr.response && geoErr.response.status === 429) {
        req.flash(
          "error",
          "Location lookup is temporarily busy. Please wait a few seconds and try again.",
        );
        return res.redirect("/listings/new");
      }
      throw geoErr; // some other error, let it bubble to your error handler
    }

    if (response.data.length === 0) {
      req.flash("error", "Location not found!");
      return res.redirect("/listings/new");
    }

    const { lat, lon } = response.data[0];
    let url = req.file.path;
    let filename = req.file.filename;

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };
    newListing.geometry = {
      type: "Point",
      coordinates: [parseFloat(lon), parseFloat(lat)],
    };

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
  } catch (err) {
    next(err);
  }
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
  res.render("listings/edit.ejs", { listing, originalImageUrl, categories });
};

module.exports.updateListing = async (req, res, next) => {
  try {
    let { id } = req.params;
    let listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing you requested for does not exist!");
      return res.redirect("/listings");
    }

    let locationChanged = req.body.listing.location !== listing.location;
    Object.assign(listing, req.body.listing);

    if (locationChanged) {
      let response;
      try {
        response = await geocodeWithRetry(req.body.listing.location);
      } catch (geoErr) {
        if (geoErr.response && geoErr.response.status === 429) {
          req.flash(
            "error",
            "Location lookup is temporarily busy. Please wait a few seconds and try again.",
          );
          return res.redirect(`/listings/${id}/edit`);
        }
        throw geoErr;
      }

      if (response.data.length === 0) {
        req.flash("error", "Location not found!");
        return res.redirect(`/listings/${id}/edit`);
      }

      const { lat, lon } = response.data[0];
      listing.geometry = {
        type: "Point",
        coordinates: [parseFloat(lon), parseFloat(lat)],
      };
    }

    if (typeof req.file !== "undefined") {
      listing.image = { url: req.file.path, filename: req.file.filename };
    }

    await listing.save();
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    next(err);
  }
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  if (!deletedListing) {
    req.flash("error", "Listing not found.");
    return res.redirect("/listings");
  }
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};
