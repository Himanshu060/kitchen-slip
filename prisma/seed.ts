import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const vendors = [
  { name: "Green Valley Produce" },
  { name: "Metro Oils" },
  { name: "City Dairy" },
  { name: "Kitchen counter" },
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
  { name: "Garlic Naan", unit: "pcs", typicalPrice: 45 },
  { name: "Butter Naan", unit: "pcs", typicalPrice: 40 },
  { name: "Plain Naan", unit: "pcs", typicalPrice: 30 },
  { name: "Tandoori Roti", unit: "pcs", typicalPrice: 18 },
  { name: "Roti", unit: "pcs", typicalPrice: 12 },
  { name: "Laccha Paratha", unit: "pcs", typicalPrice: 40 },
  { name: "Aloo Paratha", unit: "pcs", typicalPrice: 55 },
  { name: "Roti Sabji", unit: "pcs", typicalPrice: 95 },
  { name: "Paneer Sabji", unit: "pcs", typicalPrice: 180 },
  { name: "Dal Tadka", unit: "pcs", typicalPrice: 140 },
  { name: "Dal Makhani", unit: "pcs", typicalPrice: 180 },
  { name: "Jeera Rice", unit: "pcs", typicalPrice: 110 },
  { name: "Veg Biryani", unit: "pcs", typicalPrice: 190 },
  { name: "Chicken Biryani", unit: "pcs", typicalPrice: 240 },
  { name: "Butter Chicken", unit: "pcs", typicalPrice: 280 },
  { name: "Shahi Paneer", unit: "pcs", typicalPrice: 220 },
  { name: "Palak Paneer", unit: "pcs", typicalPrice: 210 },
  { name: "Kadhai Paneer", unit: "pcs", typicalPrice: 220 },
  { name: "Chole Bhature", unit: "pcs", typicalPrice: 130 },
  { name: "Pav Bhaji", unit: "pcs", typicalPrice: 120 },
  { name: "Vada Pav", unit: "pcs", typicalPrice: 40 },
  { name: "Samosa", unit: "pcs", typicalPrice: 25 },
  { name: "Papad", unit: "pcs", typicalPrice: 20 },
  { name: "Masala Papad", unit: "pcs", typicalPrice: 45 },
  { name: "Green Salad", unit: "pcs", typicalPrice: 70 },
  { name: "Raita", unit: "pcs", typicalPrice: 50 },
  { name: "Margherita Pizza", unit: "pcs", typicalPrice: 249 },
  { name: "Veg Pizza", unit: "pcs", typicalPrice: 279 },
  { name: "Paneer Pizza", unit: "pcs", typicalPrice: 299 },
  { name: "Veg Burger", unit: "pcs", typicalPrice: 99 },
  { name: "Chicken Burger", unit: "pcs", typicalPrice: 149 },
  { name: "French Fries", unit: "pcs", typicalPrice: 90 },
  { name: "Veg Spring Roll", unit: "pcs", typicalPrice: 110 },
  { name: "Veg Manchurian", unit: "pcs", typicalPrice: 160 },
  { name: "Chilli Paneer", unit: "pcs", typicalPrice: 190 },
  { name: "Hakka Noodles", unit: "pcs", typicalPrice: 150 },
  { name: "Veg Fried Rice", unit: "pcs", typicalPrice: 140 },
  { name: "Paneer Tikka", unit: "pcs", typicalPrice: 220 },
  { name: "Chicken Tikka", unit: "pcs", typicalPrice: 260 },
  { name: "Gulab Jamun", unit: "pcs", typicalPrice: 70 },
  { name: "Rasmalai", unit: "pcs", typicalPrice: 80 },
  { name: "Masala Chai", unit: "pcs", typicalPrice: 30 },
  { name: "Sweet Lassi", unit: "pcs", typicalPrice: 60 },
  { name: "Fresh Lime Soda", unit: "pcs", typicalPrice: 50 },
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

  const kitchen = await prisma.vendor.findFirst({ where: { name: "Kitchen counter" } });
  const rotiSabji = await prisma.kitchenItem.findUnique({ where: { name: "Roti Sabji" } });
  if (kitchen && rotiSabji) {
    await prisma.vendorNickname.upsert({
      where: {
        rawName_vendorId: {
          rawName: "Roti Sabji [4 Roti 1 Sabji Fix]",
          vendorId: kitchen.id,
        },
      },
      create: {
        rawName: "Roti Sabji [4 Roti 1 Sabji Fix]",
        vendorId: kitchen.id,
        kitchenItemId: rotiSabji.id,
      },
      update: { kitchenItemId: rotiSabji.id },
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
