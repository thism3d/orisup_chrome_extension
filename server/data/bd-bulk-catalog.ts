/**
 * Deterministic generator for ~1000 Bangladesh-market demo products (BDT, categories, rich descriptions).
 * Slugs use prefix bdk- for idempotent bulk seeding.
 */

export const BD_BULK_SLUG_PREFIX = "bdk-";

export type BdBulkCategoryDef = { slug: string; name: string; sortOrder: number };

export const BD_BULK_CATEGORIES: BdBulkCategoryDef[] = [
  { slug: "rice-grocery", name: "Rice, Atta & Grocery", sortOrder: 1 },
  { slug: "fresh-packaged-foods", name: "Snacks, Noodles & Packaged Foods", sortOrder: 2 },
  { slug: "mobile-gadgets", name: "Mobile & Gadgets", sortOrder: 3 },
  { slug: "tv-appliances", name: "TV & Large Appliances", sortOrder: 4 },
  { slug: "computer-office", name: "Computer & Office", sortOrder: 5 },
  { slug: "electronics", name: "Electronics & Accessories", sortOrder: 6 },
  { slug: "mens-fashion", name: "Men's Fashion", sortOrder: 7 },
  { slug: "womens-fashion", name: "Women's Fashion", sortOrder: 8 },
  { slug: "baby-kids", name: "Baby, Kids & Toys", sortOrder: 9 },
  { slug: "home-kitchen", name: "Home, Kitchen & Decor", sortOrder: 10 },
  { slug: "beauty-care", name: "Beauty & Personal Care", sortOrder: 11 },
  { slug: "sports-fitness", name: "Sports & Fitness", sortOrder: 12 },
  { slug: "books-stationery", name: "Books & Stationery", sortOrder: 13 },
  { slug: "tools-hardware", name: "Tools & Hardware", sortOrder: 14 },
];

export type BdBulkVendorDef = { slug: string; name: string };

export const BD_BULK_VENDORS: BdBulkVendorDef[] = [
  { slug: "dhaka-mart-bd", name: "Dhaka Mart" },
  { slug: "chattogram-express-shop", name: "Chattogram Express Shop" },
  { slug: "bengal-tech-store", name: "Bengal Tech Store" },
  { slug: "deshi-fashion-house", name: "Deshi Fashion House" },
  { slug: "homestyle-bd", name: "Homestyle Bangladesh" },
];

export type BdBulkProductRow = {
  vendorSlug: string;
  categorySlug: string;
  title: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  images: string[];
};

const UNSPLASH = (photoPath: string) =>
  `https://images.unsplash.com/${photoPath}?auto=format&fit=crop&w=900&q=82`;

