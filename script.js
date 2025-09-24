import { z } from "zod";
import { openaiConfig } from "bootstrap-llm-provider";
import { OpenAI } from "openai";
import { Agent, setDefaultOpenAIClient, tool, run } from "@openai/agents";

const { baseUrl, apiKey } = await openaiConfig();

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

const form = document.querySelector("#agent-form");
const questionInput = document.querySelector("#agent-question");
const submitButton = document.querySelector("#agent-submit");
const submitSpinner = submitButton?.querySelector(".spinner-border") ?? null;
const statusElement = document.querySelector("#agent-status");
const responseSection = document.querySelector("#agent-response");
const responseContent = document.querySelector("#agent-response-content");

if (!form || !questionInput || !submitButton || !statusElement || !responseSection || !responseContent) {
  throw new Error("Agent form elements are missing");
}

const setLoadingState = (isLoading) => {
  submitButton.disabled = isLoading;
  if (!submitSpinner) return;
  submitSpinner.classList.toggle("d-none", !isLoading);
};

const renderStatus = (message) => {
  statusElement.textContent = message;
};

const renderResponse = (message) => {
  responseContent.textContent = message;
  responseSection.classList.remove("d-none");
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (!question) {
    renderStatus("Enter a question to ask the agent.");
    return;
  }

  setLoadingState(true);
  renderStatus("Running agent…");

  try {
    const result = await run(agent, question, [multiplyTool]);
    renderResponse(result.finalOutput ?? "No response received.");
    renderStatus("Done.");
  } catch (error) {
    renderStatus("The agent could not complete the request. Try again.");
    responseSection.classList.add("d-none");
    console.error(error);
  } finally {
    setLoadingState(false);
  }
});
