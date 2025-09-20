import type { ChatMessage, ToolDef, ChatContext } from "../../types/ai";
import { OpenAILLM } from "./llm";
import { LocalNLPService, type LocalNLPResult } from "./local-nlp-service";
import { generateDynamicTools } from "./dynamic-tools";
import { AISettingsService } from "../ai-settings-service";
import { Types } from "mongoose";

/**
 * Validate and parse entity IDs from parsed text
 */
const validateAndParseEntities = (
  parsedText: string,
): { isValid: boolean; entities: Array<{ type: string; id: string }> } => {
  const entities: Array<{ type: string; id: string }> = [];
  const validEntityTypes = [
    "task",
    "work_order",
    "personnel",
    "project",
    "client",
  ];

  // Find all entity={id} patterns
  const entityMatches = parsedText.match(/(\w+)=\{([^}]+)\}/g) || [];

  for (const match of entityMatches) {
    const [, entityType, id] = match.match(/(\w+)=\{([^}]+)\}/) || [];

    if (!entityType || !id) {
      console.warn(`[EntityValidation] Invalid entity format: ${match}`);
      return { isValid: false, entities: [] };
    }

    // Check if entity type is valid
    if (!validEntityTypes.includes(entityType)) {
      console.warn(`[EntityValidation] Invalid entity type: ${entityType}`);
      return { isValid: false, entities: [] };
    }

    // Check if ID is a valid MongoDB ObjectId
    if (!Types.ObjectId.isValid(id)) {
      console.warn(`[EntityValidation] Invalid MongoDB ObjectId: ${id}`);
      return { isValid: false, entities: [] };
    }

    entities.push({ type: entityType, id });
    console.log(`[EntityValidation] Valid entity: ${entityType}={${id}}`);
  }

  return { isValid: true, entities };
};

/**
 * Create structured payload for Local NLP with resolved symbols
 */
const createStructuredPayload = async (
  originalText: string,
  ctx: ChatContext,
): Promise<{ originalTxt: string; parsedTxt: string }> => {
  console.log(
    `[SymbolResolution] Creating structured payload for: "${originalText}"`,
  );

  // Precise symbol detection for different types
  const symbolMatches = [];

  // Task IDs: /10, /123 (numbers only)
  const taskMatches = originalText.match(/(\/\d+)(?=\s|$)/g) || [];
  symbolMatches.push(...taskMatches);

  // Personnel: @John, @John Doe (names)
  const personnelMatches =
    originalText.match(
      /(@[A-Za-zΑ-Ωα-ω][A-Za-zΑ-Ωα-ω\s]*?)(?=\s+(?:for|in|with|due|at|from|by|από|για|σε|με|μέχρι|στις|στο|στη|έως|ως|title|$)|$)/g,
    ) || [];
  symbolMatches.push(...personnelMatches);

  // Work Orders: #Garden, #Garden Care (descriptions)
  const workOrderMatches =
    originalText.match(
      /(#[A-Za-zΑ-Ωα-ω][A-Za-zΑ-Ωα-ω\s]*?)(?=\s+(?:for|in|with|due|at|from|by|από|για|σε|με|μέχρι|στις|στο|στη|έως|ως|title|$)|$)/g,
    ) || [];
  symbolMatches.push(...workOrderMatches);

  // Projects: +Project Name
  const projectMatches =
    originalText.match(
      /(\+[A-Za-zΑ-Ωα-ω][A-Za-zΑ-Ωα-ω\s]*?)(?=\s+(?:for|in|with|due|at|from|by|από|για|σε|με|μέχρι|στις|στο|στη|έως|ως|title|$)|$)/g,
    ) || [];
  symbolMatches.push(...projectMatches);

  // Clients: &Client Name
  const clientMatches =
    originalText.match(
      /(&[A-Za-zΑ-Ωα-ω][A-Za-zΑ-Ωα-ω\s]*?)(?=\s+(?:for|in|with|due|at|from|by|από|για|σε|με|μέχρι|στις|στο|στη|έως|ως|title|$)|$)/g,
    ) || [];
  symbolMatches.push(...clientMatches);

  if (symbolMatches.length === 0) {
    return {
      originalTxt: originalText,
      parsedTxt: originalText,
    };
  }

  let parsedText = originalText;
  const resolvedSymbols: Array<{ original: string; resolved: string }> = [];

  // Resolve each symbol using autocomplete
  for (const symbolMatch of symbolMatches) {
    const symbolType = symbolMatch[0]; // @, #, /, +, &
    const query = symbolMatch.substring(1).trim(); // Remove symbol prefix

    try {
      // Call autocomplete service
      const response = await fetch(
        `${process.env.API_URL || "http://localhost:3001"}/api/v1/autocomplete?symbol=${encodeURIComponent(symbolType)}&query=${encodeURIComponent(query)}&limit=1&token=${ctx.token || ""}`,
      );

      if (response.ok) {
        const data = (await response.json()) as any;

        if (data.success && data.suggestions && data.suggestions.length > 0) {
          const suggestion = data.suggestions[0];

          // Extract the actual MongoDB ObjectId from the suggestion
          let entityId: string;
          if (typeof suggestion === "object" && suggestion._id) {
            entityId = suggestion._id;
          } else if (typeof suggestion === "object" && suggestion.id) {
            entityId = suggestion.id;
          } else if (symbolType === "/" && Types.ObjectId.isValid(query)) {
            // For task IDs, if the query itself is a valid ObjectId, use it
            entityId = query;
          } else {
            // Fallback: try to extract ID from string representation
            const idMatch = suggestion
              .toString()
              .match(/ObjectId\('([^']+)'\)|"_id"\s*:\s*"([^"]+)"/);
            entityId = idMatch
              ? idMatch[1] || idMatch[2]
              : suggestion.toString();
          }

          // Create structured replacement based on symbol type
          let replacement: string;
          switch (symbolType) {
            case "/":
              replacement = `task={${entityId}}`;
              break;
            case "@":
              replacement = `personnel={${entityId}}`;
              break;
            case "#":
              replacement = `work_order={${entityId}}`;
              break;
            case "+":
              replacement = `project={${entityId}}`;
              break;
            case "&":
              replacement = `client={${entityId}}`;
              break;
            default:
              replacement = symbolMatch;
          }

          resolvedSymbols.push({
            original: symbolMatch,
            resolved: replacement,
          });
          console.log(
            `[SymbolResolution] Resolved ${symbolMatch} -> ${replacement}`,
          );
        }
      }
    } catch (error) {
      console.warn(`[SymbolResolution] Error resolving ${symbolMatch}:`, error);
    }
  }

  // Replace symbols in the text
  resolvedSymbols.forEach(({ original, resolved }) => {
    parsedText = parsedText.replace(original, resolved);
  });

  // Validate entities in the parsed text
  const validation = validateAndParseEntities(parsedText);

  if (!validation.isValid) {
    console.warn(
      `[SymbolResolution] Entity validation failed, returning original text`,
    );
    return {
      originalTxt: originalText,
      parsedTxt: originalText,
    };
  }

  const payload = {
    originalTxt: originalText,
    parsedTxt: parsedText,
  };

  console.log(`[SymbolResolution] Structured payload:`, payload);
  console.log(`[SymbolResolution] Validated entities:`, validation.entities);
  return payload;
};

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
  if (!localNLPService) localNLPService = new LocalNLPService();
  if (!tools) tools = generateDynamicTools();
};

