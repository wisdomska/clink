import { llmsTxt, textResponse } from "@/lib/llms";

/** A plain summary for AI assistants and answer engines (llmstxt.org). See src/lib/llms.ts. */
export const dynamic = "force-static";

export function GET() {
  return textResponse(llmsTxt());
}
