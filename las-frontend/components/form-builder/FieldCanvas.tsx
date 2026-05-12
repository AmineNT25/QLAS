'use client'

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import type { FormField } from './types'

const TYPE_COLORS: Record<string, string> = {
  text: 'bg-gray-100 text-gray-700',
  email: 'bg-blue-100 text-blue-700',
  phone: 'bg-green-100 text-green-700',
  textarea: 'bg-purple-100 text-purple-700',
  select: 'bg-orange-100 text-orange-700',
  checkbox: 'bg-pink-100 text-pink-700',
}

interface Props {
  fields: FormField[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onReorder: (fields: FormField[]) => void
}

export default function FieldCanvas({
  fields,
  selectedId,
  onSelect,
  onDelete,
  onReorder,
}: Props) {
  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    const reordered = Array.from(fields)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    onReorder(reordered)
  }

  if (fields.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
        <p className="text-sm">Click a field type to add it here</p>
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="canvas">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col gap-2"
          >
            {fields.map((field, index) => (
              <Draggable key={field.id} draggableId={field.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    onClick={() => onSelect(field.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer select-none transition-shadow ${
                      selectedId === field.id
                        ? 'border-blue-500 ring-2 ring-blue-200 bg-white'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    } ${snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'}`}
                  >
                    {/* drag handle */}
                    <span
                      {...provided.dragHandleProps}
                      className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing text-lg leading-none"
                      title="Drag to reorder"
                    >
                      ⠿
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {field.label || <span className="italic text-gray-400">Untitled</span>}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        TYPE_COLORS[field.type]
                      }`}
                    >
                      {field.type}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(field.id)
                      }}
                      className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none ml-1"
                      title="Delete field"
                    >
                      ×
                    </button>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
