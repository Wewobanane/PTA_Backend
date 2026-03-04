const mongoose = require('mongoose');
require('dotenv').config();

async function ensureSingleAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📡 Connected to MongoDB');

    const User = require('../models/User');

    // Delete ALL existing admin accounts
    const deletedCount = await User.deleteMany({ role: 'admin' });
    console.log(`🗑️  Deleted ${deletedCount.deletedCount} existing admin account(s)`);

    // Create the single admin account
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@example.com',
      password: 'Admin123',
      role: 'admin',
      status: 'ACTIVE',
      activatedAt: new Date(),
      phone: '+1234567890',
      isActive: true
    });

    console.log('\n✅ Single admin account created successfully!');
    console.log('\n📋 Admin Credentials (THE ONLY ONE):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    admin@example.com');
    console.log('Password: Admin123');
    console.log('Role:     admin');
    console.log('Status:   ACTIVE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ This is the only admin account in the system!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

ensureSingleAdmin();
