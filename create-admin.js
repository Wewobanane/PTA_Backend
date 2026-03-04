const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = mongoose.model('User', new mongoose.Schema({ name: String, email: String, password: String, role: String, status: String }, { timestamps: true }));

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('admin123', salt);
  await User.create({ name: 'System Administrator', email: 'admin@test.com', password: hash, role: 'admin', status: 'ACTIVE' });
  console.log('Admin created: admin@test.com / admin123');
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
