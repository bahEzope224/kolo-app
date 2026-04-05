"""add new_cycle to notiftype

Revision ID: a8f7e2d94b32
Revises: 6e37db099f65
Create Date: 2026-04-05 22:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a8f7e2d94b32'
down_revision = '6e37db099f65'
branch_labels = None
depends_on = None

def upgrade():
    # PostgreSQL ALTER TYPE ADD VALUE ne peut pas être exécuté dans une transaction
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notiftype ADD VALUE 'new_cycle'")

def downgrade():
    # PostgreSQL ne supporte pas facilement le retrait d'une valeur d'un ENUM
    pass
