from sqlalchemy.orm import Session
from app.models.models import ReceiptSequence
from datetime import datetime


def next_receipt_number(db: Session) -> str:
    """
    Returns the next receipt number in the format REC-YYYY-NNNNN.

    Acquires a FOR UPDATE row lock on the single ReceiptSequence row
    for the duration of the caller's transaction. The lock is released
    when the caller calls db.commit(). This serializes concurrent payment
    requests so no two transactions can read the same counter value.

    Must be called inside an active transaction. Never call db.commit()
    inside this function — that would release the lock prematurely.
    """
    year = datetime.now().year

    row = (
        db.query(ReceiptSequence)
        .filter(ReceiptSequence.id == 1)
        .with_for_update()
        .first()
    )

    if row is None:
        # Defensive fallback: row should always exist after startup guard runs.
        # If somehow missing, create it rather than crashing the payment.
        row = ReceiptSequence(id=1, last_number=0)
        db.add(row)
        db.flush()

    row.last_number += 1
    db.flush()

    return f"REC-{year}-{row.last_number:05d}"