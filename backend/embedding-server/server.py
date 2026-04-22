"""
Local Embedding Server (FastEmbed Version)
──────────────────────────────────────────
A lightweight Flask server that generates text embeddings using
FastEmbed (ONNX Runtime). Runs 100% locally, zero API calls.

Model: BAAI/bge-base-en-v1.5  →  768-dimensional embeddings
(matches our Pinecone index dimension)
"""

import time
from flask import Flask, request, jsonify
from fastembed import TextEmbedding

# ─── Configuration ────────────────────────────────
# BGE-base-en-v1.5 is 768 dims and very high quality
MODEL_NAME = "BAAI/bge-base-en-v1.5"
PORT = 5100

app = Flask(__name__)

# Load model once at startup
print(f"Loading embedding model: {MODEL_NAME}...")
start = time.time()
# This will download the model (approx 400MB) on first run
model = TextEmbedding(model_name=MODEL_NAME)
print(f"Model loaded in {time.time() - start:.1f}s")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": MODEL_NAME,
        "dimensions": 768,
    })


@app.route("/embed", methods=["POST"])
def embed_single():
    data = request.get_json(force=True)
    text = data.get("text", "")

    if not text:
        return jsonify({"error": "Missing 'text' field"}), 400

    # fastembed returns a generator
    embeddings = list(model.embed([text]))
    embedding = embeddings[0]

    return jsonify({
        "embedding": embedding.tolist(),
        "dimensions": len(embedding),
    })


@app.route("/embed-batch", methods=["POST"])
def embed_batch():
    data = request.get_json(force=True)
    texts = data.get("texts", [])

    if not texts or not isinstance(texts, list):
        return jsonify({"error": "Missing or invalid 'texts' array"}), 400

    start = time.time()
    embeddings = list(model.embed(texts))
    elapsed = time.time() - start

    print(f"Embedded {len(texts)} texts in {elapsed:.2f}s")

    return jsonify({
        "embeddings": [e.tolist() for e in embeddings],
        "count": len(texts),
        "dimensions": len(embeddings[0]) if len(embeddings) > 0 else 0,
        "elapsed_ms": round(elapsed * 1000),
    })


if __name__ == "__main__":
    print(f"""
+--------------------------------------------------+
|   Local Embedding Server (FastEmbed)             |
|   Model: {MODEL_NAME:<31} |
|   Port:  {PORT:<31} |
|   Dims:  768                                     |
+--------------------------------------------------+
    """)
    app.run(host="0.0.0.0", port=PORT, debug=False)
