"""add_date_format_to_validation_results

Revision ID: 6451a39c6ce1
Revises: 79727221fbcf
Create Date: 2026-06-27 16:08:34.984958

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6451a39c6ce1'
down_revision: Union[str, Sequence[str], None] = '79727221fbcf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'validation_results',
        sa.Column(
            'date_format_passed',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('true'),
        ),
    )
    op.add_column(
        'validation_results',
        sa.Column(
            'date_format_report',
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::json"),
        ),
    )
    op.alter_column('validation_results', 'date_format_passed', server_default=None)
    op.alter_column('validation_results', 'date_format_report', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('validation_results', 'date_format_report')
    op.drop_column('validation_results', 'date_format_passed')
