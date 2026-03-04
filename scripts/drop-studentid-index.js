require('dotenv').config();
const mongoose = require('mongoose');

async function dropStudentIdIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('students');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key);
    });

    // Drop the studentId index if it exists
    try {
      await collection.dropIndex('studentId_1');
      console.log('\n✅ Successfully dropped studentId_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('\n⚠️  Index studentId_1 does not exist (already removed)');
      } else {
        throw error;
      }
    }

    // Show remaining indexes
    const remainingIndexes = await collection.indexes();
    console.log('\n📋 Remaining indexes:');
    remainingIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

dropStudentIdIndex();
