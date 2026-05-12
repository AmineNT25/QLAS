export const notFound = (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
};
