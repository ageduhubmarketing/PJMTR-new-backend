// seedAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Admin = require('./Models/Admin');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = 'editor@pjmtr.in';
    const password = 'Hagdu@123456789';

    // 🗑️ Delete old admin (specific one)
   await Admin.deleteMany({
  email: { $regex: '^admin@example.com$', $options: 'i' }
});

    // 🔐 Hash new password
    const hashed = await bcrypt.hash(password, 10);

    // ✅ Create new admin
    await Admin.create({
      email,
      password: hashed,
    });

    console.log('✅ New admin created successfully');

    process.exit();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
