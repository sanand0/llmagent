import { html } from "lit-html";
import { unsafeHTML } from "unsafe-html";
import { Marked } from "marked";
import { formatJson, highlight } from "./format.js";

const marked = new Marked();

const AsyncFunction = async function () {}.constructor;

export const jsCode = {
  getTool: (env) => ({
    description: `Execute async browser JS code. Always use return. e.g.
return await fetch("https://aipipe.org/proxy/https://httpbin.org/get?x=1").then(r => r.json())

Fetch https://aipipe.org/proxy/[URL] to bypass CORS.

You can use:
${Object.entries(env)
  .map(([k, v]) => `- env["${k}"]: ${v.length} char str\n`)
  .join("")}
`,
    parameters: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
      additionalProperties: false,
    },
    execute: async function ({ code }) {
      const fn = new AsyncFunction("env", code);
      let result;
      try {
        result = await fn(env);
      } catch (error) {
        console.error(error);
        return `Error: ${error.message} ${error.stack}`;
      }
      return result;
    },
  }),
  render: (item) => {
    const args = JSON.parse(item.arguments ?? "{}");
    return html`<summary class="mb-2"><strong>Code</strong></summary>
      <pre class="hljs language-javascript px-2 py-3"><code>${highlight(args.code ?? "", "js")}</code></pre>`;
  },
  renderResults: (item) => {
    const output = formatJson(item.output?.text ?? "");
    return html`<summary class="mb-2"><strong>Results</strong></summary>
      <pre class="hljs language-json px-2 py-3"><code>${highlight(output, "json")}</code></pre>`;
  },
};

export const googleSearch = {
  getTool: (env) => ({
    description: "Search the web via Google Custom Search API and return the raw JSON response.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        num: { type: "number" },
        start: { type: "number" },
      },
      required: ["query", "num", "start"],
      additionalProperties: false,
    },
    execute: async function ({ query, num, start }) {
      const params = new URLSearchParams({ key: env.GOOGLE_API_KEY, cx: env.GOOGLE_CSE_ID, q: query });
      if (typeof num === "number") params.set("num", `${num}`);
      if (typeof start === "number") params.set("start", `${start}`);
      let response;
      try {
        response = await fetch(`https://customsearch.googleapis.com/customsearch/v1?${params.toString()}`);
      } catch (error) {
        console.error(error);
        return `Error: ${error.message}`;
      }
      if (!response.ok) {
        const errorText = await response.text();
        return `Error: ${response.status} ${errorText}`;
      }
      return await response.json();
    },
  }),
  render: (item) => {
    const { query, start, num } = JSON.parse(item.arguments);
    return html`<summary class="mb-2">
      <strong>Google search</strong> for <q>${query}</q> (${start + 1} - ${start + num})
    </summary>`;
  },
  renderResults: (item) => {
    // Format Google search results
    const { queries, searchInformation, items } = JSON.parse(item.output.text);
    return html`<summary class="mb-2">
        <strong>Google search results</strong> for <q>${queries.request[0].searchTerms}</q>
        (${items.length} of ${searchInformation.formattedTotalResults} in ${searchInformation.formattedSearchTime}s)
      </summary>
      ${items.map(
        ({ htmlTitle, htmlSnippet, link, htmlFormattedUrl }) => html`
          <a class="mb-2 text-decoration-none link-body-emphasis" href="${link}" target="_blank" rel="noopener">
            <strong>${unsafeHTML(htmlTitle)}</strong>
            <div class="link-primary">${unsafeHTML(htmlFormattedUrl)}</div>
            <div>${htmlSnippet ? html`<div>${unsafeHTML(marked.parse(htmlSnippet))}</div>` : null}</div>
          </a>
        `
      )}`;
  },
};
