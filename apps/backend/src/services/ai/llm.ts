import OpenAI from "openai";
import { z } from "zod";
import type { ChatMessage, ToolDef } from "../../types/ai";

// ----------------------------------------------------------------------

export class OpenAILLM {
  private client: OpenAI;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private minRequestInterval = 100; // Minimum 100ms between requests
  private defaultModel: string;
  private maxTokens: number;
  private temperature: number;

  constructor(apiKey?: string, model?: string, maxTokens?: number, temperature?: number) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        "Missing OPENAI_API_KEY. Please set OPENAI_API_KEY environment variable or provide tenant ai_api_key in settings.",
      );
    }
    this.client = new OpenAI({ apiKey: key });
    this.defaultModel = model || "gpt-4o-mini";
    this.maxTokens = maxTokens || 1024;
    this.temperature = temperature !== undefined ? temperature : 0.7;

    console.log(`[OpenAILLM] Initialized with model: ${this.defaultModel}, maxTokens: ${this.maxTokens}, temperature: ${this.temperature}`);
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minRequestInterval) {
        await this.sleep(this.minRequestInterval - timeSinceLastRequest);
      }

      const request = this.requestQueue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        try {
          await request();
        } catch (error) {
          console.error('[OpenAI] Queue request failed:', error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        // Check if it's a rate limit error
        if (error?.status === 429) {
          if (attempt === maxRetries) {
            throw new Error(
              `Rate limit exceeded. Please try again later. Your organization has reached the token limit for gpt-4o-mini.`
            );
          }

          // Extract retry delay from error if available
          const retryAfter = error?.headers?.['retry-after'];
          const delay = retryAfter
            ? parseInt(retryAfter) * 1000
            : baseDelay * Math.pow(2, attempt);

          console.log(`[OpenAI] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(delay);
          continue;
        }

        // For non-rate-limit errors, throw immediately
        throw error;
      }
    }

    throw new Error('Maximum retry attempts exceeded');
  }

  async chat(messages: ChatMessage[], tools?: ToolDef[], stream = false) {
    return this.retryWithBackoff(async () => {
      const toolSpecs = tools?.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: this.zodToJsonSchema(t.schema),
        },
      }));

      const openaiMessages = messages.map((m) => {
        if (m.role === "tool" && m.toolCallId) {
          return {
            role: "tool" as const,
            content: m.content,
            tool_call_id: m.toolCallId,
          };
        }

        if (m.role === "assistant") {
          return {
            role: "assistant" as const,
            content: m.content,
          };
        }

        if (m.role === "user") {
          return {
            role: "user" as const,
            content: m.content,
            ...(m.name && { name: m.name }),
          };
        }

        if (m.role === "system") {
          return {
            role: "system" as const,
            content: m.content,
          };
        }

        // Default fallback
        return {
          role: "user" as const,
          content: m.content,
        };
      });

      console.log(`[OpenAILLM] Making request with model: ${this.defaultModel}, stream: ${stream}, messages count: ${openaiMessages.length}`);

      const request = {
        model: this.defaultModel,
        messages: openaiMessages,
        tools: toolSpecs,
        tool_choice: tools && tools.length > 0 ? "auto" : undefined,
        stream,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      };

      console.log(`[OpenAILLM] Request config:`, {
        model: request.model,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        tools_count: toolSpecs?.length || 0,
        stream: request.stream
      });

      const response = await this.client.chat.completions.create(request);

      if (stream) {
        console.log(`[OpenAILLM] Stream response created successfully`);
      } else {
        console.log(`[OpenAILLM] Non-stream response created successfully`);
      }

      return response;
    });
  }

  private zodToJsonSchema(schema: z.ZodTypeAny): any {
    // Simplified Zod to JSON Schema converter
    // For production, consider using zod-to-json-schema library
    try {
      return this.convertZodType(schema);
    } catch (error) {
      console.warn("Failed to convert Zod schema to JSON Schema:", error);
      return { type: "object", properties: {} };
    }
  }

  private convertZodType(schema: z.ZodTypeAny): any {
    // Unwrap effects (transform/refine) to underlying schema
    const def: any = (schema as any)?._def;
    if (def?.typeName === "ZodEffects" && def.schema) {
      return this.convertZodType(def.schema);
    }
    if (schema instanceof z.ZodObject) {
      const properties: Record<string, any> = {};
      const required: string[] = [];
      const shape = (schema as any).shape;

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.convertZodType(value as z.ZodTypeAny);
        if (!(value as any).isOptional?.()) {
          required.push(key);
        }
      }

      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    if (schema instanceof z.ZodString) {
      return { type: "string" };
    }

    if (schema instanceof z.ZodNumber) {
      return { type: "number" };
    }

    if (schema instanceof z.ZodBoolean) {
      return { type: "boolean" };
    }

    if (schema instanceof z.ZodArray) {
      return {
        type: "array",
        items: this.convertZodType((schema as any)._def.type),
      };
    }

    if (schema instanceof z.ZodOptional) {
      return this.convertZodType((schema as any)._def.innerType);
    }

    if (schema instanceof z.ZodNullable) {
      const inner = this.convertZodType((schema as any)._def.innerType);
      return {
        anyOf: [inner, { type: "null" }],
      };
    }

    if (schema instanceof z.ZodDefault) {
      const innerSchema = (schema as any)._def.innerType;
      const result = this.convertZodType(innerSchema);
      const def = (schema as any)._def.defaultValue;
      // In some zod versions defaultValue is a function, in others it's a value
      result.default = typeof def === "function" ? def() : def;
      return result;
    }

    if (schema instanceof z.ZodEnum) {
      return {
        type: "string",
        enum: (schema as any)._def.values,
      };
    }

    if (schema instanceof z.ZodLiteral) {
      const value = (schema as any)._def.value;
      const typeOf = typeof value;
      return typeOf === "string"
        ? { type: "string", const: value }
        : typeOf === "number"
          ? { type: "number", const: value }
          : typeOf === "boolean"
            ? { type: "boolean", const: value }
            : { const: value };
    }

    if (schema instanceof z.ZodUnion) {
      const options = (schema as any)._def.options as z.ZodTypeAny[];
      return {
        anyOf: options.map((opt) => this.convertZodType(opt)),
      };
    }

    if (schema instanceof z.ZodRecord) {
      const valueType = (schema as any)._def.valueType as z.ZodTypeAny;
      return {
        type: "object",
        additionalProperties: this.convertZodType(valueType),
      };
    }

    // Fallback for unknown types
    return { type: "string" };
  }
}
