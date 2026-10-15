"""API endpoints for user in-app notifications and alerts."""

from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.api.deps import get_current_user
from app.schemas.user import UserResponse
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
)
from app.services.notification_repository import (
    SqlAlchemyNotificationRepository,
    get_notification_repository,
)

router = APIRouter()


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="List notifications for the current authenticated user",
)
def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
    notif_repo: SqlAlchemyNotificationRepository = Depends(get_notification_repository),
) -> NotificationListResponse:
    """Fetch paginated notifications along with unread count for the user."""
    notifs, total, unread_count = notif_repo.list_user_notifications(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )
    return NotificationListResponse(
        notifications=notifs,
        total=total,
        unreadCount=unread_count,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get unread notification count",
)
def get_unread_count(
    current_user: UserResponse = Depends(get_current_user),
    notif_repo: SqlAlchemyNotificationRepository = Depends(get_notification_repository),
) -> UnreadCountResponse:
    """Fetch the number of unread alerts for the authenticated user."""
    count = notif_repo.get_unread_count(user_id=current_user.id)
    return UnreadCountResponse(unreadCount=count)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark a notification as read",
)
def mark_as_read(
    notification_id: str,
    current_user: UserResponse = Depends(get_current_user),
    notif_repo: SqlAlchemyNotificationRepository = Depends(get_notification_repository),
) -> NotificationResponse:
    """Mark a specific notification as read."""
    updated = notif_repo.mark_as_read(notification_id=notification_id, user_id=current_user.id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access forbidden.",
        )
    return updated


@router.post(
    "/mark-all-read",
    summary="Mark all user notifications as read",
)
def mark_all_as_read(
    current_user: UserResponse = Depends(get_current_user),
    notif_repo: SqlAlchemyNotificationRepository = Depends(get_notification_repository),
) -> dict:
    """Mark all unread notifications for the user as read."""
    count = notif_repo.mark_all_as_read(user_id=current_user.id)
    return {"message": "All notifications marked as read.", "count": count}


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a notification",
)
def delete_notification(
    notification_id: str,
    current_user: UserResponse = Depends(get_current_user),
    notif_repo: SqlAlchemyNotificationRepository = Depends(get_notification_repository),
) -> None:
    """Delete a single notification owned by the current user."""
    success = notif_repo.delete(notification_id=notification_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access forbidden.",
        )
