"""
Startup guard for receipt_sequence table.
Called from main.py on application startup.

Ensures the sequence row exists even in fresh dev environments
where seed_receipt_sequence.py was not run manually.
Does nothing if the row already exists.
"""

from sqlalchemy.orm import Session
from app.models.models import ReceiptSequence, Payment
from sqlalchemy import func
import re


def ensure_receipt_sequence(db: Session) -> None:
    """
    Idempotent. Safe to call on every startup.
    Creates the sequence row if missing, seeding from existing payment data.
    Does not overwrite an existing row that already has a valid value.
    """
    existing = db.query(ReceiptSequence).filter(ReceiptSequence.id == 1).first()
    if existing is not None:
        return  # Already initialized, nothing to do

    # Compute max counter from existing receipts
    existing_receipts = db.query(Payment.receipt_number).all()
    pattern = re.compile(r"^REC-\d{4}-(\d+)$")
    max_counter = 0

    for (receipt_number,) in existing_receipts:
        match = pattern.match(receipt_number)
        if match:
            counter = int(match.group(1))
            if counter > max_counter:
                max_counter = counter

    db.add(ReceiptSequence(id=1, last_number=max_counter))
    db.commit()