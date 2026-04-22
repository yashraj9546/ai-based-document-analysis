import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDocs() {
  try {
    const docs = await prisma.document.findMany({
      select: { id: true, originalName: true, status: true }
    });
    console.log('📄 Current Documents in DB:');
    console.table(docs);
  } catch (error) {
    console.error('❌ Error checking docs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocs();
