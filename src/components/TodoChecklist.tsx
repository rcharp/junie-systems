import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { GripVertical, CheckCircle2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

const initialTodos: TodoItem[] = [
  { id: '1', text: 'Schedule meetings on Google Calendar', completed: false, priority: 'high' },
  { id: '2', text: 'Create call information in user dashboard → messages/calls', completed: false, priority: 'high' },
  { id: '3', text: 'Remove setup guide after initial setup', completed: false, priority: 'medium' },
  { id: '4', text: 'Fix analytics in user dashboard to show correct data', completed: false, priority: 'high' },
  { id: '5', text: 'Implement call forwarding', completed: false, priority: 'medium' },
  { id: '6', text: 'Implement text notifications', completed: false, priority: 'medium' },
  { id: '7', text: 'Implement analytics in user dashboard', completed: false, priority: 'low' },
];

interface SortableItemProps {
  item: TodoItem;
  onToggle: (id: string) => void;
}

function SortableItem({ item, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-3 p-3 border rounded-lg bg-card transition-colors ${
        item.completed ? 'opacity-60 bg-muted/50' : 'hover:bg-muted/50'
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <Checkbox
        id={item.id}
        checked={item.completed}
        onCheckedChange={() => onToggle(item.id)}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      
      <label
        htmlFor={item.id}
        className={`flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
          item.completed ? 'line-through text-muted-foreground' : ''
        }`}
      >
        {item.text}
      </label>
      
      <Badge variant={getPriorityColor(item.priority)} className="text-xs">
        {item.priority}
      </Badge>
      
      {item.completed && (
        <CheckCircle2 className="h-4 w-4 text-primary" />
      )}
    </div>
  );
}

export function TodoChecklist() {
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setTodos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleTodo = (id: string) => {
    setTodos((items) =>
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const completedCount = todos.filter(todo => todo.completed).length;
  const totalCount = todos.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Development Todo List
          <Badge variant="outline">
            {completedCount}/{totalCount} completed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={todos} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {todos.map((todo) => (
                <SortableItem key={todo.id} item={todo} onToggle={toggleTodo} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}