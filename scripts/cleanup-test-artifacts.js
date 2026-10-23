const { connectMongo } = require('../db/mongo/connection');
const { Product } = require('../db/mongo/models');

async function clean() {
  await connectMongo();
  const testArtifacts = await Product.find({
    published: 1,
    $or: [
      { name: /Test Inverter/i },
      { name: /Negative Price/i },
      { name: /Duplicate SKU/i },
      { sku: /^DP-TEST/i },
      { sku: /^DP-NEG/i },
      { sku: /^DP-\d{5}$/i }
    ]
  }).lean();

  console.log(`Found ${testArtifacts.length} test artifacts created during test runs:`);
  testArtifacts.forEach(a => console.log(` - ID: ${a.id}, SKU: ${a.sku}, Name: ${a.name}, Slug: ${a.slug}`));

  if (testArtifacts.length > 0) {
    const ids = testArtifacts.map(a => a._id);
    const del = await Product.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted ${del.deletedCount} test artifact products.`);
  }

  const activeCount = await Product.countDocuments({ published: 1 });
  console.log(`Current active published=1 product count: ${activeCount}`);
  process.exit(0);
}

clean().catch(err => {
  console.error(err);
  process.exit(1);
});
