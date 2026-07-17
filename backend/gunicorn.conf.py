import multiprocessing

# 2 workers per CPU core is the standard starting point for async workers.
# Tune down if the embedding model's memory footprint makes this too heavy.
workers = multiprocessing.cpu_count() * 2
worker_class = "uvicorn.workers.UvicornWorker"
bind = "0.0.0.0:8000"
timeout = 120       # Give OCR/embedding room to breathe on large files
keepalive = 5
accesslog = "-"
errorlog = "-"
