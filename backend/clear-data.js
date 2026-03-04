/**
 * Clear all data from the database EXCEPT users and roles tables
 * Run with: node clear-data.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllData() {
  try {
    console.log('Starting data deletion...\n');

    // Delete in order of dependency (child tables first)
    
    console.log('Deleting lock_histories...');
    await prisma.lockHistory.deleteMany({});
    
    console.log('Deleting record_locks...');
    await prisma.recordLock.deleteMany({});
    
    console.log('Deleting notifications...');
    await prisma.notification.deleteMany({});
    
    console.log('Deleting news...');
    await prisma.news.deleteMany({});
    
    console.log('Deleting unlock_requests...');
    await prisma.unlockRequest.deleteMany({});
    
    console.log('Deleting audit_logs...');
    await prisma.auditLog.deleteMany({});
    
    console.log('Deleting search_logs...');
    await prisma.searchLog.deleteMany({});
    
    console.log('Deleting ocr_batches...');
    await prisma.ocrBatch.deleteMany({});
    
    console.log('Deleting negative_records...');
    await prisma.negativeRecord.deleteMany({});
    
    console.log('Deleting credit_transactions...');
    await prisma.creditTransaction.deleteMany({});
    
    console.log('Deleting sub_domains...');
    await prisma.subDomain.deleteMany({});
    
    console.log('Deleting clients...');
    await prisma.client.deleteMany({});

    console.log('\n✅ All data cleared successfully!');
    console.log('✅ Users and Roles tables remain untouched.');

  } catch (error) {
    console.error('❌ Error during data deletion:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Confirm before deleting
async function main() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(
    '⚠️  WARNING: This will delete ALL data except users and roles. Continue? (yes/no): ',
    async (answer) => {
      rl.close();
      
      if (answer.toLowerCase() === 'yes') {
        await clearAllData();
      } else {
        console.log('Cancelled.');
        process.exit(0);
      }
    }
  );
}

main();
