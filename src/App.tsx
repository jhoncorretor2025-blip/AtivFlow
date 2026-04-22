/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Play, 
  RotateCcw, 
  Pencil, 
  Trash2, 
  Calendar,
  Plus,
  LayoutDashboard,
  Trello,
  Clock,
  Users,
  Search,
  Bell,
  MoreHorizontal,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

interface Task {
  id: string;
  text: string;
  emoji: string;
  description?: string;
  completed: boolean;
  started: boolean;
  activeStartTime: number | null;
  totalSeconds: number;
  idleSeconds: number;
  lastSessionSeconds: number;
  hasBeenStarted: boolean;
  createdAt: number;
  priority: 'baixa' | 'alta';
  deadline?: string;
  subtasks?: SubTask[];
  reminderSet?: boolean;
}

const STORAGE_KEY = 'ativflow_tasks';

const TaskProgress = ({ task }: { task: Task }) => {
    if (!task.subtasks || task.subtasks.length === 0) return null;
    
    const completedCount = task.subtasks.filter(s => s.completed).length;
    const progress = Math.round((completedCount / task.subtasks.length) * 100);
    
    return (
        <div className="w-full mt-4">
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Progresso Check</span>
                <span className="text-[8px] font-black text-indigo-600">{progress}%</span>
            </div>
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full ${progress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                />
            </div>
        </div>
    );
};

const BoardTask = ({ task, currentSeconds, formatTime, toggleStart, toggleComplete, resetSingleTask, openTaskModal, userName }: any) => {
    const priorityClasses = task.priority === 'alta' 
        ? 'border-red-200 bg-red-50/10' 
        : 'border-blue-100 bg-blue-50/5';

    return (
        <div className={`p-4 rounded-xl border hover:border-indigo-300 transition-all group ${priorityClasses} ${task.started ? 'border-indigo-500 shadow-indigo-50 shadow-lg ring-1 ring-indigo-200' : 'shadow-sm'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{task.emoji}</span>
                {task.priority === 'alta' && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[7px] font-black uppercase rounded tracking-tighter shadow-sm border border-red-200">Alta Prioridade</span>
                )}
                {task.priority === 'baixa' && (
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[7px] font-black uppercase rounded tracking-tighter border border-blue-100">Normal</span>
                )}
              </div>
              <div className="text-[9px] font-bold tabular-nums text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                Foco: {formatTime(currentSeconds)}
              </div>
            </div>
            <h3 className={`text-[11px] font-bold mb-1 leading-relaxed uppercase tracking-tight ${task.completed ? 'line-through text-gray-300' : 'text-gray-800'}`}>
              {task.text}
            </h3>
            
            {task.description && (
                <p className="text-[9px] text-gray-400 mb-4 line-clamp-2 italic leading-tight">
                    {task.description}
                </p>
            )}
            
            {((task.subtasks && task.subtasks.length > 0) || task.deadline || task.idleSeconds > 0) && (
                <div className="flex flex-wrap items-center gap-3 mb-4 pb-3 border-b border-gray-100/50">
                    {task.subtasks && task.subtasks.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-gray-100 rounded text-[8px] font-black text-gray-400 uppercase tracking-widest">
                            <CheckCircle2 size={10} className={task.subtasks.every(s => s.completed) ? 'text-green-500' : 'text-gray-400'} />
                            <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                        </div>
                    )}
                    {task.deadline && (
                        <div className="flex items-center gap-1.5 text-[8px] font-black text-indigo-500 uppercase tracking-widest">
                            <Clock size={10} />
                            <span>{new Date(task.deadline).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}
                    {task.idleSeconds > 0 && (
                        <div className="flex items-center gap-1.5 text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-widest">
                            <RotateCcw size={10} className={task.started ? "" : "animate-pulse"} />
                            <span>Parado: {formatTime(task.idleSeconds)}</span>
                        </div>
                    )}
                </div>
            )}

            {task.lastSessionSeconds > 0 && (
                <div className="mb-4 text-[7.5px] font-bold text-indigo-300 uppercase tracking-widest">
                    Sessão Anterior: {formatTime(task.lastSessionSeconds)}
                </div>
            )}

            <TaskProgress task={task} />

            <div className="flex justify-between items-center pt-4">
              <div className="flex -space-x-1">
                <div className="w-5 h-5 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
                    {userName.charAt(0)}
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                    onClick={() => resetSingleTask(task.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 transition-colors cursor-pointer"
                    title="Reiniciar esta atividade"
                >
                    <RotateCcw size={12} />
                </button>
                <button 
                    onClick={() => openTaskModal(task)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                    <Pencil size={12} />
                </button>
                {!task.completed && (
                    <>
                        <button 
                            onClick={() => toggleStart(task.id)} 
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${task.started ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-50'}`}
                            title={task.started ? "Pausar" : "Iniciar"}
                        >
                            {task.started ? <Clock size={12} className="animate-spin-slow" /> : <Play size={12} fill="currentColor" />}
                        </button>
                        <button 
                            onClick={() => toggleComplete(task.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors cursor-pointer"
                            title="Finalizar"
                        >
                            <CheckCircle2 size={12} />
                        </button>
                    </>
                )}
              </div>
            </div>
        </div>
    );
};

const SortableBoardTask = (props: any) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: props.task.id });
  
    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0 : 1,
    };
  
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <BoardTask {...props} />
      </div>
    );
};

