import hljs from "highlight.js";
import { unsafeHTML } from "unsafe-html";

// Format JS objects / JSON as indented JSON strings where possible
export const formatJson = (value) => {
  if (typeof value === "string")
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  return JSON.stringify(value, null, 2);
};

// Syntax highlight code in a language
export const highlight = (value, language) => unsafeHTML(hljs.highlight(value, { language }).value);
