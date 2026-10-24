# KitchenSlip

A small desk for a restaurant kitchen. Photograph a vendor’s paper slip, check the digital draft, and confirm it. Confirming writes an order.

There is no tax, GST, or HSN on purpose. This tool is about the slip and the order, not compliance.

## What it does

1. You choose a vendor and drop a photo or PDF.
2. KitchenSlip copies names, quantities, prices, and the total onto a draft.
3. You can fix a line, cross one out, add a missed one, or pick the kitchen item.
4. Confirm writes `Order` and `OrderLine` rows. A second confirm does not duplicate.
5. If this vendor used a short name before (`Tmt` for Tomato), the next slip from them already has Tomato filled in.

A name is pre-filled only when the score is **greater than 50**. Otherwise the kitchen item stays empty and you pick it.

## Run it

You need **Node 20+** (this app will not start on Node 18.12). The local database is SQLite so you can run without Docker. The tables are the same shape you would host on Postgres later.

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Try the sample produce slip** works without a camera or API key. The first line is `Tmt` so you can pick Tomato, confirm, then run the sample again and see it remember.
- To read a real photo, put `GEMINI_API_KEY` in `.env`.

## Project shape

- `src/app` — pages and API routes
- `src/components` — the intake desk and the draft paper
- `src/lib` — reader, name matching, database
- `prisma` — vendors, kitchen items, nicknames, drafts, orders

## Demo for a reviewer

1. Open the home desk. Leave **Green Valley Produce** selected.
2. Click **Try the sample produce slip**.
3. Onion and Potato should already be attached. `Tmt` should be empty — pick **Tomato**.
4. Confirm and write order. You should land on a ticket.
5. Go home and run the sample again from the same vendor. `Tmt` should now come in as Tomato.
