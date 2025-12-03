export function parseApiError(err: any): string {
  if (!err) return "An unexpected error occurred.";
  // Axios-like shape
  const status = err?.response?.status;
  const data = err?.response?.data;
  const message = data?.message || err?.message;

  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }
  if (status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (typeof message === "string") {
    return message;
  }
  if (Array.isArray(message)) {
    return message.join(", ");
  }
  return "Request failed. Please try again.";
}


