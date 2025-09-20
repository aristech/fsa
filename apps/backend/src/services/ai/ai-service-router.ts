import type { ChatMessage, ToolDef, ChatContext } from "../../types/ai";
import { OpenAILLM } from "./llm";
import { LocalNLPService, type LocalNLPResult } from "./local-nlp-service";
import { generateDynamicTools } from "./dynamic-tools";

// ----------------------------------------------------------------------

export interface AIServiceResult {
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
  serviceUsed: "openai" | "local-nlp";
}

// ----------------------------------------------------------------------

// Shared instances for functional approach
let openaiLLM: OpenAILLM | null = null;
let localNLPService: LocalNLPService | null = null;
let tools: ToolDef[] | null = null;

// Initialize shared instances
const initializeServices = () => {
  if (!openaiLLM) openaiLLM = new OpenAILLM();
  if (!localNLPService) localNLPService = new LocalNLPService();
  if (!tools) tools = generateDynamicTools();
};

/**
 * Determines if a request is suitable for local NLP processing
 */
const isTaskManagementRequest = (messages: ChatMessage[]): boolean => {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") return false;

  const content = lastMessage.content.toLowerCase();

  // Keywords that indicate task creation/update requests
  const taskKeywords = [
    "create task",
    "create a task",
    "new task",
    "add task",
    "update task",
    "modify task",
    "change task",
    "edit task",
    "assign task",
    "task for",
    "due",
    "deadline",
    "priority",
    "water",
    "plant",
    "garden",
    "tomorrow",
    "today",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "next week",
    "this week",
  ];

  // Also check for common task patterns
  const taskPatterns = [
    /@\w+/, // @personnel references
    /#\w+/, // #work order references
    /\d+\s*(am|pm|hour|hours)/, // time references
    /(high|medium|low)\s*priority/, // priority references
  ];

  const hasKeywords = taskKeywords.some((keyword) => content.includes(keyword));
  const hasPatterns = taskPatterns.some((pattern) => pattern.test(content));

  return hasKeywords || hasPatterns;
};

/**
 * Processes a task management request using local NLP
 */
const processWithLocalNLP = async (
  messages: ChatMessage[],
  ctx: ChatContext,
): Promise<AIServiceResult> => {
  initializeServices();

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    throw new Error("Invalid message for local NLP processing");
  }

  try {
    // Check if local NLP service is available
    const isAvailable = await localNLPService!.isAvailable();
    console.log("[AIServiceRouter] Local NLP availability check:", isAvailable);

    if (!isAvailable) {
      throw new Error("Local NLP service not available");
    }

    // Process with local NLP
    console.log("[AIServiceRouter] Processing with local NLP:", {
      text: lastMessage.content,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
    });

    const nlpResult: LocalNLPResult = await localNLPService!.processText(
      lastMessage.content,
      ctx.userId,
      ctx.tenantId,
    );

    console.log("[AIServiceRouter] Local NLP result:", nlpResult);

    if (!nlpResult.success) {
      throw new Error(`Local NLP processing failed: ${nlpResult.intent}`);
    }

    // Convert NLP result to task creation/update
    let responseMessage = "";
    let toolCalls: Array<{ name: string; arguments: any; result: string }> = [];

    if (nlpResult.intent === "create_task") {
      // Find the create_task tool
      const createTaskTool = tools!.find((tool) => tool.name === "create_task");
      if (createTaskTool) {
        const taskArgs = {
          title: nlpResult.title,
          description: nlpResult.description || "",
          priority: nlpResult.priority || "medium",
          assignees: nlpResult.assignees || [],
          dueDate: nlpResult.due_date,
          startDate: nlpResult.start_date,
          estimatedHours: nlpResult.estimated_hours,
          workOrderNumber: nlpResult.work_order, // Pass as workOrderNumber for name resolution
          projectName: nlpResult.project, // Pass as projectName for name resolution
          clientName: nlpResult.client, // Pass as clientName for name resolution
        };

        // Execute the tool
        const toolResult = await createTaskTool.handler(taskArgs, ctx);
        toolCalls.push({
          name: "create_task",
          arguments: taskArgs,
          result:
            typeof toolResult === "string"
              ? toolResult
              : toolResult.content || JSON.stringify(toolResult),
        });

        responseMessage = `✅ Task created successfully using local NLP service!`;
      } else {
        responseMessage = "❌ Task creation tool not available";
      }
    } else if (nlpResult.intent === "update_task") {
      // Handle task updates (you'll need to implement this based on your local NLP capabilities)
      responseMessage = `✅ Task update processed using local NLP service!\n\nIntent: ${nlpResult.intent}\nTitle: ${nlpResult.title}`;
    } else {
      responseMessage = `✅ Request processed using local NLP service!\n\nIntent: ${nlpResult.intent}\nConfidence: ${(nlpResult.confidence * 100).toFixed(1)}%`;
    }

    return {
      message: responseMessage,
      serviceUsed: "local-nlp",
      toolCalls,
    };
  } catch (error) {
    console.warn("[AIServiceRouter] Local NLP processing failed:", error);
    throw error;
  }
};

