import type { ToolDef } from "../../types/ai";
import { generateDynamicTools } from "./dynamic-tools";

// ----------------------------------------------------------------------

// Initialize empty registry - tools will be populated dynamically based on user context
export let toolRegistry: ToolDef[] = [];

// Helper to initialize tools with user context
export async function initializeToolRegistry(userId?: string, tenantId?: string): Promise<ToolDef[]> {
  toolRegistry = await generateDynamicTools(userId, tenantId);
  return toolRegistry;
}
