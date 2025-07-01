import csv
import sys

from .database import SessionLocal
from .models import MedicalFacility


def import_from_csv(csv_path: str) -> None:
    session = SessionLocal()
    created = 0
    try:
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                facility = MedicalFacility(
                    short_name=row.get("short_name", ""),
                    official_name=row.get("official_name"),
                    prefecture=row.get("prefecture"),
                    city=row.get("city"),
                    address_detail=row.get("address_detail"),
                    phone_numbers=row.get("phone_numbers").split("|") if row.get("phone_numbers") else None,
                    fax=row.get("fax"),
                    remarks=row.get("remarks"),
                )
                session.add(facility)
                created += 1
        session.commit()
        print(f"Imported {created} facilities")
    finally:
        session.close()


def main():
    if len(sys.argv) != 2:
        print("Usage: python import_facilities_csv.py <csv_file>")
        sys.exit(1)
    import_from_csv(sys.argv[1])


if __name__ == "__main__":
    main()
