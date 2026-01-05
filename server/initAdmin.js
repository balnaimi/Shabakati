import { dbFunctions } from './database.js';
import { hashPassword } from './auth.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('=== إنشاء مسؤول جديد ===\n');
    
    // Check if admin already exists
    const existingAdmin = dbFunctions.getAdminByUsername('admin');
    if (existingAdmin) {
      console.log('المسؤول موجود بالفعل في قاعدة البيانات.');
      const overwrite = await question('هل تريد تغيير كلمة المرور؟ (y/n): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('تم الإلغاء.');
        rl.close();
        return;
      }
    }
    
    const username = await question('أدخل اسم المستخدم (افتراضي: admin): ') || 'admin';
    
    // Check if username already exists (except if it's the same admin we're updating)
    const checkAdmin = dbFunctions.getAdminByUsername(username);
    if (checkAdmin && (!existingAdmin || checkAdmin.id !== existingAdmin.id)) {
      console.log(`اسم المستخدم "${username}" موجود بالفعل.`);
      rl.close();
      return;
    }
    
    const password = await question('أدخل كلمة المرور: ');
    if (!password || password.length < 3) {
      console.log('كلمة المرور يجب أن تكون 3 أحرف على الأقل.');
      rl.close();
      return;
    }
    
    const passwordHash = hashPassword(password);
    
    if (existingAdmin) {
      // Update existing admin (would need update function in database.js)
      console.log('تحديث المسؤول...');
      // For now, we'll create a new one (delete old and create new)
      // In production, you'd want an update function
      console.log('يرجى استخدام دالة تحديث في database.js لتحديث المسؤول الموجود.');
      rl.close();
      return;
    } else {
      // Create new admin
      const admin = dbFunctions.createAdmin(username, passwordHash);
      console.log(`\n✅ تم إنشاء المسؤول بنجاح!`);
      console.log(`اسم المستخدم: ${admin.username}`);
      console.log(`تاريخ الإنشاء: ${admin.created_at}`);
    }
    
  } catch (error) {
    console.error('حدث خطأ:', error);
  } finally {
    rl.close();
  }
}

createAdmin();

