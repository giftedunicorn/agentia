# SaaS Deployment Guide for DeepAgents

## ❌ Why Local Filesystem Doesn't Work on Vercel/Serverless

### The Problem
```typescript
// ❌ BAD: This doesn't work on Vercel
await fs.writeFile("final_report.md", content);
```

**Issues:**
1. **Read-only filesystem** (except `/tmp`)
2. **Ephemeral storage** - files deleted after function execution
3. **No shared state** between function instances
4. **Cold starts** lose everything
5. **Concurrent requests** cause race conditions

### Vercel Specifics
- Each function invocation is isolated
- Only `/tmp` is writable (4096 MB limit)
- `/tmp` contents are cleared after execution
- Multiple regions = no shared filesystem

## ✅ Solutions for SaaS Deployment

### Comparison Table

| Approach | Best For | Pros | Cons | Cost |
|----------|----------|------|------|------|
| **Return in Response** | Simple apps, small files | Simple, no setup | Limited by response size | Free |
| **Database (PostgreSQL)** | Structured data, metadata | Fast, queryable | Size limits (~1MB/field) | Low |
| **Object Storage (S3/R2)** | Large files, media | Scalable, CDN support | External service | Low-Med |
| **LangGraph Store** | Built-in persistence | Integrated, official | Requires setup | Med |

---

## Option 1: Return Files in API Response

**Best for:** Simple use cases, small files (<1MB total)

### Pros
✅ No additional infrastructure
✅ Simple to implement
✅ Instant results

### Cons
❌ Limited by response size (Vercel: 4.5MB body limit)
❌ No persistence across requests
❌ Client must store files

### Implementation

```typescript
// api/agent/route.ts (Next.js App Router)
export async function POST(request: Request) {
  const { question } = await request.json();

  const agent = createDeepAgent({ /* config */ });
  const result = await agent.invoke({
    messages: [new HumanMessage(question)],
  });

  // Convert FileData to plain strings
  const files: Record<string, string> = {};
  if (result.files) {
    for (const [path, fileData] of Object.entries(result.files)) {
      files[path] = fileData.content.join("\n");
    }
  }

  return Response.json({
    todos: result.todos,
    files: files,
  });
}
```

### Client Usage
```typescript
const response = await fetch('/api/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: "Research topic" })
});

const { files, todos } = await response.json();
const report = files['/final_report.md'];

// Display or download
const blob = new Blob([report], { type: 'text/markdown' });
const url = URL.createObjectURL(blob);
```

---

## Option 2: Database Storage

**Best for:** Structured data, queryable history, moderate file sizes

### Pros
✅ Persistent storage
✅ Query by user, date, etc.
✅ Good for metadata
✅ Works with Vercel Postgres, Supabase, PlanetScale

### Cons
❌ Size limits (typically 1-10MB per field)
❌ Not ideal for very large files

### Schema Example (Prisma)
```prisma
model AgentSession {
  id        String   @id @default(cuid())
  userId    String
  question  String   @db.Text
  files     Json     // Store as JSON
  todos     Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([createdAt])
}
```

### Implementation
```typescript
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const { userId, question } = await request.json();

  const agent = createDeepAgent({ /* config */ });
  const result = await agent.invoke({
    messages: [new HumanMessage(question)],
  });

  // Convert files to JSON
  const files: Record<string, string> = {};
  if (result.files) {
    for (const [path, fileData] of Object.entries(result.files)) {
      files[path] = fileData.content.join("\n");
    }
  }

  // Store in database
  const session = await prisma.agentSession.create({
    data: {
      userId,
      question,
      files,
      todos: result.todos,
    },
  });

  return Response.json({
    sessionId: session.id,
    files,
    todos: result.todos,
  });
}

// Retrieve session
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
  });

  return Response.json(session);
}
```

---

## Option 3: Object Storage (S3, R2, etc.)

**Best for:** Large files, media, downloadable content

### Pros
✅ Unlimited file sizes
✅ CDN support (fast downloads)
✅ Pre-signed URLs for secure access
✅ Scalable

### Cons
❌ External service required
❌ Additional cost
❌ More complexity

### Implementation (AWS S3)
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  const { userId, question } = await request.json();

  const agent = createDeepAgent({ /* config */ });
  const result = await agent.invoke({
    messages: [new HumanMessage(question)],
  });

  const fileUrls: Record<string, string> = {};

  if (result.files) {
    for (const [path, fileData] of Object.entries(result.files)) {
      const content = fileData.content.join("\n");
      const key = `users/${userId}/${Date.now()}${path}`;

      // Upload to S3
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: content,
        ContentType: 'text/markdown',
      }));

      // Generate signed URL (expires in 1 hour)
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
        }),
        { expiresIn: 3600 }
      );

      fileUrls[path] = url;
    }
  }

  // Store metadata in database
  await prisma.agentSession.create({
    data: {
      userId,
      question,
      fileUrls,
      todos: result.todos,
    },
  });

  return Response.json({
    files: fileUrls,
    todos: result.todos,
  });
}
```

### Cloudflare R2 (S3-compatible, cheaper)
```typescript
// Same as S3 but use Cloudflare R2 endpoint
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

