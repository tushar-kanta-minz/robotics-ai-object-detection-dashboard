export function requireIngestKey(req, res, next) {
    if (
        !process.env.INGEST_API_KEY ||
        req.headers['x-ingest-key'] !== process.env.INGEST_API_KEY
    ) {
        return res.status(401).json({
            error: 'Invalid device ingest key'
        });
    }

    next();
}
