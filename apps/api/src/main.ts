import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST ?? "localhost";
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
  });
  await app.listen(port);
  console.log(`NestJs server is running on http://${host}:${port}`);
}
bootstrap();
