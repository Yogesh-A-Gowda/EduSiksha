"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-18

New deployments: alembic upgrade head
Existing deployments (tables already exist): alembic stamp head
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension before creating any vector columns
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("email", sa.String(), unique=True, index=True, nullable=False),
        sa.Column("phone", sa.String(), unique=True, index=True, nullable=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "kids",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("username", sa.String(), unique=True, index=True, nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("subscription_status", sa.Boolean(), server_default="false"),
        sa.Column("subscription_expiry", sa.DateTime(), nullable=True),
        sa.Column("is_active_access", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("kid_id", sa.Integer(), sa.ForeignKey("kids.id")),
        sa.Column("title", sa.String(), server_default="New Chat"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
    )

    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("chat_sessions.id")),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("chat_sessions.id")),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        # vector(768) — pgvector type; rely on raw DDL so Alembic doesn't need
        # the pgvector SQLAlchemy type registered at migration time.
        sa.Column("embedding", sa.Text(), nullable=True),  # placeholder column type
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
    )
    # Alter embedding column to use the real vector type after extension is enabled
    op.execute("ALTER TABLE documents ALTER COLUMN embedding TYPE vector(768) USING NULL::vector(768)")

    op.create_table(
        "chat_analytics",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("chat_sessions.id"), unique=True, nullable=False),
        sa.Column("mastery_score", sa.Integer(), server_default="0"),
        sa.Column("topics", JSONB(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("language", sa.String(), server_default="English"),
        sa.Column("last_updated", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("chat_analytics")
    op.drop_table("documents")
    op.drop_table("messages")
    op.drop_table("chat_sessions")
    op.drop_table("kids")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS vector")