// Initialize OpenAI LLM with user's API key
const initializeOpenAI = async (ctx: ChatContext): Promise<OpenAILLM> => {
  try {
    // Get user's AI settings
    const settings = await AISettingsService.getSettings(
      ctx.userId,
      ctx.tenantId,
    );

    if (settings?.openaiApiKey) {
      console.log(
        `[AIServiceRouter] Using user's OpenAI API key for user ${ctx.userId}`,
      );
      return new OpenAILLM(settings.openaiApiKey);
    } else {
      console.log(
        `[AIServiceRouter] No user API key found, using environment variable for user ${ctx.userId}`,
      );
      return new OpenAILLM(); // Falls back to environment variable
    }
  } catch (error) {
    console.warn(
      `[AIServiceRouter] Failed to get user settings, using environment variable:`,
      error,
    );
    return new OpenAILLM(); // Falls back to environment variable
  }
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

    // Create structured payload with resolved symbols
    const structuredPayload = await createStructuredPayload(
      lastMessage.content,
      ctx,
    );

    // Process with local NLP using structured payload
    console.log("[AIServiceRouter] Processing with local NLP:", {
      originalText: structuredPayload.originalTxt,
      parsedText: structuredPayload.parsedTxt,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
    });

    const nlpResult: LocalNLPResult = await localNLPService!.processText(
      structuredPayload,
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
      // Find the update_task tool
      const updateTaskTool = tools!.find((tool) => tool.name === "update_task");
      if (updateTaskTool) {
        // Extract task ID from entities
        const taskEntity = nlpResult.entities?.find((e) => e.type === "task");
        if (!taskEntity) {
          responseMessage = "❌ Task ID not found in update request";
        } else {
          const taskArgs = {
            id: taskEntity.value, // Use the task ID from entities
            title: nlpResult.title,
            description: nlpResult.description,
            priority: nlpResult.priority,
            assignees: nlpResult.assignees || [],
            dueDate: nlpResult.due_date,
            startDate: nlpResult.start_date,
            estimatedHours: nlpResult.estimated_hours,
            workOrderNumber: nlpResult.work_order,
            projectName: nlpResult.project,
            clientName: nlpResult.client,
          };

          // Execute the tool
          const toolResult = await updateTaskTool.handler(taskArgs, ctx);
          toolCalls.push({
            name: "update_task",
            arguments: taskArgs,
            result:
              typeof toolResult === "string"
                ? toolResult
                : toolResult.content || JSON.stringify(toolResult),
          });

          responseMessage = `✅ Task updated successfully using local NLP service!`;
        }
      } else {
        responseMessage = "❌ Task update tool not available";
      }
    } else {
      // For unknown intents, don't show the user - just throw error to fall back to OpenAI
      throw new Error(
        `Local NLP service cannot handle intent: ${nlpResult.intent}`,
      );
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
    // Initialize OpenAI with user's API key
    const userOpenAI = await initializeOpenAI(ctx);
    const response = await userOpenAI.chat(messages, tools!, false);
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
    console.log(
      "[AIServiceRouter] Local NLP not suitable for this request, using OpenAI:",
      (error as Error).message,
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
    console.log(
      "[AIServiceRouter] Local NLP not suitable for this request, using OpenAI:",
      (error as Error).message,
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
    // Initialize OpenAI with user's API key
    const userOpenAI = await initializeOpenAI(ctx);
    const stream = await userOpenAI.chat(messages, tools!, true);
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
