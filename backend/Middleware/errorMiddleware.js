const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const databaseAuthFailed = error.code === "ER_ACCESS_DENIED_ERROR";
  const status = databaseAuthFailed
    ? 503
    : error.message === "Origin is not allowed by CORS."
      ? 403
      : Number(error.status || error.statusCode) || 500;
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const message = databaseAuthFailed
    ? "The API cannot authenticate with MySQL. Check DB_USER and DB_PASSWORD in backend/.env, then restart the backend."
    : safeStatus < 500
      ? error.message
      : safeStatus === 503 || safeStatus === 504
        ? error.message
        : "Internal server error. Please try again.";

  // Log only non-sensitive identifiers; request bodies can contain passenger details.
  console.error("API request failed", {
    method: req.method,
    path: req.path,
    code: error.code || error.name || "Error",
    status: safeStatus,
  });

  res.status(safeStatus).json({
    success: false,
    message,
  });
};

export default errorHandler;
