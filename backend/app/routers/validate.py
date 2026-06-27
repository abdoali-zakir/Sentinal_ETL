import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services.validation_service import DatasetVersionNotFoundError, run_validation

router = APIRouter()


@router.post("/{dataset_id}/versions/{version_id}/validate")
async def validate_dataset_version(
    dataset_id: uuid.UUID,
    version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        return await run_validation(db, dataset_id, version_id)
    except DatasetVersionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Validation failed: {exc}",
        ) from exc
