import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
  QA = 'qa',
}

export class EnvironmentVariables {
  @IsEnum(Environment, {
    message: 'NODE_ENV must be one of: development, production, test, staging, qa',
  })
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber({}, { message: 'PORT must be a number' })
  @IsOptional()
  PORT: number = 3000;

  @IsString({ message: 'API_PREFIX must be a string' })
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @IsString({ message: 'CORS_ORIGIN must be a string' })
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:5173,http://localhost:3000';

  @IsString({ message: 'DATABASE_URL must be a non-empty connection string' })
  @IsNotEmpty({ message: 'DATABASE_URL is required — provide a valid SQL Server connection string' })
  DATABASE_URL: string;

  @IsString({ message: 'JWT_ACCESS_SECRET must be a string' })
  @IsNotEmpty({ message: 'JWT_ACCESS_SECRET is required — set a strong secret (min 32 characters)' })
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters for security' })
  JWT_ACCESS_SECRET: string;

  @IsString({ message: 'JWT_ACCESS_EXPIRES_IN must be a string' })
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString({ message: 'JWT_REFRESH_SECRET must be a string' })
  @IsNotEmpty({ message: 'JWT_REFRESH_SECRET is required — set a strong secret (min 32 characters)' })
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters for security' })
  JWT_REFRESH_SECRET: string;

  @IsString({ message: 'JWT_REFRESH_EXPIRES_IN must be a string' })
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString({ message: 'MOMO_PARTNER_CODE must be a string' })
  @IsOptional()
  MOMO_PARTNER_CODE: string = 'MOMOBKUN20180529';

  @IsString({ message: 'MOMO_ACCESS_KEY must be a string' })
  @IsOptional()
  MOMO_ACCESS_KEY: string = 'klm05TvNBzhg7h7j';

  @IsString({ message: 'MOMO_SECRET_KEY must be a string' })
  @IsOptional()
  MOMO_SECRET_KEY: string = 'at67qH6mk8w5Y1nAyMoYKMWACiEi2Aca';

  @IsString({ message: 'MOMO_API_ENDPOINT must be a string' })
  @IsOptional()
  MOMO_API_ENDPOINT: string = 'https://test-payment.momo.vn/v2/gateway/api/create';

  @IsString({ message: 'MOMO_REDIRECT_URL must be a string' })
  @IsOptional()
  MOMO_REDIRECT_URL: string = 'http://localhost:5173/payment/result';

  @IsString({ message: 'MOMO_IPN_URL must be a string' })
  @IsOptional()
  MOMO_IPN_URL: string = 'http://localhost:3000/api/v1/payments/momo/ipn';

  @IsOptional()
  MOMO_ENABLE_SANDBOX_FALLBACK?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((err) => Object.values(err.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`[Config Validation Error]: ${messages}`);
  }

  // Safety check: prevent obviously weak or placeholder secrets in any environment
  const weakPatterns = ['your_jwt', 'changeme', 'secret', 'development', 'example', '123456'];
  const isWeakAccessSecret = weakPatterns.some((p) =>
    validatedConfig.JWT_ACCESS_SECRET.toLowerCase().includes(p),
  );
  const isWeakRefreshSecret = weakPatterns.some((p) =>
    validatedConfig.JWT_REFRESH_SECRET.toLowerCase().includes(p),
  );

  if (validatedConfig.NODE_ENV === Environment.Production && (isWeakAccessSecret || isWeakRefreshSecret)) {
    throw new Error(
      '[Security Alert]: Weak or placeholder JWT secrets detected. Use strong, randomly-generated secrets in production!',
    );
  }

  return validatedConfig;
}
