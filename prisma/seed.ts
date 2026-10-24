import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const vendors = [
  { name: "Green Valley Produce" },
  { name: "Metro Oils" },
  { name: "City Dairy" },
];

const items = [
  { name: "Tomato", unit: "kg", typicalPrice: 40 },
  { name: "Onion", unit: "kg", typicalPrice: 25 },
  { name: "Potato", unit: "kg", typicalPrice: 22 },
  { name: "Green Chilli", unit: "kg", typicalPrice: 80 },
  { name: "Lemon", unit: "kg", typicalPrice: 60 },
  { name: "Ginger", unit: "kg", typicalPrice: 120 },
  { name: "Garlic", unit: "kg", typicalPrice: 140 },
  { name: "Wheat Flour", unit: "kg", typicalPrice: 42 },
  { name: "Rice", unit: "kg", typicalPrice: 55 },
  { name: "Basmati Rice", unit: "kg", typicalPrice: 95 },
  { name: "Sugar", unit: "kg", typicalPrice: 46 },
  { name: "Salt", unit: "kg", typicalPrice: 18 },
  { name: "Cooking Oil", unit: "ltr", typicalPrice: 130 },
  { name: "Butter", unit: "kg", typicalPrice: 480 },
  { name: "Milk", unit: "ltr", typicalPrice: 62 },
  { name: "Curd", unit: "kg", typicalPrice: 70 },
  { name: "Paneer", unit: "kg", typicalPrice: 320 },
  { name: "Chicken", unit: "kg", typicalPrice: 220 },
  { name: "Eggs", unit: "pcs", typicalPrice: 7 },
  { name: "Tea Leaves", unit: "kg", typicalPrice: 280 },
  { name: "Coffee", unit: "kg", typicalPrice: 450 },
  { name: "Cumin Seeds", unit: "kg", typicalPrice: 360 },
  { name: "Turmeric", unit: "kg", typicalPrice: 190 },
  { name: "Red Chilli Powder", unit: "kg", typicalPrice: 240 },
  { name: "Black Pepper", unit: "kg", typicalPrice: 620 },
];

async function main() {
  for (const vendor of vendors) {
    const existing = await prisma.vendor.findFirst({ where: { name: vendor.name } });
    if (!existing) await prisma.vendor.create({ data: vendor });
  }

  for (const item of items) {
    await prisma.kitchenItem.upsert({
      where: { name: item.name },
      create: item,
      update: { unit: item.unit, typicalPrice: item.typicalPrice },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
