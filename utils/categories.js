const categories = [
  { key: "trending", icon: "fa-fire", label: "Trending" },
  { key: "rooms", icon: "fa-bed", label: "Rooms" },
  { key: "iconic-cities", icon: "fa-mountain-city", label: "Iconic Cities" },
  { key: "mountains", icon: "fa-mountain", label: "Mountains" },
  { key: "castles", icon: "fa-fort-awesome", label: "Castles" },
  { key: "pools", icon: "fa-person-swimming", label: "Amazing Pools" },
  { key: "camping", icon: "fa-campground", label: "Camping" },
  { key: "farms", icon: "fa-cow", label: "Farms" },
  { key: "arctic", icon: "fa-snowflake", label: "Arctic" },
  { key: "domes", icon: "fa-igloo", label: "Domes" },
  { key: "boats", icon: "fa-ship", label: "Boats" },
];

const categoryKeywords = {
  trending: ["trending", "popular", "best", "luxury", "paradise"],
  rooms: [
    "room",
    "apartment",
    "loft",
    "suite",
    "hotel",
    "villa",
    "penthouse",
    "bungalow",
  ],
  "iconic-cities": [
    "city",
    "downtown",
    "urban",
    "tokyo",
    "new york",
    "miami",
    "boston",
    "amsterdam",
  ],
  mountains: [
    "mountain",
    "cabin",
    "hill",
    "himalaya",
    "alps",
    "banff",
    "lake tahoe",
    "montana",
    "aspen",
  ],
  castles: ["castle", "fort", "palace", "historic"],
  pools: ["pool", "swimming", "infinity"],
  camping: ["camp", "tent", "treehouse", "lodge", "safari"],
  farms: ["farm", "ranch", "countryside", "cottage", "cotswolds"],
  arctic: ["arctic", "snow", "ice", "ski", "chalet", "swiss alps"],
  domes: ["dome", "igloo"],
  boats: ["boat", "yacht", "houseboat", "canal"],
};

function getCategory(listing) {
  let text =
    `${listing.title} ${listing.description} ${listing.location} ${listing.country}`.toLowerCase();
  let category = "rooms";
  let max = 0;

  for (let key in categoryKeywords) {
    let count = 0;
    for (let word of categoryKeywords[key]) {
      if (text.includes(word)) count++;
    }
    if (count > max) {
      max = count;
      category = key;
    }
  }

  return category;
}

module.exports = { categories, categoryKeywords, getCategory };
