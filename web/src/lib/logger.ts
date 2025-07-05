// Frontend logger utility
interface LoggerOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  timestamp?: boolean;
}

class Logger {
  private options: LoggerOptions;

  constructor(options: LoggerOptions = { level: 'info', timestamp: true }) {
    this.options = options;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = this.options.timestamp ? `[${new Date().toISOString()}] ` : '';
    return `${timestamp}[${level.toUpperCase()}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
  }

  debug(message: string, data?: any) {
    if (this.options.level === 'debug') {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any) {
    if (['debug', 'info'].includes(this.options.level)) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any) {
    if (['debug', 'info', 'warn'].includes(this.options.level)) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, data?: any) {
    console.error(this.formatMessage('error', message, data));
  }
}

const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  timestamp: true
});

export default logger; 