/** Curated pools — rotate by index for variety without huge static lists */
const IMG_POOLS: Record<string, string[]> = {
  rice: [
    UNSPLASH("photo-1586201375761-83865001e31c"),
    UNSPLASH("photo-1587049352846-4a222e784d38"),
    UNSPLASH("photo-1599490659213-e2b9527bd087"),
  ],
  food: [
    UNSPLASH("photo-1621939514649-280e2ee25f60"),
    UNSPLASH("photo-1556911220-bff31c812dba"),
    UNSPLASH("photo-1562157873-818bc0726f68"),
  ],
  mobile: [
    UNSPLASH("photo-1511707171634-5f897ff02aa9"),
    UNSPLASH("photo-1592899677977-9c10ca588bbd"),
    UNSPLASH("photo-1565849904461-04a58ad377e0"),
  ],
  tv: [
    UNSPLASH("photo-1593359677879-a4bb92f829d1"),
    UNSPLASH("photo-1461158534263-385835e6f42b"),
    UNSPLASH("photo-1588508065123-5b083564ce8e"),
  ],
  computer: [
    UNSPLASH("photo-1496181133206-80ce9b88a853"),
    UNSPLASH("photo-1527443224154-c4a3942d3acf"),
    UNSPLASH("photo-1525547719571-a2d4ac8944e2"),
  ],
  electronics: [
    UNSPLASH("photo-1505740420928-5e560c06d30e"),
    UNSPLASH("photo-1544244015-0df4b3ffc6b0"),
    UNSPLASH("photo-1572569511254-l8ef29b46144"),
  ],
  men: [
    UNSPLASH("photo-1617137968427-85924c800a22"),
    UNSPLASH("photo-1618354691373-d851c5c3a990"),
    UNSPLASH("photo-1620799140408-ed534d64b33b"),
  ],
  women: [
    UNSPLASH("photo-1595777457583-95e059d581b8"),
    UNSPLASH("photo-1515372039744-b8f02a3ae446"),
    UNSPLASH("photo-1581044777550-2a227d133be2"),
  ],
  baby: [
    UNSPLASH("photo-1515488042361-ee00e0ddd4e4"),
    UNSPLASH("photo-1522771739844-6a9f6d5f14af"),
    UNSPLASH("photo-1566004100631-35d015d6a491"),
  ],
  home: [
    UNSPLASH("photo-1555041469-a586c61ea9bc"),
    UNSPLASH("photo-1586023492125-27b2c045efd7"),
    UNSPLASH("photo-1556228453-efd6c1ff04f6"),
  ],
  beauty: [
    UNSPLASH("photo-1556228720-195a672e8a03"),
    UNSPLASH("photo-1596462502278-27bfdc403348"),
    UNSPLASH("photo-1570172619644-dfd03ed5d881"),
  ],
  sports: [
    UNSPLASH("photo-1542291026-7eec264c27ff"),
    UNSPLASH("photo-1571019613454-1cb2f99b2d8b"),
    UNSPLASH("photo-1517649763962-0c62306601b7"),
  ],
  books: [
    UNSPLASH("photo-1512820790803-83ca734da794"),
    UNSPLASH("photo-1495446815901-a7297e633e8d"),
    UNSPLASH("photo-1524995997946-a1c2e315a42f"),
  ],
  tools: [
    UNSPLASH("photo-1504148455328-c376907d081c"),
    UNSPLASH("photo-1581147036324-c1a02d69e7c5"),
    UNSPLASH("photo-1530124566582-a618bc2615dc"),
  ],
};

const CAT_IMG_KEY: Record<string, keyof typeof IMG_POOLS> = {
  "rice-grocery": "rice",
  "fresh-packaged-foods": "food",
  "mobile-gadgets": "mobile",
  "tv-appliances": "tv",
  "computer-office": "computer",
  "electronics": "electronics",
  "mens-fashion": "men",
  "womens-fashion": "women",
  "baby-kids": "baby",
  "home-kitchen": "home",
  "beauty-care": "beauty",
  "sports-fitness": "sports",
  "books-stationery": "books",
  "tools-hardware": "tools",
};

function pick<T>(arr: T[], i: number): T {
  return arr[Math.abs(i) % arr.length];
}

function bdt(n: number): string {
  return String(Math.max(49, Math.round(n)));
}

function buildDescription(args: {
  title: string;
  categoryName: string;
  vendorName: string;
  bullets: string[];
  specs: string[];
  warranty: string;
}): string {
  const bulletBlock = args.bullets.map((b) => `• ${b}`).join("\n");
  const specBlock = args.specs.map((s) => `• ${s}`).join("\n");
  return [
    `**Overview**`,
    `${args.title} — curated for the Bangladesh market. Sold by **${args.vendorName}** on Orlenbd. Ideal for shoppers in Dhaka, Chattogram, Sylhet, Rajshahi, Khulna and nationwide delivery zones.`,
    ``,
    `**What's included**`,
    bulletBlock,
    ``,
    `**Specifications**`,
    specBlock,
    ``,
    `**Warranty & returns**`,
    args.warranty,
    ``,
    `**Delivery & payment**`,
    `Cash on delivery (COD) and digital payment options where available. Typical dispatch from seller within 1–3 working days; rural areas may need extra time. Price shown in **BDT (৳)** inclusive of applicable VAT where stated by the seller.`,
  ].join("\n");
}

type LineTemplate = {
  a: string[];
  b: string[];
  c: string[];
  priceMin: number;
  priceMax: number;
  bullets: (i: number) => string[];
  specs: (i: number) => string[];
  warranty: (i: number) => string;
};

