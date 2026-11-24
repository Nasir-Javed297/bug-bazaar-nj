// Generates the mock catalogue: 5,000 products that are identical on every page load.
import { CATEGORIES, type Category, type Product } from "../types/api";

export const PRODUCT_COUNT = 5000;

/**
 * "mulberry32": a tiny seeded random number generator.
 * Unlike Math.random(), the same seed always gives the same sequence,
 * so product p-0042 is the same product on every load and in every test.
 * Returns a function that gives a number in [0, 1) each time it is called.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type CategoryCatalogue = {
  adjectives: readonly string[];
  nouns: readonly string[];
  /** Price range in cents: [min, max]. */
  priceRange: readonly [number, number];
};

const CATALOGUE: Record<Category, CategoryCatalogue> = {
  keyboards: {
    adjectives: ["Clicky", "Silent", "Tactile", "Retro", "RGB", "Compact", "Ergonomic", "Wireless"],
    nouns: ["Mechanical Keyboard", "60% Keyboard", "TKL Keyboard", "Split Keyboard", "Keycap Set"],
    priceRange: [3900, 24900],
  },
  ducks: {
    adjectives: [
      "Classic",
      "Pirate",
      "Ninja",
      "Wizard",
      "Astronaut",
      "Senior Dev",
      "Sleepy",
      "Glow",
    ],
    nouns: ["Rubber Duck", "Debug Duck", "Desk Duck", "Duck Squad", "Mini Duck"],
    priceRange: [400, 2900],
  },
  coffee: {
    adjectives: [
      "Dark Roast",
      "Midnight",
      "Single Origin",
      "Espresso",
      "Decaf",
      "Cold Brew",
      "Hotfix",
    ],
    nouns: ["Coffee Beans", "Ground Coffee", "Coffee Pods", "Coffee Mug", "Pour-Over Kit"],
    priceRange: [900, 5900],
  },
  stickers: {
    adjectives: ["Holographic", "Vintage", "Matte", "Glitter", "Pixel", "Minimal", "Neon"],
    nouns: ["Sticker Pack", "Laptop Sticker", "Bug Sticker", "Git Sticker", "Sticker Sheet"],
    priceRange: [200, 1500],
  },
};

/** Picks one random element. Throws on an empty array instead of returning undefined. */
function pick<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) {
    throw new Error("pick() needs a non-empty array");
  }
  return item;
}

export function seedProducts(count = PRODUCT_COUNT, seed = 42): Product[] {
  const random = createRandom(seed);

  return Array.from({ length: count }, (_, index): Product => {
    const category = pick(random, CATEGORIES);
    const { adjectives, nouns, priceRange } = CATALOGUE[category];
    const [minPrice, maxPrice] = priceRange;
    const number = index + 1;

    // Round to whole dollars, then subtract 1 cent: prices like 1999 ($19.99).
    const dollars = Math.round((minPrice + random() * (maxPrice - minPrice)) / 100);
    // About 8% of products are sold out; the rest have 1-50 in stock.
    const stock = random() < 0.08 ? 0 : 1 + Math.floor(random() * 50);
    // Rating between 1.0 and 5.0, one decimal place.
    const rating = Math.round((1 + random() * 4) * 10) / 10;

    return {
      id: `p-${String(number).padStart(4, "0")}`,
      name: `${pick(random, adjectives)} ${pick(random, nouns)} #${number}`,
      price: dollars * 100 - 1,
      category,
      stock,
      rating,
      // Relative to the site's base, so images also load under /bug-bazaar-nj/ on Pages.
      imageUrl: `${import.meta.env.BASE_URL}images/${category}.svg`,
    };
  });
}
