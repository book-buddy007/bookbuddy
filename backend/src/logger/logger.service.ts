import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;
  private logLevels: string[];

  constructor(private configService: ConfigService) {
    // Set log levels from environment or default to all levels
    const logLevelStr = this.configService.get<string>('LOG_LEVEL', 'info');

    // Define log level hierarchy
    const allLevels = ['error', 'warn', 'log', 'debug', 'verbose'];

    // Set which levels to log based on configured level
    const levelIndex = allLevels.indexOf(logLevelStr);
    this.logLevels =
      levelIndex >= 0
        ? allLevels.slice(0, levelIndex + 1)
        : ['error', 'warn', 'log'];
  }

  setContext(context: string) {
    this.context = context;
    return this;
  }

  error(message: any, trace?: string, context?: string) {
    if (this.shouldLog('error')) {
      console.error(
        `[${this.getTimestamp()}] [ERROR] [${context || this.context}] ${message}`,
      );
      if (trace) {
        console.error(trace);
      }
    }
  }

  warn(message: any, context?: string) {
    if (this.shouldLog('warn')) {
      console.warn(
        `[${this.getTimestamp()}] [WARN] [${context || this.context}] ${message}`,
      );
    }
  }

  log(message: any, context?: string) {
    if (this.shouldLog('log')) {
      console.log(
        `[${this.getTimestamp()}] [INFO] [${context || this.context}] ${message}`,
      );
    }
  }

  debug(message: any, context?: string) {
    if (this.shouldLog('debug')) {
      console.debug(
        `[${this.getTimestamp()}] [DEBUG] [${context || this.context}] ${message}`,
      );
    }
  }

  verbose(message: any, context?: string) {
    if (this.shouldLog('verbose')) {
      console.log(
        `[${this.getTimestamp()}] [VERBOSE] [${context || this.context}] ${message}`,
      );
    }
  }

  private shouldLog(level: string): boolean {
    return this.logLevels.includes(level);
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }
}