const SUGGESTED_ACTIVITIES = [
  { text: 'FAZER DEMONSTRAÇÃO DE PRODUTO', emoji: '💄', roles: ['Vendedora', 'Consultora'] },
  { text: 'LIMPAR TESTADORES E AMOSTRAS', emoji: '🧼', roles: ['Vendedora', 'Consultora', 'Estoquista'] },
  { text: 'CONFERIR VALIDADE DOS PRODUTOS', emoji: '📅', roles: ['Estoquista', 'Gerente', 'Líder de Equipe'] },
  { text: 'ATUALIZAR CADASTRO DE CLIENTES', emoji: '📝', roles: ['Vendedora', 'Marketing'] },
  { text: 'ORGANIZAR ÁREA DE FRAGRÂNCIAS', emoji: '🌸', roles: ['Vendedora', 'Estoquista'] },
  { text: 'GRAVAR REELS COM NOVIDADES', emoji: '🤳', roles: ['Marketing', 'Líder de Equipe'] },
  { text: 'PREPARAR KITS DE PRESENTES', emoji: '🎁', roles: ['Vendedora', 'Marketing'] },
  { text: 'CONFERIR ESTOQUE DE BRINDES', emoji: '🛍️', roles: ['Estoquista', 'Caixa'] },
  { text: 'REUNIÃO DE ALINHAMENTO COM EQUIPE', emoji: '👥', roles: ['Líder de Equipe', 'Gerente'] },
  { text: 'FECHAMENTO DE CAIXA E VENDAS', emoji: '💰', roles: ['Caixa', 'Líder de Equipe'] },
  { text: 'PLANEJAMENTO DE METAS SEMANAL', emoji: '📊', roles: ['Líder de Equipe', 'Gerente'] },
  { text: 'TREINAMENTO DE TÉCNICAS DE VENDA', emoji: '🎓', roles: ['Consultora', 'Vendedora'] },
];

  const INITIAL_TASKS: Task[] = [
  { 
    id: '1', 
    text: 'DAR BOM DIA NO GRUPO DO WHATSAPP', 
    emoji: '☀️', 
    completed: false, 
    started: false, 
    activeStartTime: null, 
    totalSeconds: 0, 
    idleSeconds: 0,
    lastSessionSeconds: 0,
    hasBeenStarted: false,
    createdAt: Date.now(), 
    priority: 'baixa',
    subtasks: [
        { id: 'st1', text: 'ENVIAR FRASE MOTIVACIONAL', completed: true },
        { id: 'st2', text: 'VERIFICAR MENSAGENS PENDENTES', completed: false }
    ],
    deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  },
  { id: '2', text: 'RESPONDER CLIENTES NO WHATSAPP', emoji: '📩', completed: false, started: false, activeStartTime: null, totalSeconds: 0, idleSeconds: 0, lastSessionSeconds: 0, hasBeenStarted: false, createdAt: Date.now(), priority: 'alta', subtasks: [] },
  { id: '3', text: 'POSTAR OFERTAS NO GRUPO E STATUS', emoji: '📸', completed: false, started: false, activeStartTime: null, totalSeconds: 0, idleSeconds: 0, lastSessionSeconds: 0, hasBeenStarted: false, createdAt: Date.now(), priority: 'baixa', subtasks: [] },
  { id: '4', text: 'DISPARAR CAMPANHAS NO PRIVADO', emoji: '🚀', completed: false, started: false, activeStartTime: null, totalSeconds: 0, idleSeconds: 0, lastSessionSeconds: 0, hasBeenStarted: false, createdAt: Date.now(), priority: 'alta', subtasks: [] },
  { id: '5', text: 'ORGANIZAR A LOJA E VITRINE', emoji: '✨', completed: false, started: false, activeStartTime: null, totalSeconds: 0, idleSeconds: 0, lastSessionSeconds: 0, hasBeenStarted: false, createdAt: Date.now(), priority: 'baixa', subtasks: [] },
  { id: '6', text: 'TIRAR PÓ DOS MÓVEIS E PRODUTOS', emoji: '🧹', completed: false, started: false, activeStartTime: null, totalSeconds: 0, idleSeconds: 0, lastSessionSeconds: 0, hasBeenStarted: false, createdAt: Date.now(), priority: 'baixa', subtasks: [] },
  { id: '7', text: 'REPOSIÇÃO DE PRODUTOS NAS PRATELEIRAS', emoji: '📦', completed: false, started: false, activeStartTime: null, totalSeconds: 0, idleSeconds: 0, lastSessionSeconds: 0, hasBeenStarted: false, createdAt: Date.now(), priority: 'baixa', subtasks: [] },
];

type ViewType = 'dashboard' | 'board' | 'timeline' | 'team';

