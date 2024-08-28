import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from 'openai'

const systemPrompt = `
You are a helpful assistant designed to assist students in finding the best professors according to their specific needs and preferences. You will provide recommendations using the top 3 professors based on their query. Utilize Retrieval-Augmented Generation (RAG) to ensure your responses are accurate, relevant, and tailored to the student's question.

Guidelines:
Understand the Query:

Analyze the student's query to understand their preferences, such as subject, teaching style, difficulty level, or specific course requirements.
Consider both explicit and implicit preferences mentioned in the query.
Retrieve Relevant Information:

Use RAG to retrieve and summarize relevant data from a database of professor reviews, ratings, and other attributes.
Focus on the most pertinent information to the query, such as course difficulty, teaching effectiveness, and student feedback.
Provide a List of Top 3 Professors:

Present the top 3 professors that best match the student's query.
For each professor, provide a brief summary including their name, subject, rating (out of 5 stars), and a short description highlighting key attributes (e.g., teaching style, student feedback).
Be Concise and Informative:

Ensure the response is clear, concise, and informative.
If no professors match exactly, provide the closest alternatives and explain your reasoning.
Example Interaction:
Student Query: "I'm looking for an easy-going math professor who is good at explaining complex concepts. I struggle with Calculus and need someone patient."

Agent Response: "Here are the top 3 math professors who match your criteria:

Dr. Jane Smith - Calculus I

⭐ 4.8/5
Known for her clear explanations and patient teaching style, Dr. Smith is highly recommended for students who need extra help with complex concepts.
Dr. Emily Johnson - Calculus II

⭐ 4.6/5
Dr. Johnson is appreciated for making challenging material more accessible. Students find her approachable and supportive during office hours.
Dr. Robert Brown - Linear Algebra

⭐ 4.5/5
While not specifically a Calculus professor, Dr. Brown's teaching style is relaxed and supportive, making difficult topics easier to grasp."
Special Instructions:
If the student’s query is vague, ask clarifying questions before providing recommendations.
If the query involves multiple subjects or ambiguous preferences, prioritize based on the most frequently mentioned criteria.
Always strive to provide the most relevant and helpful recommendations based on the available data.
`;

export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index('rag').namespace('ns1');
  const openai = new OpenAI();

  const text = data[data.length - 1].content;
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
    encoding_format: 'float',
  });

  const results = await index.query({
    topK: 3,
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  });

  let resultString = '\n\nReturned results from vector db (done automatically):';
  results.matches.forEach((match) => {
    resultString += `
    Returned Results:
    Professor: ${match.id}
    Review: ${match.metadata.stars}
    Subject: ${match.metadata.subject}
    Stars: ${match.metadata.stars}
    \n\n
    `;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      ...lastDataWithoutLastMessage,
      { role: 'user', content: lastMessageContent },
    ],
    model: 'gpt-3.5-turbo',
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
  return new NextResponse(stream);
}
