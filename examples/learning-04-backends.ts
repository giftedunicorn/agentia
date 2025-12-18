/**
 * 学习示例 4：后端系统
 *
 * 这个示例展示：
 * - 三种不同的后端：StateBackend, FilesystemBackend, CompositeBackend
 * - 如何选择合适的后端
 * - 后端对文件存储的影响
 */

import { config } from "dotenv";
config();

import { createDeepAgent } from "../src/deepagents";
import {
  StateBackend,
  FilesystemBackend,
  CompositeBackend,
} from "../src/deepagents/backends";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import * as fs from "fs/promises";
import * as path from "path";

async function demonstrateStateBackend() {
  console.log("\n1️⃣ StateBackend（默认）");
  console.log("─".repeat(70));
  console.log("说明：文件存储在 agent 的 state.files 中（内存）\n");

  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0,
    }),
    systemPrompt: "创建一个简短的笔记文件",
    // 不指定 backend，默认使用 StateBackend
  });

  const result = await agent.invoke({
    messages: [new HumanMessage("创建一个笔记文件 /note.txt，内容是 'Hello from StateBackend'")],
  });

  console.log("结果：");
  if (result.files && result.files["/note.txt"]) {
    const content = result.files["/note.txt"].content.join("\n");
    console.log(`✅ 文件存储在 result.files["/note.txt"]`);
    console.log(`   内容: "${content}"`);
    console.log(`   位置: 内存中（不在磁盘上）`);
  }

  console.log("\n💡 适用场景：");
  console.log("   - 开发和测试");
  console.log("   - 临时文件");
  console.log("   - 需要在代码中直接访问文件");
}

async function demonstrateFilesystemBackend() {
  console.log("\n\n2️⃣ FilesystemBackend");
  console.log("─".repeat(70));
  console.log("说明：文件存储在真实的文件系统中\n");

  const testDir = "./test_filesystem_backend";

  // 创建测试目录
  await fs.mkdir(testDir, { recursive: true });

  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0,
    }),
    systemPrompt: "创建一个简短的笔记文件",
    backend: new FilesystemBackend({ root: testDir }),
  });

  const result = await agent.invoke({
    messages: [new HumanMessage("创建一个笔记文件 /note.txt，内容是 'Hello from FilesystemBackend'")],
  });

  console.log("结果：");
  const filePath = path.join(testDir, "note.txt");
  try {
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    if (exists) {
      const content = await fs.readFile(filePath, "utf-8");
      console.log(`✅ 文件已创建在磁盘上`);
      console.log(`   路径: ${filePath}`);
      console.log(`   内容: "${content.trim()}"`);
    }
  } catch (error) {
    console.log("❌ 文件未创建");
  }

  console.log("\n💡 适用场景：");
  console.log("   - 本地开发，需要查看文件");
  console.log("   - 与其他程序共享文件");
  console.log("   - 长期存储");

  console.log("\n🧹 清理测试目录...");
  await fs.rm(testDir, { recursive: true, force: true });
}

async function demonstrateCompositeBackend() {
  console.log("\n\n3️⃣ CompositeBackend（组合后端）");
  console.log("─".repeat(70));
  console.log("说明：不同路径使用不同的后端\n");

  const tempDir = "./test_temp";
  const dataDir = "./test_data";

  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });

  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0,
    }),
    systemPrompt: "创建文件",
    backend: new CompositeBackend([
      {
        backend: new FilesystemBackend({ root: tempDir }),
        priority: 1,
        glob: "/temp/**",  // /temp 目录使用文件系统
      },
      {
        backend: new FilesystemBackend({ root: dataDir }),
        priority: 2,
        glob: "/data/**",  // /data 目录使用另一个文件系统
      },
      {
        backend: (config) => new StateBackend(config),
        priority: 3,
        glob: "/**",  // 其他文件使用内存
      },
    ]),
  });

  const result = await agent.invoke({
    messages: [
      new HumanMessage(`创建三个文件：
        1. /temp/cache.txt 内容 "临时缓存"
        2. /data/record.txt 内容 "重要数据"
        3. /memory.txt 内容 "内存数据"`)
    ],
  });

  console.log("结果：");

  // 检查 /temp/cache.txt
  const tempFile = path.join(tempDir, "cache.txt");
  const tempExists = await fs.access(tempFile).then(() => true).catch(() => false);
  console.log(`${tempExists ? "✅" : "❌"} /temp/cache.txt -> ${tempDir}/cache.txt (文件系统)`);

  // 检查 /data/record.txt
  const dataFile = path.join(dataDir, "record.txt");
  const dataExists = await fs.access(dataFile).then(() => true).catch(() => false);
  console.log(`${dataExists ? "✅" : "❌"} /data/record.txt -> ${dataDir}/record.txt (文件系统)`);

  // 检查 /memory.txt
  const memoryExists = result.files && result.files["/memory.txt"];
  console.log(`${memoryExists ? "✅" : "❌"} /memory.txt -> result.files["/memory.txt"] (内存)`);

  console.log("\n💡 适用场景：");
  console.log("   - 混合存储策略");
  console.log("   - 临时文件用文件系统，重要数据用数据库");
  console.log("   - 灵活的路由规则");

  console.log("\n🧹 清理测试目录...");
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.rm(dataDir, { recursive: true, force: true });
}

async function main() {
  console.log("🎓 学习示例 4：后端系统\n");

  try {
    await demonstrateStateBackend();
    await demonstrateFilesystemBackend();
    await demonstrateCompositeBackend();

    console.log("\n\n✅ 所有示例完成！\n");
    console.log("📊 后端对比总结：");
    console.log("─".repeat(70));
    console.log("| 后端类型            | 存储位置     | 适用场景              |");
    console.log("|---------------------|--------------|----------------------|");
    console.log("| StateBackend        | 内存         | 开发/测试/临时文件   |");
    console.log("| FilesystemBackend   | 磁盘         | 本地开发/长期存储    |");
    console.log("| StoreBackend        | 数据库       | 生产环境/SaaS        |");
    console.log("| CompositeBackend    | 混合         | 复杂场景/灵活路由    |");
    console.log("─".repeat(70));

    console.log("\n💡 如何选择后端：");
    console.log("   - 本地开发测试 → StateBackend（默认）");
    console.log("   - 需要查看文件 → FilesystemBackend");
    console.log("   - SaaS 部署 → StoreBackend + PostgreSQL");
    console.log("   - 混合需求 → CompositeBackend\n");

  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
