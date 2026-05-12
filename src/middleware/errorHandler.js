/**
 * Global error handler — catches anything passed to next(err)
 */
export const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.url}`, err);

  // Supabase-specific errors
  if (err.code === "23505") {
    return res.status(409).json({ message: "A record with that value already exists." });
  }
  if (err.code === "23503") {
    return res.status(400).json({ message: "Referenced resource does not exist." });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
