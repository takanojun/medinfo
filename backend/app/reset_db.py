from .database import Base, engine


def reset_db():
    """Drop all tables and recreate them."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database reset completed.")


if __name__ == "__main__":
    reset_db()
