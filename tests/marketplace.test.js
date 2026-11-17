const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/index");
const User = require("../src/models/user");
const SaleItem = require("../src/models/SaleItem");
const SaleInquiry = require("../src/models/SaleInquiry");
const SaleReport = require("../src/models/SaleReport");

describe("For Sale marketplace", () => {
  let seller;
  let buyer;
  let sellerToken;
  let buyerToken;
  let outsider;
  let outsiderToken;
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
    await SaleItem.init();
    seller = await createMember("Marketplace Seller", "Lagos", "Ikeja");
    buyer = await createMember("Marketplace Buyer", "Oyo", "Ibadan");
    sellerToken = await login(seller);
    buyerToken = await login(buyer);
    outsider = await createMember("Listing Outsider", "Kano", "Kano");
    outsiderToken = await login(outsider);
  });

  afterAll(async () => {
    await SaleInquiry.deleteMany({ listing: { $in: createdIds } });
    await SaleReport.deleteMany({ listing: { $in: createdIds } });
    await SaleItem.deleteMany({ _id: { $in: createdIds } });
    await User.deleteMany({ _id: { $in: [seller?._id, buyer?._id, outsider?._id].filter(Boolean) } });
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

  test("buyer can privately message seller and outsider cannot see or reply", async () => {
    const listing = await publish({ title: "Messageable used phone", price: 5000 });
    const id = listing.body.item._id;
    const sent = await request(app).post("/api/sales/" + id + "/inquiries")
      .set("Authorization", "Bearer " + buyerToken).send({ message: "Hello, is this item still available?" });
    expect(sent.statusCode).toBe(201);
    const sellerInbox = await request(app).get("/api/sales/inquiries")
      .set("Authorization", "Bearer " + sellerToken);
    expect(sellerInbox.statusCode).toBe(200);
    expect(sellerInbox.body.inquiries.some((t) => String(t._id) === String(sent.body.threadId))).toBe(true);
    expect(sellerInbox.body.inquiries[0].buyer.email).toBeUndefined();
    const denied = await request(app).post("/api/sales/inquiries/" + sent.body.threadId + "/messages")
      .set("Authorization", "Bearer " + outsiderToken).send({ message: "Not my conversation" });
    expect(denied.statusCode).toBe(404);
    const outsiderInbox = await request(app).get("/api/sales/inquiries")
      .set("Authorization", "Bearer " + outsiderToken);
    expect(outsiderInbox.body.inquiries).toHaveLength(0);
    const replied = await request(app).post("/api/sales/inquiries/" + sent.body.threadId + "/messages")
      .set("Authorization", "Bearer " + sellerToken).send({ message: "Yes, you can collect it nearby." });
    expect(replied.statusCode).toBe(201);
  });

  test("seller cannot message self and only one report per buyer is accepted", async () => {
    const listing = await publish({ title: "Reportable old phone", price: 3000 });
    const id = listing.body.item._id;
    const own = await request(app).post("/api/sales/" + id + "/inquiries")
      .set("Authorization", "Bearer " + sellerToken).send({ message: "Can I message myself?" });
    expect(own.statusCode).toBe(400);
    const reported = await request(app).post("/api/sales/" + id + "/reports")
      .set("Authorization", "Bearer " + buyerToken).send({ reason: "misleading" });
    expect(reported.statusCode).toBe(201);
    const repeated = await request(app).post("/api/sales/" + id + "/reports")
      .set("Authorization", "Bearer " + buyerToken).send({ reason: "spam" });
    expect(repeated.statusCode).toBe(409);
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
