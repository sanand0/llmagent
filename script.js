import { render, html } from "lit-html";
import { unsafeHTML } from "unsafe-html";
import saveform from "saveform";
import { Marked } from "marked";
import { openaiConfig } from "bootstrap-llm-provider";
import { OpenAI } from "openai";
import { Agent, setDefaultOpenAIClient, tool, run } from "@openai/agents";
import hljs from "highlight.js";
import { jsCodeTool, googleSearchTool } from "./tools.js";

const $ = (s, el = document) => el.querySelector(s);
const marked = new Marked();
const BASE_URLS = [
  "https://api.openai.com/v1",
  "https://aipipe.org/openai/v1",
  "https://llmfoundry.straivedemo.com/openai/v1",
  "https://llmfoundry.straive.com/openai/v1",
];

saveform("#agent-form");
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
  const env = Object.fromEntries(new FormData(document.querySelector("#agent-form")).entries());
  const dynamicAgent = new Agent({
    name: "Executor agent",
    instructions,
    model,
    modelSettings: {
      // Ask the model to produce a reasoning summary you can show to users
      reasoning: { effort: "high", summary: "auto" },
      text: { verbosity: "low" },
      store: true
    },
    // Allow tools access to the form environment (e.g. API keys)
    tools: [jsCodeTool, googleSearchTool].map((config) => tool({ ...config, execute: config.execute.bind(env) })),
  });

  const stream = await run(dynamicAgent, question, { stream: true });
  for await (const event of stream) {
    console.log(event);
    if (event.type != "run_item_stream_event") continue;
    results.push(event);
    renderResponse(results);
  }
  setLoadingState(false);
});

const renderResponse = (results) => {
  render(
    results.map(
      (event) => html`<details class="mb-3" ?open=${event.name == "user_message" || event.name == "message_output_created"}>
        <summary class="mb-2">
          <strong>${event.item.agent.name}</strong>: ${event.name}
        </summary>
        ${renderEvent(event)}
      </details>`
    ),
    $("#agent-response")
  );
};

const renderEvent = ({ name, item }) => {
  const raw = item?.rawItem;
  return name === "user_message"
    ? item.output
    : name == "reasoning_item_created"
    ? null
    : name == "tool_called"
    ? html`<pre class="hljs language-json px-2 py-3"><code>${raw.name} ${highlightJSON(raw.arguments)}</code></pre>`
    : name == "tool_output"
    ? html`<pre class="hljs language-json px-2 py-3"><code>${raw.name} ${highlightJSON(
        raw.output.type == "text" ? raw.output.text : raw.output
      )}</code></pre>`
    : name == "message_output_created"
    ? raw.content.map((content) =>
        content.type == "output_text" ? unsafeHTML(marked.parse(content.text)) : highlightJSON(content)
      )
    : JSON.stringify(item);
};

// Syntax highlight JSON, provided as a string or object
const highlightJSON = (json) =>
  unsafeHTML(
    hljs.highlight(JSON.stringify(typeof json === "string" ? JSON.parse(json) : json, null, 2), { language: "json" })
      .value
  );
