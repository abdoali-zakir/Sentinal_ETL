"""add_repair_actions_and_audit_log_entries

Revision ID: a8f3c2e91d04
Revises: 6451a39c6ce1
Create Date: 2026-06-27 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a8f3c2e91d04"
down_revision: Union[str, Sequence[str], None] = "6451a39c6ce1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "repair_actions",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("dataset_version_id", sa.UUID(), nullable=False),
        sa.Column(
            "action_type",
            sa.Enum(
                "type_conversion",
                "duplicate_removal",
                "null_fill",
                "column_mapping",
                "schema_normalization",
                name="repair_action_type",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("target_column", sa.Text(), nullable=True),
        sa.Column(
            "before_value_sample",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "after_value_sample",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("rows_affected", sa.Integer(), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["dataset_version_id"],
            ["dataset_versions.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "audit_log_entries",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("dataset_version_id", sa.UUID(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("actor", sa.Text(), nullable=False),
        sa.Column("details", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["dataset_version_id"],
            ["dataset_versions.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION prevent_audit_log_entry_modification()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION
                'audit_log_entries rows are immutable: % operations are not allowed',
                TG_OP;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        CREATE TRIGGER trg_audit_log_entries_no_update
        BEFORE UPDATE ON audit_log_entries
        FOR EACH ROW
        EXECUTE FUNCTION prevent_audit_log_entry_modification();
        """
    )

    op.execute(
        """
        CREATE TRIGGER trg_audit_log_entries_no_delete
        BEFORE DELETE ON audit_log_entries
        FOR EACH ROW
        EXECUTE FUNCTION prevent_audit_log_entry_modification();
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        "DROP TRIGGER IF EXISTS trg_audit_log_entries_no_delete ON audit_log_entries"
    )
    op.execute(
        "DROP TRIGGER IF EXISTS trg_audit_log_entries_no_update ON audit_log_entries"
    )
    op.execute("DROP FUNCTION IF EXISTS prevent_audit_log_entry_modification()")

    op.drop_table("audit_log_entries")
    op.drop_table("repair_actions")
