import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixStatus() {
  try {
    console.log('🔍 Checking for documents stuck in processing...');
    const result = await prisma.document.updateMany({
      where: { status: 'processing' },
      data: { status: 'ready' }
    });
    
    console.log(`✅ Fixed ${result.count} documents. They are now set to "ready".`);
  } catch (error) {
    console.error('❌ Failed to fix status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixStatus();
