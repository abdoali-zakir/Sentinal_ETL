import io
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import (
    Dataset,
    DatasetVersion,
    DatasetVersionStatus,
    PipelineRun,
    PipelineRunStatus,
    PipelineStage,
)
from app.services.validation_service import run_validation

router = APIRouter()

REPO_ROOT = Path(__file__).resolve().parents[3]
BRONZE_DIR = REPO_ROOT / "data" / "bronze"


SUPPORTED_EXTENSIONS = {".csv", ".json", ".xlsx"}
UNSUPPORTED_EXTENSION_MSG = (
    "Only .csv, .json, and .xlsx files are supported"
)


def _read_dataframe(content: bytes, extension: str) -> pd.DataFrame:
    buffer = io.BytesIO(content)
    if extension == ".csv":
        return pd.read_csv(buffer)
    if extension == ".json":
        return pd.read_json(buffer)
    if extension == ".xlsx":
        # Multi-sheet Excel files are a known limitation; only the first sheet is read.
        return pd.read_excel(buffer)
    raise HTTPException(
        status_code=400,
        detail=UNSUPPORTED_EXTENSION_MSG,
    )


def _dataframe_metadata(df: pd.DataFrame) -> tuple[int, int, list[dict[str, str]], dict[str, str]]:
    columns = [{"name": col, "dtype": str(dtype)} for col, dtype in df.dtypes.items()]
    dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}
    return len(df), len(df.columns), columns, dtypes


@router.post("/upload")
async def upload_dataset(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    started_at = datetime.now(timezone.utc)
    dataset: Dataset | None = None
    dataset_version: DatasetVersion | None = None
    version_number: int | None = None
    bronze_path: str | None = None

    try:
        extension = Path(file.filename or "").suffix.lower()
        if extension not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=UNSUPPORTED_EXTENSION_MSG,
            )

        content = await file.read()
        df = _read_dataframe(content, extension)
        row_count, column_count, columns, _ = _dataframe_metadata(df)

        result = await db.execute(select(Dataset).where(Dataset.name == name))
        dataset = result.scalar_one_or_none()

        if dataset is None:
            dataset = Dataset(id=uuid.uuid4(), name=name)
            db.add(dataset)
            await db.flush()
            version_number = 1
        else:
            version_result = await db.execute(
                select(func.coalesce(func.max(DatasetVersion.version_number), 0)).where(
                    DatasetVersion.dataset_id == dataset.id
                )
            )
            version_number = version_result.scalar_one() + 1

        bronze_path = f"data/bronze/{dataset.id}/v{version_number}/raw.parquet"
        parquet_file = REPO_ROOT / bronze_path
        parquet_file.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(parquet_file, engine="pyarrow", index=False)

        dataset_version = DatasetVersion(
            dataset_id=dataset.id,
            version_number=version_number,
            bronze_path=bronze_path,
            status=DatasetVersionStatus.uploaded,
            row_count=row_count,
        )
        db.add(dataset_version)
        await db.flush()

        dataset.current_version_id = dataset_version.id

        finished_at = datetime.now(timezone.utc)
        pipeline_run = PipelineRun(
            dataset_version_id=dataset_version.id,
            stage=PipelineStage.ingest,
            status=PipelineRunStatus.success,
            started_at=started_at,
            finished_at=finished_at,
        )
        db.add(pipeline_run)
        await db.commit()

    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:
        await db.rollback()
        finished_at = datetime.now(timezone.utc)

        try:
            if dataset is not None:
                if dataset_version is None:
                    if version_number is None:
                        version_result = await db.execute(
                            select(func.coalesce(func.max(DatasetVersion.version_number), 0)).where(
                                DatasetVersion.dataset_id == dataset.id
                            )
                        )
                        version_number = version_result.scalar_one() + 1

                    dataset_version = DatasetVersion(
                        dataset_id=dataset.id,
                        version_number=version_number,
                        bronze_path=bronze_path or "",
                        status=DatasetVersionStatus.failed,
                        row_count=None,
                    )
                    db.add(dataset_version)
                    await db.flush()

                failed_run = PipelineRun(
                    dataset_version_id=dataset_version.id,
                    stage=PipelineStage.ingest,
                    status=PipelineRunStatus.failed,
                    started_at=started_at,
                    finished_at=finished_at,
                    error_message=str(exc),
                )
                db.add(failed_run)
                await db.commit()
        except Exception:
            await db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Ingestion failed: {exc}",
        ) from exc

    upload_response = {
        "dataset_id": str(dataset.id),
        "version_id": str(dataset_version.id),
        "version_number": version_number,
        "row_count": row_count,
        "column_count": column_count,
        "columns": columns,
        "bronze_path": bronze_path,
    }

    try:
        validation_response = await run_validation(
            db,
            dataset.id,
            dataset_version.id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Upload succeeded but validation failed: {exc}",
        ) from exc

    return {
        **upload_response,
        "validation": validation_response,
    }
