import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services.repair_service import (
    NoRepairNeededError,
    ValidationResultNotFoundError,
    get_audit_log,
    run_repair,
)
from app.services.validation_service import DatasetVersionNotFoundError

router = APIRouter()


@router.post("/{dataset_id}/versions/{version_id}/repair")
async def repair_dataset_version(
    dataset_id: uuid.UUID,
    version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        return await run_repair(db, dataset_id, version_id)
    except DatasetVersionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValidationResultNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except NoRepairNeededError as exc:
        return {
            "status": "validated",
            "message": str(exc),
            "repaired_path": None,
            "actions_taken": [],
            "quality_score_before": None,
            "quality_score_after": None,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Repair failed: {exc}",
        ) from exc


@router.get("/{dataset_id}/versions/{version_id}/audit-log")
async def list_audit_log(
    dataset_id: uuid.UUID,
    version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        entries = await get_audit_log(db, dataset_id, version_id)
        return {"entries": entries}
    except DatasetVersionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load audit log: {exc}",
        ) from exc
