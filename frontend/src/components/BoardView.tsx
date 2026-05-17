import { FormEvent, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface BoardCardSummary {
  id: string;
  title: string;
  description?: string | null;
  labels?: string[];
  _count?: {
    comments: number;
    attachments: number;
  };
}

export interface BoardListSummary {
  id: string;
  title: string;
  position: number;
  cards: BoardCardSummary[];
}

interface BoardViewProps {
  lists: BoardListSummary[];
  editingListId: string | null;
  editListTitle: string;
  cardDrafts: Record<string, string>;
  onSelectCard: (cardId: string) => void;
  onCardCreate: (listId: string) => void;
  onCardDraftChange: (listId: string, value: string) => void;
  onStartEditList: (listId: string, title: string) => void;
  onCancelEditList: () => void;
  onEditListTitleChange: (value: string) => void;
  onSaveEditList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onMoveCard: (cardId: string, targetListId: string, position: number) => void;
}

interface SortableCardProps {
  card: BoardCardSummary;
  onSelect: (id: string) => void;
}

function SortableCard({ card, onSelect }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: 'card', cardId: card.id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      className="card card--interactive card--draggable"
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <button
        className="card-hitbox"
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(card.id);
        }}
      >
        <strong>{card.title}</strong>
        <span>{card.description ? stripHtml(card.description) : 'No description'}</span>
        <small>{card.labels?.length ? card.labels.join(', ') : 'No labels'}</small>
      </button>
      <div className="card-meta">
        <span>{card._count?.comments ?? 0} comments</span>
        <span>{card._count?.attachments ?? 0} files</span>
      </div>
    </div>
  );
}

interface SortableListProps {
  list: BoardListSummary;
  editing: boolean;
  editTitle: string;
  cardDraft: string;
  onSelectCard: (id: string) => void;
  onCardCreate: () => void;
  onCardDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditTitleChange: (value: string) => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}

function SortableList({
  list,
  editing,
  editTitle,
  cardDraft,
  onSelectCard,
  onCardCreate,
  onCardDraftChange,
  onStartEdit,
  onCancelEdit,
  onEditTitleChange,
  onSaveEdit,
  onDelete,
}: SortableListProps) {
  const cardIds = useMemo(() => list.cards.map((c) => c.id), [list.cards]);
  const { setNodeRef, isOver } = useDroppable({
    id: `list:${list.id}`,
    data: { type: 'list', listId: list.id },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSaveEdit();
  };

  return (
    <article
      className={`board-list${isOver ? ' board-list--drop' : ''}`}
      ref={setNodeRef}
    >
      <div className="list-heading">
        {editing ? (
          <form className="inline-form" onSubmit={handleSubmit}>
            <input
              autoFocus
              value={editTitle}
              onChange={(event) => onEditTitleChange(event.target.value)}
            />
            <button className="primary-button" type="submit">
              Save
            </button>
            <button className="ghost-button" type="button" onClick={onCancelEdit}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            <h3>{list.title}</h3>
            <span>{list.cards.length} cards</span>
            <button
              className="ghost-button"
              type="button"
              title="Rename list"
              onClick={onStartEdit}
            >
              ✏️
            </button>
            <button
              className="ghost-button"
              type="button"
              title="Delete list"
              onClick={onDelete}
            >
              🗑️
            </button>
          </>
        )}
      </div>
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="board-list-cards">
          {list.cards.map((card) => (
            <SortableCard key={card.id} card={card} onSelect={onSelectCard} />
          ))}
        </div>
      </SortableContext>
      <div className="card-compose">
        <input
          placeholder="New card title"
          value={cardDraft}
          onChange={(event) => onCardDraftChange(event.target.value)}
        />
        <button className="ghost-button" type="button" onClick={onCardCreate}>
          Add card
        </button>
      </div>
    </article>
  );
}

function stripHtml(input: string) {
  if (!input.includes('<')) {
    return input;
  }
  return input
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function BoardView(props: BoardViewProps) {
  const {
    lists,
    editingListId,
    editListTitle,
    cardDrafts,
    onSelectCard,
    onCardCreate,
    onCardDraftChange,
    onStartEditList,
    onCancelEditList,
    onEditListTitleChange,
    onSaveEditList,
    onDeleteList,
    onMoveCard,
  } = props;

  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const cardIndex = useMemo(() => {
    const index = new Map<
      string,
      { card: BoardCardSummary; listId: string; position: number }
    >();
    lists.forEach((list) => {
      list.cards.forEach((card, position) => {
        index.set(card.id, { card, listId: list.id, position });
      });
    });
    return index;
  }, [lists]);

  const activeCard = activeCardId ? cardIndex.get(activeCardId)?.card : null;

  function findListIdForDroppable(id: string) {
    if (id.startsWith('list:')) {
      return id.slice('list:'.length);
    }
    return cardIndex.get(id)?.listId ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveCardId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    setActiveCardId(null);

    if (!event.over) {
      return;
    }

    const overId = String(event.over.id);
    const sourceEntry = cardIndex.get(activeId);
    if (!sourceEntry) {
      return;
    }

    const targetListId = findListIdForDroppable(overId);
    if (!targetListId) {
      return;
    }

    const targetList = lists.find((list) => list.id === targetListId);
    if (!targetList) {
      return;
    }

    let targetPosition: number;
    if (overId.startsWith('list:')) {
      targetPosition = targetList.cards.length;
    } else {
      const overEntry = cardIndex.get(overId);
      if (!overEntry) {
        return;
      }
      targetPosition = overEntry.position;
    }

    if (
      sourceEntry.listId === targetListId &&
      sourceEntry.position === targetPosition
    ) {
      return;
    }

    onMoveCard(activeId, targetListId, targetPosition);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveCardId(null)}
    >
      <div className="board-lists">
        {lists.map((list) => (
          <SortableList
            key={list.id}
            list={list}
            editing={editingListId === list.id}
            editTitle={editListTitle}
            cardDraft={cardDrafts[list.id] ?? ''}
            onSelectCard={onSelectCard}
            onCardCreate={() => onCardCreate(list.id)}
            onCardDraftChange={(value) => onCardDraftChange(list.id, value)}
            onStartEdit={() => onStartEditList(list.id, list.title)}
            onCancelEdit={onCancelEditList}
            onEditTitleChange={onEditListTitleChange}
            onSaveEdit={() => onSaveEditList(list.id)}
            onDelete={() => onDeleteList(list.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? (
          <div className="card card--interactive card--dragging">
            <div className="card-hitbox">
              <strong>{activeCard.title}</strong>
              <span>
                {activeCard.description ? stripHtml(activeCard.description) : 'No description'}
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
