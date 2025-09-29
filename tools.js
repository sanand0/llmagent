// Note: All .execute functions will be bound to an environment object.

const AsyncFunction = async function () {}.constructor;

export const jsCodeTool = {
  name: "js_code",
  description: `Execute async browser JS code. Always use return. e.g.
return await fetch("https://aipipe.org/proxy/https://httpbin.org/get?x=1").then(r => r.json())

https://aipipe.org/proxy/[URL] can be used to bypass CORS issues.
`,
  parameters: {
    type: "object",
    properties: { code: { type: "string" } },
    required: ["code"],
    additionalProperties: false,
  },
  execute: async function ({ code }) {
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
};

export const googleSearchTool = {
  name: "google_search",
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
    const params = new URLSearchParams({ key: this.GOOGLE_API_KEY, cx: this.GOOGLE_CSE_ID, q: query });
    console.log(params);
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
};
