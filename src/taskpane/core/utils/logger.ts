/// <reference types="office-js" />
/**
 * @issue #339
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private redactPatterns: RegExp[] = [
    /(bearer\s+)[^\s"']+/gi,
    /(password\s*[:=]\s*)[^\s,"']+/gi,
    /(secret\s*[:=]\s*)[^\s,"']+/gi,
    /(token\s*[:=]\s*)[^\s,"']+/gi,
    /(clientSecret\s*[:=]\s*)[^\s,"']+/gi,
    /"access_token"\s*:\s*"[^"]+"/gi,
    /"password"\s*:\s*"[^"]+"/gi,
    /"secret"\s*:\s*"[^"]+"/gi,
    /"token"\s*:\s*"[^"]+"/gi,
  ];

  private isHostReady = false;

  constructor() {
    if (typeof Office !== "undefined") {
      Office.onReady(() => {
        this.isHostReady = true;
      });
    } else {
      this.isHostReady = true; // Non-Office environment fallback
    }
  }

  private redact(message: string): string {
    let redactedMessage = message;
    for (const pattern of this.redactPatterns) {
      redactedMessage = redactedMessage.replace(pattern, (match, p1) => {
        if (p1) {
          return p1 + '"[REDACTED]"';
        }
        return match;
      });
    }

    // Fallback simple redactors if the group capture isn't enough:
    redactedMessage = redactedMessage.replace(/([?&]token=)[^&]+/gi, "$1[REDACTED]");
    redactedMessage = redactedMessage.replace(/([?&]secret=)[^&]+/gi, "$1[REDACTED]");
    redactedMessage = redactedMessage.replace(/([?&]password=)[^&]+/gi, "$1[REDACTED]");
    redactedMessage = redactedMessage.replace(/([?&]clientSecret=)[^&]+/gi, "$1[REDACTED]");

    return redactedMessage;
  }

  private formatMessage(args: any[]): string {
    return args
      .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg, null, 2)))
      .join(" ");
  }

  private log(level: LogLevel, ...args: any[]) {
    if (level < this.level) return;
    if (!this.isHostReady) return;

    const message = this.formatMessage(args);
    const redactedMessage = this.redact(message);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(redactedMessage);
        break;
      case LogLevel.INFO:
        console.info(redactedMessage);
        break;
      case LogLevel.WARN:
        console.warn(redactedMessage);
        break;
      case LogLevel.ERROR:
        console.error(redactedMessage);
        break;
    }
  }

  public debug(...args: any[]) {
    this.log(LogLevel.DEBUG, ...args);
  }

  public info(...args: any[]) {
    this.log(LogLevel.INFO, ...args);
  }

  public warn(...args: any[]) {
    this.log(LogLevel.WARN, ...args);
  }

  public error(...args: any[]) {
    this.log(LogLevel.ERROR, ...args);
  }
}

export const logger = new Logger();
