import { z } from "zod";

// ----------------------------------------------------------------------

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
};

export type ToolDef = {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  handler: (args: unknown, ctx: ChatContext) => Promise<{ content: string }>;
};

export type StreamEvent = {
  type: "token" | "tool_delta" | "done" | "error" | "event";
  data?: string;
  error?: string;
};

export type ChatContext = {
  userId: string;
  tenantId: string;
  emitEvent?: (event: { type: string; data: any }) => void;
};
