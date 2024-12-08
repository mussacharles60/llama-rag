import { Message, Ollama } from 'ollama';
import TextUtil, { Logcat } from './utils';

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OllamaEmbeddings } from '@langchain/ollama';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { config } from 'dotenv';
import moment from 'moment';
import path from 'node:path';
import readline from 'readline';

// import fs from 'node:fs/promises';

config({ path: path.join(__dirname, '/.env') });

const App = async () => {
  const stopAnim = TextUtil.animateLoading(
    `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
      'Initializing ...',
      'info'
    )}`
  );

  const llm = new Ollama({
    host: process.env.OLLAMA_HOST || '',
  });

  const embeddingsLlm = new OllamaEmbeddings({
    baseUrl: process.env.OLLAMA_HOST || '',
    model: process.env.OLLAMA_EMBEDDINGS_MODEL || '',
  });

  // Load data from txt file
  const loader = new TextLoader(path.join(__dirname, './data/knowledge.txt'));
  const docs = await loader.load();

  // Create a text splitter
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    separators: ['\n\n'],
    chunkOverlap: 200,
  });

  // Split the text and get Document list as response
  const output = await splitter.splitDocuments(docs);

  // Create embeddings and push it to collection
  const vectorStore = await Chroma.fromDocuments(output, embeddingsLlm, {
    collectionName: 'knowledge',
    url: process.env.CHROMA_HOST || '', // Optional, will default to this value
  });

  // const file_path = path.join(__dirname, './data/knowledge.txt');
  // const knowledge_input = await fs.readFile(file_path, 'utf-8');

  // // Get instance of vector store
  // // We will connect to langchainData collection
  // const vectorStore = await Chroma.fromExistingCollection(embeddingsLlm, {
  //   collectionName: 'knowledge',
  //   url: process.env.CHROMA_HOST || '',
  // });

  // // Get retriever
  // const chromaRetriever = vectorStore.asRetriever();

  // // Create a prompt template and convert the user question into standalone question
  // const questionPrompt = PromptTemplate.fromTemplate(`
  // For following user question convert it into a standalone question
  // {userQuestion}`);

  // const simpleQuestionChain = questionPrompt
  //   .pipe(llm)
  //   .pipe(new StringOutputParser())
  //   .pipe(chromaRetriever);

  const chat_history: Message[] = [];

  // const waitFor = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

  const getCurrentDate = () => `${moment().format('LL HH:mm')}`;
  const getCurrentTime = () => `${moment().format('HH:mm')}`;

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

  const askLLM = async (prompt: string) => {
    let stopAnim = TextUtil.animateLoading(
      `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
        'Getting context ...',
        'success'
      )}`
    );

    let vector_store_response = await vectorStore.similaritySearch(prompt, 3);

    const context = vector_store_response
      .reverse()
      .map((r) => r.pageContent)
      .join('\n\n');

    stopAnim();

    Logcat.info(`CONTEXT START`);
    console.log(`${context}`);
    Logcat.info(`CONTEXT END`);

    stopAnim = TextUtil.animateLoading(
      `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
        'Waiting for Myssa to respond ...',
        'success'
      )}`
    );

    // const SYSTEM_PROMPT = `
    // You are a tech assistant capable of performing tasks such as answers questions using the provided context or general knowledge.
    // You must be as concise as possible in your response.
    // You must respond with less words as much as possible.

    // If you're unsure or if the context doesn't provide enough information, just answer it with your general knowledge.

    // Provided Context:
    // <context>
    // ${context}
    // </context>

    // User Question:
    // <question>
    // ${prompt}
    // </question>
    // `;

    const SYSTEM_PROMPT = `
    Answer the following question using the provided knowledge and the chat history
    You are a Myssa assistant capable of performing tasks such as answers questions using the provided context or general knowledge.
    If you're unsure or if the context doesn't provide enough information, just answer it with your general knowledge.
    
    Provided Context:
    <context>
    ${context}
    </context>

    User Question:
    <question>
    ${prompt}
    </question>
    `;

    chat_history.push({
      role: 'user',
      content: SYSTEM_PROMPT,
    });

    const response = await llm.chat({
      model: process.env.OLLAMA_MODEL || '',
      keep_alive: '30m',
      messages: chat_history,
      stream: true,
    });

    chat_history.pop();
    chat_history.push({
      role: 'user',
      content: prompt,
    });

    stopAnim();
    process.stdout.write(`${TextUtil.logTxt('MYS:', 'info')} `);

    const isToken = (t: string) => {
      return t.startsWith(':mys:') && t.length > 5 && t.endsWith(':');
    };

    const processToken = (token: string) => {
      switch (token) {
        case ':mys:current_date:':
          const date = getCurrentDate();
          process.stdout.write(TextUtil.logTxt(date, 'success'));
          break;
        case ':mys:current_time:':
          const time = getCurrentTime();
          process.stdout.write(TextUtil.logTxt(time, 'success'));
          break;
        default:
          break;
      }
    };

    // const decoder = new TextDecoder("utf-8");
    let buffer = ''; // Accumulated text buffer
    let full_message = '';
    let timeoutId: NodeJS.Timeout | null = null;

    const flushBuffer = () => {
      if (buffer.trim()) {
        if (isToken(buffer.trim())) {
          processToken(buffer.trim());
        } else {
          process.stdout.write(TextUtil.logTxt(buffer, 'success'));
        }
        buffer = ''; // Clear the buffer after logging
      }
      if (timeoutId) {
        clearTimeout(timeoutId); // Reset the timeout
        timeoutId = null;
      }
    };

    for await (const chat of response) {
      const textChunk = chat.message.content;
      full_message += textChunk;

      if (!textChunk) continue; // Skip if the response is empty

      buffer += textChunk;

      // If we detect a space or newline, it's a complete word, so print it
      if (/\s|[\n.,!?]/.test(textChunk)) {
        flushBuffer();
      } else {
        // Reset the 2-second timer to ensure that the buffer prints if incomplete
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(flushBuffer, 2000);
      }
    }
    // Flush any remaining buffer content after the stream ends
    flushBuffer();
    console.log(); // newline
    chat_history.push({
      role: 'assistant',
      content: full_message,
    });
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

  const main = async () => {
    let stopAnim = TextUtil.animateLoading(
      `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
        'Initiating Myssa Chat ...',
        'info'
      )}`
    );
    // await waitFor(3000);

    stopAnim();

    // Load knowledge base
    // const file_path = path.join(__dirname, './data/knowledge.txt');

    // stopAnim = TextUtil.animateLoading(
    //   `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
    //     'Loading knowledge database ...',
    //     'info'
    //   )}`
    // );
    // const knowledge_input = await fs.readFile(file_path, 'utf-8');
    // // console.dir(JSON.stringify({ system: knowledge_input }), { depth: null });
    // stopAnim();

    // stopAnim = TextUtil.animateLoading(
    //   `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
    //     'Creating embeddings ...',
    //     'info'
    //   )}`
    // );
    // const response = await llm.embed({
    //   model: process.env.OLLAMA_EMBEDDINGS_MODEL || '',
    //   keep_alive: '30m',
    //   input: knowledge_input,
    // });
    // embeddings = response.embeddings;
    // stopAnim();

    const starter = 'Hello there, how can I help?';
    Logcat.info(`${TextUtil.txt(starter, ['fgGreen'])}`);

    chat_history.push({
      role: 'assistant',
      content: starter,
    });

    await loop();
  };

  const loop = async () => {
    const prompt = await getPrompt();
    await askLLM(prompt);
    // loop
    await loop();
  };

  stopAnim();

  main().catch((error) => {
    Logcat.error(error);
    process.exit(1);
  });
};

App();

// const newTextQaPrompt = ({ context, query }) => {
//   return `Context information is below.
// ---------------------
// ${context}
// ---------------------
// You are an experienced tutor for the Machine course.
// Answer all questions to the best of your ability based on the above context.
// If the question is not clear, ask for clarification.
// If the context is not relevant, ignore it and answer the question as best as you can but inform the user that the context provided was not relevant to the question.

// If the question is a general greeting, respond with a friendly greeting.

// Provide friendly, informative answers using markdown format, ensuring clarity and engagement.
// Query: ${query}
// Answer:`;
// };
// const responseSynthesizer = new ResponseSynthesizer({
//   responseBuilder: new CompactAndRefine(undefined, newTextQaPrompt),
// });
// async function answer(user_query) {
//   const queryEngine = index.asQueryEngine({
//     retriever: retriever,
//     nodePostprocessors: [Reranker],
//     responseSynthesizer: responseSynthesizer,
//   });
//   const query = user_query;
//   const results = await queryEngine.query({
//     query,
//   });
//   return results;
// }
