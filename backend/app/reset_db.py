from .database import Base, engine
from . import models  # ensure models are registered with Base


def reset_db():
    """Drop all tables and recreate them."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database reset completed.")


if __name__ == "__main__":
    reset_db()
