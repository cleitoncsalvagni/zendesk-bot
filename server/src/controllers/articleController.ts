import { Request, Response } from "express";
import { ArticleService } from "../services/articleService.js";

export class ArticleController {
  private static instance: ArticleController | null = null;
  private articleService: ArticleService;

  private constructor() {
    this.articleService = ArticleService.getInstance();
  }

  public static getInstance(): ArticleController {
    if (!ArticleController.instance) {
      ArticleController.instance = new ArticleController();
    }
    return ArticleController.instance;
  }

  public async initialize(): Promise<void> {
    await this.articleService.initialize();
  }

  public setupRoutes(app: any): void {
    app.post("/api/articles/search", this.searchArticles.bind(this));
  }

  private async searchArticles(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.body;

      if (!query || typeof query !== "string") {
        res.status(400).json({
          success: false,
          error: "Query é obrigatória e deve ser uma string",
        });
        return;
      }

      const articles = await this.articleService.findSimilarArticles(query);

      res.json({
        success: true,
        data: articles,
      });
    } catch (error) {
      console.error("Erro ao buscar artigos:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno ao processar sua requisição",
      });
    }
  }
}
