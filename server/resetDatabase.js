import db from './database.js';
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

async function resetDatabase() {
  try {
    console.log('\n=== Reset Database ===\n');
    console.log('⚠️  WARNING: All data will be deleted from the database including:');
    console.log('   - Hosts');
    console.log('   - Networks');
    console.log('   - Tags');
    console.log('   - Groups');
    console.log('   - Favorites');
    console.log('   - Admins');
    console.log('   - Host status history');
    console.log('   - Host-tag links\n');
    
    const confirm = await question('Are you absolutely sure you want to delete all data? (type "yes" to confirm): ');
    
    if (confirm.trim().toLowerCase() !== 'yes') {
      console.log('\nCancelled. No data was deleted.');
      rl.close();
      return;
    }

    console.log('\nDeleting all data...\n');

    // Start transaction
    db.exec('BEGIN TRANSACTION');

    try {
      // Delete all data in correct order (respecting foreign keys)
      // 1. Delete host_tags (junction table) - must be deleted first
      const hostTagsResult = db.exec('DELETE FROM host_tags');
      console.log('✓ Deleted host-tag links (host_tags)');

      // 2. Delete host_status_history
      const historyResult = db.exec('DELETE FROM host_status_history');
      console.log('✓ Deleted host status history (host_status_history)');

      // 3. Delete favorites (references hosts)
      const favoritesResult = db.exec('DELETE FROM favorites');
      console.log('✓ Deleted favorites');

      // 4. Delete hosts
      const hostsResult = db.exec('DELETE FROM hosts');
      console.log('✓ Deleted hosts');

      // 5. Delete networks
      const networksResult = db.exec('DELETE FROM networks');
      console.log('✓ Deleted networks');

      // 6. Delete tags - now safe to delete since host_tags is already deleted
      const tagsResult = db.exec('DELETE FROM tags');
      console.log('✓ Deleted tags');

      // 7. Delete groups
      const groupsResult = db.exec('DELETE FROM groups');
      console.log('✓ Deleted groups');

      // 8. Delete admins - this is the key difference from the API endpoint
      const adminsResult = db.exec('DELETE FROM admins');
      console.log('✓ Deleted admins');

      // Commit transaction
      db.exec('COMMIT');

      console.log('\n✅ All data deleted successfully!');
      console.log('\nThe application is now in first-run state.');
      console.log('You can now create a new admin through the web interface.\n');
      
    } catch (error) {
      // Rollback on error
      db.exec('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('\n❌ Error occurred while deleting data:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

resetDatabase();