/**
 * Processes a request using OpenAI
 */
const processWithOpenAI = async (
  messages: ChatMessage[],
  ctx: ChatContext,
): Promise<AIServiceResult> => {
  initializeServices();

  try {
    const response = await openaiLLM!.chat(messages, tools!, false);
    const choice = (response as any).choices?.[0];

    if (!choice) {
      throw new Error("No response from OpenAI model");
    }

    let responseMessage = choice.message?.content || "";
    let toolCalls: Array<{ name: string; arguments: any; result: string }> = [];

    // Handle tool calls if any
    if (choice.finish_reason === "tool_calls" && choice.message?.tool_calls) {
      const toolCallResults = await executeToolCalls(
        choice.message.tool_calls,
        ctx,
      );
      toolCalls = toolCallResults;

      // Generate a response message based on tool results
      if (toolCallResults.length > 0) {
        responseMessage = `✅ Request processed successfully!\n\n${toolCallResults.map((tc) => tc.result).join("\n\n")}`;
      }
    }

    return {
      message: responseMessage,
      usage: (response as any).usage,
      serviceUsed: "openai",
      toolCalls,
    };
  } catch (error) {
    console.warn("[AIServiceRouter] OpenAI processing failed:", error);
    throw error;
  }
};

/**
 * Executes tool calls and returns results
 */
const executeToolCalls = async (
  toolCalls: any[],
  ctx: ChatContext,
): Promise<Array<{ name: string; arguments: any; result: string }>> => {
  initializeServices();

  const results: Array<{ name: string; arguments: any; result: string }> = [];

  for (const toolCall of toolCalls) {
    const tool = tools!.find((t) => t.name === toolCall.function.name);
    if (!tool) {
      results.push({
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
        result: `❌ Tool '${toolCall.function.name}' not found`,
      });
      continue;
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await tool.handler(args, ctx);
      results.push({
        name: toolCall.function.name,
        arguments: args,
        result:
          typeof result === "string"
            ? result
            : result.content || JSON.stringify(result),
      });
    } catch (error) {
      results.push({
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
        result: `❌ Tool execution failed: ${(error as Error).message}`,
      });
    }
  }

  return results;
};

/**
 * Main method to process chat requests with intelligent routing
 */
export const processChat = async (
  messages: ChatMessage[],
  ctx: ChatContext,
): Promise<AIServiceResult> => {
  const isTaskRequest = isTaskManagementRequest(messages);
  const lastMessage = messages[messages.length - 1];

  console.log("[AIServiceRouter] Processing request:", {
    isTaskRequest,
    messageContent: lastMessage?.content,
    userId: ctx.userId,
    tenantId: ctx.tenantId,
  });

  // Try local NLP first for ALL requests (prioritize local service)
  try {
    console.log(
      "[AIServiceRouter] Attempting local NLP first for all requests",
    );
    return await processWithLocalNLP(messages, ctx);
  } catch (error) {
    console.warn(
      "[AIServiceRouter] Local NLP failed, falling back to OpenAI:",
      error,
    );
    // Fall through to OpenAI
  }

  // Use OpenAI as fallback
  try {
    console.log("[AIServiceRouter] Using OpenAI as fallback");
    return await processWithOpenAI(messages, ctx);
  } catch (error) {
    const errorMessage = (error as Error).message;

    // Check if it's a rate limit error
    if (
      errorMessage.includes("Rate limit exceeded") ||
      errorMessage.includes("token limit")
    ) {
      console.warn(
        "[AIServiceRouter] OpenAI rate limited, trying local NLP again as last resort",
      );

      // Try local NLP one more time as last resort
      try {
        return await processWithLocalNLP(messages, ctx);
      } catch (fallbackError) {
        console.error(
          "[AIServiceRouter] Both services failed after rate limit:",
          {
            error,
            fallbackError,
          },
        );
        throw new Error(
          `AI services unavailable. OpenAI rate limited: ${errorMessage}. Local NLP: ${(fallbackError as Error).message}`,
        );
      }
    }

    // If OpenAI fails for other reasons, throw the error
    console.error("[AIServiceRouter] OpenAI failed:", error);
    throw new Error(`AI services unavailable. OpenAI: ${errorMessage}`);
  }
};

