import { afterEach, describe, expect, it, vi } from "vitest";

import { renderForumContent } from "@/utils/renderForumContent";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("論壇文章內容解析器", () => {
  it("解析前台相容的圖片 Markdown 並補上 API 網域", () => {
    vi.stubEnv("VITE_API_URL", "https://localhost:8080");

    const html = renderForumContent("前文\n\n![測試圖](/uploads/forum-images/test.webp)\n\n後文");

    expect(html).toContain("<p>前文</p>");
    expect(html).toContain(
      '<img src="https://localhost:8080/uploads/forum-images/test.webp" alt="測試圖" loading="lazy" class="forum-inline-image" />'
    );
    expect(html).toContain("<p>後文</p>");
  });

  it("轉義一般文字並保留前台自訂文字樣式", () => {
    const html = renderForumContent("[[bold|粗體]]\n\n<script>alert(1)</script>");

    expect(html).toContain("<strong>粗體</strong>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });
});
