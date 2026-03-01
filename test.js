const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://codedguy4life:Codedguy12@verifiedng.ngjq2tq.mongodb.net/?appName=VerifiedNG";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  family: 4
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB!");
  } catch (error) {
    console.log("❌ Failed:", error.message);
  } finally {
    await client.close();
  }
}

run();