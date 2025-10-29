import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";
import type { ZodSchema } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const formattedErrors = result.error.issues.map((issue) => ({
        field: this.formatPath(issue.path),
        message: issue.message,
        code: issue.code,
      }));

      throw new BadRequestException({
        message: "Validation failed",
        errors: formattedErrors,
      });
    }

    return result.data;
  }

  private formatPath(path: (string | number | symbol)[]): string {
    return path
      .map((segment) => {
        if (typeof segment === "symbol") {
          return segment.toString();
        }
        return String(segment);
      })
      .join(".");
  }
}
