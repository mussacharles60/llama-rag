import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OllamaEmbeddings } from '@langchain/ollama';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.join(__dirname, '../.env') });

// Get an instance of ollama embeddings
const ollamaEmbeddings = new OllamaEmbeddings({
  baseUrl: process.env.OLLAMA_HOST || '',
  model: process.env.OLLAMA_EMBEDDINGS_MODEL || '',
});

const main = async () => {
  // Load data from txt file
  const loader = new TextLoader(path.join(__dirname, './knowledge.txt'));
  const docs = await loader.load();

  // Create a text splitter
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    separators: ['\n\n', '\n', ' ', ''],
    chunkOverlap: 200,
  });

  // Split the text and get Document list as response
  const output = await splitter.splitDocuments(docs);

  // Create embeddings and push it to collection
  const vectorStore = await Chroma.fromDocuments(output, ollamaEmbeddings, {
    collectionName: 'knowledge',
    url: process.env.CHROMA_HOST || '', // Optional, will default to this value
  });

  // Search and see if we are able to get results from similarity search

  // Search for the most similar document
  let vectorStoreResponse = await vectorStore.similaritySearch(
    'where is businessos',
    1
  );

  console.log(
    'Where is businessos: Printing docs after similarity search --> ',
    vectorStoreResponse
  );

  vectorStoreResponse = await vectorStore.similaritySearch(
    'Whats your name',
    1
  );
  console.log(
    'Whats your name: Printing docs after similarity search --> ',
    vectorStoreResponse
  );
};

main().catch(console.error);
