import { AppError } from './AppError';

export type MiCorreoQuoteErrorCode =
  | 'INVALID_CP'
  | 'LOGIN_FAILED'
  | 'CAPTCHA_DETECTED'
  | 'FORM_STRUCTURE_CHANGED'
  | 'NO_TIERS_AVAILABLE'
  | 'TIMEOUT'
  | 'BROWSER_LAUNCH_FAILED';

export class MiCorreoQuoteError extends AppError {
  constructor(message: string, public readonly quoteCode: MiCorreoQuoteErrorCode) {
    // INVALID_CP es un error del cliente (CP mal escrito) → 400.
    // El resto son fallas nuestras/del portal al cotizar → 502.
    super(message, quoteCode === 'INVALID_CP' ? 400 : 502, `MICORREO_${quoteCode}`);
    this.name = 'MiCorreoQuoteError';
  }
}
