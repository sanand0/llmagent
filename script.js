import { z } from "zod";
import { openaiConfig } from "bootstrap-llm-provider";
import { OpenAI } from "openai";
import { Agent, setDefaultOpenAIClient, tool, run } from "@openai/agents";

const { baseUrl, apiKey, models } = await openaiConfig();
console.log(baseUrl, apiKey, models);

const customClient = new OpenAI({
  dangerouslyAllowBrowser: true,
  baseURL: baseUrl,
  apiKey: apiKey,
});
setDefaultOpenAIClient(customClient);

const multiplyTool = tool({
  name: "multiply",
  description: "Multiply 2 numbers",
  parameters: z.object({ a: z.number(), b: z.number() }),
  execute: async (a, b) => a * b,
});

const agent = new Agent({
  name: "Calculator agent",
  instructions: "Always multiply inputs using the multiply tool",
  model: "gpt-5-nano",
});

const result = await run(agent, "What is 123456 * 987654?", [multiplyTool]);

console.log(result);
