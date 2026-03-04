const mongoose = require('mongoose');
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📡 Connected to MongoDB');

    const User = require('../models/User');

    // Check if admin exists
    let admin = await User.findOne({ email: 'admin@example.com' });

    if (admin) {
      // Update existing admin
      admin.password = 'Admin123!';
      admin.status = 'ACTIVE';
      admin.role = 'admin';
      admin.name = 'System Admin';
      admin.activatedAt = new Date();
      await admin.save();
      console.log('✅ Admin account updated');
    } else {
      // Create new admin
      admin = await User.create({
        name: 'System Admin',
        email: 'admin@example.com',
        password: 'Admin123!',
        role: 'admin',
        status: 'ACTIVE',
        activatedAt: new Date(),
        phone: '+1234567890'
      });
      console.log('✅ Admin account created');
    }

    console.log('\n📋 Admin Details:');
    console.log('Email:', admin.email);
    console.log('Password: Admin123!');
    console.log('Role:', admin.role);
    console.log('Status:', admin.status);
    console.log('\n✨ You can now login with these credentials!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
