"""initial_schema

Revision ID: eb7588ba5e4e
Revises: 
Create Date: 2026-06-23 15:24:46.726341

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eb7588ba5e4e'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "datasets",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("current_version_id", sa.UUID(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "dataset_versions",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("dataset_id", sa.UUID(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("bronze_path", sa.String(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "uploaded",
                "validating",
                "validated",
                "repairing",
                "repaired",
                "promoted",
                "failed",
                name="dataset_version_status",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("row_count", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_foreign_key(
        "fk_datasets_current_version_id",
        "datasets",
        "dataset_versions",
        ["current_version_id"],
        ["id"],
    )
    op.create_table(
        "pipeline_runs",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("dataset_version_id", sa.UUID(), nullable=False),
        sa.Column(
            "stage",
            sa.Enum(
                "ingest",
                "validate",
                "repair",
                "transform",
                name="pipeline_stage",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "running",
                "success",
                "failed",
                name="pipeline_run_status",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["dataset_version_id"], ["dataset_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("pipeline_runs")
    op.drop_constraint(
        "fk_datasets_current_version_id", "datasets", type_="foreignkey"
    )
    op.drop_table("dataset_versions")
    op.drop_table("datasets")
