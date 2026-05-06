from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, UniqueConstraint, CheckConstraint, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
import uuid
import enum


class LinkType(str, enum.Enum):
    blocks = "blocks"
    relates = "relates"
    duplicates = "duplicates"


class TaskLink(Base):
    __tablename__ = "task_links"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    target_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    link_type: Mapped[LinkType] = mapped_column(SAEnum(LinkType, name="link_type"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("source_id", "target_id", "link_type", name="uq_task_links_unique"),
        CheckConstraint("source_id <> target_id", name="ck_task_links_no_self"),
    )
