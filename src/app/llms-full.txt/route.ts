import { llmsFullTxt, textResponse } from "@/lib/llms";

/** The full text of every public page, in Markdown, for AI assistants. See src/lib/llms.ts. */
export const dynamic = "force-static";

export function GET() {
  return textResponse(llmsFullTxt());
}
