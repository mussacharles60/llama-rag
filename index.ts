import {
  Document,
  HuggingFaceEmbedding,
  Ollama,
  RetrieverQueryEngine,
  Settings,
  VectorStoreIndex,
  serviceContextFromDefaults,
} from 'llamaindex';
import TextUtil, { Logcat } from './utils';

import { config } from 'dotenv';
import fs from 'node:fs/promises';
import moment from 'moment';
import path from 'node:path';
import readline from 'readline';

const stopAnim = TextUtil.animateLoading(
  `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
    'Initializing ...',
    'info'
  )}`
);

config({ path: path.join(__dirname, '/.env') });

const llm = new Ollama({
  model: 'llama3.2',
  keepAlive: '30m',
  options: {
    temperature: 0.1,
  },
} as any);
const embedModel = new HuggingFaceEmbedding({
  modelType: 'BAAI/bge-small-en-v1.5',
  quantized: false,
});

Settings.llm = llm;
Settings.embedModel = embedModel;

// llm.chat({
//   messages: [{
//     content: 'dude!',
//     role: 'user'
//   }]
// })

//
const serviceContext = serviceContextFromDefaults({
  llm,
  embedModel,
});

const waitFor = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

// const currentDate = FunctionTool.from(() => `${moment().format('LL HH:mm')}`, {
//   name: 'currentDate',
//   description: 'Use this function to get current date & time',
// });
const getCurrentDate = () => `${moment().format('LL HH:mm')}`;

const question = async (prompt: string, abort = true): Promise<string> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (answer) => {
      resolve(answer);
      if (abort) {
        rl.close();
      }
    });
  });
};

const askLLM = async (prompt: string, queryEngine: RetrieverQueryEngine) => {
  const final_prompt = `
  Respond in less words is better as much as you can.
  You are an assistant capable of performing tasks such as fetching weather data, doing calculations, and retrieving relevant documents.
  If a task is mentioned in the query, invoke the corresponding function and return the result.
  If no task is detected, just provide a text-based response.

  User: ${prompt}
  Assistant:
  `;
  const stopAnim = TextUtil.animateLoading(
    `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
      'Waiting for Myssa response ...',
      'info'
    )}`
  );
  const response = await queryEngine.query({
    query: {
      query: final_prompt,
    },
    stream: true,
  });
  stopAnim();
  process.stdout.write(`${TextUtil.logTxt('MYS:', 'info')} `);
  for await (const message of response) {
    let output = message.delta;
    if (output.includes('[currentDate]')) {
      const date = getCurrentDate();
      output = output.replace('[currentDate]', date);
    }
    process.stdout.write(output); // no newline
  }
  console.log(); // newline
};

const getPrompt = async () => {
  let prompt = await question(
    `${TextUtil.logTxt('USR:', 'info')} ${TextUtil.txt('>> ', ['fgGreen'])}`
  );
  if (prompt) {
    prompt = prompt.trim();
  }

  return prompt;
};

async function main() {
  let stopAnim = TextUtil.animateLoading(
    `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
      'Initiating Myssa Chat ...',
      'info'
    )}`
  );
  await waitFor(3000);
  stopAnim();

  // Load knowledge base
  // const path = 'node_modules/llamaindex/examples/abramov.txt';
  const file_path = path.join(__dirname, './data/knowledge.txt');

  stopAnim = TextUtil.animateLoading(
    `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
      'Loading knowledge database ...',
      'info'
    )}`
  );
  const essay = await fs.readFile(file_path, 'utf-8');
  stopAnim();

  // Create Document object with essay
  const document = new Document({ text: essay, id_: file_path });

  // Split text and create embeddings. Store them in a VectorStoreIndex
  stopAnim = TextUtil.animateLoading(
    `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
      'Creating embeddings ...',
      'info'
    )}`
  );
  const index = await VectorStoreIndex.fromDocuments([document], {
    serviceContext,
  });
  stopAnim();

  stopAnim = TextUtil.animateLoading(
    `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
      'Querying the index ...',
      'info'
    )}`
  );
  // get retriever
  const retriever = index.asRetriever();
  // Query the index
  const queryEngine = index.asQueryEngine({
    retriever,
  });
  stopAnim();

  // async function chatWithContext(query: string) {
  //   // Retrieve context from the LlamaIndex based on the query
  //   const context = await index.query(query);

  //   // Combine the context with the user query
  //   const finalPrompt = `${context}\n\nUser: ${query}\nAssistant:`;

  //   // Query LLaMA with the combined context and user input
  //   const response = await queryLLaMA(finalPrompt);

  //   return response;
  // }

  const starter = 'Hello there, how can I help?';
  Logcat.info(`${TextUtil.txt(starter, ['fgGreen'])}`);
  await loop(queryEngine);
}

const loop = async (queryEngine: RetrieverQueryEngine) => {
  const prompt = await getPrompt();
  await askLLM(prompt, queryEngine);
  // loop
  await loop(queryEngine);
};

stopAnim();

main().catch((error) => {
  Logcat.error(error);
  process.exit(1);
});
