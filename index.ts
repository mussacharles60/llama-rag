import {
  Document,
  HuggingFaceEmbedding,
  MetadataMode,
  NodeWithScore,
  Ollama,
  Settings,
  VectorStoreIndex,
  serviceContextFromDefaults,
} from 'llamaindex';

import { config } from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

config({ path: path.join(__dirname, '/.env') });

const llm = new Ollama({
  model: 'llama3.2',
  options: {
    temperature: 0.1,
  },
});
const embedModel = new HuggingFaceEmbedding({
  modelType: 'BAAI/bge-small-en-v1.5',
  quantized: false,
});

Settings.llm = llm;
Settings.embedModel = embedModel;

//
const serviceContext = serviceContextFromDefaults({
  llm,
  embedModel,
});

async function main() {
  // Load essay from abramov.txt in Node
  const path = 'node_modules/llamaindex/examples/abramov.txt';

  console.log('loading example file...');
  // const essay = await fs.readFile(path, 'utf-8');
  const essay = 'Hello world!';

  // Create Document object with essay
  // const document = new Document({ text: essay, id_: path });
  const document = new Document({ text: essay });

  // Split text and create embeddings. Store them in a VectorStoreIndex
  console.log('creating embeddings...');
  const index = await VectorStoreIndex.fromDocuments([document], {
    serviceContext,
  });

  // index.embedModel = embedModel;

  // Query the index
  console.log('querying the index...');
  const queryEngine = index.asQueryEngine();

  const response = await queryEngine.query({
    // query: 'What did the author do in college?',
    query: 'What is that even mean?',
  });

  // Output response
  console.log('response...');
  console.log(response.toString());
}

main().catch(console.error);
