from datetime import datetime
from sqlalchemy import String, Boolean, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import uuid


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="topics")
    parent: Mapped["Topic | None"] = relationship("Topic", remote_side="Topic.id", back_populates="children")
    children: Mapped[list["Topic"]] = relationship("Topic", back_populates="parent", cascade="all, delete-orphan")
    kanban_columns: Mapped[list["KanbanColumn"]] = relationship("KanbanColumn", back_populates="topic", cascade="all, delete-orphan")
    # Disambiguate: there are two FKs to topics on tasks (topic_id, linked_topic_id).
    # Topic.tasks should only follow the "owner" FK (topic_id).
    tasks: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="topic",
        foreign_keys="Task.topic_id",
        cascade="all, delete-orphan",
    )
    notes: Mapped[list["Note"]] = relationship("Note", back_populates="topic", cascade="all, delete-orphan")
