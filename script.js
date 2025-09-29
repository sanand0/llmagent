import { render, html } from "lit-html";
import { openaiConfig } from "bootstrap-llm-provider";
import { OpenAI } from "openai";
import { Agent, setDefaultOpenAIClient, run } from "@openai/agents";
import { jsCodeTool } from "./tools.js";

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

$("#agent-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = $("#agent-question").value.trim();
  if (!question) return;

  setLoadingState(true);
  const results = [{ name: "user_message", item: { agent: { name: "User" }, output: question } }];
  renderResponse(results);

  const { baseUrl, apiKey } = await openaiConfig({ defaultBaseUrls: BASE_URLS });
  setDefaultOpenAIClient(new OpenAI({ dangerouslyAllowBrowser: true, baseURL: baseUrl, apiKey: apiKey }));

  const model = $("#agent-model").value.trim();
  const instructions = $("#agent-instructions").value.trim();
  const dynamicAgent = new Agent({ name: "Executor agent", instructions, model, tools: [jsCodeTool] });

  const stream = await run(dynamicAgent, question, { stream: true });
  for await (const event of stream) {
    if (event.type != "run_item_stream_event") continue;
    results.push(event);
    renderResponse(results);
  }
  setLoadingState(false);
});

const renderResponse = (results) => {
  render(
    results.map(
      (event) => html`<div class="${event.name}">
        <strong>${event.item.agent.name}</strong>
        ${renderEvent(event)}
      </div>`
    ),
    $("#agent-response")
  );
};

const renderEvent = ({ name, item }) => {
  const raw = item?.rawItem;
  return name === "user_message"
    ? html`<em>Input</em> ${item.output}`
    : name == "reasoning_item_created"
    ? html`<em>Thinking</em>`
    : name == "tool_called"
    ? html`<em>Tool call</em> <code>${raw.name} ${raw.arguments}</code> `
    : name == "tool_output"
    ? html`<em>Tool output</em>
        <code>${raw.name} ${raw.output.type == "text" ? raw.output.text : JSON.stringify(raw.output)}</code>`
    : name == "message_output_created"
    ? raw.content.map((content) => (content.type == "output_text" ? content.text : JSON.stringify(content)))
    : JSON.stringify(item);
};