const TEMPLATES: Record<string, LineTemplate> = {
  "rice-grocery": {
    a: ["Pran", "ACI", "Fresh", "Square", "Tropilite", "Diploma", "Fortune", "Radhuni"],
    b: ["Chinigura Aromatic Rice", "Miniket Rice", "Nazirshail Rice", "Basmati Premium", "Puffed Rice (Muri)", "Red Lentil (Masoor Dal)", "Moog Dal", "Chola Dal", "Soybean Oil 5L", "Mustard Oil 2L", "Atta 10kg", "Maida 2kg", "Sugar 2kg", "Salt (Iodized) 1kg"],
    c: ["5 kg pack", "10 kg bag", "2 kg pouch", "1 kg refill", "Family pack", "Export quality"],
    priceMin: 120,
    priceMax: 12500,
    bullets: (i) => [
      pick(["Sealed factory packaging", "Hygienically packed", "STP-certified lot where applicable"], i),
      pick(["Store in a cool, dry place", "Avoid moisture and direct sunlight"], i + 1),
      pick(["Check manufacturing date on pack", "Batch traceable to distributor"], i + 2),
    ],
    specs: (i) => [
      `Category: ${pick(["Staples", "Edible oil", "Pulses", "Rice"], i)}`,
      `Origin / type: ${pick(["Local mill", "Imported basmati blend", "Premium parboiled"], i + 3)}`,
      `Unit: ${pick(["kg", "L", "pack"], i + 5)}`,
    ],
    warranty: (i) =>
      pick(
        [
          "7-day return for unopened packs if wrong item delivered.",
          "Report damage within 24 hours of delivery with photos.",
          "Perishable policy: follow courier guidelines.",
        ],
        i
      ),
  },
  "fresh-packaged-foods": {
    a: ["Pran", "Olympic", "Dan Cake", "Bombay Sweets", "Mr. Twist", "Maggi", "Doodles", "Sun", "Ruchi"],
    b: ["Cream Crackers", "Chocolate Wafer", "Potato Chips Spicy", "Instant Noodles Masala", "Fruit Drink 250ml", "Mango Juice 1L", "Biscuit Family Pack", "Chanachur Mix", "Toast biscuit", "Cup cake vanilla"],
    c: ["6 pcs", "12-pack", "Family bundle", "Limited offer"],
    priceMin: 35,
    priceMax: 899,
    bullets: (i) => [
      pick(["Halal certified where labelled", "Check allergen info on pack"], i),
      pick(["Best before date printed", "Do not buy if seal broken"], i + 1),
    ],
    specs: (i) => [
      `Net weight: ${pick(["50g", "82g", "150g", "340g", "1L"], i)}`,
      `Storage: ${pick(["Room temperature", "Refrigerate after opening"], i + 2)}`,
    ],
    warranty: () => "Food items: return only for wrong/damaged delivery if packaging intact policy allows.",
  },
  "mobile-gadgets": {
    a: ["realme", "Xiaomi", "Samsung", "vivo", "OPPO", "Anker", "Ugreen", "Baseus"],
    b: ["USB-C Fast Cable 2m", "20W PD Adapter", "Bluetooth Neckband", "Phone Case Clear", "Tempered Glass 2-pack", "Wireless Earbuds", "Power Bank 10000mAh", "Car Charger Dual", "Selfie Stick Tripod", "OTG Adapter USB-C"],
    c: ["BD warranty sticker", "Official distributor stock", "Import model"],
    priceMin: 250,
    priceMax: 8999,
    bullets: (i) => [
      pick(["Compatible with most Android & iOS devices", "Check port type before purchase"], i),
      pick(["Includes retail box where stated", "Serial on packaging"], i + 1),
    ],
    specs: (i) => [
      `Power / speed: ${pick(["18W", "20W", "33W", "5V/2A"], i)}`,
      `Interface: ${pick(["USB-C", "USB-A + USB-C", "Lightning bundle"], i + 3)}`,
    ],
    warranty: (i) =>
      pick(["Brand warranty as per distributor card.", "7-day DOA replacement for accessories."], i),
  },
  "tv-appliances": {
    a: ["Samsung", "LG", "Walton", "Vision", "Haier", "Gree", "Sharp"],
    b: ['32" HD Ready LED TV', '43" Smart Android TV', '55" 4K UHD TV', "Double-door Refrigerator 250L", "Split AC 1.5 Ton Inverter", "Microwave Oven 25L", "Blender 2-in-1", "Electric Kettle 1.8L", "Iron Dry 1200W", "Ceiling Fan 56\""],
    c: ["Official service network", "Installation in city limits", "Energy efficient"],
    priceMin: 1899,
    priceMax: 125000,
    bullets: (i) => [
      pick(["Voltage 220V ~ 50Hz", "Use proper stabilizer for rural grids"], i),
      pick(["Read manual before first use", "Keep invoice for warranty"], i + 1),
    ],
    specs: (i) => [
      `Capacity / size: ${pick(['32"', '43"', "250L", "1.5 Ton", "25L"], i)}`,
      `Energy: ${pick(["3-star", "4-star", "5-star rated"], i + 2)}`,
    ],
    warranty: () => "Manufacturer warranty as per Bangladesh service policy; installation may be extra.",
  },
  "computer-office": {
    a: ["HP", "Dell", "ASUS", "Lenovo", "Logitech", "Rapoo", "A4Tech", "TP-Link"],
    b: ["Wireless Mouse", "Mechanical Keyboard RGB", "USB Webcam 1080p", "Laptop Stand Aluminium", "HDMI Cable 3m", "Wi-Fi USB Adapter", "Toner Compatible", "Notebook Backpack", "SSD 512GB SATA", "USB Hub 4-port"],
    c: ["For work-from-home", "Student friendly", "Office bulk"],
    priceMin: 450,
    priceMax: 98500,
    bullets: (i) => [
      pick(["Check laptop port compatibility", "Driver may be required"], i),
      pick(["1-year limited warranty on electronics parts"], i + 1),
    ],
    specs: (i) => [
      `Interface: ${pick(["USB 3.0", "USB-C", "HDMI 2.0", "Wi-Fi 5"], i)}`,
      `Use case: ${pick(["Office", "Gaming", "Classroom"], i + 3)}`,
    ],
    warranty: (i) => pick(["1-year service warranty.", "Brand warranty card inside box."], i),
  },
  electronics: {
    a: ["Sony", "JBL", "Anker", "Edifier", "Mi", "OnePlus", "Boat"],
    b: ["Wireless Headphones ANC", "Portable Bluetooth Speaker", "Smart Watch Fitness", "Fitness Band", "Trimmer Rechargeable", "Electric Toothbrush", "LED Desk Lamp", "Extension Socket 5-way"],
    c: ["Deep bass", "Splash resistant", "Fast charge"],
    priceMin: 699,
    priceMax: 24999,
    bullets: (i) => [pick(["Charge before first use", "App pairing optional"], i)],
    specs: (i) => [
      `Battery: ${pick(["Up to 8h", "Up to 20h", "USB-C charging"], i)}`,
      `Connectivity: ${pick(["Bluetooth 5.0", "Bluetooth 5.3", "3.5mm + BT"], i + 1)}`,
    ],
    warranty: () => "Follow brand service center list for Bangladesh.",
  },
  "mens-fashion": {
    a: ["Artisan", "Yellow", "Cats Eye", "Dorji", "Easy", "Ecstasy"],
    b: ["Cotton Panjabi Embroidery", "Slim Fit Casual Shirt", "Denim Jeans Stretch", "Polo T-Shirt Pique", "Formal Trouser", "Winter Hoodie", "Leather Belt", "Lungi Premium Cotton"],
    c: ["Size M–XXL", "Unstitched option", "Eid collection"],
    priceMin: 450,
    priceMax: 4999,
    bullets: (i) => [
      pick(["Fabric: cotton / cotton blend — see label", "Gentle wash dark colours separately"], i),
    ],
    specs: (i) => [
      `Fit: ${pick(["Regular", "Slim", "Relaxed"], i)}`,
      `Season: ${pick(["All season", "Summer", "Winter"], i + 2)}`,
    ],
    warranty: () => "Fashion: exchange for size only if tags intact — per seller policy.",
  },
  "womens-fashion": {
    a: ["Aarong", "Kay Kraft", "Richman", "Westin", "Banglar Mela", "Nogor"],
    b: ["Cotton Sharee Print", "Silk Blend Sharee", "Three-piece Unstitched", "Kurti with Palazzo", "Handbag PU Leather", "Ornaments Set", "Scarf Chiffon", "Abaya Casual"],
    c: ["Handloom accent", "Party wear", "Daily wear"],
    priceMin: 599,
    priceMax: 8999,
    bullets: (i) => [pick(["Dry clean for delicate fabrics", "Colour may vary slightly on screen"], i)],
    specs: (i) => [
      `Material: ${pick(["Cotton", "Silk blend", "Georgette", "Linen blend"], i)}`,
      `Work: ${pick(["Printed", "Embroidered", "Handwork detail"], i + 1)}`,
    ],
    warranty: () => "Eligible size/colour exchange within policy window if unworn with tags.",
  },
  "baby-kids": {
    a: ["Meril", "Johnson's", "Pampers", "Junior", "Walton Kids", "RFL"],
    b: ["Baby Diaper Pants L", "Feeding Bottle BPA-free", "Soft Toy Teddy", "Wooden Learning Blocks", "Stroller Lightweight", "School Bag Primary", "Kids Bicycle 16\"", "Water Bottle Insulated"],
    c: ["0–6 months", "2–5 years", "6–12 years"],
    priceMin: 199,
    priceMax: 12999,
    bullets: (i) => [pick(["Adult supervision for toys", "Check age grading on pack"], i)],
    specs: (i) => [
      `Age: ${pick(["0+", "1+", "3+", "6+"], i)}`,
      `Material: ${pick(["BPA-free plastic", "Cotton", "Steel"], i + 2)}`,
    ],
    warranty: () => "Baby gear: warranty per manufacturer; hygiene items non-returnable if opened.",
  },
  "home-kitchen": {
    a: ["RFL", "Vision", "IKEA-style", "Prestige", "Butterfly", "Non-stick Pro"],
    b: ["Dinner Set Melamine", "Non-stick Fry Pan 26cm", "Glass Food Container Set", "Vacuum Flask 1L", "Curtain Blackout", "Storage Box Stackable", "Wall Shelf Floating", "Bamboo Chopping Board"],
    c: ["Heat resistant handle", "Dishwasher safe parts", "Modern minimal"],
    priceMin: 275,
    priceMax: 8999,
    bullets: (i) => [pick(["Do not use metal utensils on non-stick", "Wash before first use"], i)],
    specs: (i) => [
      `Material: ${pick(["Melamine", "Stainless steel", "Glass", "Bamboo"], i)}`,
      `Capacity: ${pick(["500ml", "1L", "Set of 6", "26cm"], i + 1)}`,
    ],
    warranty: () => "Kitchenware: manufacturing defect claims within standard window.",
  },
  "beauty-care": {
    a: ["Glow", "Ponds", "Dove", "LUX", "Parachute", "Keya Seth", "Wella"],
    b: ["Face Wash Oily Skin", "Body Lotion 400ml", "Shampoo Anti-dandruff", "Hair Oil Coconut", "Lip Balm SPF", "Face Cream Night", "Perfume Roll-on", "Beard Oil"],
    c: ["Dermatologist tested label", "For humid climate", "Travel size"],
    priceMin: 120,
    priceMax: 1899,
    bullets: (i) => [pick(["Patch test before use", "Avoid eye contact"], i)],
    specs: (i) => [
      `Skin / hair type: ${pick(["All", "Oily", "Dry", "Combination"], i)}`,
      `Volume: ${pick(["50ml", "100ml", "400ml"], i + 2)}`,
    ],
    warranty: () => "Cosmetics: return if sealed wrong item only.",
  },
  "sports-fitness": {
    a: ["Adidas", "Nike", "Decathlon-style", "Cosco", "BT Sport", "Yonex-style"],
    b: ["Cricket Bat English Willow", "Tennis Ball 6-pack", "Yoga Mat TPE", "Dumbbell Pair 5kg", "Running Shoes Mesh", "Cycling Helmet", "Skipping Rope Steel", "Football Size 5"],
    c: ["Indoor / outdoor", "Club practice", "Beginner friendly"],
    priceMin: 299,
    priceMax: 12999,
    bullets: (i) => [pick(["Warm up before exercise", "Check size chart for footwear"], i)],
    specs: (i) => [
      `Sport: ${pick(["Cricket", "Football", "Fitness", "Cycling"], i)}`,
      `Level: ${pick(["Beginner", "Intermediate"], i + 1)}`,
    ],
    warranty: () => "Sports equipment: check for transit damage on delivery.",
  },
  "books-stationery": {
    a: ["Panjeree", " Lecture", "SAP", "Oxford", "Matador", "Faber-Castell"],
    b: ["SSC Science Guide 2026", "Admission Test Math", "English Grammar Workbook", "Notebook Spiral 200p", "Ballpoint Pen 12-pack", "Highlighter Set", "Sticky Notes", "Drawing Pencil Set"],
    c: ["NCTB aligned options", "Bengali & English", "Stationery combo"],
    priceMin: 45,
    priceMax: 1299,
    bullets: (i) => [pick(["Verify edition year before purchase", "Cover may update yearly"], i)],
    specs: (i) => [
      `Format: ${pick(["Paperback", "Spiral", "Loose worksheets"], i)}`,
      `Language: ${pick(["Bengali", "English", "Bilingual"], i + 1)}`,
    ],
    warranty: () => "Books: no returns for change of mind; misprint swap per seller.",
  },
  "tools-hardware": {
    a: ["Total", "Ingco", "Stanley-style", "RFL Tools", "Hardware Pro"],
    b: ["Cordless Drill 12V", "Screwdriver Set 32pcs", "Measuring Tape 5m", "LED Bulb 12W 4-pack", "Extension Cord 10m", "Padlock Brass 50mm", "Paint Roller Kit", "Adjustable Wrench 10\""],
    c: ["DIY home repair", "Electrician grade", "Safety first"],
    priceMin: 199,
    priceMax: 8999,
    bullets: (i) => [pick(["Wear PPE; unplug before work", "Keep away from children"], i)],
    specs: (i) => [
      `Power: ${pick(["12V", "220V", "Manual"], i)}`,
      `Standard: ${pick(["BS / local market spec"], i + 1)}`,
    ],
    warranty: () => "Tools: warranty on motor/electronic parts as per seller.",
  },
};

