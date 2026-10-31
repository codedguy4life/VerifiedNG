const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/index");
const User = require("../src/models/user");
const SaleItem = require("../src/models/SaleItem");

describe("For Sale marketplace", () => {
  let seller;
  let buyer;
  let sellerToken;
  let buyerToken;
  const createdIds = [];

  async function createMember(label, state, city) {
    const unique = String(Date.now()) + String(Math.floor(Math.random() * 100000));
    return User.create({
      fullName: label,
      email: "market" + unique + "@example.com",
      phone: "08" + unique.slice(-9),
      password: await bcrypt.hash("TestPass123!", 10),
      state, city,
      role: "customer",
    });
  }

  async function login(member) {
    const result = await request(app).post("/api/auth/login")
      .send({ identifier: member.email, password: "TestPass123!" });
    expect(result.statusCode).toBe(200);
    return result.body.token;
  }

  beforeAll(async () => {
    seller = await createMember("Marketplace Seller", "Lagos", "Ikeja");
    buyer = await createMember("Marketplace Buyer", "Oyo", "Ibadan");
    sellerToken = await login(seller);
    buyerToken = await login(buyer);
  });

  afterAll(async () => {
    await SaleItem.deleteMany({ _id: { $in: createdIds } });
    await User.deleteMany({ _id: { $in: [seller?._id, buyer?._id].filter(Boolean) } });
  });

  async function publish(overrides = {}) {
    const result = await request(app)
      .post("/api/sales").set("Authorization", "Bearer " + sellerToken)
      .send({
        title: "Working electric fan",
        description: "Used, tested and in good condition.",
        category: "Electronics",
        subcategory: "Other electronics",
        price: 0,
        ...overrides,
      });
    if (result.body.item?._id) createdIds.push(result.body.item._id);
    return result;
  }

  test("categories are available and real listings start empty when none are saved", async () => {
    const result = await request(app).get("/api/sales/categories")
      .set("Authorization", "Bearer " + buyerToken);
    expect(result.statusCode).toBe(200);
    expect(result.body.categories.Electronics).toContain("Other electronics");
  });

  test("seller can publish a free item and buyers can search and filter it", async () => {
    const posted = await publish({ title: "Free working electric fan" });
    expect(posted.statusCode).toBe(201);
    expect(posted.body.item.price).toBe(0);
    expect(posted.body.item.city).toBe("Ikeja");
    expect(posted.body.item.seller.fullName).toBe("Marketplace Seller");
    expect(posted.body.item.seller.email).toBeUndefined();

    const result = await request(app)
      .get("/api/sales?search=Free%20working&free=true&category=Electronics&subcategory=Other%20electronics&sort=price_low")
      .set("Authorization", "Bearer " + buyerToken);
    expect(result.statusCode).toBe(200);
    expect(result.body.items.map((item) => String(item._id))).toContain(String(posted.body.item._id));
    expect(result.body.items.every((item) => item.price === 0)).toBe(true);
    expect(result.body.items.every((item) => item.approximatePoint === undefined)).toBe(true);
  });

  test("distance filtering returns only items with opt-in approximate coordinates", async () => {
    const posted = await publish({ title: "Nearby fan for sale", price: 10000, lat: 6.6018, lng: 3.3515 });
    expect(posted.statusCode).toBe(201);
    const result = await request(app)
      .get("/api/sales?search=Nearby%20fan&distanceKm=5&lat=6.60&lng=3.35")
      .set("Authorization", "Bearer " + buyerToken);
    expect(result.statusCode).toBe(200);
    expect(result.body.items).toHaveLength(1);
    expect(result.body.items[0].distanceKm).toBeLessThan(5);
    expect(result.body.items[0].approximatePoint).toBeUndefined();

    const noLocation = await request(app)
      .get("/api/sales?distanceKm=5")
      .set("Authorization", "Bearer " + buyerToken);
    expect(noLocation.statusCode).toBe(400);
  });

  test("buyers cannot mark another person's listing sold, but the owner can", async () => {
    const posted = await publish({ title: "Compact desk lamp", price: 2000 });
    expect(posted.statusCode).toBe(201);
    const id = posted.body.item._id;
    const forbidden = await request(app)
      .patch("/api/sales/" + id + "/status")
      .set("Authorization", "Bearer " + buyerToken)
      .send({ status: "sold" });
    expect(forbidden.statusCode).toBe(404);

    const sold = await request(app)
      .patch("/api/sales/" + id + "/status")
      .set("Authorization", "Bearer " + sellerToken)
      .send({ status: "sold" });
    expect(sold.statusCode).toBe(200);

    const result = await request(app)
      .get("/api/sales?search=Compact%20desk%20lamp")
      .set("Authorization", "Bearer " + buyerToken);
    expect(result.statusCode).toBe(200);
    expect(result.body.items.map((item) => String(item._id))).not.toContain(String(id));
  });

  test("server rejects invalid categories, forged prices and public image URLs", async () => {
    const badCategory = await publish({ title: "Bad category", category: "Something invented" });
    expect(badCategory.statusCode).toBe(400);
    const badPrice = await publish({ title: "Bad price", price: -100 });
    expect(badPrice.statusCode).toBe(400);
    const badImage = await publish({ title: "Bad image", imageUrl: "https://example.com/picture.png" });
    expect(badImage.statusCode).toBe(400);
  });
});
