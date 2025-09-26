import { openaiConfig } from "bootstrap-llm-provider";
import { OpenAI } from "openai";
import { Agent, setDefaultOpenAIClient, setOpenAIAPI, tool, run } from "@openai/agents";

const $ = (s, el = document) => el.querySelector(s);
const BASE_URLS = [
  "https://api.openai.com/v1",
  "https://aipipe.org/openai/v1",
  "https://llmfoundry.straivedemo.com/openai/v1",
  "https://llmfoundry.straive.com/openai/v1",
];

const submitSpinner = $("#agent-submit .spinner-border");

$("#openai-config-btn").addEventListener("click", () => {
  void openaiConfig({ defaultBaseUrls: BASE_URLS, show: true });
});

const setLoadingState = (isLoading) => {
  $("#agent-submit").disabled = isLoading;
  submitSpinner.classList.toggle("d-none", !isLoading);
};

const renderStatus = (message) => {
  $("#agent-status").textContent = message;
};

const stringifyValue = (value) => (typeof value === "string" ? value : JSON.stringify(value, null, 2));

const renderHistoryItem = (item) => {
  if (!item) return "";
  if (typeof item.content === "string") return item.content;
  if (Array.isArray(item.content)) {
    return item.content
      .map((part) => part?.text ?? part?.refusal ?? part?.transcript ?? stringifyValue(part))
      .join("\n");
  }
  if (item.content !== undefined) return stringifyValue(item.content);
  if ("output" in item) return stringifyValue(item.output);
  if ("arguments" in item) return stringifyValue(item.arguments);
  return stringifyValue(item);
};

const renderResponse = (result) => {
  const historySummary = (result?.history ?? [])
    .map((item, index) => {
      const label = item?.role ?? item?.type ?? `item ${index + 1}`;
      const body = renderHistoryItem(item).trim();
      return body ? `${label}:\n${body}` : label;
    })
    .filter(Boolean)
    .join("\n\n");

  const finalOutput =
    result?.finalOutput === undefined
      ? ""
      : `Final output:\n${stringifyValue(result.finalOutput)}`;

  const responseText = [historySummary, finalOutput].filter(Boolean).join("\n\n") || "No response received.";

  $("#agent-response-content").textContent = responseText;
  $("#agent-response").classList.remove("d-none");
};

$("#agent-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = $("#agent-question").value.trim();
  if (!question) {
    renderStatus("Enter a question to ask the agent.");
    return;
  }

  setLoadingState(true);
  renderStatus("Running agent…");

  try {
    const { baseUrl, apiKey } = await openaiConfig({ defaultBaseUrls: BASE_URLS });
    setDefaultOpenAIClient(new OpenAI({ dangerouslyAllowBrowser: true, baseURL: baseUrl, apiKey: apiKey }));
    setOpenAIAPI("chat_completions");

    const model = $("#agent-model").value.trim();
    const instructions = $("#agent-instructions").value.trim();
    const dynamicAgent = new Agent({ name: "Executor agent", instructions, model, tools: [jsCodeTool] });

    const result = await run(dynamicAgent, question);
    renderResponse(result);
    renderStatus("Done.");
  } catch (error) {
    renderStatus("The agent could not complete the request. Try again.");
    $("#agent-response").classList.add("d-none");
    console.error(error);
  } finally {
    setLoadingState(false);
  }
});

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

const jsCodeTool = tool({
  name: "js_code",
  description: "Execute JavaScript code and return the awaited result.",
  parameters: {
    type: "object",
    properties: {
      code: { type: "string" },
    },
    required: ["code"],
    additionalProperties: false,
  },
  execute: async (code) => {
    const fn = new AsyncFunction(code);
    return await fn();
  },
});
