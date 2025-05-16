import { CohereClient } from "cohere-ai";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.COHERE_API_KEY) {
  throw new Error("COHERE_API_KEY is not set in .env file");
}

export const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});
