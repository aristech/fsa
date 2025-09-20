import type { ChatMessage, ToolDef, ChatContext } from "../../types/ai";
import { OpenAILLM } from "./llm";
import { toolRegistry } from "./tools";
import {
  processChat,
  processChatStream,
  type AIServiceResult,
} from "./ai-service-router";

// ----------------------------------------------------------------------

export interface ChatResult {
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: Array<{
    name: string;
    arguments: any;
    result: string;
  }>;
  serviceUsed?: "openai" | "local-nlp";
}

export async function runChat({
  messages,
  ctx,
  tools = toolRegistry,
}: {
  messages: ChatMessage[];
  ctx: ChatContext;
  tools?: ToolDef[];
}): Promise<ChatResult> {
  try {
    const result = await processChat(messages, ctx);

    return {
      message: result.message,
      usage: result.usage,
      toolCalls: result.toolCalls,
      serviceUsed: result.serviceUsed,
    };
  } catch (error) {
    console.error("AI chat failed:", error);
    throw new Error(`AI chat failed: ${(error as Error).message}`);
  }
}

// Legacy function - keeping for backward compatibility
export async function runChatLegacy({
  messages,
  ctx,
  tools = toolRegistry,
}: {
  messages: ChatMessage[];
  ctx: ChatContext;
  tools?: ToolDef[];
}): Promise<ChatResult> {
  const llm = new OpenAILLM();

  try {
    // Initial call to LLM with available tools
    const response = await llm.chat(messages, tools, false);
    const choice = (response as any).choices?.[0];

    if (!choice) {
      throw new Error("No response from AI model");
    }

    // Check if the model wants to call tools
    if (choice.finish_reason === "tool_calls" && choice.message?.tool_calls) {
      const toolCalls = choice.message.tool_calls;
      const toolResponses: ChatMessage[] = [];
      const executedTools: Array<{
        name: string;
        arguments: any;
        result: string;
      }> = [];

      // Execute each tool call
      for (const toolCall of toolCalls) {
        const tool = tools.find((t) => t.name === toolCall.function.name);

        if (!tool) {
          console.warn(`Unknown tool requested: ${toolCall.function.name}`);
          const errorResponse: ChatMessage = {
            role: "tool",
            content: JSON.stringify({
              error: `Unknown tool: ${toolCall.function.name}`,
            }),
            name: toolCall.function.name,
            toolCallId: toolCall.id,
          };
          toolResponses.push(errorResponse);
          continue;
        }

        try {
          // Parse tool arguments
          const args = JSON.parse(toolCall.function.arguments || "{}");

          // Execute the tool with tenant/user context
          const result = await tool.handler(args, ctx);

          const toolResponse: ChatMessage = {
            role: "tool",
            content: result.content,
            name: toolCall.function.name,
            toolCallId: toolCall.id,
          };

          toolResponses.push(toolResponse);
          executedTools.push({
            name: tool.name,
            arguments: args,
            result: result.content,
          });
        } catch (error: any) {
          console.error(`Tool execution error for ${tool.name}:`, error);

          const errorResponse: ChatMessage = {
            role: "tool",
            content: JSON.stringify({
              error: error.message || "Tool execution failed",
              tool: tool.name,
            }),
            name: toolCall.function.name,
            toolCallId: toolCall.id,
          };

          toolResponses.push(errorResponse);
          executedTools.push({
            name: tool.name,
            arguments: JSON.parse(toolCall.function.arguments || "{}"),
            result: `Error: ${error.message}`,
          });
        }
      }

      // Make a follow-up call with tool results
      const followUpMessages: ChatMessage[] = [
        ...messages,
        {
          role: "assistant",
          content: choice.message.content || "",
          ...(choice.message.tool_calls && { name: "assistant" }),
        },
        ...toolResponses,
      ];

      const followUpResponse = await llm.chat(followUpMessages, tools, false);
      const followUpChoice = (followUpResponse as any).choices?.[0];

      return {
        message: followUpChoice?.message?.content || "No response generated",
        usage: (followUpResponse as any).usage
          ? {
              promptTokens: (followUpResponse as any).usage.prompt_tokens,
              completionTokens: (followUpResponse as any).usage
                .completion_tokens,
              totalTokens: (followUpResponse as any).usage.total_tokens,
            }
          : undefined,
        toolCalls: executedTools,
      };
    }

    // No tool calls, return the direct response
    return {
      message: choice.message?.content || "No response generated",
      usage: (response as any).usage
        ? {
            promptTokens: (response as any).usage.prompt_tokens,
            completionTokens: (response as any).usage.completion_tokens,
            totalTokens: (response as any).usage.total_tokens,
          }
        : undefined,
    };
  } catch (error: any) {
    console.error("Chat orchestration error:", error);
    throw new Error(`AI chat failed: ${error.message}`);
  }
}

export async function streamChat({
  messages,
  ctx,
  tools = toolRegistry,
  onToken,
  onToolCall,
  onComplete,
  onError,
}: {
  messages: ChatMessage[];
  ctx: ChatContext;
  tools?: ToolDef[];
  onToken: (token: string) => void;
  onToolCall: (toolCall: any) => void;
  onComplete: (result: ChatResult) => void;
  onError: (error: Error) => void;
}): Promise<void> {
  try {
    await processChatStream(messages, ctx, {
      onToken,
      onToolCall,
      onComplete: (result) => {
        onComplete({
          message: result.message,
          usage: result.usage,
          toolCalls: result.toolCalls,
          serviceUsed: result.serviceUsed,
        });
      },
      onError,
    });
  } catch (error) {
    onError(error as Error);
  }
}

