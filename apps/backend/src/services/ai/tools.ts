import type { ToolDef } from "../../types/ai";
import { generateDynamicTools } from "./dynamic-tools";

// ----------------------------------------------------------------------

export const toolRegistry: ToolDef[] = generateDynamicTools();
