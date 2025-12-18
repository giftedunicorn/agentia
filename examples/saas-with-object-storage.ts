/**
 * Example: SaaS with Object Storage (S3, Cloudflare R2, etc.)
 * Best for large files or when you need file URLs
 */

import { createDeepAgent } from "deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function uploadToS3(
  key: string,
  content: string,
  bucket: string
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      ContentType: "text/markdown",
    })
  );

  return `https://${bucket}.s3.amazonaws.com/${key}`;
}

export async function POST(request: Request) {
  const { userId, question } = await request.json();

  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    // ... config
  });

  const result = await agent.invoke({
    messages: [new HumanMessage(question)],
  });

  // ✅ GOOD: Upload large files to S3
  const fileUrls: Record<string, string> = {};
  if (result.files) {
    for (const [path, fileData] of Object.entries(result.files)) {
      const content = fileData.content.join("\n");
      const fileName = path.replace(/^\//, ""); // Remove leading slash
      const key = `users/${userId}/sessions/${Date.now()}/${fileName}`;

      const url = await uploadToS3(key, content, "my-agent-files-bucket");
      fileUrls[path] = url;
    }
  }

  // Store metadata in database
  await db.agentSession.create({
    data: {
      userId,
      question,
      fileUrls: JSON.stringify(fileUrls),
      todos: JSON.stringify(result.todos),
    },
  });

  return Response.json({
    todos: result.todos,
    files: fileUrls, // Return URLs instead of content
  });
}

// Client can then download files:
// const { files } = await response.json();
// const reportUrl = files['/final_report.md'];
// window.open(reportUrl); // Or fetch and display
