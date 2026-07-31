export interface AppErrorDetalle {
  path: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: AppErrorDetalle[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}
