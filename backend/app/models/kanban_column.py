from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import uuid


class KanbanColumn(Base):
    __tablename__ = "kanban_columns"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_done_column: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    topic: Mapped["Topic"] = relationship("Topic", back_populates="kanban_columns")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="column", cascade="all, delete-orphan")