interface Member {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_TASKS;
      }
    }
    return INITIAL_TASKS;
  });

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [userName, setUserName] = useState(() => localStorage.getItem('ativflow_user_name') || 'LETICIA');
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('ativflow_members');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [{ id: '1', name: 'LETICIA', role: 'Líder de Equipe', active: true }];
      }
    }
    return [{ id: '1', name: 'LETICIA', role: 'Líder de Equipe', active: true }];
  });

  const [today] = useState(new Date().toLocaleDateString('pt-BR'));
  const [now, setNow] = useState(Date.now());
  
  // Drag and Drop state
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState(() => {
    const saved = localStorage.getItem('ativflow_notif_prefs');
    return saved ? JSON.parse(saved) : { enabled: true, sound: true, browser: false };
  });

  const [activeNotifications, setActiveNotifications] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'info' | 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  
  // Search & Notification UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTask, setModalTask] = useState<Partial<Task> | null>(null);

  // New states for team member and user editing
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Consultora');
  const [isUserEditing, setIsUserEditing] = useState(false);

  // New UI states
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('oldest');
  const [boardPriorityFilter, setBoardPriorityFilter] = useState<'todas' | 'alta' | 'baixa'>('todas');
  const [boardStatusFilter, setBoardStatusFilter] = useState<'todas' | 'pendente' | 'em foco' | 'concluido'>('todas');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('ativflow_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('ativflow_user_name', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('ativflow_notif_prefs', JSON.stringify(notifPrefs));
  }, [notifPrefs]);

  // Deadline Checker & Notifications
  useEffect(() => {
    if (!notifPrefs.enabled) return;

    const checkNotifications = () => {
        const nowTime = Date.now();
        tasks.forEach(task => {
            if (task.completed || !task.deadline) return;

            const deadlineTime = new Date(task.deadline).getTime();
            const timeDiff = deadlineTime - nowTime;

            // Notify if deadline is within 30 minutes and not already notified this hour
            if (timeDiff > 0 && timeDiff < 30 * 60 * 1000) {
                const notifId = `deadline-${task.id}-${new Date().getHours()}`;
                if (!activeNotifications.includes(notifId)) {
                    setActiveNotifications(prev => [...prev, notifId]);
                    
                    if (notifPrefs.sound) {
                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                            audio.play().catch(() => {});
                        } catch (e) {}
                    }

                    if (notifPrefs.browser && "Notification" in window) {
                        if (Notification.permission === "granted") {
                            new Notification("AtivFlow: Prazo Próximo", {
                                body: `A tarefa "${task.text}" vence em breve!`,
                                icon: "/favicon.ico"
                            });
                        } else if (Notification.permission !== "denied") {
                            Notification.requestPermission();
                        }
                    }
                }
            }
        });
    };

    const interval = setInterval(checkNotifications, 60000); // Check every minute
    checkNotifications();
    return () => clearInterval(interval);
  }, [tasks, notifPrefs, activeNotifications]);

  // Update "now" every second to drive the active timers
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      // Increment idle time for tasks that are NOT started and NOT completed, BUT have been started at least once
      setTasks(prev => prev.map(t => {
        if (!t.started && !t.completed && t.hasBeenStarted) {
          return { ...t, idleSeconds: (t.idleSeconds || 0) + 1 };
        }
        return t;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`;
  };

  const getTaskCurrentSeconds = (task: Task) => {
    let currentSeconds = task.totalSeconds;
    if (task.started && task.activeStartTime) {
      currentSeconds += (now - task.activeStartTime) / 1000;
    }
    return currentSeconds;
  };

  const filteredTasks = tasks.filter(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()));

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100) || 0;
  
  const totalSecondsToday = tasks.reduce((acc, t) => acc + getTaskCurrentSeconds(t), 0);

  const getSmartSuggestions = () => {
    const userRole = members.find(m => m.id === '1' || m.name === userName)?.role || 'Líder de Equipe';
    
    // Sort logic: Role match first, then rest
    const sorted = [...SUGGESTED_ACTIVITIES].sort((a, b) => {
        const aRoleMatch = a.roles?.includes(userRole) ? 1 : 0;
        const bRoleMatch = b.roles?.includes(userRole) ? 1 : 0;
        if (aRoleMatch !== bRoleMatch) return bRoleMatch - aRoleMatch;
        return 0;
    });

    // Get frequent task names from existing tasks
    const frequentTaskNames = tasks.reduce((acc, t) => {
        acc[t.text] = (acc[t.text] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const frequentSuggestions = Object.entries(frequentTaskNames)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([text]) => {
            const original = tasks.find(t => t.text === text);
            return { text, emoji: original?.emoji || '📝', roles: [], isFrequent: true };
        });

    return [...frequentSuggestions, ...sorted];
  };

  const toggleComplete = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isNowCompleted = !t.completed;
        const currentSessionSeconds = (t.started && t.activeStartTime) ? (Date.now() - t.activeStartTime) / 1000 : 0;
        
        return { 
          ...t, 
          completed: isNowCompleted, 
          started: false, 
          activeStartTime: null,
          totalSeconds: t.totalSeconds + currentSessionSeconds,
          lastSessionSeconds: currentSessionSeconds > 0 ? currentSessionSeconds : t.lastSessionSeconds
        };
      }
      return t;
    }));
    showToast("Estado da tarefa atualizado com sucesso!");
  };

  const toggleStart = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isNowStarting = !t.started;
        const currentSessionSeconds = (!isNowStarting && t.activeStartTime) ? (Date.now() - t.activeStartTime) / 1000 : 0;

        return { 
          ...t, 
          started: isNowStarting, 
          hasBeenStarted: t.hasBeenStarted || isNowStarting,
          activeStartTime: isNowStarting ? Date.now() : null,
          totalSeconds: t.totalSeconds + currentSessionSeconds,
          lastSessionSeconds: currentSessionSeconds > 0 ? currentSessionSeconds : t.lastSessionSeconds
        };
      }
      return t;
    }));
  };

  const resetTasks = () => {
    setTasks(prev => prev.map(t => ({ ...t, completed: false, started: false, activeStartTime: null, totalSeconds: 0, idleSeconds: 0, lastSessionSeconds: 0, hasBeenStarted: false })));
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdVal = active.id as string;
    const overIdVal = over.id as string;

    // Determine the target status based on the column ID or the task being dropped over
    let targetStatus: 'todo' | 'in-progress' | 'done' | null = null;
    
    if (['col-todo', 'col-in-progress', 'col-done'].includes(overIdVal)) {
      targetStatus = overIdVal.replace('col-', '') as any;
    } else {
      const overTask = tasks.find(t => t.id === overIdVal);
      if (overTask) {
        if (overTask.completed) targetStatus = 'done';
        else if (overTask.started) targetStatus = 'in-progress';
        else targetStatus = 'todo';
      }
    }

    if (targetStatus) {
      setTasks(prev => prev.map(t => {
        if (t.id === activeIdVal) {
          const currentSessionSeconds = (t.started && t.activeStartTime) ? (Date.now() - t.activeStartTime) / 1000 : 0;
          
          if (targetStatus === 'todo') {
            return { ...t, completed: false, started: false, activeStartTime: null, totalSeconds: t.totalSeconds + currentSessionSeconds };
          } else if (targetStatus === 'in-progress') {
            return { ...t, completed: false, started: true, hasBeenStarted: true, activeStartTime: t.started ? t.activeStartTime : Date.now(), totalSeconds: t.totalSeconds };
          } else if (targetStatus === 'done') {
            return { ...t, completed: true, started: false, activeStartTime: null, totalSeconds: t.totalSeconds + currentSessionSeconds };
          }
        }
        return t;
      }));
    }
  };

  const resetSingleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { 
          ...t, 
          completed: false, 
          started: false, 
          activeStartTime: null, 
          totalSeconds: 0, 
          idleSeconds: 0, 
          lastSessionSeconds: 0, 
          hasBeenStarted: false 
        };
      }
      return t;
    }));
    showToast("Atividade reiniciada!");
  };

  const removeTask = (id: string) => {
    setTaskToDelete(id);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      setTasks(prev => prev.filter(t => t.id !== taskToDelete));
      setTaskToDelete(null);
    }
  };

  const openTaskModal = (task?: Task) => {
    if (task) {
        setModalTask({ ...task, subtasks: task.subtasks || [] });
    } else {
        setModalTask({ 
          text: '', 
          emoji: '📝', 
          id: Math.random().toString(36).substring(2, 9), 
          priority: 'baixa',
          subtasks: [] 
        });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalTask(null);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName) return;
    const newMember: Member = {
        id: Math.random().toString(36).substring(2, 9),
        name: newMemberName.toUpperCase(),
        role: newMemberRole,
        active: true
    };
    setMembers(prev => [...prev, newMember]);
    setNewMemberName('');
    setIsTeamModalOpen(false);
  };

  const removeMember = (id: string) => {
    if (members.length > 1) {
        setMembers(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTask?.text) return;

    setTasks(prev => {
        const existing = prev.find(t => t.id === modalTask.id);
        if (existing) {
            return prev.map(t => t.id === modalTask.id ? { ...t, ...modalTask } as Task : t);
        } else {
            const newTask: Task = {
                id: modalTask.id!,
                text: modalTask.text!,
                emoji: modalTask.emoji || '📝',
                description: modalTask.description,
                completed: false,
                started: false,
                activeStartTime: null,
                totalSeconds: 0,
                idleSeconds: 0,
                lastSessionSeconds: 0,
                hasBeenStarted: false,
                createdAt: Date.now(),
                priority: modalTask.priority || 'baixa',
                deadline: modalTask.deadline,
                subtasks: modalTask.subtasks || [],
                reminderSet: modalTask.reminderSet
            };
            return [...prev, newTask];
        }
    });
    closeModal();
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks?.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
        };
      }
      return t;
    }));
  };

  // --- Views Renders ---

  const renderDashboard = () => {
    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (sortOrder === 'newest') return b.createdAt - a.createdAt;
        return a.createdAt - b.createdAt;
    });

    return (
    <div className="max-w-4xl mx-auto">
      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Progresso</p>
          <div className="flex justify-between items-end">
            <h3 className="text-2xl font-bold">{progressPercent}%</h3>
            <span className="text-indigo-600 text-xs font-semibold">{completedCount}/{tasks.length}</span>
          </div>
          <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        
        <div className="bg-indigo-600 p-6 rounded-xl border border-indigo-700 shadow-lg shadow-indigo-100 flex items-center justify-between text-white">
          <div>
            <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">Tempo Total Hoje</p>
            <h3 className="text-2xl font-bold tabular-nums">{formatTime(totalSecondsToday)}</h3>
          </div>
          <div className="p-3 bg-indigo-500/50 rounded-lg">
            <Timer size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Atividades</p>
            <h3 className="text-2xl font-bold">{tasks.length}</h3>
          </div>
          <div className="p-3 bg-gray-50 text-gray-400 rounded-lg">
            <LayoutDashboard size={24} />
          </div>
        </div>
      </div>

      {/* List Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Atividades em Foco</h3>
            <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                <button 
                    onClick={() => setSortOrder('newest')}
                    className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${sortOrder === 'newest' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Recentes
                </button>
                <button 
                    onClick={() => setSortOrder('oldest')}
                    className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${sortOrder === 'oldest' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Antigos
                </button>
            </div>
        </div>
        <button 
            onClick={resetTasks} 
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all group cursor-pointer" 
            title="Zerar timers e progresso do dia"
        >
          <RotateCcw size={12} className="group-hover:rotate-[-120deg] transition-transform duration-500" />
          <span>Reiniciar Dia</span>
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {sortedTasks.map((task) => {
            const currentSeconds = getTaskCurrentSeconds(task);
            return (
              <motion.div
                key={task.id}
                layout
                className={`group relative bg-white p-5 rounded-2xl border transition-all duration-300 ${
                  task.completed ? 'border-gray-100 opacity-60' : 'border-gray-200 shadow-sm'
                } ${task.started ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
              >
                <div className="flex items-center gap-5">
                  <button 
                    onClick={() => toggleComplete(task.id)}
                    className="flex-shrink-0 cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="text-green-500" size={28} />
                    ) : (
                      <div className="w-7 h-7 rounded-lg border-2 border-gray-200 bg-gray-50 hover:border-indigo-400 transition-colors" />
                    )}
                  </button>
                  
                  <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-xl">{task.emoji}</span>
                            <h4 className={`text-[13px] font-bold tracking-tight uppercase ${task.completed ? 'line-through text-gray-300' : 'text-gray-800'}`}>
                                {task.text}
                            </h4>
                            {task.priority === 'alta' && (
                                <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[8px] font-black uppercase rounded tracking-tighter self-center">Alta</span>
                            )}
                        </div>
                        {task.description && (
                            <p className="text-[10px] text-gray-400 mb-3 line-clamp-1 italic max-w-xl">
                                {task.description}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                            <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100/50">
                                <span className={`text-[10px] font-black uppercase tracking-widest text-indigo-400`}>Trabalho:</span>
                                <span className={`text-[11px] font-black tabular-nums ${task.started ? 'text-indigo-600' : 'text-gray-500'}`}>
                                    {formatTime(currentSeconds)}
                                </span>
                                {task.started && (
                                    <motion.span 
                                        animate={{ opacity: [1, 0, 1] }} 
                                        transition={{ duration: 1, repeat: Infinity }}
                                        className="w-1.5 h-1.5 rounded-full bg-red-500"
                                    />
                                )}
                            </div>

                            {task.idleSeconds > 0 && (
                                <div className="flex items-center gap-2 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100/50">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Parado:</span>
                                    <span className="text-[11px] font-black tabular-nums text-amber-600">
                                        {formatTime(task.idleSeconds)}
                                    </span>
                                </div>
                            )}
                            
                            {task.subtasks && task.subtasks.length > 0 && (
                                <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 border border-gray-100 rounded text-[9px] font-bold text-gray-500">
                                    <CheckCircle2 size={10} className={task.subtasks.every(s => s.completed) ? 'text-green-500' : 'text-gray-400'} />
                                    <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                                </div>
                            )}

                            {task.deadline && (
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-tight">
                                    <Clock size={10} />
                                    <span>Prazo: {new Date(task.deadline).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            )}

                            {task.lastSessionSeconds > 0 && (
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-300 uppercase tracking-tight">
                                    <Timer size={10} />
                                    <span>Ref: {formatTime(task.lastSessionSeconds)}</span>
                                </div>
                            )}
                        </div>
                        <TaskProgress task={task} />
                    </div>
                    <div className="flex items-center gap-3">
                       {!task.completed && (
                        <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleStart(task.id)}
                              className={`px-4 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all cursor-pointer flex items-center gap-2 shadow-sm ${
                                task.started 
                                  ? 'bg-gray-900 text-white' 
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {task.started ? (
                                <>
                                    <Clock size={14} className="animate-spin-slow" />
                                    Parar
                                </>
                              ) : (
                                <>
                                    <Play size={14} fill="currentColor" />
                                    Iniciar
                                </>
                              )}
                            </button>
                            
                            <button 
                                onClick={() => toggleComplete(task.id)}
                                className="px-4 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-green-600 transition-all cursor-pointer flex items-center gap-2 shadow-sm shadow-green-100"
                            >
                                <CheckCircle2 size={14} />
                                Finalizar
                            </button>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => resetSingleTask(task.id)}
                            className="p-2 text-gray-400 hover:text-amber-600 cursor-pointer"
                            title="Reiniciar esta atividade"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button 
                            onClick={() => openTaskModal(task)}
                            className="p-2 text-gray-400 hover:text-indigo-600 cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => removeTask(task.id)} className="p-2 text-gray-400 hover:text-red-600 cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <button 
            onClick={() => openTaskModal()}
            className="w-full py-5 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-3 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/10 transition-all group cursor-pointer"
        >
          <Plus size={20} />
          <span className="text-xs font-black uppercase tracking-[0.2em]">Adicionar Nova Atividade</span>
        </button>
      </div>
    </div>
    );
  };

  const renderBoard = () => {
    const boardItems = filteredTasks.filter(t => {
        if (boardPriorityFilter === 'todas') return true;
        return t.priority === boardPriorityFilter;
    });

    const todoTasks = boardItems.filter(t => !t.completed && !t.started);
    const inProgressTasks = boardItems.filter(t => !t.completed && t.started);
    const doneTasks = boardItems.filter(t => t.completed);

    const DroppableColumn = ({ id, title, count, items, colorClass }: { id: string, title: string, count: number, items: Task[], colorClass: string }) => {
        return (
            <SortableContext id={id} items={items.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col h-full bg-gray-50/30 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between mb-6 px-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{title}</span>
                        <span className={`px-2 py-0.5 ${colorClass} text-[10px] font-bold rounded-full`}>{count}</span>
                    </div>
                    </div>
                    <div id={id} className="space-y-4 flex-1 overflow-y-auto pb-4 px-1 min-h-[200px]">
                        {items.map(task => (
                            <SortableBoardTask 
                                key={task.id} 
                                task={task} 
                                currentSeconds={getTaskCurrentSeconds(task)} 
                                formatTime={formatTime}
                                toggleStart={toggleStart}
                                toggleComplete={toggleComplete}
                                resetSingleTask={resetSingleTask}
                                openTaskModal={openTaskModal}
                                userName={userName}
                            />
                        ))}
                        {items.length === 0 && (
                            <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-xl text-gray-200 text-[9px] font-black uppercase tracking-[0.2em]">
                                Soltar aqui
                            </div>
                        )}
                    </div>
                </div>
            </SortableContext>
        );
    };

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-full gap-6">
            <div className="flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 gap-4">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Prioridade:</span>
                        <div className="flex bg-gray-50 border border-gray-100 rounded-xl p-1">
                            {(['todas', 'alta', 'baixa'] as const).map(p => (
                                <button 
                                    key={p}
                                    onClick={() => setBoardPriorityFilter(p)}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${boardPriorityFilter === p ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status:</span>
                        <div className="flex bg-gray-50 border border-gray-100 rounded-xl p-1">
                            {(['todas', 'pendente', 'em foco', 'concluido'] as const).map(s => (
                                <button 
                                    key={s}
                                    onClick={() => setBoardStatusFilter(s)}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${boardStatusFilter === s ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest mr-2 underline decoration-indigo-200 underline-offset-4">Arraste para organizar</span>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl whitespace-nowrap">
                        Total: {boardItems.length} Itens
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 pb-8">
                {(boardStatusFilter === 'todas' || boardStatusFilter === 'pendente') && (
                    <DroppableColumn id="col-todo" title="Pendente" count={todoTasks.length} items={todoTasks} colorClass="bg-gray-100 text-gray-600" />
                )}
                {(boardStatusFilter === 'todas' || boardStatusFilter === 'em foco') && (
                    <DroppableColumn id="col-in-progress" title="Em Foco" count={inProgressTasks.length} items={inProgressTasks} colorClass="bg-indigo-600 text-white" />
                )}
                {(boardStatusFilter === 'todas' || boardStatusFilter === 'concluido') && (
                    <DroppableColumn id="col-done" title="Concluído" count={doneTasks.length} items={doneTasks} colorClass="bg-green-100 text-green-600" />
                )}
            </div>
        </div>

        <DragOverlay>
            {activeId ? (
                <div className="w-80 shadow-2xl skew-x-[-1deg] rotate-[-1deg]">
                    <BoardTask 
                        task={tasks.find(t => t.id === activeId)} 
                        currentSeconds={getTaskCurrentSeconds(tasks.find(t => t.id === activeId)!)} 
                        formatTime={formatTime}
                        toggleStart={toggleStart}
                        toggleComplete={toggleComplete}
                        resetSingleTask={resetSingleTask}
                        openTaskModal={openTaskModal}
                        userName={userName}
                    />
                </div>
            ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  const renderTimeline = () => (
    <div className="max-w-4xl mx-auto py-12 text-center">
      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Clock size={32} />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">Relatório de Atividades</h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto">
        Aqui você verá um comparativo detalhado do tempo investido em cada tarefa ao longo do dia.
      </p>
      
      <div className="mt-12 bg-white border border-gray-200 rounded-2xl p-8 max-w-2xl mx-auto text-left">
          <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Tempo por Atividade</h4>
          <div className="space-y-6">
              {tasks.map(task => {
                  const val = getTaskCurrentSeconds(task);
                  const width = totalSecondsToday > 0 ? (val / totalSecondsToday) * 100 : 0;
                  return (
                      <div key={task.id}>
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">{task.text}</span>
                              <div className="flex items-center gap-3">
                                {task.idleSeconds > 0 && (
                                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded border border-amber-100/30">Pausa: {formatTime(task.idleSeconds)}</span>
                                )}
                                <span className="text-[10px] font-bold text-indigo-600 tabular-nums bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/30">{formatTime(val)}</span>
                              </div>
                          </div>
                          <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${width}%` }}
                                className="h-full bg-indigo-500"
                              />
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>
    </div>
  );

  const renderTeam = () => (
    <div className="max-w-4xl mx-auto">
       <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight uppercase tracking-tighter">Equipe de Operações</h2>
          <button 
            onClick={() => setIsTeamModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.1em] hover:bg-indigo-700 transition-all cursor-pointer shadow-lg shadow-indigo-100"
          >
            <Plus size={16} />
            Convidar Membro
          </button>
       </div>
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 tracking-tight uppercase tracking-tighter">Equipe de Operações</h2>
                    <button 
                        onClick={() => setIsTeamModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.1em] hover:bg-indigo-700 transition-all cursor-pointer shadow-lg shadow-indigo-100"
                    >
                        <Plus size={16} />
                        Convidar Membro
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {members.map(member => (
                        <div key={member.id} className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center gap-5 shadow-sm hover:shadow-md transition-all group">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-lg border-4 border-white shadow-inner ${member.name === userName ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {member.name.substring(0, 2)}
                            </div>
                            <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-black text-gray-800 uppercase tracking-tight leading-none text-sm">{member.name}</h4>
                                {member.name === userName && (
                                    <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Você</span>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">{member.role}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <span className={`px-2 py-1 text-[8px] font-black rounded uppercase tracking-widest ${member.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                    {member.active ? 'Ativa' : 'Offline'}
                                </span>
                                {member.name !== userName && (
                                    <button 
                                        onClick={() => removeMember(member.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 transition-all cursor-pointer"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-8 h-fit">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-8 pb-4 border-b border-gray-50 flex items-center gap-2">
                    <Bell size={16} />
                    Configurar Notificações
                </h3>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-gray-800 uppercase">Ativar Alertas</p>
                            <p className="text-[9px] text-gray-400 font-medium">Receber lembretes de prazos</p>
                        </div>
                        <button 
                            onClick={() => setNotifPrefs(prev => ({ ...prev, enabled: !prev.enabled }))}
                            className={`w-10 h-5 rounded-full relative transition-all ${notifPrefs.enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${notifPrefs.enabled ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-gray-800 uppercase">Alertas Sonoros</p>
                            <p className="text-[9px] text-gray-400 font-medium">Reproduzir som ao notificar</p>
                        </div>
                        <button 
                            onClick={() => setNotifPrefs(prev => ({ ...prev, sound: !prev.sound }))}
                            disabled={!notifPrefs.enabled}
                            className={`w-10 h-5 rounded-full relative transition-all ${notifPrefs.sound && notifPrefs.enabled ? 'bg-indigo-600' : 'bg-gray-200'} ${!notifPrefs.enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${notifPrefs.sound ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-gray-800 uppercase">Notificações no Navegador</p>
                            <p className="text-[9px] text-gray-400 font-medium">Alertas do sistema operacional</p>
                        </div>
                        <button 
                            onClick={() => {
                                if ("Notification" in window) {
                                    Notification.requestPermission().then(res => {
                                        if (res === 'granted') {
                                            setNotifPrefs(prev => ({ ...prev, browser: true }));
                                            showToast("Notificações de navegador ativadas!", "success");
                                        } else {
                                            showToast("Permissão negada pelo navegador. Verifique os cadeados na barra de endereços.", "error");
                                            setNotifPrefs(prev => ({ ...prev, browser: false }));
                                        }
                                    }).catch(() => {
                                        showToast("Erro ao solicitar permissão. Tente abrir em uma nova aba.", "error");
                                    });
                                } else {
                                    showToast("Este navegador não suporta notificações.", "error");
                                }
                            }}
                            disabled={!notifPrefs.enabled}
                            className={`w-10 h-5 rounded-full relative transition-all ${notifPrefs.browser && notifPrefs.enabled ? 'bg-indigo-600' : 'bg-gray-200'} ${!notifPrefs.enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${notifPrefs.browser ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-50">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed mb-6">
                        Você será notificado 30 minutos antes de cada prazo configurado em suas atividades.
                    </p>
                    <button 
                        onClick={() => {
                            if (notifPrefs.sound) {
                                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                                audio.play().catch(() => {});
                            }
                        }}
                        className="w-full py-3 bg-gray-50 text-[9px] font-black uppercase tracking-widest text-indigo-600 rounded-xl hover:bg-gray-100 transition-all border border-gray-100"
                    >
                        Testar Som de Alerta
                    </button>
                </div>
            </div>
       </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F9FAFB] text-[#111827] font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            {userName.charAt(0)}
          </div>
          <h1 className="text-lg font-black tracking-tighter uppercase italic">AtivFlow</h1>
        </div>
        
        <nav className="mt-4 flex-1 px-4 space-y-2">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all cursor-pointer ${
              currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button 
            onClick={() => setCurrentView('board')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all cursor-pointer ${
              currentView === 'board' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Trello size={18} />
            Board
          </button>
          <button 
            onClick={() => setCurrentView('timeline')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all cursor-pointer ${
              currentView === 'timeline' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Clock size={18} />
            Relatórios
          </button>
          <button 
            onClick={() => setCurrentView('team')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all cursor-pointer ${
              currentView === 'team' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Users size={18} />
            Equipe
          </button>
        </nav>

        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 text-xs font-black">
              {userName.substring(0, 2)}
            </div>
            <div className="flex-1 overflow-hidden">
              {isUserEditing ? (
                  <input 
                    autoFocus
                    className="w-full bg-gray-50 border border-gray-200 rounded p-1 text-[10px] font-black uppercase outline-none"
                    value={userName}
                    onChange={(e) => {
                        const newName = e.target.value.toUpperCase();
                        setUserName(newName);
                        setMembers(prev => prev.map(m => m.id === '1' ? { ...m, name: newName } : m));
                    }}
                    onBlur={() => setIsUserEditing(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsUserEditing(false)}
                  />
              ) : (
                  <p 
                    onDoubleClick={() => setIsUserEditing(true)}
                    className="text-[11px] font-black truncate uppercase tracking-tight cursor-text"
                    title="Clique duplo para editar seu nome"
                  >
                    {userName}
                  </p>
              )}
              <p className="text-[9px] text-gray-400 truncate font-bold uppercase">Líder de Equipe</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black tracking-tight uppercase">
              {currentView === 'dashboard' && 'Dashboard'}
              {currentView === 'board' && 'Board'}
              {currentView === 'timeline' && 'Relatórios'}
              {currentView === 'team' && 'Equipe'}
            </h2>
            <div className="h-4 w-[1px] bg-gray-200" />
            <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-[10px] px-3 py-1 bg-indigo-50 rounded-full uppercase tracking-widest">
              <Calendar size={12} />
              <span>{today}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-gray-400 group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <Search size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar atividade..." 
                  className="bg-transparent border-none outline-none text-xs font-medium w-48" 
                />
            </div>
            <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 transition-all rounded-lg cursor-pointer relative ${showNotifications ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`} 
                  title="Notificações"
                >
                  <Bell size={20} />
                  {tasks.length > 0 && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                      >
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notificações</span>
                          <span className="text-[9px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full shadow-sm">Recentes</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {tasks.length > 0 ? (
                            tasks.slice(0, 5).map(task => (
                              <div key={task.id} className="p-4 border-b border-gray-50 flex gap-3 hover:bg-gray-50 transition-colors">
                                <span className="text-lg">{task.emoji}</span>
                                <div>
                                  <p className="text-[11px] font-bold text-gray-800 leading-tight uppercase">{task.text}</p>
                                  <p className="text-[9px] text-gray-400 mt-1">Sincronizado {new Date(task.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest uppercase">Sem notificações</div>
                          )}
                        </div>
                        <div className="p-3 text-center bg-gray-50/30">
                          <button className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer">Ver todas as atividades</button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
            </div>
            <div className="h-6 w-[1px] bg-gray-200 mx-2" />
            <button 
                onClick={() => openTaskModal()}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.1em] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              Novo Item
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentView === 'dashboard' && renderDashboard()}
              {currentView === 'board' && renderBoard()}
              {currentView === 'timeline' && renderTimeline()}
              {currentView === 'team' && renderTeam()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Stats */}
        <footer className="h-14 bg-white border-t border-gray-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    Sessão Ativa: <strong className="text-indigo-600 tabular-nums">{formatTime(totalSecondsToday)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    Progresso: <strong className="text-gray-700">{progressPercent}%</strong>
                </span>
              </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] text-gray-300 uppercase tracking-widest font-black">
              Sync: {new Date().toLocaleTimeString('pt-BR', { hour12: false })}
            </span>
          </div>
        </footer>
      </main>

      {/* Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <form onSubmit={handleSaveTask}>
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black uppercase tracking-tight text-gray-800">
                      {tasks.find(t => t.id === modalTask?.id) ? 'Editar Atividade' : 'Nova Atividade'}
                    </h3>
                    <button 
                      type="button" 
                      onClick={closeModal} 
                      className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={20} className="rotate-45" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Nome da Atividade</label>
                      <input 
                        autoFocus
                        type="text" 
                        value={modalTask?.text || ''}
                        onChange={(e) => setModalTask(prev => ({ ...prev!, text: e.target.value.toUpperCase() }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        placeholder="EX: RESPONDER CLIENTES"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Descrição Detalhada</label>
                      <textarea 
                        value={modalTask?.description || ''}
                        onChange={(e) => setModalTask(prev => ({ ...prev!, description: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[11px] font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[80px] resize-y"
                        placeholder="Adicione observações ou detalhes importantes aqui..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Emoji / Ícone</label>
                        <select 
                          value={modalTask?.emoji || '📝'}
                          onChange={(e) => setModalTask(prev => ({ ...prev!, emoji: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="☀️">☀️ Dia</option>
                          <option value="📩">📩 Mensagem</option>
                          <option value="📸">📸 Foto</option>
                          <option value="🚀">🚀 Foguete</option>
                          <option value="✨">✨ Magia</option>
                          <option value="🧹">🧹 Limpeza</option>
                          <option value="📦">📦 Caixa</option>
                          <option value="📝">📝 Nota</option>
                          <option value="🛒">🛒 Compra</option>
                          <option value="📞">📞 Ligação</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Vencimento / Prazo</label>
                        <input 
                            type="datetime-local"
                            value={modalTask?.deadline || ''}
                            onChange={(e) => setModalTask(prev => ({ ...prev!, deadline: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Prioridade</label>
                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                          <button 
                            type="button" 
                            onClick={() => setModalTask(prev => ({ ...prev!, priority: 'baixa' }))}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${modalTask?.priority === 'baixa' ? 'text-indigo-600 bg-white shadow-sm' : 'text-gray-400'}`}
                          >
                            Baixa
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setModalTask(prev => ({ ...prev!, priority: 'alta' }))}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${modalTask?.priority === 'alta' ? 'text-red-600 bg-white shadow-sm' : 'text-gray-400'}`}
                          >
                            Alta
                          </button>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <button 
                            type="button"
                            onClick={() => setModalTask(prev => ({ ...prev!, reminderSet: !prev?.reminderSet }))}
                            className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${modalTask?.reminderSet ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                        >
                            <Bell size={14} />
                            {modalTask?.reminderSet ? 'Lembrete Ativo' : 'Ativar Lembrete'}
                        </button>
                      </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                             <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Sub-tarefas (Checklist)</label>
                             <button 
                                type="button" 
                                onClick={() => setModalTask(prev => ({ ...prev!, subtasks: [...(prev?.subtasks || []), { id: Math.random().toString(36).substring(2, 9), text: '', completed: false }] }))}
                                className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:text-indigo-700"
                             >
                                <Plus size={12} />
                                Adicionar
                             </button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {modalTask?.subtasks?.map((st, idx) => (
                                <div key={st.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const newSub = [...modalTask.subtasks!];
                                            newSub[idx].completed = !newSub[idx].completed;
                                            setModalTask(prev => ({ ...prev!, subtasks: newSub }));
                                        }}
                                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${st.completed ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-transparent'}`}
                                    >
                                        <CheckCircle2 size={12} />
                                    </button>
                                    <input 
                                        type="text" 
                                        value={st.text}
                                        onChange={(e) => {
                                            const newSub = [...modalTask.subtasks!];
                                            newSub[idx].text = e.target.value.toUpperCase();
                                            setModalTask(prev => ({ ...prev!, subtasks: newSub }));
                                        }}
                                        placeholder="Nome da sub-tarefa..."
                                        className={`flex-1 bg-transparent border-none outline-none text-[10px] font-bold ${st.completed ? 'line-through text-gray-300' : 'text-gray-700'}`}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setModalTask(prev => ({ ...prev!, subtasks: prev?.subtasks?.filter(s => s.id !== st.id) }));
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                            {modalTask?.subtasks?.length === 0 && (
                                <p className="text-[9px] text-gray-300 italic py-2">Nenhuma sub-tarefa definida</p>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Sugestões Rápidas (IA)</label>
                            <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">Para: {members.find(m => m.id === '1' || m.name === userName)?.role || 'Líder'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {getSmartSuggestions().map((item, idx) => (
                                <button
                                    key={`${item.text}-${idx}`}
                                    type="button"
                                    onClick={() => setModalTask(prev => ({ ...prev!, text: item.text, emoji: item.emoji }))}
                                    className={`flex items-center gap-3 p-2.5 border rounded-xl transition-all text-left group cursor-pointer ${'isFrequent' in item && item.isFrequent ? 'bg-indigo-50/50 border-indigo-100 border-dashed' : 'bg-gray-50 border-gray-100 hover:border-indigo-300 hover:bg-white'}`}
                                >
                                    <span className="text-sm bg-white p-1 rounded-lg shadow-sm">{item.emoji}</span>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-gray-500 group-hover:text-indigo-600 uppercase tracking-tight leading-tight">{item.text}</span>
                                        {'isFrequent' in item && item.isFrequent && (
                                            <span className="text-[7px] text-indigo-400 font-black uppercase mt-0.5">Frequente</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:bg-gray-100 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer"
                  >
                    Salvar Atividade
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {taskToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTaskToDelete(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-gray-800 mb-2">Excluir Atividade?</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed mb-8">
                Esta ação não pode ser desfeita. Todo o tempo registrado será perdido.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTaskToDelete(null)}
                  className="flex-1 py-4 bg-gray-50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 rounded-2xl hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDeleteTask}
                  className="flex-1 py-4 bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-red-100 hover:bg-red-600 transition-all cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Member Modal */}
      <AnimatePresence>
        {isTeamModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTeamModalOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <form onSubmit={handleAddMember} className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Users size={24} />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-gray-800">Novo Membro</h3>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setIsTeamModalOpen(false)} 
                      className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={20} className="rotate-45" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Nome do Membro</label>
                      <input 
                        autoFocus
                        type="text" 
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value.toUpperCase())}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="EX: MARIA SOUZA"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Cargo / Função</label>
                      <select 
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="Consultora">Consultora</option>
                        <option value="Vendedora">Vendedora</option>
                        <option value="Estoquista">Estoquista</option>
                        <option value="Caixa">Caixa</option>
                        <option value="Marketing">Marketing</option>
                      </select>
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button 
                        type="button" 
                        onClick={() => setIsTeamModalOpen(false)}
                        className="flex-1 py-4 bg-gray-50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 rounded-2xl hover:bg-gray-100 transition-all cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        className="flex-1 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer"
                    >
                        Adicionar
                    </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 
                toast.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 
                'bg-gray-900 border-gray-800 text-white'
            }`}
          >
            {toast.type === 'error' && <RotateCcw size={16} className="rotate-45" />}
            {toast.type === 'success' && <CheckCircle2 size={16} />}
            {toast.type === 'info' && <Bell size={16} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
