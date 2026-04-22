import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkIndex() {
  const apiKey = process.env.PINECONE_API_KEY || '';
  const indexName = process.env.PINECONE_INDEX_NAME || 'docreader';

  const pc = new Pinecone({ apiKey });
  
  try {
    const describe = await pc.describeIndex(indexName);
    console.log(`\n--- Index Info: ${indexName} ---`);
    console.log(`Dimension: ${describe.dimension}`);
    console.log(`Metric: ${describe.metric}`);
    console.log(`Status: ${describe.status.state}`);
    
    if (describe.dimension !== 768) {
      console.log(`\n⚠️ MISMATCH DETECTED: Index is ${describe.dimension} but we need 768.`);
    } else {
      console.log(`\n✅ Dimensions match (768).`);
    }
  } catch (error: any) {
    console.error('❌ Error checking index:', error.message);
  }
}

checkIndex();
