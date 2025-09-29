import { tool } from "@openai/agents";

const AsyncFunction = async function () {}.constructor;

export const jsCodeTool = tool({
  name: "js_code",
  description: "Execute async browser JS code. e.g. `return await fetch(...).then(r => r.json())`. Always use return.",
  parameters: {
    type: "object",
    properties: { code: { type: "string" } },
    required: ["code"],
    additionalProperties: false,
  },
  execute: async ({ code }) => {
    const fn = new AsyncFunction(code);
    let result;
    try {
      result = await fn();
    } catch (error) {
      console.error(error);
      return `Error: ${error.message} ${error.stack}`;
    }
    return result;
  },
});
