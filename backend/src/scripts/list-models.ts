import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    return;
  }

  try {
    console.log('🔍 Fetching available models...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data: any = await response.json();
    
    if (data.error) {
      console.error('❌ API Error:', data.error.message);
      return;
    }

    if (!data.models) {
      console.log('❓ No models found in response:', data);
      return;
    }

    const embeddingModels = data.models.filter((m: any) => 
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes('embedContent')
    );

    console.log('\n✅ Available Embedding Models:');
    embeddingModels.forEach((m: any) => {
      console.log(`- ${m.name} (${m.displayName})`);
    });

  } catch (error: any) {
    console.error('❌ Failed to list models:', error.message);
  }
}

listModels();