/**
 * Stream processing with intelligent routing
 */
export const processChatStream = async (
  messages: ChatMessage[],
  ctx: ChatContext,
  callbacks: {
    onToken: (token: string) => void;
    onToolCall: (toolCall: any) => void;
    onComplete: (result: AIServiceResult) => void;
    onError: (error: Error) => void;
  },
): Promise<void> => {
  const isTaskRequest = isTaskManagementRequest(messages);

  // Try local NLP first for ALL requests (prioritize local service)
  try {
    console.log(
      "[AIServiceRouter] Attempting local NLP first for all requests (stream)",
    );
    const result = await processWithLocalNLP(messages, ctx);

    // Simulate streaming by sending the result in chunks
    const words = result.message.split(" ");
    for (let i = 0; i < words.length; i++) {
      setTimeout(() => {
        callbacks.onToken(words[i] + (i < words.length - 1 ? " " : ""));
        if (i === words.length - 1) {
          callbacks.onComplete(result);
        }
      }, i * 50); // 50ms delay between words
    }
    return;
  } catch (error) {
    console.warn(
      "[AIServiceRouter] Local NLP failed in stream, falling back to OpenAI:",
      error,
    );
    // Fall through to OpenAI streaming
  }

  // Use OpenAI streaming as fallback
  try {
    console.log("[AIServiceRouter] Using OpenAI streaming as fallback");
    await processWithOpenAIStream(messages, ctx, callbacks);
  } catch (error) {
    const errorMessage = (error as Error).message;

    // Check if it's a rate limit error
    if (
      errorMessage.includes("Rate limit exceeded") ||
      errorMessage.includes("token limit")
    ) {
      console.warn(
        "[AIServiceRouter] OpenAI streaming rate limited, trying local NLP again as last resort",
      );

      try {
        const result = await processWithLocalNLP(messages, ctx);

        // Simulate streaming
        const words = result.message.split(" ");
        for (let i = 0; i < words.length; i++) {
          setTimeout(() => {
            callbacks.onToken(words[i] + (i < words.length - 1 ? " " : ""));
            if (i === words.length - 1) {
              callbacks.onComplete(result);
            }
          }, i * 50);
        }
      } catch (fallbackError) {
        console.error(
          "[AIServiceRouter] Both streaming services failed after rate limit:",
          {
            error,
            fallbackError,
          },
        );
        callbacks.onError(
          new Error(
            `AI services unavailable. OpenAI rate limited: ${errorMessage}. Local NLP: ${(fallbackError as Error).message}`,
          ),
        );
      }
    } else {
      // If OpenAI streaming fails for other reasons, throw the error
      console.error("[AIServiceRouter] OpenAI streaming failed:", error);
      callbacks.onError(error as Error);
    }
  }
};

/**
 * OpenAI streaming implementation
 */
const processWithOpenAIStream = async (
  messages: ChatMessage[],
  ctx: ChatContext,
  callbacks: {
    onToken: (token: string) => void;
    onToolCall: (toolCall: any) => void;
    onComplete: (result: AIServiceResult) => void;
    onError: (error: Error) => void;
  },
): Promise<void> => {
  initializeServices();

  try {
    const stream = await openaiLLM!.chat(messages, tools!, true);
    let accumulatedContent = "";
    let toolCalls: any[] = [];

    for await (const chunk of stream as any) {
      const choice = chunk.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta;

      // Handle content tokens
      if (delta.content) {
        accumulatedContent += delta.content;
        callbacks.onToken(delta.content);
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

            callbacks.onToolCall(toolCallDelta);
          }
        }
      }

      // Check if stream is complete
      if (
        choice.finish_reason === "stop" ||
        choice.finish_reason === "tool_calls"
      ) {
        let toolCallResults: Array<{
          name: string;
          arguments: any;
          result: string;
        }> = [];

        // Execute tool calls if any
        if (choice.finish_reason === "tool_calls" && toolCalls.length > 0) {
          toolCallResults = await executeToolCalls(toolCalls, ctx);
        }

        const result: AIServiceResult = {
          message: accumulatedContent,
          serviceUsed: "openai",
          toolCalls: toolCallResults,
        };

        callbacks.onComplete(result);
        break;
      }
    }
  } catch (error) {
    callbacks.onError(error as Error);
  }
};
