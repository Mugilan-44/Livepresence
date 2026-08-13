import React, { useState, useMemo } from 'react';
import {
  Building, Clock, Hourglass, CheckCircle2, Search, ChevronRight, ChevronDown,
  Plus, User, Briefcase, Layers, TrendingUp, X, AlertCircle, Filter, Calendar, ShieldCheck, RefreshCcw
} from 'lucide-react';
import TeamMemberTaskProgressWidget from './projects/TeamMemberTaskProgressWidget';
import TaskReworkModal from './projects/TaskReworkModal';


export default function ProjectVelocityWidget({
  activeUser, projects = [], tasks = [], users = [], customizations, onUpdateTaskStatus, onCreateTask, onCreateProject, onOpenAllocation
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [expandedProjectId, setExpandedProjectId] = useState(projects[0]?.id || null);

  // Modals state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // New Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProjectId, setTaskProjectId] = useState(projects[0]?.id || '');
  const [taskAssigneeId, setTaskAssigneeId] = useState(users[3]?.id || users[0]?.id || '');
  const [taskPriority, setTaskPriority] = useState('High');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPoints, setTaskPoints] = useState('8');

  // New Project form state
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projClient, setProjClient] = useState('Prolync Internal');
  const [projDeadline, setProjDeadline] = useState('');
  const [projBudget, setProjBudget] = useState('₹3,50,000');
  const [assignedUserIds, setAssignedUserIds] = useState([]);

  const canManageWork = ['SUPER_ADMIN', 'MANAGER'].includes(activeUser?.role);
  const canCreateTask = Boolean(activeUser?.id);
  const isAdmin = canManageWork;
  const canScopeProject = Boolean(activeUser?.id);
  // The board is the team's shared delivery view. Any signed-in colleague can
  // move a work card; the movement history still records exactly who did it.
  const canMoveTask = () => Boolean(activeUser?.id);
  const stageFor = (status) => ({
    'To Do': 'Research and planning', 'Not Started': 'Research and planning',
    'In Progress': 'Development', 'Code Review': 'Deployment',
    'Testing / QA': 'Testing', 'Testing': 'Testing', 'Done': 'Completed',
    'Completed': 'Completed'
  }[status] || status || 'Research and planning');
  const isOverdue = (item) => Boolean(item?.due_date || item?.deadline) && String(item.due_date || item.deadline).slice(0, 10) < new Date().toISOString().slice(0, 10) && stageFor(item.status) !== 'Completed';
  const projectStateFor = (project) => {
    const projectTasks = tasks.filter(task => task.project_id === project.id);
    if (!projectTasks.length) return 'new';
    if (projectTasks.every(task => stageFor(task.status) === 'Research and planning')) return 'new';
    if (projectTasks.every(task => stageFor(task.status) === 'Completed')) return 'completed';
    return 'processing';
  };

  // Filter projects based on Role-Based Scoping Guard
  const scopedProjects = useMemo(() => {
    if (isAdmin) return projects; // Admins see ALL projects

    return projects.filter(p => {
      // User is project lead
      const isLead = p.lead_id === activeUser?.id || p.lead_name === activeUser?.name || p.lead === activeUser?.name;
      // User is assigned to at least 1 task in project
      const hasTaskAssigned = tasks.some(t => t.project_id === p.id && (t.assigned_to === activeUser?.id || t.assigned_name === activeUser?.name));
      // User assigned a task to someone in project
      const hasTaskCreated = tasks.some(t => t.project_id === p.id && t.assigner_name === activeUser?.name);

      return isLead || hasTaskAssigned || hasTaskCreated;
    });
  }, [projects, tasks, activeUser, isAdmin]);

  // Filter projects by Search Query
  const filteredProjects = useMemo(() => {
    const matching = !searchQuery.trim() ? scopedProjects : scopedProjects.filter(p =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.lead_name && p.lead_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const filtered = projectFilter === 'all' ? matching : matching.filter(project => projectStateFor(project) === projectFilter);
    const order = { new: 0, processing: 1, completed: 2 };
    return [...filtered].sort((a, b) => order[projectStateFor(a)] - order[projectStateFor(b)]);
  }, [scopedProjects, searchQuery, projectFilter, tasks]);

  // Filter tasks relevant to scoped projects
  const scopedTasks = useMemo(() => {
    if (isAdmin) return tasks;
    const projectIds = new Set(scopedProjects.map(p => p.id));
    return tasks.filter(t => projectIds.has(t.project_id));
  }, [tasks, scopedProjects, isAdmin]);

  // Calculate Protocol KPI Counts
  const activeProjectsCount = scopedProjects.filter(p => p.status === 'Active' || !p.status).length;
  const stages = ['Research and planning', 'Development', 'Deployment', 'Testing', 'Completed'];
  const notStartedCount = scopedTasks.filter(t => stageFor(t.status) === 'Research and planning').length;
  const ongoingTasksCount = scopedTasks.filter(t => stageFor(t.status) === 'Development').length;
  const completedTasksCount = scopedTasks.filter(t => stageFor(t.status) === 'Completed').length;

  const moveTask = async (event, taskId, stage) => {
    event?.preventDefault();
    const task = tasks.find(item => item.id === taskId);
    if (!task || !canMoveTask(task)) return;
    try {
      await onUpdateTaskStatus(taskId, stage);
    } finally {
      setDraggedTaskId(null);
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    await onCreateTask({
      projectId: taskProjectId || projects[0]?.id,
      title: taskTitle,
      description: taskDesc,
      assignedToId: canManageWork ? taskAssigneeId : activeUser?.id,
      assignerName: activeUser?.name || "Colleague",
      priority: taskPriority,
      dueDate: taskDueDate,
      velocityPoints: taskPoints
    });
    setTaskTitle('');
    setTaskDesc('');
    setShowTaskModal(false);
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    await onCreateProject({
      title: projTitle,
      client: projClient,
      description: projDesc,
      leadId: activeUser?.id,
      leadName: activeUser?.name,
      deadline: projDeadline,
      budget: projBudget,
      userRole: activeUser?.role
    });
    setProjTitle('');
    setProjDesc('');
    setShowProjectModal(false);
  };

  return (
    <div className="space-y-6 select-none">

      {/* 1. Protocol Metric KPI Cards Header (Exact UI from Screenshot Protocol) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Active Projects */}
        <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Active projects</span>
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {activeProjectsCount}
          </div>
        </div>

        {/* Card 2: Not Yet Started */}
        <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Not Yet Started</span>
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {notStartedCount}
          </div>
        </div>

        {/* Card 3: Ongoing Tasks */}
        <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
              <Hourglass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Ongoing Tasks</span>
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {ongoingTasksCount}
          </div>
        </div>

        {/* Card 4: Completed Tasks */}
        <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Completed Tasks</span>
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {completedTasksCount}
          </div>
        </div>

      </div>

      {/* 2. My Projects Control Bar & Search Input */}
      <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2">
              Project management
              {!isAdmin && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  Your workspace
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAdmin ? 'All active projects and team tasks' : 'Projects assigned to you or managed by your team'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManageWork && (
              <button
                onClick={onOpenAllocation}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition"
              >
                <User className="w-3.5 h-3.5 text-slate-500" /> Team allocation
              </button>
            )}
            {canScopeProject && (
              <button
                onClick={() => setShowProjectModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-500" /> New project
              </button>
            )}
            {canCreateTask && <button
              onClick={() => setShowTaskModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Create task
            </button>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2"><button onClick={() => setProjectFilter('new')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${projectFilter === 'new' ? 'bg-[var(--accent)] text-white' : 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>New</button><button onClick={() => setProjectFilter('processing')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${projectFilter === 'processing' ? 'bg-[var(--accent)] text-white' : 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>On Processing</button><button onClick={() => setProjectFilter('completed')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${projectFilter === 'completed' ? 'bg-[var(--accent)] text-white' : 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>Completed</button><button onClick={() => setProjectFilter('all')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${projectFilter === 'all' ? 'bg-[var(--accent)] text-white' : 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>All</button></div>

        {/* Search Input Protocol */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search Projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>
      </div>

      {/* 3. Scoped Projects List & Task Kanban Accordion */}
      <div className="space-y-4">
        {filteredProjects.map((proj, index) => {
          const projTasks = tasks.filter(t => t.project_id === proj.id);
          const isExpanded = expandedProjectId === proj.id;
          const completedCount = projTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
          const projectState = projectStateFor(proj);
          const previousState = index > 0 ? projectStateFor(filteredProjects[index - 1]) : null;
          const sectionTitle = projectState === 'new' ? 'New' : projectState === 'processing' ? 'On Processing' : 'Completed';

          return (
            <React.Fragment key={proj.id}>
              {projectState !== previousState && <div className="flex items-center gap-3 pt-2"><h3 className="text-sm font-bold text-slate-900 dark:text-white">{sectionTitle}</h3><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /></div>}
            <div
              className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700"
            >
              {/* Project Card Header (Exact UI from Screenshot Protocol) */}
              <div
                onClick={() => setExpandedProjectId(isExpanded ? null : proj.id)}
                className="p-4 sm:p-5 flex items-center justify-between cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                      {proj.title}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Lead: {proj.lead_name || proj.lead || 'Unassigned'}
                      </span>
                      {proj.created_by_name && <span className="text-[10px] font-medium text-slate-500">Created by {proj.created_by_name}</span>}
                      {isOverdue(proj) && <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">Overdue</span>}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {projTasks.length === 0
                        ? 'No tasks assigned to you yet'
                        : `${projTasks.length} task${projTasks.length > 1 ? 's' : ''} assigned • ${completedCount} completed`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                    <span>Progress:</span>
                    <strong className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">{proj.completion_pct}%</strong>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Project Kanban Pipeline */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-[#0d1322]">
                  
                  {/* Action Bar for Project */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed flex-1">
                      {proj.description || 'No project description has been added yet.'}
                    </p>

                    {canCreateTask && <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskProjectId(proj.id);
                        setShowTaskModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md flex items-center gap-1.5 transition flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Create task
                    </button>}
                  </div>

                  {/* Team Member Task Progress Widget */}
                  <TeamMemberTaskProgressWidget projectId={proj.id} projectTitle={proj.title} />

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-4">
                      <span>Deadline: <strong className="text-slate-900 dark:text-white">{proj.deadline}</strong></span>
                      <span>Budget: <strong className="text-slate-900 dark:text-white">{proj.budget}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Overall Completion:</span>
                      <div className="w-32 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all" style={{ width: `${proj.completion_pct}%` }} />
                      </div>
                    </div>
                  </div>


                  {/* Kanban Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 pt-2">
                    {stages.map((stage) => {
                      const stageTasks = projTasks.filter(t => stageFor(t.status) === stage);
                      return (
                        <div key={stage} onDragOver={(event) => { if (draggedTaskId) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }} onDrop={(event) => moveTask(event, event.dataTransfer.getData('text/plain') || draggedTaskId, stage)} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 flex flex-col min-h-[200px]">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              {stage}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                              {stageTasks.length}
                            </span>
                          </div>

                          <div className="space-y-2.5 flex-1">
                            {stageTasks.map((t) => (
                              <div key={t.id} draggable={canMoveTask(t)} onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', t.id); setDraggedTaskId(t.id); }} onDragEnd={() => setDraggedTaskId(null)} className={`bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 hover:border-slate-400 rounded-xl p-3 transition shadow-2xs space-y-2 ${canMoveTask(t) ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{t.title}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    t.priority === 'High' || t.priority === 'Critical' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                  }`}>
                                    {t.priority}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">{t.description}</p>
                                <p className="text-[10px] text-slate-500">Created by {t.created_by_name || t.assigner_name || 'Team'}{t.movement_history?.[0] ? ` · Last moved by ${t.movement_history[0].actor_name} to ${t.movement_history[0].to_status}` : ''}</p>
                                <div className={`text-[10px] font-semibold ${t.is_overdue || isOverdue(t) ? 'text-rose-600 dark:text-rose-300' : 'text-slate-500'}`}>{t.is_overdue || isOverdue(t) ? `Overdue · due ${t.due_date}` : `Due ${t.due_date || 'Not set'}`}</div>
                                
                                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                    <User className="w-3 h-3 text-cyan-500" /> {t.assigned_name}
                                  </span>
                                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{t.velocity_points || 5} pts</span>
                                </div>

                                {/* Direct Interactive Status Selector Dropdown & Quick Move Buttons */}
                                {canMoveTask(t) && <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-500 font-medium">Update Status:</span>
                                    <select
                                      value={stageFor(t.status)}
                                      onChange={(e) => onUpdateTaskStatus(t.id, e.target.value)}
                                      className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 focus:outline-none focus:border-cyan-500 cursor-pointer"
                                    >
                                      {stages.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>}
                              </div>
                            ))}

                            {stageTasks.length === 0 && (
                              <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic py-6">
                                No tasks in {stage}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            </React.Fragment>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-sm">
            <Building className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Projects Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {isAdmin
                ? 'No matching projects found for your search query.'
                : 'You are currently not assigned to any project. Contact your manager or assign a task to get started!'}
            </p>
          </div>
        )}
      </div>

      {/* Task Allocation Modal (Anyone to Anyone) */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleTaskSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">Create a new task</h3>
              <button type="button" onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Project</label>
              <select
                value={taskProjectId}
                onChange={(e) => setTaskProjectId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Task Title *</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
                placeholder="e.g. Build spatial coordinate index parser"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description *</label>
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
                placeholder="Detailed task instructions..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assignee (Anyone to Anyone)</label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
                >
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority Tag</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Completion date *</label>
                <input type="date" required value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="text-xs px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/20"
              >
                Assign & Trigger Reminder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scope Project Modal (Top Tiers) */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleProjectSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">Create a new project</h3>
              <button type="button" onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Project Title *</label>
              <input
                type="text"
                value={projTitle}
                onChange={(e) => setProjTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
                placeholder="e.g. Prolync Mobile App v2"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Client / Business Unit</label>
              <input
                type="text"
                value={projClient}
                onChange={(e) => setProjClient(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
                placeholder="e.g. Internal Operations"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description *</label>
              <textarea
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
                placeholder="High-level project scope and deliverables..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deadline Date</label>
                <input required
                  type="date"
                  value={projDeadline}
                  onChange={(e) => setProjDeadline(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Budget Allocation</label>
                <input
                  type="text"
                  value={projBudget}
                  onChange={(e) => setProjBudget(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. ₹5,00,000"
                />
              </div>
            </div>

            {/* Assign Multiple Employees to Project */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assign Team Members (2 or more employees)</label>
              <div className="max-h-32 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                {users.map(u => {
                  const isChecked = assignedUserIds.includes(u.id);
                  return (
                    <label key={u.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{u.name} <span className="text-[10px] font-mono text-slate-400">({u.department || u.role})</span></span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setAssignedUserIds(prev => isChecked ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                        }}
                        className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                className="text-xs px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/20"
              >
                Scope & Publish Project
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
