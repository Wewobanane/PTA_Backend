const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE CONNECTION SUCCESSFUL');
    console.log('='.repeat(60));
    console.log('🗄️  Database:', conn.connection.name);
    console.log('🌐 Host:', conn.connection.host);
    console.log('📊 Ready State:', conn.connection.readyState === 1 ? 'Connected' : 'Unknown');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ DATABASE CONNECTION FAILED');
    console.error('='.repeat(60));
    console.error('🔴 Error:', error.message);
    console.error('📋 Details:', error);
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
};

module.exports = connectDB;
