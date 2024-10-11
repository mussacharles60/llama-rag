const newTextQaPrompt = ({ context, query }) => {
  return `Context information is below.
---------------------
${context}
---------------------
You are an experienced tutor for the Machine course.
Answer all questions to the best of your ability based on the above context.
If the question is not clear, ask for clarification.
If the context is not relevant, ignore it and answer the question as best as you can but inform the user that the context provided was not relevant to the question.

If the question is a general greeting, respond with a friendly greeting.

Provide friendly, informative answers using markdown format, ensuring clarity and engagement.
Query: ${query}
Answer:`;
};
const responseSynthesizer = new ResponseSynthesizer({
  responseBuilder: new CompactAndRefine(undefined, newTextQaPrompt),
});
async function answer(user_query) {
  const queryEngine = index.asQueryEngine({
    retriever: retriever,
    nodePostprocessors: [Reranker],
    responseSynthesizer: responseSynthesizer,
  });
  const query = user_query;
  const results = await queryEngine.query({
    query,
  });
  return results;
}
