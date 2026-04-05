"""add_is_admin_to_user

Revision ID: a755a003dcf2
Revises: 3bdc55b4557b
Create Date: 2026-04-01 13:14:32.851802

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a755a003dcf2'
down_revision: Union[str, None] = '3bdc55b4557b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), nullable=True, server_default='false'))
    op.execute("UPDATE users SET is_admin = false")


def downgrade() -> None:
    op.drop_column('users', 'is_admin')
