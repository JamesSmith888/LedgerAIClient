export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: number;
}

export interface ApiError {
  message: string;
  code?: number;
  details?: any;
}

