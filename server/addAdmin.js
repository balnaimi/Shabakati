import { dbFunctions } from './database.js';
import { hashPassword } from './auth.js';

function addAdmin() {
  try {
    const username = process.argv[2] || 'borashidadmin';
    const password = process.argv[3] || process.env.ADMIN_PASSWORD;
    
    if (!password) {
      console.log('❌ Password is required!');
      console.log('Usage: node addAdmin.js [username] [password]');
      console.log('   or: ADMIN_PASSWORD=yourpassword node addAdmin.js [username]');
      process.exit(1);
    }
    
    // Check if admin already exists
    const existingAdmin = dbFunctions.getAdminByUsername(username);
    if (existingAdmin) {
      console.log(`❌ Admin "${username}" already exists!`);
      process.exit(1);
    }
    
    if (password.length < 3) {
      console.log('❌ Password must be at least 3 characters long');
      process.exit(1);
    }
    
    // Hash password and create admin
    const passwordHash = hashPassword(password);
    const admin = dbFunctions.createAdmin(username, passwordHash);
    
    console.log(`✅ Admin "${username}" created successfully!`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Created at: ${admin.created_at}`);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
}

addAdmin();
