/**
 * 学习示例 2：文件系统操作
 *
 * 这个示例展示：
 * - 文件系统工具的使用（write_file, read_file, ls）
 * - 如何访问 result.files
 * - FileData 的结构
 */

import { config } from "dotenv";
config();

import { createDeepAgent } from "../src/deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

async function main() {
  console.log("🎓 学习示例 2：文件系统操作\n");

  // 创建 agent
  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.7,
    }),
    systemPrompt: `你是一个技术写作助手。
      当用户要求创建文档时，使用 write_file 工具保存。
      文件路径必须以 / 开头（例如：/tutorial.md）`,
  });

  console.log("📤 任务：创建一个 Python 教程并保存为文件\n");

  const result = await agent.invoke({
    messages: [
      new HumanMessage("帮我创建一个 Python 基础教程，保存为 /python_tutorial.md")
    ],
  });

  // 查看创建的文件
  console.log("📁 创建的文件 (result.files):");
  console.log("─".repeat(70));

  if (result.files && Object.keys(result.files).length > 0) {
    for (const [path, fileData] of Object.entries(result.files)) {
      console.log(`\n📄 ${path}`);
      console.log(`   创建时间: ${fileData.created_at}`);
      console.log(`   修改时间: ${fileData.modified_at}`);
      console.log(`   内容行数: ${fileData.content.length}`);

      // 显示文件内容
      const content = fileData.content.join("\n");
      const preview = content.length > 200
        ? content.substring(0, 200) + "\n... [内容被截断]"
        : content;

      console.log("\n   内容预览:");
      console.log("   " + "─".repeat(66));
      console.log(preview.split("\n").map(line => "   " + line).join("\n"));
      console.log("   " + "─".repeat(66));
    }
  } else {
    console.log("(没有创建文件)");
  }

  // 演示如何在代码中访问文件
  console.log("\n💡 在代码中访问文件:");
  console.log("─".repeat(70));
  console.log("// 获取文件内容");
  console.log("const fileData = result.files['/python_tutorial.md'];");
  console.log("const content = fileData.content.join('\\n');");
  console.log("\n// FileData 结构:");
  console.log("interface FileData {");
  console.log("  content: string[];      // 按行存储的内容");
  console.log("  created_at: string;     // ISO 格式的创建时间");
  console.log("  modified_at: string;    // ISO 格式的修改时间");
  console.log("}");

  console.log("\n✅ 示例完成！\n");
}

main().catch(console.error);
