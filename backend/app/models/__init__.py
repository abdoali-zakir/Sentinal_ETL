import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class DatasetVersionStatus(str, enum.Enum):
    uploaded = "uploaded"
    validating = "validating"
    validated = "validated"
    repairing = "repairing"
    repaired = "repaired"
    promoted = "promoted"
    failed = "failed"


class PipelineStage(str, enum.Enum):
    ingest = "ingest"
    validate = "validate"
    repair = "repair"
    transform = "transform"


class PipelineRunStatus(str, enum.Enum):
    running = "running"
    success = "success"
    failed = "failed"


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dataset_versions.id", use_alter=True),
        nullable=True,
    )


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("datasets.id"),
    )
    version_number: Mapped[int] = mapped_column(Integer)
    bronze_path: Mapped[str] = mapped_column()
    status: Mapped[DatasetVersionStatus] = mapped_column(
        Enum(
            DatasetVersionStatus,
            name="dataset_version_status",
            native_enum=False,
        ),
    )
    row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    dataset_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dataset_versions.id"),
    )
    stage: Mapped[PipelineStage] = mapped_column(
        Enum(
            PipelineStage,
            name="pipeline_stage",
            native_enum=False,
        ),
    )
    status: Mapped[PipelineRunStatus] = mapped_column(
        Enum(
            PipelineRunStatus,
            name="pipeline_run_status",
            native_enum=False,
        ),
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
