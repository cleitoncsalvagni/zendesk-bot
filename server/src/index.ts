import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { ArticleController } from "./controllers/articleController.js";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Muitas requisições, por favor tente novamente mais tarde",
  },
});

app.use("/api/", apiLimiter);

async function startServer() {
  try {
    const articleController = ArticleController.getInstance();
    await articleController.initialize();

    articleController.setupRoutes(app);

    app.listen(PORT, () => {
      console.info(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao iniciar o servidor:", error);
    process.exit(1);
  }
}

startServer();
