
from app.services.pdf_generator import generate_practice_paper

# Test data
history = [
    {"role": "user", "content": "What is photosynthesis?"},
    {"role": "assistant", "content": "Photosynthesis is..."},
]

try:
    qp_path, key_path = generate_practice_paper(history, 999)
    print(f"Success! QP: {qp_path}, Key: {key_path}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

