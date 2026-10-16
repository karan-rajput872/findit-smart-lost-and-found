"""
Persistent Storage Service for FindIt

Handles image and file uploads to persistent cloud object storage (Cloudinary)
when configured in production, or to persistent local disk storage as a reliable fallback.
"""

import os
import uuid
import logging
from datetime import datetime
from typing import Dict, Any

from app.core.config import settings

logger = logging.getLogger("findit.storage")


def upload_image_to_storage(contents: bytes, ext: str, original_filename: str = "") -> Dict[str, str]:
    """Upload image bytes to Cloudinary if configured, otherwise persist to local UPLOAD_DIR.

    Returns:
        Dict[str, str]: { "url": "<accessible_url>", "filename": "<stored_reference>" }
    """
    safe_basename = f"item_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:8]}"
    safe_filename = f"{safe_basename}{ext}"

    # Try Cloudinary if credentials are configured
    if settings.is_cloudinary_configured:
        try:
            import cloudinary
            import cloudinary.uploader

            # Configure cloudinary instance
            if settings.CLOUDINARY_URL:
                cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL, secure=True)
            else:
                cloudinary.config(
                    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                    api_key=settings.CLOUDINARY_API_KEY,
                    api_secret=settings.CLOUDINARY_API_SECRET,
                    secure=True,
                )

            logger.info("Uploading image to Cloudinary persistent storage...")
            upload_result: Dict[str, Any] = cloudinary.uploader.upload(
                contents,
                folder="findit/items",
                public_id=safe_basename,
                resource_type="image",
                overwrite=True,
            )

            secure_url = upload_result.get("secure_url") or upload_result.get("url")
            public_id = upload_result.get("public_id") or safe_filename
            logger.info("Cloudinary upload successful: %s", secure_url)

            return {
                "url": secure_url,
                "filename": public_id,
            }
        except ImportError:
            logger.warning(
                "Cloudinary credentials configured but 'cloudinary' package is not installed. Falling back to local storage."
            )
        except Exception as e:
            logger.error("Cloudinary upload failed: %s. Falling back to local storage.", e, exc_info=True)

    # Local filesystem storage fallback
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    dest_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    with open(dest_path, "wb") as f:
        f.write(contents)

    logger.info("Saved image to local storage: %s", dest_path)
    return {
        "url": f"/uploads/{safe_filename}",
        "filename": safe_filename,
    }