function imagesForCategory(categorySlug: string, seed: number): string[] {
  const key = CAT_IMG_KEY[categorySlug] ?? "electronics";
  const pool = IMG_POOLS[key];
  const a = pick(pool, seed);
  const b = pick(pool, seed + 7);
  return a === b ? [a] : [a, b];
}

function priceFor(template: LineTemplate, globalIdx: number): { price: number; compare: number | null } {
  const span = template.priceMax - template.priceMin;
  const step = 37 + (globalIdx % 91);
  const price = template.priceMin + (globalIdx * step) % Math.max(span, 1);
  const rounded = Math.round(price / 10) * 10;
  const compareMul = 1.06 + (globalIdx % 17) / 100;
  const compare = Math.round(rounded * compareMul / 10) * 10;
  return compare > rounded ? { price: rounded, compare } : { price: rounded, compare: null };
}

/**
 * Build exactly `total` products (default 1000): evenly split across BD_BULK_VENDORS.
 */
export function buildBdBulkProductRows(total = 1000): BdBulkProductRow[] {
  const vendors = BD_BULK_VENDORS;
  const cats = BD_BULK_CATEGORIES;
  const perVendor = Math.floor(total / vendors.length);
  const remainder = total - perVendor * vendors.length;

  const rows: BdBulkProductRow[] = [];
  let globalIdx = 0;

  vendors.forEach((v, vi) => {
    const count = perVendor + (vi < remainder ? 1 : 0);
    for (let j = 0; j < count; j++) {
      const cat = cats[(globalIdx + vi * 3) % cats.length];
      const slug = `${BD_BULK_SLUG_PREFIX}${v.slug}-${String(j).padStart(4, "0")}`;
      const tmpl = TEMPLATES[cat.slug];
      const title = `${pick(tmpl.a, globalIdx)} ${pick(tmpl.b, globalIdx + vi)} ${pick(tmpl.c, globalIdx + j)}`.replace(/\s+/g, " ").trim();
      const { price, compare } = priceFor(tmpl, globalIdx);
      const desc = buildDescription({
        title,
        categoryName: cat.name,
        vendorName: v.name,
        bullets: tmpl.bullets(globalIdx),
        specs: tmpl.specs(globalIdx),
        warranty: tmpl.warranty(globalIdx),
      });
      const stock = 25 + (globalIdx % 160);
      rows.push({
        vendorSlug: v.slug,
        categorySlug: cat.slug,
        title,
        slug,
        description: desc,
        price: bdt(price),
        compareAtPrice: compare != null ? bdt(compare) : null,
        stock,
        images: imagesForCategory(cat.slug, globalIdx),
      });
      globalIdx++;
    }
  });

  return rows;
}
