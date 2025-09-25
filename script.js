import { z } from "zod";
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

const renderResponse = (message) => {
  $("#agent-response-content").textContent = message;
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
    const dynamicAgent = new Agent({ name: "Calculator agent", instructions, model });

    const result = await run(dynamicAgent, question, [multiplyTool]);
    renderResponse(result.finalOutput ?? "No response received.");
    renderStatus("Done.");
  } catch (error) {
    renderStatus("The agent could not complete the request. Try again.");
    $("#agent-response").classList.add("d-none");
    console.error(error);
  } finally {
    setLoadingState(false);
  }
});

const multiplyTool = tool({
  name: "multiply",
  description: "Multiply 2 numbers",
  parameters: z.object({ a: z.number(), b: z.number() }),
  execute: async (a, b) => a * b,
});
