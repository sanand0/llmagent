import { render, html } from "lit-html";
import { unsafeHTML } from "unsafe-html";
import saveform from "saveform";
import { Marked } from "marked";
import { openaiConfig } from "bootstrap-llm-provider";
import { OpenAI } from "openai";
import { Agent, setDefaultOpenAIClient, user, tool, run } from "@openai/agents";
import { jsCode, googleSearch } from "./tools.js";

const $ = (s, el = document) => el.querySelector(s);
const marked = new Marked();
const BASE_URLS = [
  "https://api.openai.com/v1",
  "https://aipipe.org/openai/v1",
  "https://llmfoundry.straivedemo.com/openai/v1",
  "https://llmfoundry.straive.com/openai/v1",
];

let thread = [];
const tools = { jsCode, googleSearch };

saveform("#agent-form", { exclude: '[type="file"], .exclude-saveform' });
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
  $("#agent-question").value = "";
  $("#agent-question").focus();

  thread.push(user(question));
  // Only add context the first time
  if (thread.length == 1) {
    let doc = $("#context").value.trim();
    if (doc.length > 10000) {
      doc = `Answer fetching parts of env["context"] (${doc.length} chars) via jsCodeTool:\n\n${
        doc.slice(0, 100) + "\n\n...[Trimmed]...\n\n" + doc.slice(-100)
      }`;
    } else if (doc.length) {
      doc = `Answer using context:\n\n${doc}`;
    }
    if (doc.length) thread.push(user(doc));
  }

  renderThread(thread);
  try {
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
        reasoning: { summary: "auto" },
      },
      // Allow tools access to the form environment (e.g. API keys)
      tools: Object.entries(tools).map(([name, config]) => tool({ ...config.getTool(env), name })),
    });

    const stream = await run(dynamicAgent, thread, { stream: true });
    for await (const event of stream) {
      if (event.type !== "run_item_stream_event") continue;
      renderThread(stream.history);
    }
    thread = stream.history;
  } finally {
    setLoadingState(false);
  }
});

const renderThread = (thread) => render(thread.map(threadItem), $("#agent-response"));

const threadItem = (item) => {
  const { type, role, name, content, output } = item;
  const details =
    type == "message"
      ? html`<summary class="mb-2 fw-bold">${role}</summary>
          ${unsafeHTML(marked.parse(content[0].text))}`
      : type == "function_call"
      ? tools[name].render
        ? tools[name].render(item)
        : html`<summary class="mb-2 fw-bold">${name}</summary>
            <pre>${item.arguments}</pre>`
      : type == "function_call_result"
      ? tools[name].renderResults
        ? tools[name].renderResults(item)
        : html`<summary class="mb-2 fw-bold">${name} results</summary>
            <pre>${output.text}</pre>`
      : type == "reasoning"
      ? html`<summary class="mb-2 fw-bold">Reasoning</summary>
          ${content.map((c) => html`<div>${unsafeHTML(marked.parse(c.text))}</div>`)}`
      : JSON.stringify(item);
  return html`<details class="${type == "message" ? "mt-3" : "small"}" ?open=${type == "message"}>${details}</details>`;
};
