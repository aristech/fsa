import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

export interface LocalNLPEntity {
  type: string;
  value: string;
  symbol: string;
}

export interface LocalNLPResult {
  intent: string;
  title: string;
  description?: string;
  priority: string;
  assignees: string[];
  work_order?: string;
  project?: string;
  client?: string;
  due_date?: string;
  start_date?: string;
  estimated_hours?: number;
  entities: LocalNLPEntity[];
  confidence: number;
  success: boolean;
}

export class LocalNLPService {
  private nlpServerProcess: ChildProcess | null = null;
  private nlpServerUrl = "http://localhost:8001";
  private isStarting = false;

  constructor() {
    this.startNLPServer();
  }

  private async startNLPServer(): Promise<void> {
    if (this.isStarting || this.nlpServerProcess) return;

    this.isStarting = true;

    try {
      // In compiled JS, __dirname points to dist/services/ai, so we need to go back to src
      const nlpDir = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "src",
        "services",
        "ai",
        "local-nlp",
      );
      const pythonScript = path.join(nlpDir, "server.py");

      // Check if Python script exists
      if (!fs.existsSync(pythonScript)) {
        console.warn("[LocalNLP] Python script not found, local NLP disabled");
        this.isStarting = false;
        return;
      }

      // Check if server is already running
      try {
        const response = await fetch(`${this.nlpServerUrl}/health`);
        if (response.ok) {
          console.log("[LocalNLP] Server already running, skipping startup");
          this.isStarting = false;
          return;
        }
      } catch (error) {
        // Server not running, continue with startup
      }

      console.log("[LocalNLP] Starting Python NLP server...");

      // Start Python server using virtual environment
      const venvPython = path.join(nlpDir, "nlp_env", "bin", "python");
      const pythonExecutable = fs.existsSync(venvPython)
        ? venvPython
        : "python3";

      console.log(`[LocalNLP] Using Python: ${pythonExecutable}`);

      this.nlpServerProcess = spawn(pythonExecutable, [pythonScript], {
        cwd: nlpDir,
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.nlpServerProcess.stdout?.on("data", (data) => {
        console.log(`[LocalNLP] ${data.toString().trim()}`);
      });

      this.nlpServerProcess.stderr?.on("data", (data) => {
        console.error(`[LocalNLP] Error: ${data.toString().trim()}`);
      });

      this.nlpServerProcess.on("close", (code) => {
        console.log(`[LocalNLP] Process exited with code ${code}`);
        this.nlpServerProcess = null;
      });

      this.nlpServerProcess.on("error", (error) => {
        console.error("[LocalNLP] Failed to start:", error);
        this.nlpServerProcess = null;
      });

      // Wait for server to start
      await this.waitForServer();
      console.log("[LocalNLP] Server started successfully");
    } catch (error) {
      console.error("[LocalNLP] Failed to start server:", error);
      this.nlpServerProcess = null;
    } finally {
      this.isStarting = false;
    }
  }

  private async waitForServer(maxAttempts = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.nlpServerUrl}/health`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error("NLP server failed to start within timeout");
  }

  async processText(
    text: string | { originalTxt: string; parsedTxt: string },
    userId?: string,
    tenantId?: string,
  ): Promise<LocalNLPResult> {
    try {
      // Check if server is available via health endpoint
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        throw new Error("Local NLP server not available");
      }

      // Handle both string and structured payload
      const payload =
        typeof text === "string"
          ? { text, user_id: userId, tenant_id: tenantId }
          : {
              originalTxt: text.originalTxt,
              parsedTxt: text.parsedTxt,
              user_id: userId,
              tenant_id: tenantId,
            };

      const response = await fetch(`${this.nlpServerUrl}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`NLP server error: ${response.status}`);
      }

      const result = await response.json();
      return result as LocalNLPResult;
    } catch (error) {
      console.error("[LocalNLP] Processing error:", error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if server is responding to health endpoint
      // Don't rely on this.nlpServerProcess as server might be running externally
      const response = await fetch(`${this.nlpServerUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });

      const isAvailable = response.ok;
      console.log(
        `[LocalNLP] Health check: ${response.status} - Available: ${isAvailable}`,
      );
      return isAvailable;
    } catch (error) {
      console.log(
        `[LocalNLP] Health check failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  async runDirectScript(text: string): Promise<LocalNLPResult> {
    /**
     * Alternative method: Run Python script directly without server
     * Useful as fallback if HTTP server fails
     */
    return new Promise((resolve, reject) => {
      const nlpDir = path.join(__dirname, "local-nlp");
      const pythonScript = path.join(nlpDir, "main.py");

      const venvPython = path.join(nlpDir, "nlp_env", "bin", "python");
      const pythonExecutable = fs.existsSync(venvPython)
        ? venvPython
        : "python3";

      const process = spawn(pythonExecutable, [pythonScript, text], {
        cwd: nlpDir,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve({ ...result, success: true });
          } catch (error) {
            reject(new Error(`Failed to parse NLP output: ${error}`));
          }
        } else {
          reject(new Error(`NLP script failed: ${stderr}`));
        }
      });

      process.on("error", (error) => {
        reject(new Error(`Failed to run NLP script: ${error}`));
      });
    });
  }

  destroy(): void {
    if (this.nlpServerProcess) {
      console.log("[LocalNLP] Shutting down server...");
      this.nlpServerProcess.kill("SIGTERM");
      this.nlpServerProcess = null;
    }
  }
}

// Global instance
export const localNLPService = new LocalNLPService();

// Cleanup on process exit
process.on("SIGINT", () => {
  localNLPService.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  localNLPService.destroy();
  process.exit(0);
});
