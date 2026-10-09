export function fail(statusCode, code, message, fields) {
  const error = new Error(message); Object.assign(error, {statusCode, code, fields}); throw error;
}
