"""Orchestration layer for dataset version repair."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AuditLogEntry,
    DatasetVersion,
    DatasetVersionStatus,
    PipelineRun,
    PipelineRunStatus,
    PipelineStage,
    RepairAction,
    RepairActionType,
    ValidationResult,
)
from app.services.repair_engine import run_repair_pipeline
from app.services.validation_engine import (
    check_date_format,
    check_duplicates,
    check_nulls,
    check_types,
    compute_quality_score,
    detect_schema_drift,
)
from app.services.validation_service import (
    DatasetVersionNotFoundError,
    _all_checks_passed,
    _current_column_schema,
    _read_parquet_column_schema,
    _read_parquet_dataframe,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
SYSTEM_ACTOR = "system"


class ValidationResultNotFoundError(Exception):
    """Raised when no validation result exists for a dataset version."""


class NoRepairNeededError(Exception):
    """Raised when a dataset version has already passed validation."""


def _parquet_path(relative_path: str) -> Path:
    return REPO_ROOT / relative_path


def _validation_result_to_repair_input(validation_result: ValidationResult) -> dict:
    return {
        "null_check_passed": validation_result.null_check_passed,
        "null_report": validation_result.null_report,
        "type_check_passed": validation_result.type_check_passed,
        "type_report": validation_result.type_report,
        "duplicate_check_passed": validation_result.duplicate_check_passed,
        "duplicate_count": validation_result.duplicate_count,
        "schema_drift_detected": validation_result.schema_drift_detected,
        "schema_drift_report": validation_result.schema_drift_report,
        "date_format_passed": validation_result.date_format_passed,
        "date_format_report": validation_result.date_format_report,
        "quality_score": validation_result.quality_score,
    }


def _failed_checks_summary(validation_result: ValidationResult) -> dict[str, bool]:
    return {
        "null_check": not validation_result.null_check_passed,
        "type_check": not validation_result.type_check_passed,
        "duplicate_check": not validation_result.duplicate_check_passed,
        "schema_drift": validation_result.schema_drift_detected,
        "date_format_check": not validation_result.date_format_passed,
    }


async def _load_previous_schema(
    db: AsyncSession,
    dataset_version: DatasetVersion,
) -> tuple[dict[str, str] | None, dict[str, str] | None]:
    previous_columns: dict[str, str] | None = None
    expected_schema: dict[str, str] | None = None

    if dataset_version.version_number <= 1:
        return previous_columns, expected_schema

    previous_result = await db.execute(
        select(DatasetVersion).where(
            DatasetVersion.dataset_id == dataset_version.dataset_id,
            DatasetVersion.version_number == dataset_version.version_number - 1,
            DatasetVersion.status != DatasetVersionStatus.failed,
        )
    )
    previous_version = previous_result.scalar_one_or_none()
    if previous_version is not None:
        previous_columns = _read_parquet_column_schema(previous_version.bronze_path)
        expected_schema = previous_columns

    return previous_columns, expected_schema


def _evaluate_dataframe(
    df: pd.DataFrame,
    expected_schema: dict[str, str] | None,
    previous_columns: dict[str, str] | None,
) -> tuple[float, bool]:
    current_columns = _current_column_schema(df)
    total_rows = len(df)

    null_result = check_nulls(df)
    type_result = check_types(df, expected_schema)
    duplicate_result = check_duplicates(df)
    drift_result = detect_schema_drift(current_columns, previous_columns)
    date_format_result = check_date_format(df)

    quality_score = compute_quality_score(
        null_result,
        type_result,
        duplicate_result,
        drift_result,
        date_format_result,
        total_rows,
    )
    all_passed = _all_checks_passed(
        null_result,
        type_result,
        duplicate_result,
        drift_result,
        date_format_result,
    )
    return quality_score, all_passed


def _repair_action_from_log(
    dataset_version_id: uuid.UUID,
    action_log: dict,
) -> RepairAction:
    action_type = RepairActionType(action_log["action_type"])
    return RepairAction(
        dataset_version_id=dataset_version_id,
        action_type=action_type,
        target_column=action_log.get("target_column"),
        before_value_sample=action_log.get("before_value_sample"),
        after_value_sample=action_log.get("after_value_sample"),
        rows_affected=int(action_log.get("rows_affected", 0)),
        success=bool(action_log.get("success", True)),
    )


def _audit_entry_to_dict(entry: AuditLogEntry) -> dict:
    return {
        "id": str(entry.id),
        "dataset_version_id": str(entry.dataset_version_id),
        "event_type": entry.event_type,
        "actor": entry.actor,
        "details": entry.details,
        "created_at": entry.created_at.isoformat(),
    }


async def get_audit_log(
    db: AsyncSession,
    dataset_id: uuid.UUID,
    version_id: uuid.UUID,
) -> list[dict]:
    """Return audit log entries for a dataset version, oldest first."""
    version_result = await db.execute(
        select(DatasetVersion).where(
            DatasetVersion.id == version_id,
            DatasetVersion.dataset_id == dataset_id,
        )
    )
    if version_result.scalar_one_or_none() is None:
        raise DatasetVersionNotFoundError(
            f"Dataset version {version_id} not found for dataset {dataset_id}"
        )

    entries_result = await db.execute(
        select(AuditLogEntry)
        .where(AuditLogEntry.dataset_version_id == version_id)
        .order_by(AuditLogEntry.created_at.asc())
    )
    entries = entries_result.scalars().all()
    return [_audit_entry_to_dict(entry) for entry in entries]


async def run_repair(
    db: AsyncSession,
    dataset_id: uuid.UUID,
    version_id: uuid.UUID,
) -> dict:
    """Repair a dataset version based on its latest validation result."""
    started_at = datetime.now(timezone.utc)

    version_result = await db.execute(
        select(DatasetVersion).where(
            DatasetVersion.id == version_id,
            DatasetVersion.dataset_id == dataset_id,
        )
    )
    dataset_version = version_result.scalar_one_or_none()
    if dataset_version is None:
        raise DatasetVersionNotFoundError(
            f"Dataset version {version_id} not found for dataset {dataset_id}"
        )

    if dataset_version.status == DatasetVersionStatus.validated:
        raise NoRepairNeededError(
            "No repair needed — this version has already passed all validation checks."
        )

    validation_result_query = await db.execute(
        select(ValidationResult)
        .where(ValidationResult.dataset_version_id == version_id)
        .order_by(ValidationResult.created_at.desc())
        .limit(1)
    )
    validation_result = validation_result_query.scalar_one_or_none()
    if validation_result is None:
        raise ValidationResultNotFoundError(
            f"No validation result found for dataset version {version_id}"
        )

    quality_score_before = validation_result.quality_score
    validation_input = _validation_result_to_repair_input(validation_result)

    try:
        df = _read_parquet_dataframe(dataset_version.bronze_path)

        attempted_entry = AuditLogEntry(
            dataset_version_id=dataset_version.id,
            event_type="repair_attempted",
            actor=SYSTEM_ACTOR,
            details={
                "failed_checks": _failed_checks_summary(validation_result),
                "quality_score_before": quality_score_before,
            },
        )
        db.add(attempted_entry)

        repaired_df, action_logs = run_repair_pipeline(df, validation_input)

        repair_actions = [
            _repair_action_from_log(dataset_version.id, action_log)
            for action_log in action_logs
        ]
        for repair_action in repair_actions:
            db.add(repair_action)

        repaired_path = (
            f"data/bronze/{dataset_id}/v{dataset_version.version_number}/repaired.parquet"
        )
        repaired_file = _parquet_path(repaired_path)
        repaired_file.parent.mkdir(parents=True, exist_ok=True)
        repaired_df.to_parquet(repaired_file, engine="pyarrow", index=False)

        previous_columns, expected_schema = await _load_previous_schema(
            db,
            dataset_version,
        )
        quality_score_after, revalidation_passed = _evaluate_dataframe(
            repaired_df,
            expected_schema,
            previous_columns,
        )

        if revalidation_passed:
            dataset_version.status = DatasetVersionStatus.repaired
            final_event_type = "repair_succeeded"
        else:
            dataset_version.status = DatasetVersionStatus.failed
            final_event_type = "repair_failed"

        dataset_version.row_count = len(repaired_df)

        final_entry = AuditLogEntry(
            dataset_version_id=dataset_version.id,
            event_type=final_event_type,
            actor=SYSTEM_ACTOR,
            details={
                "actions_taken": action_logs,
                "quality_score_before": quality_score_before,
                "quality_score_after": quality_score_after,
                "revalidation_passed": revalidation_passed,
                "repaired_path": repaired_path,
            },
        )
        db.add(final_entry)

        finished_at = datetime.now(timezone.utc)
        pipeline_run = PipelineRun(
            dataset_version_id=dataset_version.id,
            stage=PipelineStage.repair,
            status=PipelineRunStatus.success,
            started_at=started_at,
            finished_at=finished_at,
        )
        db.add(pipeline_run)

        await db.commit()

        return {
            "status": dataset_version.status.value,
            "repaired_path": repaired_path,
            "actions_taken": action_logs,
            "quality_score_before": quality_score_before,
            "quality_score_after": quality_score_after,
        }

    except Exception as exc:
        await db.rollback()
        finished_at = datetime.now(timezone.utc)

        failed_run = PipelineRun(
            dataset_version_id=dataset_version.id,
            stage=PipelineStage.repair,
            status=PipelineRunStatus.failed,
            started_at=started_at,
            finished_at=finished_at,
            error_message=str(exc),
        )
        db.add(failed_run)
        await db.commit()
        raise
