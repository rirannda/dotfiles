const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

export function shortenMediaText(text: string, limit = 14): string {
  const parts = Array.from(segmenter.segment(text.trim().replace(/\s+/g, " ")), part => part.segment);
  return parts.length <= limit ? parts.join("") : `${parts.slice(0, limit - 3).join("")}...`;
}
