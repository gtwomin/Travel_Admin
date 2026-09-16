import { resolveForumMediaUrl } from "./resolveForumMediaUrl";

const IMAGE_LINE_PATTERN = /^!\[([^\]\n]*)\]\((https?:\/\/[^\s()]+|\/[^\s()]*)\)$/;
const CENTER_PREFIX = "::center::";
const SPAN_PATTERN = /\[\[([a-z]+(?::[0-9a-z]+)?(?:,[a-z]+(?::[0-9a-z]+)?)*)\|([^[\]]*)\]\]/g;
const HEX_COLOR_PATTERN = /^[0-9a-f]{6}$/i;

const COLOR_KEYS = new Set(["red", "orange", "green", "blue", "purple", "gray"]);
const FONT_KEYS = new Set([
  "sans",
  "pmingliu",
  "mingliu",
  "dfkaisb",
  "jhenghei",
  "arial",
  "arialblack",
  "comicsans",
  "couriernew",
  "msmincho",
  "tahoma",
  "timesnewroman",
  "verdana"
]);
const SIZE_KEYS = new Set(["sm", "md", "lg", "xl"]);

const isHexColor = (value: string) => HEX_COLOR_PATTERN.test(value);

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderInlineSpans(escapedText: string): string {
  return escapedText.replace(SPAN_PATTERN, (_match, attrsRaw: string, text: string) => {
    let bold = false;
    let italic = false;
    let colorClass = "";
    let colorStyle = "";
    let fontClass = "";
    let sizeClass = "";

    for (const token of attrsRaw.split(",")) {
      const [key, value] = token.split(":");
      if (key === "bold") bold = true;
      else if (key === "italic") italic = true;
      else if (key === "color" && value) {
        if (COLOR_KEYS.has(value)) colorClass = `forum-color-${value}`;
        else if (isHexColor(value)) colorStyle = `color:#${value}`;
      } else if (key === "font" && value && FONT_KEYS.has(value)) {
        fontClass = `forum-font-${value}`;
      } else if (key === "size" && value && SIZE_KEYS.has(value)) {
        sizeClass = `forum-size-${value}`;
      }
    }

    let html = text;
    if (italic) html = `<em>${html}</em>`;
    if (bold) html = `<strong>${html}</strong>`;

    const classes = [colorClass, fontClass, sizeClass].filter(Boolean).join(" ");
    const classAttr = classes ? ` class="${classes}"` : "";
    const styleAttr = colorStyle ? ` style="${colorStyle}"` : "";
    if (classAttr || styleAttr) html = `<span${classAttr}${styleAttr}>${html}</span>`;
    return html;
  });
}

function renderParagraph(paragraph: string): string {
  let raw = paragraph;
  let centered = false;

  if (raw.startsWith(CENTER_PREFIX)) {
    centered = true;
    raw = raw.slice(CENTER_PREFIX.length);
  }

  const html = renderInlineSpans(escapeHtml(raw)).replace(/\n/g, "<br>");
  const className = centered ? ' class="forum-align-center"' : "";
  return `<p${className}>${html}</p>`;
}

/** 依照前台既有格式解析論壇文章內容。 */
export const renderForumContent = (content: string): string => {
  const paragraphs = (content ?? "")
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0);

  return paragraphs
    .map(paragraph => {
      const imageMatch = IMAGE_LINE_PATTERN.exec(paragraph);
      if (imageMatch) {
        const alt = imageMatch[1] ?? "";
        const url = imageMatch[2] ?? "";
        const resolvedUrl = resolveForumMediaUrl(url) ?? url;
        return `<img src="${escapeHtml(resolvedUrl)}" alt="${escapeHtml(alt)}" loading="lazy" class="forum-inline-image" />`;
      }
      return renderParagraph(paragraph);
    })
    .join("");
};
