import { spawn } from "child_process";
import path from "path";
import { ArticleService } from "./articleService.js";

export class ZendeskSyncService {
  private static instance: ZendeskSyncService | null = null;
  private syncInProgress: boolean = false;

  private constructor() {}

  public static getInstance(): ZendeskSyncService {
    if (!ZendeskSyncService.instance) {
      ZendeskSyncService.instance = new ZendeskSyncService();
    }
    return ZendeskSyncService.instance;
  }

  public async syncArticles(): Promise<boolean> {
    if (this.syncInProgress) {
      console.log("Sync already in progress");
      return false;
    }

    this.syncInProgress = true;
    try {
      const scriptPath = path.join(
        process.cwd(),
        "..",
        "zendesk-sync",
        "get-articles.py"
      );

      const hasChanges = await new Promise<boolean>((resolve, reject) => {
        const pythonProcess = spawn(
          path.join(
            process.cwd(),
            "..",
            "zendesk-sync",
            "venv",
            "bin",
            "python"
          ),
          [scriptPath]
        );

        let output = "";

        pythonProcess.stdout.on("data", (data) => {
          output += data.toString();
          console.log(`Python output: ${data}`);
        });

        pythonProcess.stderr.on("data", (data) => {
          console.error(`Python error: ${data}`);
        });

        pythonProcess.on("close", async (code) => {
          if (code === 0) {
            const hasChanges = output.includes(
              "Articles updated - changes detected"
            );
            if (hasChanges) {
              const articleService = ArticleService.getInstance();
              await articleService.initialize();
              console.log("Articles reloaded and embeddings updated");
            }
            resolve(hasChanges);
          } else {
            reject(new Error(`Python script exited with code ${code}`));
          }
        });
      });

      return hasChanges;
    } catch (error) {
      console.error("Error syncing articles:", error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }
}
