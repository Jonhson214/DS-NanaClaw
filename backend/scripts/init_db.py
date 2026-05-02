"""数据库初始化脚本。

用法:
    python -m scripts.init_db
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine

from app.config import settings
from app.models.db_models import Base


def main():
    print(f"Connecting to database: {settings.database_url}")
    engine = create_engine(settings.database_url)

    print("Creating tables...")
    Base.metadata.create_all(engine)

    print("Database initialization complete.")
    print("Tables created:")
    for table_name in Base.metadata.tables:
        print(f"  - {table_name}")


if __name__ == "__main__":
    main()