// Legacy streaming function - keeping for backward compatibility
export async function streamChatLegacy({
  messages,
  ctx,
  tools = toolRegistry,
  onToken,
  onToolCall,
  onComplete,
  onError,
}: {
  messages: ChatMessage[];
  ctx: ChatContext;
  tools?: ToolDef[];
  onToken: (token: string) => void;
  onToolCall: (toolCall: any) => void;
  onComplete: (result: ChatResult) => void;
  onError: (error: Error) => void;
}): Promise<void> {
  const llm = new OpenAILLM();

  try {
    const stream = await llm.chat(messages, tools, true);
    let accumulatedContent = "";
    let toolCalls: any[] = [];
    let currentToolCall: any = null;

    for await (const chunk of stream as any) {
      const choice = chunk.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta;

      // Handle content tokens
      if (delta.content) {
        accumulatedContent += delta.content;
        onToken(delta.content);
      }

      // Handle tool calls
      if (delta.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          if (toolCallDelta.index !== undefined) {
            // Initialize or update tool call
            if (!toolCalls[toolCallDelta.index]) {
              toolCalls[toolCallDelta.index] = {
                id: "",
                type: "function",
                function: { name: "", arguments: "" },
              };
            }

            const toolCall = toolCalls[toolCallDelta.index];

            if (toolCallDelta.id) {
              toolCall.id = toolCallDelta.id;
            }

            if (toolCallDelta.function) {
              if (toolCallDelta.function.name) {
                toolCall.function.name = toolCallDelta.function.name;
              }
              if (toolCallDelta.function.arguments) {
                toolCall.function.arguments += toolCallDelta.function.arguments;
              }
            }

            onToolCall(toolCallDelta);
          }
        }
      }

      // Check if stream is complete
      if (
        choice.finish_reason === "stop" ||
        choice.finish_reason === "tool_calls"
      ) {
        if (toolCalls.length > 0) {
          // Execute tools and continue streaming
          try {
            const toolResponses: ChatMessage[] = [];
            const executedTools: Array<{
              name: string;
              arguments: any;
              result: string;
            }> = [];

            for (const toolCall of toolCalls) {
              const tool = tools.find((t) => t.name === toolCall.function.name);

              if (!tool) {
                toolResponses.push({
                  role: "tool",
                  content: JSON.stringify({
                    error: `Unknown tool: ${toolCall.function.name}`,
                  }),
                  tool_call_id: toolCall.id,
                });
                executedTools.push({
                  name: toolCall.function.name,
                  arguments: {},
                  result: "Error: Unknown tool",
                });
                continue;
              }

              try {
                const args = JSON.parse(toolCall.function.arguments || "{}");
                const result = await tool.handler(args, ctx);

                toolResponses.push({
                  role: "tool",
                  content: result.content,
                  tool_call_id: toolCall.id,
                });

                executedTools.push({
                  name: tool.name,
                  arguments: args,
                  result: result.content,
                });
              } catch (error: any) {
                const argsSafe = (() => {
                  try {
                    return JSON.parse(toolCall.function.arguments || "{}");
                  } catch {
                    return {};
                  }
                })();
                toolResponses.push({
                  role: "tool",
                  content: JSON.stringify({
                    error: error?.message || "Tool execution failed",
                    tool: tool.name,
                  }),
                  tool_call_id: toolCall.id,
                });
                executedTools.push({
                  name: tool.name,
                  arguments: argsSafe,
                  result: `Error: ${error?.message || "Tool execution failed"}`,
                });
              }
            }

            // Continue with follow-up call
            const followUpMessages: ChatMessage[] = [
              ...messages,
              {
                role: "assistant",
                content: accumulatedContent,
                tool_calls: toolCalls.map((tc) => ({
                  id: tc.id,
                  type: "function",
                  function: {
                    name: tc.function.name,
                    arguments: tc.function.arguments,
                  },
                })),
              },
              ...toolResponses,
            ];

            // Stream the follow-up response
            const followUpStream = await llm.chat(
              followUpMessages,
              tools,
              true,
            );
            let followUpContent = "";

            for await (const followUpChunk of followUpStream as any) {
              const followUpChoice = followUpChunk.choices?.[0];
              if (followUpChoice?.delta?.content) {
                followUpContent += followUpChoice.delta.content;
                onToken(followUpChoice.delta.content);
              }

              if (followUpChoice?.finish_reason === "stop") {
                onComplete({
                  message: accumulatedContent + followUpContent,
                  toolCalls: executedTools,
                });
                return;
              }
            }
          } catch (error: any) {
            onError(new Error(`Tool execution failed: ${error.message}`));
            return;
          }
        } else {
          onComplete({
            message: accumulatedContent,
          });
          return;
        }
      }
    }
  } catch (error: any) {
    // Check if it's a rate limit error and provide user-friendly message
    if (error.message?.includes("Rate limit exceeded")) {
      onError(
        new Error(
          "AI service is temporarily busy due to high usage. Please try again in a few minutes.",
        ),
      );
    } else if (error.message?.includes("tokens per min")) {
      onError(
        new Error(
          "AI service has reached its usage limit. Please try again later.",
        ),
      );
    } else {
      onError(new Error(`AI service error: ${error.message}`));
    }
  }
}
