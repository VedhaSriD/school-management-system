"""
Receipt Sequence Seeder
=======================
Run this ONCE after migration to initialize the receipt_sequence table.

It sets last_number to the current maximum sequential counter extracted
from existing receipt numbers (format: REC-YYYY-NNNNN), so the new
sequencer continues from where the old count-based system left off.

Usage:
    python seed_receipt_sequence.py

Safe to run multiple times — it will not overwrite if a row already exists
with a value greater than what it computes.
"""

import sys
import os
import re

# Allow running from the backend/ directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.models import ReceiptSequence, Payment


def seed():
    db = SessionLocal()
    try:
        # Find the highest sequential counter from existing receipt numbers.
        # Handles format REC-YYYY-NNNNN — extracts the NNNNN part.
        existing_payments = db.query(Payment.receipt_number).all()

        max_counter = 0
        pattern = re.compile(r"^REC-\d{4}-(\d+)$")

        for (receipt_number,) in existing_payments:
            match = pattern.match(receipt_number)
            if match:
                counter = int(match.group(1))
                if counter > max_counter:
                    max_counter = counter

        # Check if sequence row already exists
        sequence_row = db.query(ReceiptSequence).filter(ReceiptSequence.id == 1).first()

        if sequence_row is None:
            sequence_row = ReceiptSequence(id=1, last_number=max_counter)
            db.add(sequence_row)
            print(f"Created receipt_sequence row with last_number={max_counter}")
        elif sequence_row.last_number < max_counter:
            # Only update if existing value is behind the real data
            old_value = sequence_row.last_number
            sequence_row.last_number = max_counter
            print(f"Updated receipt_sequence from {old_value} to {max_counter}")
        else:
            print(f"receipt_sequence already at {sequence_row.last_number}, no update needed.")

        db.commit()
        print("Receipt sequence seeding complete.")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()