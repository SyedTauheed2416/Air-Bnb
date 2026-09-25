const Listing = require("../models/listing");
const axios = require("axios");
const { categories, categoryKeywords } = require("../utils/categories");

async function geocodeLocation(query) {
  try {
    return await axios.get("https://photon.komoot.io/api/", {
      params: {
        q: query,
        limit: 1,
        lang: "en",
      },
      timeout: 7000,
      headers: {
        "User-Agent": "Wanderlust/1.0",
      },
    });
  } catch (err) {
    if (err.response?.status === 429) {
      const error = new Error("Location service is temporarily busy.");
      error.code = "GEOCODING_LIMIT";
      throw error;
    }
    throw err;
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
    const response = await geocodeLocation(req.body.listing.location);
    const feature = response.data.features?.[0];

    if (!feature) {
      req.flash("error", "Location not found! Try adding the city or country.");
      return res.redirect("/listings/new");
    }

    const [lon, lat] = feature.geometry.coordinates;

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = {
      url: req.file.path,
      filename: req.file.filename,
    };
    newListing.geometry = {
      type: "Point",
      coordinates: [Number(lon), Number(lat)],
    };

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
  } catch (err) {
    if (err.code === "GEOCODING_LIMIT") {
      req.flash(
        "error",
        "Location service is temporarily busy. Please try again in a few seconds.",
      );
      return res.redirect("/listings/new");
    }
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
      try {
        const response = await geocodeLocation(req.body.listing.location);
        const feature = response.data.features?.[0];

        if (!feature) {
          req.flash("error", "Location not found!");
          return res.redirect(`/listings/${id}/edit`);
        }

        const [lon, lat] = feature.geometry.coordinates;
        listing.geometry = {
          type: "Point",
          coordinates: [Number(lon), Number(lat)],
        };
      } catch (geoErr) {
        if (geoErr.code === "GEOCODING_LIMIT") {
          req.flash(
            "error",
            "Location service is temporarily busy. Please try again in a few seconds.",
          );
          return res.redirect(`/listings/${id}/edit`);
        }
        throw geoErr;
      }
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