---

## Option 4: LangGraph Store Backend

**Best for:** When using LangGraph checkpointing, persistent sessions

### Pros
✅ Built into LangGraph
✅ Automatic persistence
✅ Consistent with agent state
✅ Support for PostgreSQL, SQLite, etc.

### Cons
❌ Requires LangGraph store setup
❌ More complex configuration

### Implementation
```typescript
import { PostgresStore } from '@langchain/langgraph-checkpoint-postgres';
import { StoreBackend } from '@/deepagents/backends';

const store = new PostgresStore({
  connectionString: process.env.DATABASE_URL!,
});

export async function POST(request: Request) {
  const { userId, sessionId, question } = await request.json();

  const agent = createDeepAgent({
    model: /* ... */,
    tools: /* ... */,

    // Use StoreBackend for persistent files
    backend: (config) => new StoreBackend({
      namespace: ['agent-files', userId, sessionId],
      store: config.store || store,
    }),

    store: store,
  });

  const result = await agent.invoke(
    { messages: [new HumanMessage(question)] },
    { configurable: { thread_id: sessionId } }
  );

  // Files are automatically stored in PostgreSQL
  return Response.json({
    sessionId,
    todos: result.todos,
  });
}

// Retrieve files
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId')!;
  const sessionId = searchParams.get('sessionId')!;

  const items = await store.list({
    namespace: ['agent-files', userId, sessionId],
  });

  const files: Record<string, string> = {};
  for (const item of items) {
    const path = item.key[item.key.length - 1];
    const fileData = item.value as any;
    files[path] = fileData.content.join('\n');
  }

  return Response.json({ files });
}
```

---

## Recommended Approach by Use Case

### 1. MVP / Prototype
**Use:** Return in Response
**Why:** Fastest to implement, no additional services

### 2. Production SaaS (Small Files)
**Use:** Database (PostgreSQL) + Return in Response
**Why:** Persistent history, queryable, reasonable costs

### 3. Production SaaS (Large Files)
**Use:** Database (metadata) + S3/R2 (files)
**Why:** Scalable, CDN support, reasonable costs

### 4. Enterprise / High Volume
**Use:** LangGraph Store + S3/R2
**Why:** Full LangGraph integration, state management

---

## Environment Variables

### For Database (Option 2)
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### For S3 (Option 3)
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET=my-agent-files
```

### For Cloudflare R2 (Option 3)
```env
CLOUDFLARE_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET=my-agent-files
```

---

## Vercel-Specific Considerations

### Function Limits
- **Timeout**: 10s (Hobby), 60s (Pro), 900s (Enterprise)
- **Memory**: 1024MB (Hobby), 3008MB (Pro)
- **Response Size**: 4.5MB max
- **/tmp Size**: 512MB (Hobby), 4096MB (Pro)

### Best Practices
1. **Use streaming** for long-running agents
2. **Return early** with a job ID, poll for results
3. **Use background jobs** (Vercel Cron, Inngest, etc.) for heavy tasks
4. **Cache aggressively** (Vercel KV, Redis)

### Example: Async Job Pattern
```typescript
// POST /api/agent - Start job
export async function POST(request: Request) {
  const { question } = await request.json();
  const jobId = generateId();

  // Store job status
  await redis.set(`job:${jobId}`, JSON.stringify({
    status: 'pending',
    question,
  }));

  // Trigger background job (Vercel Cron, Inngest, etc.)
  await triggerBackgroundJob(jobId, question);

  return Response.json({ jobId });
}

// GET /api/agent/status - Check status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  const job = await redis.get(`job:${jobId}`);
  return Response.json(JSON.parse(job));
}
```

---

## Cost Comparison

### Database (Vercel Postgres)
- **Free tier**: 256MB storage
- **Paid**: $0.03/GB/month
- **Best for**: <100MB files/day

### S3
- **Storage**: $0.023/GB/month
- **Transfer**: $0.09/GB (first 10TB)
- **Requests**: $0.0004/1000 PUT, $0.0004/10000 GET
- **Best for**: Any size

### Cloudflare R2
- **Storage**: $0.015/GB/month
- **Transfer**: FREE (no egress fees!)
- **Requests**: $0.36/million writes, $0.36/10million reads
- **Best for**: Any size, high bandwidth

---

## Migration Path

1. **Start**: Return in Response
2. **When you have users**: Add Database
3. **When files grow**: Add S3/R2
4. **When you need advanced features**: Switch to LangGraph Store

You can mix approaches:
- Small files (metadata): Database
- Large files (reports, media): S3/R2
- Temporary files: In-memory (return in response)
