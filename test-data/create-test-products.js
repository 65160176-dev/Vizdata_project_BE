// Script สำหรับสร้างข้อมูล Product ทดสอบ
// รันด้วย: node test-data/create-test-products.js

const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017'; // แก้ไข URL ตามของคุณ
const dbName = 'vizdata'; // แก้ไขชื่อ database ตามของคุณ

async function createTestProducts() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    const productsCollection = db.collection('product'); // ชื่อ collection ตาม schema
    
    // หา user คนแรกเพื่อใช้เป็น seller
    const user = await usersCollection.findOne({});
    
    if (!user) {
      console.error('No user found! Please create a user first.');
      return;
    }
    
    console.log('Found user:', user.username || user.email);
    
    // สร้าง products ตัวอย่าง
    const products = [
      {
        userId: user._id,
        name: 'iPhone 15 Pro',
        image: 'https://via.placeholder.com/400x400/007bff/ffffff?text=iPhone+15',
        price: 39900,
        stock: 10,
        commission: 5,
        weight: 0.5,
        shippingCost: '50',
        description: 'Latest iPhone with advanced features',
        category: 'Electronics',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: user._id,
        name: 'Samsung Galaxy S24',
        image: 'https://via.placeholder.com/400x400/28a745/ffffff?text=Galaxy+S24',
        price: 32900,
        stock: 15,
        commission: 5,
        weight: 0.4,
        shippingCost: '50',
        description: 'Premium Samsung smartphone',
        category: 'Electronics',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: user._id,
        name: 'MacBook Pro 16"',
        image: 'https://via.placeholder.com/400x400/dc3545/ffffff?text=MacBook+Pro',
        price: 89900,
        stock: 5,
        commission: 10,
        weight: 2.0,
        shippingCost: '100',
        description: 'Professional laptop for creators',
        category: 'Computers',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: user._id,
        name: 'Sony WH-1000XM5',
        image: 'https://via.placeholder.com/400x400/ffc107/000000?text=Sony+XM5',
        price: 12900,
        stock: 20,
        commission: 3,
        weight: 0.3,
        shippingCost: 'Free',
        description: 'Premium noise-cancelling headphones',
        category: 'Audio',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: user._id,
        name: 'Apple Watch Series 9',
        image: 'https://via.placeholder.com/400x400/6f42c1/ffffff?text=Watch+S9',
        price: 15900,
        stock: 12,
        commission: 4,
        weight: 0.1,
        shippingCost: 'Free',
        description: 'Latest smartwatch from Apple',
        category: 'Wearables',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const result = await productsCollection.insertMany(products);
    console.log(`Created ${result.insertedCount} products`);
    console.log('Product IDs:', Object.values(result.insertedIds));
    
    // แสดง products ที่สร้าง
    const createdProducts = await productsCollection
      .find({ _id: { $in: Object.values(result.insertedIds) } })
      .toArray();
    
    console.log('\nCreated products:');
    createdProducts.forEach(p => {
      console.log(`- ${p.name}: ฿${p.price} (ID: ${p._id})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createTestProducts();
