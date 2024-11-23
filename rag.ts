import { Message, Ollama } from 'ollama';
import TextUtil, { Logcat } from './utils';

import { config } from 'dotenv';
import fs from 'node:fs/promises';
import moment from 'moment';
import path from 'node:path';
import readline from 'readline';

config({ path: path.join(__dirname, '/.env') });

const llm = new Ollama({
  host: process.env.OLLAMA_LAN_HOST || '',
});

let embeddings: number[][] = [];
const chat_history: Message[] = [];

const stopAnim = TextUtil.animateLoading(
  `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
    'Initializing ...',
    'info'
  )}`
);

const waitFor = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

// const currentDate = FunctionTool.from(() => `${moment().format('LL HH:mm')}`, {
//   name: 'currentDate',
//   description: 'Use this function to get current date & time',
// });
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
  const stopAnim = TextUtil.animateLoading(
    `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
      'Waiting for Myssa response ...',
      'success'
    )}`
  );

  const SYSTEM_PROMPT = `
  You are a helpful AI assistant that answers questions using only the provided context. 
  For each answer, include the following:
  1. Directly quote the relevant text as evidence for your answer.
  2. Provide the source of the quoted evidence, including metadata such as the page number or document ID.
  3. Be as concise as possible in your response.
  
  If you're unsure or if the context doesn't provide enough information, just say "I don't know."
  
  Context:
  `;

  chat_history.push({
    role: 'user',
    content: prompt,
  });

  const response = await llm.chat({
    model: process.env.OLLAMA_MODEL || '',
    keep_alive: '30m',
    messages: chat_history,
    stream: true,
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
  let buffer = "";       // Accumulated text buffer
  let full_message = "";
  let timeoutId: NodeJS.Timeout | null = null;

  const flushBuffer = () => {
    if (buffer.trim()) {
      if (isToken(buffer.trim())) {
        processToken(buffer.trim());
      } else {
        process.stdout.write(TextUtil.logTxt(buffer, 'success'));
      }
      buffer = ""; // Clear the buffer after logging
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
  const knowledge_input = await fs.readFile(file_path, 'utf-8');
  // console.dir(JSON.stringify({ system: knowledge_input }), { depth: null });
  stopAnim();

  stopAnim = TextUtil.animateLoading(
    `${TextUtil.logTxt('MYS:', 'info')} ${TextUtil.logTxt(
      'Creating embeddings ...',
      'info'
    )}`
  );
  const response = await llm.embed({
    model: process.env.OLLAMA_EMBEDDINGS_MODEL || '',
    keep_alive: '30m',
    input: knowledge_input,
  });
  embeddings = response.embeddings;
  stopAnim();

  /*
  # Modelfile generated by "ollama show"
  # To build a new Modelfile based on this, replace FROM with:
  # FROM llama3.2:3b
  
  FROM E:\\AI\\ollama\\models\\blobs\\sha256-dde5aa3fc5ffc17176b5e8bdc82f587b24b2678c6c66101bf7da77af9f7ccdff
  TEMPLATE """
  <|start_header_id|>system<|end_header_id|>
  
  Cutting Knowledge Date: December 2023
  
  {{ if .System }}{{ .System }}
  {{- end }}
  {{- if .Tools }}
  When you receive a tool call response, use the output to format an answer to the original user question.
  
  You are a helpful assistant with tool calling capabilities.
  {{- end }}<|eot_id|>
  {{- range $i, $_ := .Messages }}
  {{- $last := eq (len (slice $.Messages $i)) 1 }}
  {{- if eq .Role "user" }}<|start_header_id|>user<|end_header_id|>
  {{- if and $.Tools $last }}
  
  Given the following functions, please respond with a JSON for a function call with its proper arguments that best answers the given prompt.
  
  Respond in the format {"name": function name, "parameters": dictionary of argument name and its value}. Do not use variables.
  
  {{ range $.Tools }}
  {{- . }}
  {{ end }}
  {{ .Content }}<|eot_id|>
  {{- else }}
  
  {{ .Content }}<|eot_id|>
  {{- end }}{{ if $last }}<|start_header_id|>assistant<|end_header_id|>
  
  {{ end }}
  {{- else if eq .Role "assistant" }}<|start_header_id|>assistant<|end_header_id|>
  {{- if .ToolCalls }}
  {{ range .ToolCalls }}
  {"name": "{{ .Function.Name }}", "parameters": {{ .Function.Arguments }}}{{ end }}
  {{- else }}
  
  {{ .Content }}
  {{- end }}{{ if not $last }}<|eot_id|>{{ end }}
  {{- else if eq .Role "tool" }}<|start_header_id|>ipython<|end_header_id|>
  
  {{ .Content }}<|eot_id|>{{ if $last }}<|start_header_id|>assistant<|end_header_id|>
   
  {{ end }}
  {{- end }}
  {{- end }}"""
  
  PARAMETER stop <|start_header_id|>
  PARAMETER stop <|end_header_id|>
  PARAMETER stop <|eot_id|>
  */

  
  
  const context = `
  You are a tech assistant capable of performing tasks such as telling the time with respond of just :mys:current_date:, and retrieving relevant documents.
  If a task is mentioned in the query, invoke the corresponding function and return the result.
  If no task is detected, just provide a text-based response.
  Respond in less words is better as much as you can.

  System:
  User: "Hello there"
  Assistant: "${knowledge_input}"
  `;
  // chat_history.push({
  //   role: 'assistant',
  //   content: context,
  // });

  const starter = 'Hello there, how can I help?';
  Logcat.info(`${TextUtil.txt(starter, ['fgGreen'])}`);
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
