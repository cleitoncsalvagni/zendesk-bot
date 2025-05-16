import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { cohere } from "../config/cohere.js";
import { Article } from "../types/article.js";

dotenv.config();
export class ArticleService {
  private static instance: ArticleService | null = null;
  private articles: Article[] = [];

  private constructor() {}

  public static getInstance(): ArticleService {
    if (!ArticleService.instance) {
      ArticleService.instance = new ArticleService();
    }
    return ArticleService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const articlesPath = path.join(
        process.cwd(),
        "src",
        "data",
        "articles.json"
      );
      const articlesData = await fs.readFile(articlesPath, "utf-8");
      this.articles = JSON.parse(articlesData);

      await this.loadOrGenerateEmbeddings();
    } catch (error) {
      console.error("Erro ao inicializar o serviço de artigos:", error);
      throw error;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async processInBatches<T>(
    items: T[],
    batchSize: number,
    processItem: (item: T) => Promise<void>
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      console.info(
        `Processando lote ${i / batchSize + 1} de ${Math.ceil(
          items.length / batchSize
        )}`
      );

      for (const item of batch) {
        await processItem(item);
        await this.delay(1100);
      }
    }
  }

  private async loadOrGenerateEmbeddings(): Promise<void> {
    const cacheDir = path.join(process.cwd(), "cache");
    const cachePath = path.join(cacheDir, "articles_embeddings.json");

    try {
      if (!this.articles.length) {
        throw new Error("Nenhum artigo carregado para processar");
      }
      console.info(
        `Processando embeddings para ${this.articles.length} artigos`
      );

      await fs.mkdir(cacheDir, { recursive: true });

      let cache: { [key: string]: number[] } = {};
      try {
        const cacheData = await fs.readFile(cachePath, "utf-8");
        cache = JSON.parse(cacheData);
      } catch (error) {
        await fs.writeFile(cachePath, JSON.stringify({}));
      }

      this.articles = this.articles.map((article) => ({
        ...article,
        embedding: cache[article.id] || null,
      }));

      const articlesWithoutEmbeddings = this.articles.filter(
        (article) => !article.embedding
      );

      if (articlesWithoutEmbeddings.length > 0) {
        console.info(
          `Gerando embeddings para ${articlesWithoutEmbeddings.length} artigos sem cache`
        );

        const batchSize = 10;
        let currentCache = { ...cache };

        await this.processInBatches(
          articlesWithoutEmbeddings,
          batchSize,
          async (article) => {
            try {
              console.info(
                `Gerando embedding para artigo ${article.id}: ${article.title}`
              );
              const embedding = await this.generateEmbedding(article.body);
              currentCache[article.id] = embedding;

              const index = this.articles.findIndex((a) => a.id === article.id);
              if (index !== -1) {
                this.articles[index].embedding = embedding;
              }

              await fs.mkdir(path.dirname(cachePath), { recursive: true });

              await fs.writeFile(
                cachePath,
                JSON.stringify(currentCache, null, 2)
              );
            } catch (error) {
              console.error(
                `Erro ao gerar embedding para artigo ${article.id}:`,
                error
              );
            }
          }
        );
      }

      const articlesWithEmbeddings = this.articles.filter(
        (article) =>
          Array.isArray(article.embedding) && article.embedding.length > 0
      );
      console.info(
        `Total de artigos com embeddings válidos: ${articlesWithEmbeddings.length}/${this.articles.length}`
      );
    } catch (error) {
      console.error("Erro ao processar embeddings:", error);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await cohere.embed({
        texts: [text],
        model: "embed-multilingual-v3.0",
        inputType: "search_query",
      });

      if (Array.isArray(response.embeddings)) {
        return response.embeddings[0];
      } else if (
        response.embeddings &&
        typeof response.embeddings === "object"
      ) {
        return Object.values(response.embeddings)[0] as number[];
      }

      throw new Error("Embedding inválido retornado pela API");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Erro detalhado ao gerar embedding:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      } else {
        console.error("Erro desconhecido ao gerar embedding:", error);
      }
      throw error;
    }
  }

  public async findSimilarArticles(
    query: string,
    limit: number = 5
  ): Promise<Article[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);

      const articlesWithScores = this.articles
        .filter(
          (article) =>
            Array.isArray(article.embedding) && article.embedding.length > 0
        )
        .map((article) => {
          const score = this.cosineSimilarity(
            queryEmbedding,
            article.embedding || []
          );
          return {
            ...article,
            score,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (articlesWithScores.length === 0) {
        console.warn("Nenhum artigo com embedding válido encontrado");
        return [];
      }

      const topArticles = articlesWithScores.slice(0, 20).map((article) => ({
        ...article,
        _debug: {
          embeddingSimilarity: (article.score * 100).toFixed(2) + "%",
        },
      }));

      const rerankedResults = await this.rerankResults(
        query,
        topArticles,
        limit
      );

      return rerankedResults;
    } catch (error) {
      console.error("Erro ao buscar artigos similares:", error);
      throw error;
    }
  }

  private async rerankResults(
    query: string,
    articles: Article[],
    topK: number = 5
  ): Promise<Article[]> {
    try {
      const documents = articles.map((article) => article.body);

      const response = await cohere.rerank({
        query,
        documents,
        topN: topK,
        model: "rerank-v3.5",
      });

      return response.results.map((result) => {
        const article = articles[result.index];
        return {
          ...article,
          _debug: {
            relevanceScore: (result.relevanceScore * 100).toFixed(2) + "%",
            confidence:
              result.relevanceScore > 0.65
                ? "high"
                : result.relevanceScore > 0.45
                ? "medium"
                : "low",
          },
        };
      });
    } catch (error) {
      console.error("Erro ao fazer rerank dos resultados:", error);
      throw error;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (
      !Array.isArray(a) ||
      !Array.isArray(b) ||
      a.length === 0 ||
      b.length === 0
    ) {
      throw new Error("Embeddings inválidos para cálculo de similaridade");
    }

    if (a.length !== b.length) {
      throw new Error(
        `Dimensões dos embeddings não correspondem: ${a.length} vs ${b.length}`
      );
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }
}
