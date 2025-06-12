import { ApiError } from '../types/index.js';

/**
 * Format error responses consistently for MCP tools
 */
export function formatErrorResponse(error: ApiError | unknown): {
  content: Array<{ type: 'text'; text: string }>;
} {
  let errorMessage: string;
  
  if (error && typeof error === 'object' && 'type' in error) {
    const apiError = error as ApiError;
    switch (apiError.type) {
      case 'permission':
        errorMessage = `❌ Permission Error\n\n${apiError.message}`;
        if ('suggestion' in apiError) {
          errorMessage += `\n\n💡 Suggestion: ${apiError.suggestion}`;
        }
        break;
      case 'not_found':
        errorMessage = `❌ Not Found\n\n${apiError.message}`;
        break;
      case 'api_error':
        errorMessage = `❌ API Error\n\n${apiError.message}`;
        break;
      default:
        errorMessage = `❌ Error\n\n${JSON.stringify(apiError, null, 2)}`;
    }
  } else if (error instanceof Error) {
    errorMessage = `❌ Error\n\n${error.message}`;
    if (error.stack) {
      errorMessage += `\n\nStack trace:\n${error.stack}`;
    }
  } else {
    errorMessage = `❌ Unknown Error\n\n${JSON.stringify(error, null, 2)}`;
  }
  
  return {
    content: [
      {
        type: 'text',
        text: errorMessage,
      },
    ],
  };
}