import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Resolve environments folder path
const envDir = path.resolve(process.cwd(), "src/environments");

// Ensure the folder exists
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
  console.log("📁 Created environments folder:", envDir);
}

const apiUrl = process.env.API_URL || "http://localhost:3000/";
const nodeEnv = process.env.NODE_ENV || "development";

// Environment file content
const devEnv = `export const environment = {
  production: false,
  apiUrl: '${apiUrl}',
  i18nHash: ${Date.now()},
};
`;

const prodEnv = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  i18nHash: ${Date.now()},
};
`;

// Write files
fs.writeFileSync(path.join(envDir, "environment.ts"), devEnv, "utf8");
fs.writeFileSync(path.join(envDir, "environment.prod.ts"), prodEnv, "utf8");

console.log("✅ Environment files generated successfully!");
console.log(`🌍 NODE_ENV=${nodeEnv}`);
console.log(`🌍 API_URL=${apiUrl}`);
