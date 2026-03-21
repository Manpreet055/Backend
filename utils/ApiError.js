class ApiError extends Error {
  constructor(message, statusCode) {
    super(message); // calls the parent Error constructor
    this.statusCode = statusCode;
    this.isOperational = true; // Useful to distinguish from programming bugs

    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
