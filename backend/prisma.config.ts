import dotenv from "dotenv";
import path from "path";
import { defineConfig, env } from "prisma/config";

// Load environment (.env.development vs .env.production)
const nodeEnv = process.env.NODE_ENV || "development";
const envFile = nodeEnv === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL") || env("DATABASE_URL"),
  },
});
