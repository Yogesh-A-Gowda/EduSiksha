
from sqlalchemy import create_engine, inspect
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/eduguard")
print(f"Connecting to {SQLALCHEMY_DATABASE_URL}")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
inspector = inspect(engine)

columns = inspector.get_columns("kids")
print("Columns in kids table:")
for col in columns:
    print(f"- {col['name']} ({col['type']})")

