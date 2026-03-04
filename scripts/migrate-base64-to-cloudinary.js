/**
 * Migration Script: แปลง base64 images → Cloudinary URLs
 * 
 * ค้นหา documents ใน MongoDB ที่มี image field เป็น base64 (data:...)
 * แล้วอัปโหลดไป Cloudinary → อัปเดต document ด้วย Cloudinary URL
 * 
 * Collections ที่ตรวจสอบ:
 * - products (image field)
 * - orders (item[].image field)
 * - users (avatar field)
 * - sellers (avatar field)
 * - notifications (image field)
 * 
 * Usage:
 *   cd vizdata_project_be
 *   node scripts/migrate-base64-to-cloudinary.js
 * 
 * หรือ dry-run (ดูจำนวนที่ต้องแปลง โดยไม่แก้อะไร):
 *   node scripts/migrate-base64-to-cloudinary.js --dry-run
 */

const { MongoClient } = require('mongodb');
const cloudinary = require('cloudinary').v2;

// ─── Config ─────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://65160307_db_user:U4q8UXTc8qIqQdtn@vizdata.ndor5hh.mongodb.net/Vizdata?appName=Vizdata';
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dc4nt8qyq';
const API_KEY = process.env.CLOUDINARY_API_KEY || '118259156884916';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || 'nSHi1xS8N4wjbuQIGhmQBphz2KY';
const DRY_RUN = process.argv.includes('--dry-run');

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

// ─── Helpers ────────────────────────────────────────────
function isBase64(str) {
  return typeof str === 'string' && str.startsWith('data:');
}

async function uploadBase64ToCloudinary(base64Str, folder) {
  try {
    const result = await cloudinary.uploader.upload(base64Str, {
      folder,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (err) {
    console.error(`  ❌ Cloudinary upload failed: ${err.message}`);
    return null;
  }
}

// ─── Migration Functions ────────────────────────────────

async function migrateProducts(db) {
  const col = db.collection('products');
  const docs = await col.find({ image: { $regex: /^data:/ } }).toArray();
  console.log(`\n📦 Products with base64 images: ${docs.length}`);
  if (DRY_RUN || docs.length === 0) return docs.length;

  let success = 0;
  for (const doc of docs) {
    const url = await uploadBase64ToCloudinary(doc.image, 'vizdata_products');
    if (url) {
      await col.updateOne({ _id: doc._id }, { $set: { image: url } });
      console.log(`  ✅ Product ${doc._id} (${doc.name || 'unnamed'}) → ${url}`);
      success++;
    }
  }
  console.log(`  Migrated: ${success}/${docs.length}`);
  return docs.length;
}

async function migrateOrders(db) {
  const col = db.collection('orders');
  // ค้นหา orders ที่มี item.image เป็น base64
  const docs = await col.find({ 'item.image': { $regex: /^data:/ } }).toArray();
  console.log(`\n🛒 Orders with base64 item images: ${docs.length}`);
  if (DRY_RUN || docs.length === 0) return docs.length;

  let success = 0;
  for (const doc of docs) {
    let updated = false;
    const items = doc.item || [];
    for (let i = 0; i < items.length; i++) {
      if (isBase64(items[i].image)) {
        const url = await uploadBase64ToCloudinary(items[i].image, 'vizdata_order_items');
        if (url) {
          items[i].image = url;
          updated = true;
        } else {
          // ถ้าอัปโหลดไม่ได้ ให้ล้างเป็นค่าว่าง
          items[i].image = '';
          updated = true;
        }
      }
    }
    if (updated) {
      await col.updateOne({ _id: doc._id }, { $set: { item: items } });
      console.log(`  ✅ Order ${doc.orderId || doc._id} — items updated`);
      success++;
    }
  }
  console.log(`  Migrated: ${success}/${docs.length}`);
  return docs.length;
}

async function migrateUsers(db) {
  const col = db.collection('users');
  const docs = await col.find({ avatar: { $regex: /^data:/ } }).toArray();
  console.log(`\n👤 Users with base64 avatars: ${docs.length}`);
  if (DRY_RUN || docs.length === 0) return docs.length;

  let success = 0;
  for (const doc of docs) {
    const url = await uploadBase64ToCloudinary(doc.avatar, 'vizdata_avatars');
    if (url) {
      await col.updateOne({ _id: doc._id }, { $set: { avatar: url } });
      console.log(`  ✅ User ${doc._id} (${doc.username || doc.email || 'unknown'}) → ${url}`);
      success++;
    }
  }
  console.log(`  Migrated: ${success}/${docs.length}`);
  return docs.length;
}

async function migrateSellers(db) {
  const col = db.collection('sellers');
  const docs = await col.find({ avatar: { $regex: /^data:/ } }).toArray();
  console.log(`\n🏪 Sellers with base64 avatars: ${docs.length}`);
  if (DRY_RUN || docs.length === 0) return docs.length;

  let success = 0;
  for (const doc of docs) {
    const url = await uploadBase64ToCloudinary(doc.avatar, 'vizdata_avatars');
    if (url) {
      await col.updateOne({ _id: doc._id }, { $set: { avatar: url } });
      console.log(`  ✅ Seller ${doc._id} (${doc.display_name || doc.name || 'unknown'}) → ${url}`);
      success++;
    }
  }
  console.log(`  Migrated: ${success}/${docs.length}`);
  return docs.length;
}

async function migrateNotifications(db) {
  const col = db.collection('notifications');
  const docs = await col.find({ image: { $regex: /^data:/ } }).toArray();
  console.log(`\n🔔 Notifications with base64 images: ${docs.length}`);
  if (DRY_RUN || docs.length === 0) return docs.length;

  let success = 0;
  for (const doc of docs) {
    // notifications เก่า ลบ base64 ออกเฉยๆ (ไม่คุ้มอัปโหลด)
    await col.updateOne({ _id: doc._id }, { $set: { image: '' } });
    success++;
  }
  console.log(`  Cleared: ${success}/${docs.length}`);
  return docs.length;
}

// ─── Main ───────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log(' 🔄 Base64 → Cloudinary Migration Script');
  console.log(`    Mode: ${DRY_RUN ? '🔍 DRY RUN (ไม่แก้ไขข้อมูล)' : '⚡ LIVE (แก้ไขข้อมูลจริง)'}`);
  console.log('═══════════════════════════════════════════════════');

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    const db = client.db();

    const counts = {
      products: await migrateProducts(db),
      orders: await migrateOrders(db),
      users: await migrateUsers(db),
      sellers: await migrateSellers(db),
      notifications: await migrateNotifications(db),
    };

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log('\n═══════════════════════════════════════════════════');
    console.log(` 📊 Summary: ${total} documents with base64 found`);
    Object.entries(counts).forEach(([k, v]) => {
      if (v > 0) console.log(`    ${k}: ${v}`);
    });
    if (DRY_RUN && total > 0) {
      console.log('\n 💡 Run without --dry-run to migrate them:');
      console.log('    node scripts/migrate-base64-to-cloudinary.js');
    }
    console.log('═══════════════════════════════════════════════════');
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main().catch(err => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
