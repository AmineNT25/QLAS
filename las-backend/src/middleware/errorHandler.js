export const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.url}`, err);

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(409).json({ message: "A record with that value already exists." });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(422).json({ message: err.message });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format." });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
