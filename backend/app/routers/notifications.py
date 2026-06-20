from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import RoleChecker, get_current_active_user
from app.models import models
from app.schemas import schemas
from typing import Optional

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _get_parent_family_id(current_user: models.User) -> str:
    """
    Extracts family_id from the logged-in parent's profile.
    Raises 403 if the profile is missing.
    Centralised here so all three endpoints share the same guard.
    """
    parent_profile = current_user.parent_profile
    if not parent_profile:
        raise HTTPException(status_code=403, detail="Parent profile not initialized")
    return parent_profile.family_id


@router.get(
    "/",
    response_model=list[schemas.NotificationResponse],
    dependencies=[Depends(RoleChecker(["Parent"]))],
)
def list_notifications(
    unread_only: Optional[bool] = False,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Returns all notifications for the logged-in parent's family,
    ordered newest first. Pass ?unread_only=true to filter to unread only.
    """
    family_id = _get_parent_family_id(current_user)

    query = db.query(models.Notification).filter(
        models.Notification.family_id == family_id
    )
    if unread_only:
        query = query.filter(models.Notification.is_read == False)

    return query.order_by(models.Notification.created_at.desc()).all()


@router.get(
    "/unread-count",
    response_model=schemas.UnreadCountResponse,
    dependencies=[Depends(RoleChecker(["Parent"]))],
)
def unread_count(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Returns the count of unread notifications for the logged-in parent.
    Intended for badge display on the parent dashboard.
    """
    family_id = _get_parent_family_id(current_user)

    count = db.query(models.Notification).filter(
        models.Notification.family_id == family_id,
        models.Notification.is_read == False,
    ).count()

    return {"count": count}


@router.patch(
    "/{notification_id}/read",
    response_model=schemas.NotificationResponse,
    dependencies=[Depends(RoleChecker(["Parent"]))],
)
def mark_as_read(
    notification_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Marks a single notification as read.
    Verifies the notification belongs to the calling parent's family_id
    before allowing the update — parents cannot mark other families' notifications.
    """
    family_id = _get_parent_family_id(current_user)

    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Ownership check — prevents a parent from touching another family's record
    if notification.family_id != family_id:
        raise HTTPException(status_code=403, detail="Access denied")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.patch(
    "/mark-all-read",
    dependencies=[Depends(RoleChecker(["Parent"]))],
)
def mark_all_read(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Marks all unread notifications for the logged-in parent's family as read.
    Useful for a 'clear all' button on the parent dashboard.
    """
    family_id = _get_parent_family_id(current_user)

    db.query(models.Notification).filter(
        models.Notification.family_id == family_id,
        models.Notification.is_read == False,
    ).update({"is_read": True})

    db.commit()
    return {"detail": "All notifications marked as read"}