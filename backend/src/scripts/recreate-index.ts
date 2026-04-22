import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function recreateIndex() {
  const apiKey = process.env.PINECONE_API_KEY || '';
  const indexName = process.env.PINECONE_INDEX_NAME || 'ai-doc-analyser';

  const pc = new Pinecone({ apiKey });
  
  console.log(`🚀 Starting index recreation for: ${indexName}`);

  try {
    // 1. Delete existing index
    console.log(`🗑️ Deleting index ${indexName}...`);
    await pc.deleteIndex(indexName);
    console.log('✅ Index deleted. Waiting 10s for propagation...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 2. Create new index with 768 dimensions
    console.log(`🆕 Creating new index ${indexName} with 768 dimensions...`);
    await pc.createIndex({
      name: indexName,
      dimension: 768,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    console.log('✅ Index creation triggered. Waiting for it to become ready...');
    
    // 3. Wait for ready
    let isReady = false;
    while (!isReady) {
      const describe = await pc.describeIndex(indexName);
      if (describe.status.state === 'Ready') {
        isReady = true;
        console.log('✨ SUCCESS! New 768-dimension index is ready.');
      } else {
        console.log(`⏳ Status: ${describe.status.state}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  } catch (error: any) {
    console.error('❌ Error during recreation:', error.message);
  }
}

recreateIndex();
