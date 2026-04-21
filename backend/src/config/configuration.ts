export interface AppConfig {
  PORT: number;
  NODE_ENV: string;
  FRONTEND_URL: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  FB_APP_ID: string;
  FB_APP_SECRET: string;
  FB_CALLBACK_URL: string;
  FB_WEBHOOK_VERIFY_TOKEN: string;
}

export default (): AppConfig => ({
  PORT: parseInt(process.env['PORT'] ?? '3000', 10),
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  FRONTEND_URL: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
  MONGODB_URI: process.env['MONGODB_URI'] ?? '',
  JWT_SECRET: process.env['JWT_SECRET'] ?? 'change-me',
  JWT_EXPIRES_IN: process.env['JWT_EXPIRES_IN'] ?? '7d',
  FB_APP_ID: process.env['FB_APP_ID'] ?? '',
  FB_APP_SECRET: process.env['FB_APP_SECRET'] ?? '',
  FB_CALLBACK_URL: process.env['FB_CALLBACK_URL'] ?? '',
  FB_WEBHOOK_VERIFY_TOKEN: process.env['FB_WEBHOOK_VERIFY_TOKEN'] ?? '',
});
