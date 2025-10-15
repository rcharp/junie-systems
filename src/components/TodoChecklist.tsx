import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GripVertical, CheckCircle2, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
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
  display_order: number;
  created_at: string;
  updated_at: string;
}


interface SortableItemProps {
  item: TodoItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPriorityChange: (id: string, priority: 'high' | 'medium' | 'low') => void;
  onEdit: (id: string, newText: string) => void;
  isEditing: boolean;
  onStartEdit: (id: string, currentText: string) => void;
  onCancelEdit: () => void;
  editingText: string;
  onEditingTextChange: (text: string) => void;
}

function SortableItem({ item, onToggle, onDelete, onPriorityChange, onEdit, isEditing, onStartEdit, onCancelEdit, editingText, onEditingTextChange }: SortableItemProps) {
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

  const getPriorityBorderClass = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-l-red-500';
      case 'medium': return 'border-l-4 border-l-yellow-500';
      case 'low': return 'border-l-4 border-l-gray-300';
      default: return 'border-l-4 border-l-gray-300';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group p-3 border rounded-lg bg-card transition-colors ${getPriorityBorderClass(item.priority)} ${
        item.completed ? 'opacity-60 bg-muted/50' : 'hover:bg-muted/50'
      }`}
    >
      {/* Mobile: Two rows. Desktop: Single row */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
        {/* First section: drag handle, checkbox, text/input */}
        <div className="flex items-center space-x-3 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <Checkbox
            id={item.id}
            checked={item.completed}
            onCheckedChange={() => onToggle(item.id)}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            disabled={isEditing}
          />
          
          {isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={editingText}
                onChange={(e) => onEditingTextChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onEdit(item.id, editingText);
                  } else if (e.key === 'Escape') {
                    onCancelEdit();
                  }
                }}
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item.id, editingText)}
                className="h-8 w-8 p-0"
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelEdit}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <>
              <label
                htmlFor={item.id}
                className={`flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                  item.completed ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {item.text}
              </label>
              
              {item.completed && (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              )}
            </>
          )}
        </div>
        
        {/* Second section: priority dropdown, edit button, and trash button */}
        {!isEditing && (
          <div className="flex items-center gap-2 ml-10 md:ml-0">
            <Select value={item.priority} onValueChange={(priority: 'high' | 'medium' | 'low') => onPriorityChange(item.id, priority)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit(item.id, item.text);
              }}
              className="transition-opacity h-8"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="transition-opacity h-8"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TodoChecklist() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('completed', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTodos((data || []).map(todo => ({
        ...todo,
        priority: todo.priority as 'high' | 'medium' | 'low'
      })));
    } catch (error: any) {
      console.error('Error fetching todos:', error);
      toast({
        title: "Error",
        description: "Failed to load todos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
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

        const newTodos = arrayMove(items, oldIndex, newIndex);
        updateTodoOrder(newTodos);
        return newTodos;
      });
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const newCompletedStatus = !todo.completed;
    let newDisplayOrder = todo.display_order;

    try {
      // If marking as completed, move to bottom
      if (newCompletedStatus) {
        const maxOrder = Math.max(...todos.map(t => t.display_order), 0);
        newDisplayOrder = maxOrder + 1;
      } else {
        // If unmarking as completed, move back to appropriate position among uncompleted items
        const uncompletedTodos = todos.filter(t => !t.completed && t.id !== id);
        newDisplayOrder = uncompletedTodos.length > 0 ? Math.min(...uncompletedTodos.map(t => t.display_order)) : 1;
      }

      const { error } = await supabase
        .from('todos')
        .update({ 
          completed: newCompletedStatus,
          display_order: newDisplayOrder
        })
        .eq('id', id);

      if (error) throw error;

      setTodos((items) =>
        items.map((item) =>
          item.id === id ? { ...item, completed: newCompletedStatus, display_order: newDisplayOrder } : item
        ).sort((a, b) => {
          // Sort by completion status first (uncompleted first), then by display_order
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          return a.display_order - b.display_order;
        })
      );

      toast({
        title: todo.completed ? "Todo marked as pending" : "Todo completed!",
        description: todo.completed ? "Task marked as pending" : "Great job completing this task!",
      });
    } catch (error: any) {
      console.error('Error updating todo:', error);
      toast({
        title: "Error",
        description: "Failed to update todo",
        variant: "destructive",
      });
    }
  };

  const addTodo = async () => {
    if (!newTodoText.trim() || !user) return;

    try {
      const maxOrder = Math.max(...todos.map(t => t.display_order), 0);
      const { data, error } = await supabase
        .from('todos')
        .insert({
          text: newTodoText.trim(),
          priority: newTodoPriority,
          display_order: maxOrder + 1,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTodos(prev => [...prev, {
        ...data,
        priority: data.priority as 'high' | 'medium' | 'low'
      }]);
      setNewTodoText('');
      setNewTodoPriority('medium');

      toast({
        title: "Todo added",
        description: "New todo item has been added successfully",
      });
    } catch (error: any) {
      console.error('Error adding todo:', error);
      toast({
        title: "Error",
        description: "Failed to add todo",
        variant: "destructive",
      });
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTodos(prev => prev.filter(t => t.id !== id));

      toast({
        title: "Todo deleted",
        description: "Todo item has been deleted",
      });
    } catch (error: any) {
      console.error('Error deleting todo:', error);
      toast({
        title: "Error",
        description: "Failed to delete todo",
        variant: "destructive",
      });
    }
  };

  const updateTodoOrder = async (newTodos: TodoItem[]) => {
    try {
      const updates = newTodos.map((todo, index) => ({
        id: todo.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from('todos')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
    } catch (error: any) {
      console.error('Error updating todo order:', error);
      toast({
        title: "Error",
        description: "Failed to update todo order",
        variant: "destructive",
      });
    }
  };

  const updateTodoPriority = async (id: string, priority: 'high' | 'medium' | 'low') => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ priority })
        .eq('id', id);

      if (error) throw error;

      setTodos((items) =>
        items.map((item) =>
          item.id === id ? { ...item, priority } : item
        )
      );

      toast({
        title: "Priority updated",
        description: `Todo priority changed to ${priority}`,
      });
    } catch (error: any) {
      console.error('Error updating todo priority:', error);
      toast({
        title: "Error",
        description: "Failed to update todo priority",
        variant: "destructive",
      });
    }
  };

  const startEditTodo = (id: string, currentText: string) => {
    setEditingId(id);
    setEditingText(currentText);
  };

  const cancelEditTodo = () => {
    setEditingId(null);
    setEditingText('');
  };

  const editTodo = async (id: string, newText: string) => {
    if (!newText.trim()) {
      toast({
        title: "Error",
        description: "Todo text cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('todos')
        .update({ text: newText.trim() })
        .eq('id', id);

      if (error) throw error;

      setTodos((items) =>
        items.map((item) =>
          item.id === id ? { ...item, text: newText.trim() } : item
        )
      );

      setEditingId(null);
      setEditingText('');

      toast({
        title: "Todo updated",
        description: "Todo text has been updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating todo:', error);
      toast({
        title: "Error",
        description: "Failed to update todo",
        variant: "destructive",
      });
    }
  };

  const completedCount = todos.filter(todo => todo.completed).length;
  const totalCount = todos.length;

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Development Todo List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please log in to view and manage todos.</p>
        </CardContent>
      </Card>
    );
  }

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
        {/* Add Todo Form */}
        <div className="mb-6 p-4 border rounded-lg bg-muted/20">
          <div className="flex flex-col md:flex-row gap-2 mb-3">
            <Input
              placeholder="Add a new todo..."
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              className="w-full md:flex-1 md:max-w-md"
            />
            <div className="flex gap-2">
              <Select value={newTodoPriority} onValueChange={(value: 'high' | 'medium' | 'low') => setNewTodoPriority(value)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addTodo} disabled={!newTodoText.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={todos} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {todos.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No todos yet. Add your first todo above!</p>
                  </div>
                ) : (
                  todos.map((todo) => (
                    <SortableItem 
                      key={todo.id} 
                      item={todo} 
                      onToggle={toggleTodo} 
                      onDelete={deleteTodo} 
                      onPriorityChange={updateTodoPriority}
                      onEdit={editTodo}
                      isEditing={editingId === todo.id}
                      onStartEdit={startEditTodo}
                      onCancelEdit={cancelEditTodo}
                      editingText={editingText}
                      onEditingTextChange={setEditingText}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}