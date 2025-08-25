import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronDown, Check, Plus, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';

// AI Task Analysis Interface
interface AITaskAnalysis {
  summary: string;
  subtasks: Array<{
    title: string;
    points: number;
  }>;
  totalTime: number; // in hours
  isLoading?: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  devops: Array<{ id: string; name: string }>;
}

interface Project {
  id: string;
  title: string;
  devops: Array<{ id: string; name: string }>;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (tasks: string, selectedTaskIds: string[], projectId: string) => void;
  onSkip: () => void;
  userId?: string;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onApply, userId }) => {
  const [tasks, setTasks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskScore, setNewTaskScore] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isEditingTaskSummary, setIsEditingTaskSummary] = useState(false);

  // AI Analysis State
  const [aiAnalyses, setAiAnalyses] = useState<Record<string, AITaskAnalysis>>({});
  const [customTasks, setCustomTasks] = useState<Array<{ id: string; title: string; description: string }>>([]);
  const [nextCustomTaskId, setNextCustomTaskId] = useState(1);
  
  // Track which analysis sections should be visible
  const [visibleAnalyses, setVisibleAnalyses] = useState<Set<string>>(new Set());

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const analysisRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const setAnalysisRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    analysisRefs.current[id] = el;
  }, []);
  const scrollToAnalysis = (id: string) => {
    const el = analysisRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  const [lastAnalyzedId, setLastAnalyzedId] = useState<string | null>(null);

  // Scroll when the last analyzed block finishes loading and is rendered
  useEffect(() => {
    if (!lastAnalyzedId) return;
    const analysis = aiAnalyses[lastAnalyzedId];
    if (analysis && analysis.isLoading === false) {
      setTimeout(() => scrollToAnalysis(lastAnalyzedId), 50);
    }
  }, [aiAnalyses, lastAnalyzedId]);

  // Helper to detect trivial/non-actionable inputs like "hi", "hello", duplicated short words, etc.
  const isTrivialTask = (text: string): boolean => {
    let raw = (text || '').trim().toLowerCase();
    if (!raw) return true;

    // Remove score annotations like "score: 0"
    raw = raw.replace(/score\s*:\s*[0-9]+/gi, '').trim();

    const greetings = new Set([
      'hi', 'hello', 'hey', 'yo', 'test', 'ok', 'okay', 'n/a', 'na', 'none', 'no task', 'no tasks'
    ]);

    // Exact trivial phrases
    if (greetings.has(raw)) return true;
    if (/^(hi|hello|hey|yo)(\s+\1)?$/.test(raw)) return true; // greeting or repeated greeting

    const alnum = raw.replace(/[^a-z0-9]+/g, ' ').trim();
    if (!alnum) return true;
    const words = alnum.split(/\s+/).filter(Boolean);

    // One or two-word inputs are considered trivial per requirements
    if (words.length <= 2) return true;

    // Treat two short, non-meaningful words as trivial (e.g., "hi hi", "hihi hi")
    if (words.length === 2) {
      const [w1, w2] = words;
      const meaningfulShortWords = new Set(['api', 'db', 'ui', 'ux', 'sql']);
      const meaningfulWords = new Set(['fix', 'bug', 'login', 'signup', 'register', 'deploy', 'build', 'page', 'auth', 'update', 'create', 'delete', 'task']);
      const bothShort = w1.length <= 3 && w2.length <= 3;
      const bothGreetings = greetings.has(w1) && greetings.has(w2);
      const repeated = w1 === w2;
      const bothUnmeaningfulShort = bothShort && !meaningfulShortWords.has(w1) && !meaningfulShortWords.has(w2);
      const bothUnmeaningful = !meaningfulWords.has(w1) && !meaningfulWords.has(w2);
      // Detect simple repeated-syllable gibberish like "hihi", "yoyo"
      const repeatsSmallPattern = (w: string) => /^([a-z]{1,2})\1+$/.test(w);
      const eitherGibberishRepeat = repeatsSmallPattern(w1) || repeatsSmallPattern(w2);
      const shortCombined = (w1.length + w2.length) <= 10;
      if (
        repeated ||
        bothGreetings ||
        (bothUnmeaningfulShort && bothUnmeaningful) ||
        (eitherGibberishRepeat && bothUnmeaningful) ||
        (shortCombined && bothUnmeaningful)
      ) return true;
    }

    return false;
  };

  // (removed) isAutoGeneratedSummary

  // Heuristic estimator for non-trivial inputs when AI fails
  const buildHeuristicEstimate = (
    text: string
  ): { summary: string; subtasks: Array<{ title: string; points: number }>; totalTime: number } => {
    const raw = (text || '').trim();
    const lower = raw.toLowerCase();

    // Identify likely pages/features
    const pageKeywords = [
      'home', 'homepage', 'landing', 'about', 'contact', 'blog', 'pricing', 'dashboard', 'admin', 'profile', 'settings'
    ];
    const techHints = [
      'react', 'next', 'vue', 'svelte', 'angular', 'auth', 'login', 'signup', 'api', 'stripe', 'payment', 'cms', 'db', 'database', 'crud', 'form', 'responsive', 'animation'
    ];

    const foundPages = new Set<string>();
    pageKeywords.forEach(k => { if (lower.includes(k)) foundPages.add(k); });
    const pages = Array.from(foundPages);

    let complexityBumps = 0;
    techHints.forEach(k => { if (lower.includes(k)) complexityBumps += 1; });

    const subtasks: Array<{ title: string; points: number }> = [];

    if (pages.length > 0) {
      // Base points
      let designBase = 1.0;
      let devBase = 1.0;
      if (lower.includes('responsive')) designBase += 0.25;
      if (lower.includes('animation')) designBase += 0.25;
      if (lower.includes('crud') || lower.includes('db') || lower.includes('database')) devBase += 0.25;

      pages.forEach(p => {
        const name = p.charAt(0).toUpperCase() + p.slice(1);
        subtasks.push({ title: `• Design ${name} Page`, points: parseFloat(designBase.toFixed(2)) });
        subtasks.push({ title: `• Develop ${name} Page`, points: parseFloat(devBase.toFixed(2)) });
      });

      // Integration and testing scale with number of pages + complexity bumps
      const integratePts = 0.25 + Math.max(0, pages.length - 1) * 0.25 + Math.min(0.5, complexityBumps * 0.1);
      const testPts = 0.5 + pages.length * 0.25 + Math.min(0.75, complexityBumps * 0.15);
      subtasks.push({ title: '• Integrate Pages', points: parseFloat(integratePts.toFixed(2)) });
      subtasks.push({ title: '• Testing and Debugging', points: parseFloat(testPts.toFixed(2)) });
    } else {
      // Generic feature-based estimate when pages aren't explicit
      const basePlan = 0.5;
      let impl = 1.0 + Math.min(1.5, complexityBumps * 0.25);
      let test = 0.5 + Math.min(1.0, complexityBumps * 0.2);
      // Slight scale with length
      const wordCount = raw.split(/\s+/).filter(Boolean).length;
      if (wordCount > 12) { impl += 0.5; test += 0.25; }
      if (wordCount > 25) { impl += 0.5; test += 0.25; }

      subtasks.push({ title: `• Clarify scope for: ${raw.slice(0, 40)}`, points: parseFloat(basePlan.toFixed(2)) });
      subtasks.push({ title: `• Implement core features for: ${raw.slice(0, 40)}`, points: parseFloat(impl.toFixed(2)) });
      subtasks.push({ title: `• Test and validate: ${raw.slice(0, 40)}`, points: parseFloat(test.toFixed(2)) });
    }

    const totalPoints = subtasks.reduce((s, t) => s + (t.points || 0), 0);
    const totalTime = parseFloat(totalPoints.toFixed(2)); // 1 point = 1 hour, rounded
    return {
      summary: `Estimate for: ${raw}`,
      subtasks,
      totalTime
    };
  };

  type InsightRow = { title: string; description?: string; hoursMin: number; hoursMax: number; hoursMid: number };
  type Insights = {
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'VeryLarge';
    easyParts: string[];
    mediumParts: string[];
    hardParts: string[];
    kpis: number;
    rows: InsightRow[];
    totalMin: number;
    totalMax: number;
  };

  const deriveInsights = (inputText: string, analysis?: AITaskAnalysis): Insights => {
    const rows: InsightRow[] = [];
    const easyParts: string[] = [];
    const mediumParts: string[] = [];
    const hardParts: string[] = [];
    const normalizeTitle = (t: string) => (t || '').replace(/^[\s•\-]+/, '').trim();

    // Special-case: migration from Supabase to MongoDB / large EMS rewrite
    const isMigration = /(migrate|migration|replace|rewrite|refactor|from the old|completely new)/i.test(inputText);
    const mentionsMongo = /(mongodb|mongo)/i.test(inputText);
    const mentionsSupabase = /(supabase)/i.test(inputText);

    if (isMigration && mentionsMongo && mentionsSupabase) {
      // Build rows similar to the user's desired output (midpoints used; provide min/max range)
      const add = (title: string, description: string, minH: number, maxH: number) => {
        rows.push({ title, description, hoursMin: minH, hoursMax: maxH, hoursMid: (minH + maxH) / 2 });
      };
      add('Requirements review + old EMS code analysis', 'Analyze existing codebase and document requirements for migration', 4, 6);
      add('MongoDB setup (local & production)', 'Configure MongoDB instances and connection settings', 2, 4);
      add('Backend API changes (replace Supabase calls with MongoDB queries)', 'Refactor API endpoints to use MongoDB instead of Supabase', 10, 14);
      add('Data migration scripts (Supabase → MongoDB)', 'Create scripts to transfer data from Supabase to MongoDB', 4, 8);
      add('Testing & debugging', 'Verify all functionality works correctly after migration', 6, 8);
      add('Deployment & environment configuration', 'Update deployment scripts and environment variables', 2, 3);

      easyParts.push('MongoDB connection setup', 'Creating collections', 'Replacing simple Supabase queries');
      mediumParts.push('Refactoring business logic', 'Adjusting API endpoints', 'Testing migrations');
      hardParts.push('Zero-downtime data migration', 'Ensuring no broken features', 'Rewriting complex query logic');

      const totalMin = rows.reduce((s, r) => s + r.hoursMin, 0);
      const totalMax = rows.reduce((s, r) => s + r.hoursMax, 0);
      const totalMid = (totalMin + totalMax) / 2;
      const kpis = calculateDynamicKPIs(totalMid);
      return {
        difficulty: 'Medium',
        easyParts,
        mediumParts,
        hardParts,
        kpis,
        rows,
        totalMin,
        totalMax
      };
    }

    // Special-case: Invoice/Invoice Generator type inputs → curated breakpoints with clean ranges
    const isInvoiceApp = /(invoice|invoicing|billing)/i.test(inputText)
      || (/\bbill\b/i.test(inputText) && /(generate|generator|maker|create|making)/i.test(inputText))
      || /gen[a-z]{0,4}rat[a-z]{0,3}or/i.test(inputText); // fuzzy match for "generator" (handles genaratoor etc.)
    if (isInvoiceApp) {
      const add = (title: string, description: string, minH: number, maxH: number) => {
        const mid = parseFloat((((minH + maxH) / 2)).toFixed(2));
        rows.push({ title, description, hoursMin: minH, hoursMax: maxH, hoursMid: mid });
      };
      add('Project Setup & Base UI', 'Initialize project, responsive layout, header/navigation, main sections for invoice creation', 2, 3);
      add('Business & Client Details Form', 'Input fields for company, client info, contact details, and validation', 1, 2);
      add('Line Items & Tax Inputs', 'Add multiple dynamic line items, quantity, price, tax, subtotal calculation', 2, 3);
      add('Automatic Total Calculation', 'Real-time sum of all line items including taxes, update totals instantly', 1, 2);
      add('Real-time Invoice Preview', 'Show professional invoice layout, live updates as inputs change', 2, 3);
      add('PDF Download Functionality', 'Generate invoice PDF preserving formatting and styling', 1, 2);
      add('Responsive Design & Performance Optimization', 'Ensure mobile/desktop compatibility, smooth UI, optimized performance', 2, 3);
    } else {
      // Generic insights from analysis subtasks
      const subtasks = analysis?.subtasks || [];
      if (subtasks.length > 0) {
        // Map each subtask point to mid hour = points; use +-20% as range
        for (const s of subtasks) {
          const mid = typeof s.points === 'number' ? s.points : 1;
          const minH = Math.max(0.25, parseFloat((mid * 0.8).toFixed(2)));
          const maxH = parseFloat((mid * 1.4).toFixed(2));
          const title = normalizeTitle(s.title);
          const description = title.toLowerCase().includes('design') ? 'Create visual layout and user interface components' :
                           title.toLowerCase().includes('develop') ? 'Implement functionality and code the features' :
                           title.toLowerCase().includes('test') ? 'Verify functionality and fix any issues' :
                           title.toLowerCase().includes('integrate') ? 'Connect different components and ensure they work together' :
                           title.toLowerCase().includes('setup') ? 'Initialize project structure and configuration' :
                           title.toLowerCase().includes('deploy') ? 'Prepare and launch the application' :
                           title.toLowerCase().includes('clarify') ? 'Define requirements and project scope' :
                           title.toLowerCase().includes('implement') ? 'Build and code the core functionality' :
                           title.toLowerCase().includes('validate') ? 'Test and ensure quality standards' :
                           'Complete the specified task requirements';
          rows.push({ title, description, hoursMin: minH, hoursMax: maxH, hoursMid: mid });
        }
      } else {
        // Fall back to heuristic rows built from the heuristic estimate
        const h = buildHeuristicEstimate(inputText);
        for (const s of h.subtasks) {
          const mid = s.points;
          const minH = Math.max(0.25, parseFloat((mid * 0.8).toFixed(2)));
          const maxH = parseFloat((mid * 1.4).toFixed(2));
          const title = normalizeTitle(s.title);
          const description = title.toLowerCase().includes('design') ? 'Create visual layout and user interface components' :
                           title.toLowerCase().includes('develop') ? 'Implement functionality and code the features' :
                           title.toLowerCase().includes('test') ? 'Verify functionality and fix any issues' :
                           title.toLowerCase().includes('integrate') ? 'Connect different components and ensure they work together' :
                           title.toLowerCase().includes('setup') ? 'Initialize project structure and configuration' :
                           title.toLowerCase().includes('deploy') ? 'Prepare and launch the application' :
                           title.toLowerCase().includes('clarify') ? 'Define requirements and project scope' :
                           title.toLowerCase().includes('implement') ? 'Build and code the core functionality' :
                           title.toLowerCase().includes('validate') ? 'Test and ensure quality standards' :
                           'Complete the specified task requirements';
          rows.push({ title, description, hoursMin: minH, hoursMax: maxH, hoursMid: mid });
        }
      }
    }

    // Scale time based on number of breakpoints (more breakpoints → longer time; fewer → shorter)
    const breakpointCount = rows.length;
    const shouldScale = !isInvoiceApp; // keep curated invoice ranges as-is to match example clarity
    const scale = breakpointCount <= 2 ? 0.85
      : breakpointCount <= 4 ? 0.95
      : breakpointCount <= 6 ? 1.05
      : breakpointCount <= 8 ? 1.15
      : 1.3;

    const scaledRows: InsightRow[] = shouldScale
      ? rows.map((r) => {
          const scaledMid = parseFloat((r.hoursMid * scale).toFixed(2));
          const minH = Math.max(0.25, parseFloat((scaledMid * 0.8).toFixed(2)));
          const maxH = parseFloat((scaledMid * 1.4).toFixed(2));
          return { title: r.title, description: r.description, hoursMin: minH, hoursMax: maxH, hoursMid: scaledMid };
        })
      : rows;

    // Difficulty by total hours (based on scaled mid)
    const totalMid = scaledRows.reduce((s, r) => s + r.hoursMid, 0);
    const totalMin = parseFloat((totalMid * 0.8).toFixed(2));
    const totalMax = parseFloat((totalMid * 1.4).toFixed(2));
    // Categorize by requested thresholds
    const difficulty: Insights['difficulty'] =
      totalMid < 3 ? 'Easy' : totalMid < 6 ? 'Medium' : totalMid < 12 ? 'Hard' : 'VeryLarge';
    
    // Calculate KPIs: 1 KPI per hour (exact rounding)
    const dynamicKPIs = calculateDynamicKPIs(totalMid);
    
    // Simple part classification heuristics
    const t = inputText.toLowerCase();
    if (/setup|install|config|connect/.test(t)) easyParts.push('Environment setup and basic configuration');
    if (/api|endpoint|business|logic|feature/.test(t)) mediumParts.push('Refactoring business logic and endpoints');
    if (/migrat|downtime|complex|index|performance/.test(t)) hardParts.push('Complex migration/performance considerations');

    return { difficulty, easyParts, mediumParts, hardParts, kpis: dynamicKPIs, rows: scaledRows, totalMin, totalMax };
  };

  // KPI calculation: exactly 1 KPI per hour
  const calculateDynamicKPIs = (totalTime: number): number => {
    return Math.max(0, Math.round(totalTime));
  };

  // Humanized duration formatters with hours and minutes
  // (removed) formatDuration

  // Single-value duration only (no ranges)

  const renderInsights = (
    inputTitle: string,
    analysis?: AITaskAnalysis
  ) => {
    if (!inputTitle.trim()) return null;
    const insights = deriveInsights(inputTitle, analysis);

    // Work directly from insights without showing or shortening time rows
    const rows = [...insights.rows];
    const derivedHours = rows.reduce((s, r) => s + r.hoursMid, 0);
    const hours = typeof analysis?.totalTime === 'number' && isFinite(analysis.totalTime)
      ? analysis.totalTime
      : derivedHours;
    const kpiCount = Math.max(0, Math.round(hours));
    return (
      <div className="mt-4 p-2 sm:p-4 bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm">
        <div className="text-xs sm:text-sm text-gray-800">
          This task contributes to {kpiCount} KPIs.
        </div>
      </div>
    );
  };

  // AI Analysis Function
  const analyzeTaskWithAI = async (taskTitle: string, taskId: string) => {
    if (!taskTitle.trim()) {
      setAiAnalyses(prev => ({
        ...prev,
        [taskId]: {
          summary: taskId === 'new-task' ? 'Please provide a valid task.' : 'please provide a task',
          subtasks: [],
          totalTime: 0,
          isLoading: false
        }
      }));
      if (taskId === 'new-task') {
        setNewTaskScore('');
      }
      return;
    }

    // Short-circuit for trivial inputs (greetings, single word, non-actionable)
    if (isTrivialTask(taskTitle)) {
      setAiAnalyses(prev => ({
        ...prev,
        [taskId]: {
          summary: taskId === 'new-task' ? 'Please provide a valid task.' : 'please provide a task',
          subtasks: [],
          totalTime: 0,
          isLoading: false
        }
      }));
      if (taskId === 'new-task') {
        setNewTaskScore('');
      }
      return;
    }

    setAiAnalyses(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        isLoading: true
      }
    }));

    try {
      const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        throw new Error('Groq API key not found');
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
             {
  role: 'system',
  content: `You are a professional and practical AI task time estimator.

🎯 Rules:
- Break the user's request into clear, short subtasks.
- Use small decimal points like 0.25, 0.5, 0.75, 1.0 — based on real effort.
- 1 point = 1 hour exactly.
- Estimated time must be equal to total points (not multiplied or reduced).

⚠ Guidelines:
- If the user says "Hi" or gives no task, reply only:
  "⚠ Please provide a task to estimate."
- If the task is small (like a simple website), total points should be 2–5
- If the task is medium (like a feature), total points should be 10–20
- If the task is large (like a full app), total points should be 20–30
- If the task is complex (like system integration), total points should be 15–25

✅ Always respond in *this fixed format*:

✅ Task Breakdown:
- Subtask 1: X points
- Subtask 2: Y points
...

📊 Total Points: Z
⏱ Estimated Time: Z hours

❌ Do not add explanation, greeting, or any extra text. Stay 100% strict to this format.`
}
,
             {
               role: 'assistant',
               content: `✅ Task Breakdown:
- Design login/register forms: 2 points
- Implement JWT authentication: 3 points
- Add password reset functionality: 1 point

📊 Total Points: 6
⏱ Estimated Time: 6 hours`
             },
             {
               role: 'user',
               content: 'Create a user dashboard'
             },
             {
               role: 'assistant',
               content: `✅ Task Breakdown:
- Design dashboard layout and components: 2 points
- Implement user profile display: 1 point
- Add activity tracking widgets: 2 points

📊 Total Points: 5
⏱ Estimated Time: 5 hours`
             },
             {
               role: 'user',
               content: `TASK TO ANALYZE: "${taskTitle}"

Based on this EXACT task text, provide:
1. A summary of what this specific task involves
2. Detailed subtasks that directly relate to this task
3. Realistic time estimates

DO NOT give generic responses. Your analysis must be specific to: "${taskTitle}"

Remember: If the task is "Fix login bug", your subtasks should be about debugging login issues, not generic development steps.`
             }

           ],
           temperature: 0.3,
           max_tokens: 300
         })
       });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq API error response:', errorText);
        throw new Error(`AI analysis failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();

      // Debug: Log what the AI actually returned
      console.log('AI Response for task:', taskTitle);
      console.log('AI Raw content:', content);

      // Helper: parse our fixed-format estimator response
      const parseEstimatorFormat = (text: string): { summary: string; subtasks: Array<{ title: string; points: number }>; totalTime: number } | null => {
        try {
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          // Attempt to find a summary line if present
          let summary = '';
          const summaryIdx = lines.findIndex(l => /^summary\s*:/i.test(l));
          if (summaryIdx !== -1) {
            summary = lines[summaryIdx].replace(/^summary\s*:/i, '').trim();
          } else {
            summary = `Estimate for: ${taskTitle.trim()}`;
          }

          // Extract subtasks in either "- Subtask: X points" or "• ..." forms
          const subtasks: Array<{ title: string; points: number }> = [];
          const taskStartIdx = lines.findIndex(l => /task breakdown/i.test(l));
          let i = taskStartIdx !== -1 ? taskStartIdx + 1 : 0;
          for (; i < lines.length; i++) {
            const line = lines[i];
            if (/^📊\s*total points/i.test(line) || /^total points/i.test(line) || /^⏱/i.test(line) || /^estimated time/i.test(line)) {
              break;
            }
            // Match "- Name: X points" or "• Name: X points" or "X pts – Name"
            let m = line.match(/^[-•]\s*(.+?):\s*([0-9]+(?:\.[0-9]+)?)\s*(?:points|pts?)\b/i);
            if (!m) {
              // try reversed form: "0.5 pts – Title" or "0.5 points - Title"
              m = line.match(/^([0-9]+(?:\.[0-9]+)?)\s*(?:points|pts?)\s*[–-]\s*(.+)$/i);
              if (m) {
                const points = parseFloat(m[1]);
                const title = `• ${m[2].trim()}`;
                if (!Number.isNaN(points) && points > 0) subtasks.push({ title, points });
              }
            } else {
              const title = `• ${m[1].trim()}`;
              const points = parseFloat(m[2]);
              if (!Number.isNaN(points) && points > 0) subtasks.push({ title, points });
            }
          }

          // Pull totals
          const totalPointsLine = lines.find(l => /^📊\s*total points\s*:/i.test(l) || /^total points\s*:/i.test(l));
          let totalPoints: number | null = null;
          if (totalPointsLine) {
            const mp = totalPointsLine.match(/:\s*([0-9]+(?:\.[0-9]+)?)/);
            if (mp) totalPoints = parseFloat(mp[1]);
          }
          const estTimeLine = lines.find(l => /^⏱\s*estimated time\s*:/i.test(l) || /^estimated time\s*:/i.test(l));
          let totalTime: number | null = null;
          if (estTimeLine) {
            const mt = estTimeLine.match(/:\s*([0-9]+(?:\.[0-9]+)?)\s*hours?/i);
            if (mt) totalTime = parseFloat(mt[1]);
          }

          // If not provided, compute from points with rule: 1 point = 1 hour (per user's format)
          if (totalPoints === null) totalPoints = subtasks.reduce((s, t) => s + (t.points || 0), 0);
          if (totalTime === null) totalTime = totalPoints; // 1 point = 1 hour

          if (subtasks.length === 0) return null;
          if (!totalTime || totalTime < 0) totalTime = 0;
          return { summary, subtasks, totalTime };
        } catch {
          return null;
        }
      };

      // 1) Try JSON parse first (in case the model returned JSON)
      let parsedOk = false;
      try {
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.subtasks)) {
          const totalTime = typeof parsed.totalTime === 'number' ? parsed.totalTime : parsed.subtasks.reduce((s: number, t: any) => s + (t.points || 0), 0);
          setAiAnalyses(prev => ({
            ...prev,
            [taskId]: {
              summary: parsed.summary || `Estimate for: ${taskTitle.trim()}`,
              subtasks: parsed.subtasks,
              totalTime: Math.max(0, totalTime),
              isLoading: false
            }
          }));
          if (taskId === 'new-task') {
            const kpis = Math.max(0, Math.round(Math.max(0, totalTime)));
            setNewTaskScore(String(kpis));
          }
          parsedOk = true;
        }
      } catch {}

      // 2) If JSON failed, try estimator fixed-format parse
      if (!parsedOk) {
        const est = parseEstimatorFormat(content);
        if (est) {
          setAiAnalyses(prev => ({
            ...prev,
            [taskId]: {
              summary: est.summary,
              subtasks: est.subtasks,
              totalTime: est.totalTime,
              isLoading: false
            }
          }));
          if (taskId === 'new-task') {
            const kpis = Math.max(0, Math.round(Math.max(0, est.totalTime)));
            setNewTaskScore(String(kpis));
          }
        } else {
          // No parse – let error handler decide (retry or fallback)
          throw new Error('Unable to parse AI output');
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Input-based minimal fallback
      const baseTitle = taskTitle.trim();
      if (isTrivialTask(baseTitle)) {
        // For trivial inputs, explicitly return 0 hours
        setAiAnalyses(prev => ({
          ...prev,
          [taskId]: {
            summary: taskId === 'new-task' ? 'Please provide a valid task.' : 'please provide a task',
            subtasks: [],
            totalTime: 0,
            isLoading: false
          }
        }));
        if (taskId === 'new-task') {
          setNewTaskScore('');
        }
        return;
      }

      // For non-trivial inputs, build a dynamic heuristic estimate
      const heuristic = buildHeuristicEstimate(baseTitle);
      setAiAnalyses(prev => ({
        ...prev,
        [taskId]: {
          summary: heuristic.summary,
          subtasks: heuristic.subtasks,
          totalTime: heuristic.totalTime,
          isLoading: false
        }
      }));
      if (taskId === 'new-task') {
        const kpis = Math.max(0, Math.round(Math.max(0, heuristic.totalTime)));
        setNewTaskScore(String(kpis));
      }
    }
  };

  // Manual AI analysis trigger function with retry capability
  const triggerAnalysis = (taskId: string, title: string) => {
    if (title.trim()) {
      // Show the analysis section when Analyze button is clicked
      setVisibleAnalyses(prev => new Set([...prev, taskId]));
      
      setLastAnalyzedId(taskId);
      analyzeTaskWithAI(title, taskId);
    }
  };



  // Add custom task
  const addCustomTask = () => {
    const newTask = {
      id: `custom-${nextCustomTaskId}`,
      title: '',
      description: ''
    };
    setCustomTasks(prev => [...prev, newTask]);
    setNextCustomTaskId(prev => prev + 1);
  };

  // Remove custom task
  const removeCustomTask = (taskId: string) => {
    setCustomTasks(prev => prev.filter(task => task.id !== taskId));
    setAiAnalyses(prev => {
      const newAnalyses = { ...prev };
      delete newAnalyses[taskId];
      return newAnalyses;
    });
  };

  // Update custom task
  const updateCustomTask = (taskId: string, field: 'title' | 'description', value: string) => {
    setCustomTasks(prev => 
      prev.map(task => 
        task.id === taskId ? { ...task, [field]: value } : task
      )
    );
  };

   // Function to handle task summary edit mode
  const handleTaskSummaryClick = () => {
    setIsEditingTaskSummary(true);
    // Focus the textarea after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
      }
    }, 0);
  };

  // Function to handle task summary blur (exit edit mode)
  const handleTaskSummaryBlur = () => {
    setIsEditingTaskSummary(false);
  };

  // Function to handle Enter key in task summary
  const handleTaskSummaryKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditingTaskSummary(false);
      inputRef.current?.blur();
    }
    // Call the original handleKeyDown for Ctrl+Enter functionality
    handleKeyDown(e);
  };

  // Fetch user's projects
  const fetchUserProjects = useCallback(async () => {
    if (!userId) {
      console.log('No userId provided');
      return;
    }

    console.log('Fetching projects for userId:', userId);
    setIsLoadingProjects(true);
    try {
      // Fetch all projects and filter client-side to handle invalid JSON
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, devops');

      if (error) throw error;

      console.log('All projects from database:', data);

      const userProjects = data?.filter(project => {
        try {
          if (!project.devops) {
            console.log('Project has no devops:', project.title);
            return false;
          }

          console.log('Checking project:', project.title, 'devops:', project.devops);

          // devops is already an array, no need to parse
          const devops = project.devops;
          console.log('Devops array:', devops);

          const hasUser = Array.isArray(devops) && devops.some((dev: { id: string; name: string }) => {
            console.log('Comparing dev.id:', dev.id, 'with userId:', userId);
            return dev.id === userId;
          });

          console.log('Project', project.title, 'has user:', hasUser);
          return hasUser;
        } catch (e) {
          console.log('Error checking devops for project:', project.title, e);
          return false;
        }
      }) || [];

      console.log('Filtered user projects:', userProjects);
      setProjects(userProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [userId]);

  // Fetch tasks for selected project
  const fetchProjectTasks = useCallback(async () => {
    if (!selectedProject || !userId) return;

    console.log('Fetching tasks for project:', selectedProject.title, 'and userId:', userId);
    setIsLoadingTasks(true);
    try {
      // Fetch tasks for the selected project only
      const { data, error } = await supabase
        .from('tasks_of_projects')
        .select('id, title, description, status, devops')
        .eq('project_id', selectedProject.id)
        .in('status', ['todo', 'inProgress']);

      if (error) throw error;

      console.log('Tasks for project:', data);

      const userTasks = data?.filter(task => {
        try {
          if (!task.devops) {
            console.log('Task has no devops:', task.title);
            return false;
          }

          console.log('Checking task:', task.title, 'devops:', task.devops);

          // devops is already an array
          const devops = task.devops;
          console.log('Devops array:', devops);

          const hasUser = Array.isArray(devops) && devops.some((dev: { id: string; name: string }) => {
            console.log('Comparing dev.id:', dev.id, 'with userId:', userId);
            return dev.id === userId;
          });

          console.log('Task', task.title, 'has user:', hasUser);
          return hasUser;
        } catch (e) {
          console.log('Error checking devops for task:', task.title, e);
          return false;
        }
      }) || [];

      console.log('Filtered user tasks for project:', userTasks);
      setProjectTasks(userTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [selectedProject, userId]);

  // Fetch user's projects
  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProjects();
    }
  }, [isOpen, userId, fetchUserProjects]);

  // Fetch tasks for selected project
  useEffect(() => {
    if (selectedProject && userId) {
      setSelectedTasks([]); // Clear selected tasks when project changes
      fetchProjectTasks();
    }
  }, [selectedProject, userId, fetchProjectTasks]);

  // Reset when modal opens - FRESH SESSION
  useEffect(() => {
    if (isOpen) {
      setTasks('');
      setIsSaving(false);
      setSelectedProject(null);
      setProjectTasks([]);
      setSelectedTasks([]);
      setShowCreateTask(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskScore('');
      setIsEditingTaskSummary(false);
      
      // Clear AI analyses and custom tasks for fresh session
      setAiAnalyses({});
      setCustomTasks([]);
      setNextCustomTaskId(1);
      
      // Clear visible analyses
      setVisibleAnalyses(new Set());
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Generate task content based on selections
  useEffect(() => {
    if (selectedProject && selectedTasks.length > 0) {
      const content = `I am working on ${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''} of ${selectedProject.title}.`;
      if (tasks.trim() === '') {
       setTasks(content);
      }
    }
  }, [selectedTasks, selectedProject, projectTasks, tasks]);



  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Handle escape key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const handleApply = () => {
    if (!tasks.trim()) return;
    setIsSaving(true);

    onApply(tasks, selectedTasks, selectedProject?.id || '');
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleCreateTask = async () => {
    if (!selectedProject || !newTaskTitle.trim() || !userId) {
      console.error('Missing required data for task creation:', {
        selectedProject: !!selectedProject,
        newTaskTitle: newTaskTitle.trim(),
        userId,
        userIdFromLocalStorage: localStorage.getItem('user_id')
      });
      alert('Missing required information. Please ensure you are logged in and have selected a project.');
      return;
    }

    setIsCreatingTask(true);
    try {
      console.log('Creating task with userId:', userId);

      // First, get the user's name from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, name, email')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        console.error('User ID being searched:', userId);
      }

      console.log('Fetched user data:', userData);

      // Improved user name resolution with better fallback
      let userName = 'Unknown User';
      if (userData) {
        userName = userData.full_name || userData.name || userData.email?.split('@')[0] || 'Unknown User';
      } else {
        // If user data fetch failed, try to get from auth store or localStorage
        const authUser = useAuthStore.getState().user;
        if (authUser) {
          userName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown User';
        }
      }

      console.log('Final userName for task:', userName);

      const taskData = {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || null,
        status: 'todo',
        project_id: selectedProject.id,
        devops: [{ id: userId, name: userName }],
        score: newTaskScore ? parseInt(newTaskScore) : 0,
        created_at: new Date().toISOString()
      };

      console.log('Inserting task data:', taskData);

      const { data, error } = await supabase
        .from('tasks_of_projects')
        .insert(taskData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting task:', error);
        throw error;
      }

      console.log('Task created successfully:', data);

      // Add the new task to the list and select it
      setProjectTasks(prev => [...prev, data]);
      setSelectedTasks(prev => [...prev, data.id]);

      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskScore('');
      setShowCreateTask(false);
    } catch (error) {
      console.error('Error creating task:', error);
      // Show user-friendly error message
      alert('Failed to create task. Please try again.');
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Handle enter key press with ctrl/cmd to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (tasks.trim()) {
        handleApply();
      }
    }
  };

  // (Removed) analyzeAllProgress

  // Progress section: auto-analyze the Task Summary whenever it changes
  // Auto-analysis for Task Summary removed by request

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] border border-white/60 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] z-10 relative animate-fadeIn overflow-hidden flex flex-col"
        style={{
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Today's Tasks</h2>
            <p className="text-xs sm:text-sm text-white/80 mt-1">Plan your day and stay focused</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X size={20} className="sm:w-[22px] sm:h-[22px]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Project
            </label>
            <div className="relative">
              <button
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className={`w-full p-3 sm:p-4 border ${selectedProject ? 'border-indigo-200 bg-white' : 'border-gray-200 bg-white'} rounded-lg sm:rounded-xl text-left flex items-center justify-between hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm`}
                disabled={isLoadingProjects}
              >
                <span className={selectedProject ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                  {selectedProject ? selectedProject.title : 'Choose a project...'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProjectDropdownOpen && (
                <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-xl max-h-48 sm:max-h-64 overflow-auto z-10 py-1">
                  {isLoadingProjects ? (
                    <div className="p-3 sm:p-4 text-center text-gray-500">
                      <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <span className="text-sm">Loading projects...</span>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="p-3 sm:p-4 text-center text-gray-500 text-sm">No projects found</div>
                  ) : (
                    projects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setSelectedProject(project);
                          setIsProjectDropdownOpen(false);
                          setSelectedTasks([]);
                        }}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-indigo-50 transition-colors flex items-center justify-between group"
                      >
                        <span className="font-medium text-gray-700 group-hover:text-indigo-600 text-sm sm:text-base">{project.title}</span>
                        {selectedProject?.id === project.id && (
                          <Check className="w-4 h-4 text-indigo-600" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Task Selection */}
          {selectedProject && (
            <div className="animate-fadeIn">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Tasks
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
                  className={`w-full p-3 sm:p-4 border ${selectedTasks.length > 0 ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white'} rounded-lg sm:rounded-xl text-left flex items-center justify-between hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm`}
                  disabled={isLoadingTasks}
                >
                  <span className={selectedTasks.length > 0 ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {selectedTasks.length > 0
                      ? `${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''} selected`
                      : 'Choose tasks...'}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isTaskDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isTaskDropdownOpen && (
                  <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-xl max-h-64 sm:max-h-80 overflow-auto z-10 py-1">
                    {isLoadingTasks ? (
                      <div className="p-3 sm:p-4 text-center text-gray-500">
                        <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <span className="text-sm">Loading tasks...</span>
                      </div>
                    ) : (
                      <>
                        <div className="border-b border-gray-100 mb-1">
                          <button
                            onClick={() => {
                              setShowCreateTask(true);
                              setIsTaskDropdownOpen(false);
                            }}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center group"
                          >
                            <div className="p-1 bg-indigo-100 rounded-lg mr-2 sm:mr-3 group-hover:bg-indigo-200 transition-colors">
                              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                            </div>
                            <span className="font-medium text-sm sm:text-base">Create New Task</span>
                          </button>
                        </div>
                        {projectTasks.length === 0 ? (
                          <div className="p-3 sm:p-4 text-center text-gray-500 text-sm">No pending tasks found</div>
                        ) : (
                          projectTasks.map(task => (
                            <button
                              key={task.id}
                              onClick={() => {
                                toggleTaskSelection(task.id);
                                setIsTaskDropdownOpen(false);
                              }}
                              className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-left transition-all flex items-center justify-between group ${selectedTasks.includes(task.id)
                                ? 'bg-indigo-50 hover:bg-indigo-100'
                                : 'hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium text-sm sm:text-base ${selectedTasks.includes(task.id) ? 'text-indigo-900' : 'text-gray-700'}`}>
                                  {task.title}
                                </div>
                                {task.description && (
                                  <div className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">{task.description}</div>
                                )}
                              </div>
                              <div className={`ml-2 sm:ml-3 p-1 rounded-full transition-all ${selectedTasks.includes(task.id)
                                ? 'bg-indigo-600'
                                : 'bg-gray-200 group-hover:bg-gray-300'
                                }`}>
                                <Check className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${selectedTasks.includes(task.id)
                                  ? 'text-white'
                                  : 'text-transparent'
                                  }`} />
                              </div>
                            </button>
                          ))
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
 {/* Create New Task Form */}
{showCreateTask && (
  <div className="animate-fadeIn">
    <div className="p-4 sm:p-6 border-2 border-indigo-200 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-50 to-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center text-sm sm:text-base">
          <div className="p-1 sm:p-1.5 bg-indigo-100 rounded-lg mr-2">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
          </div>
          Create New Task
        </h3>
        <button
          onClick={() => {
            setShowCreateTask(false);
            setNewTaskTitle('');
            setNewTaskDescription('');
          }}
          className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
      </div>

      {/* Inputs */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Task title"
          className="flex-1 p-2 sm:p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-white shadow-sm text-sm sm:text-base"
        />
      </div>

      <textarea
        value={newTaskDescription}
        onChange={(e) => setNewTaskDescription(e.target.value)}
        placeholder="Task description (optional)"
        className="w-full p-2 sm:p-3 border-2 border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none bg-white shadow-sm text-sm sm:text-base"
        rows={2}
      />

      <input
        type="number"
        value={newTaskScore}
        onChange={(e) => setNewTaskScore(e.target.value)}
        placeholder="Task KPI/Score (optional)"
        className="w-full p-2 sm:p-3 border-2 border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-white shadow-sm text-sm sm:text-base"
        min="0"
      />

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
        <button
          onClick={() => {
            setShowCreateTask(false);
            setNewTaskTitle('');
            setNewTaskDescription('');
          }}
          className="px-3 sm:px-4 py-2 text-sm font-medium border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
          disabled={isCreatingTask}
        >
          Cancel
        </button>

        <button
          onClick={handleCreateTask}
          disabled={!newTaskTitle.trim() || isCreatingTask}
          className="px-3 sm:px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
        >
          {isCreatingTask ? (
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Creating...
            </div>
          ) : (
            'Add Task'
          )}
        </button>

        {/* Analyze Button for New Task */}
        <button
          onClick={() => {
            const text = `${newTaskTitle || ''} ${newTaskDescription || ''}`.trim();
            triggerAnalysis('new-task', text);
          }}
          disabled={!newTaskTitle.trim() && !newTaskDescription.trim()}
          className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
          Analyze
        </button>
      </div>

      {/* AI Analysis Display for Create New Task - Only show when visible */}
      {visibleAnalyses.has('new-task') && (newTaskTitle.trim() || newTaskDescription.trim()) && (
        <div className="mt-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm">
          <div className="flex items-center mb-3">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 mr-2" />
            <span className="text-xs sm:text-sm font-medium text-gray-700">AI Analysis</span>
            {aiAnalyses['new-task']?.isLoading && (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 ml-2 animate-spin" />
            )}
          </div>

          {aiAnalyses['new-task'] && !aiAnalyses['new-task'].isLoading && (
            <div ref={setAnalysisRef('new-task')} className="space-y-2">
              {(Math.max(0, aiAnalyses['new-task'].totalTime || 0) > 0)
                ? renderInsights(`${newTaskTitle} ${newTaskDescription}`.trim(), aiAnalyses['new-task'] as any)
                : (<div className="text-xs sm:text-sm text-gray-600">{aiAnalyses['new-task'].summary || 'Please provide a valid task.'}</div>)}
            </div>
          )}
          <div className="mt-4 flex justify-start">
            <button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim() || isCreatingTask}
              className="px-3 sm:px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {isCreatingTask ? (
                <div className="flex items-center">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Add Task'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)}

{/* Custom Tasks Section */}
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <label className="block text-sm font-semibold text-gray-700">
      Additional Tasks
    </label>
    <button
      onClick={addCustomTask}
      className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
    >
      <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
      Add Task
    </button>
  </div>

  {customTasks.map((task) => (
    <div
      key={task.id}
      className="border-2 border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-white shadow-sm"
    >
      {/* Title + Delete */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-2 flex-1">
          <input
            type="text"
            value={task.title}
            onChange={(e) => updateCustomTask(task.id, "title", e.target.value)}
            placeholder="Enter task title..."
            className="flex-1 p-2 sm:p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-white shadow-sm text-sm sm:text-base"
          />
        </div>
        <button
          onClick={() => removeCustomTask(task.id)}
          className="ml-2 p-1.5 sm:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <X size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Description */}
      <textarea
        value={task.description}
        onChange={(e) =>
          updateCustomTask(task.id, "description", e.target.value)
        }
        placeholder="Task description (optional)"
        className="w-full p-2 sm:p-3 border-2 border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none bg-white shadow-sm text-sm sm:text-base"
        rows={2}
      />

      {/* Analyze Button */}
      <button
        onClick={() => triggerAnalysis(task.id, `${task.title} ${task.description}`)}
        disabled={!task.title.trim() && !task.description.trim()}
        className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md text-sm"
      >
        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
        Analyze
      </button>

      {/* AI Analysis Display - Only show when visible */}
      {visibleAnalyses.has(task.id) && (task.title?.trim() || task.description?.trim()) && (
        <div className="mt-3 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm">
          <div className="flex items-center mb-3">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 mr-2" />
            <span className="text-xs sm:text-sm font-medium text-gray-700">AI Analysis</span>
            {aiAnalyses[task.id]?.isLoading && (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 ml-2 animate-spin" />
            )}
          </div>

          {aiAnalyses[task.id] && !aiAnalyses[task.id].isLoading && (
            <div ref={setAnalysisRef(task.id)} className="space-y-2">
              {isTrivialTask(`${task.title} ${task.description}`)
                ? (<div className="text-xs sm:text-sm text-gray-600">Please provide a valid task.</div>)
                : renderInsights(`${task.title} ${task.description}`.trim(), aiAnalyses[task.id] as any)}
            </div>
          )}
        </div>
      )}
    </div>
  ))}
</div>



          {/* Selected Project Tasks with AI Analysis */}
          {selectedTasks.length > 0 && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">
                Selected Project Tasks
              </label>
              
              {selectedTasks.map((taskId) => {
                const task = projectTasks.find(t => t.id === taskId);
                if (!task) return null;

                return (
                  <div key={taskId} className="border-2 border-blue-200 rounded-lg sm:rounded-xl p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-white shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm sm:text-base">{task.title}</div>
                        {task.description && (
                          <div className="text-xs sm:text-sm text-gray-600 mt-1">{task.description}</div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 ml-2">
                        <button
                          onClick={() => triggerAnalysis(taskId, `${task.title || ''} ${task.description || ''}`.trim())}
                          disabled={!task.title.trim()}
                          className="px-2 sm:px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 text-xs sm:text-sm shadow-sm hover:shadow-md"
                        >
                          <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          Analyze
                        </button>
                        <button
                          onClick={() => toggleTaskSelection(taskId)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <X size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>

                    {/* AI Analysis for Project Tasks - Only show when visible */}
                    {visibleAnalyses.has(taskId) && (
                      <div className="mt-3 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm">
                        <div className="flex items-center mb-3">
                          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 mr-2" />
                          <span className="text-xs sm:text-sm font-medium text-gray-700">AI Analysis</span>
                          {aiAnalyses[taskId]?.isLoading && (
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 ml-2 animate-spin" />
                          )}
                        </div>
                        
                        {aiAnalyses[taskId] && !aiAnalyses[taskId].isLoading && (
                          <div ref={setAnalysisRef(taskId)} className="space-y-2">
                            {isTrivialTask(`${task.title || ''} ${task.description || ''}`)
                              ? (<div className="text-xs sm:text-sm text-gray-600">Please provide a valid task.</div>)
                              : renderInsights(`${task.title || ''} ${task.description || ''}`.trim(), aiAnalyses[taskId] as any)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Task Summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Task Summary
                {!isEditingTaskSummary && (
                  <span className="text-xs text-gray-500 ml-2">(Click to edit)</span>
                )}
              </label>
              
            </div>
            <div className="relative">
              {!isEditingTaskSummary ? (
                // Display mode - clickable text
                <div
                  onClick={handleTaskSummaryClick}
                  className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-lg sm:rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-all min-h-[100px] sm:min-h-[120px] flex items-start"
                  style={{ lineHeight: '1.6' }}
                >
                  <div className="flex-1">
                    {tasks ? (
                      <div className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{tasks}</div>
                    ) : (
                      <div className="text-gray-400 text-sm sm:text-base">Your task summary will appear here...</div>
                    )}
                  </div>
                  <div className="ml-2 text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded opacity-70">
                    Click to edit
                  </div>
                </div>
              ) : (
                // Edit mode - textarea
                <textarea
                  ref={inputRef}
                  value={tasks}
                  onChange={(e) => setTasks(e.target.value)}
                  onKeyDown={handleTaskSummaryKeyDown}
                  onBlur={handleTaskSummaryBlur}

                
                  className="w-full p-3 sm:p-4 border border-indigo-500 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all resize-none bg-white shadow-sm text-sm sm:text-base"
                  rows={5}
                  placeholder="Enter your task summary here..."
                  style={{ lineHeight: '1.6' }}
                />
              )}
              {isEditingTaskSummary && (
                <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
                  Press Enter to save, Shift+Enter for new line
                </div>
              )}
            </div>
            
            {/* AI Analysis Display for Task Summary removed by request */}
          </div>

          <div className="flex items-center justify-center space-x-2 text-xs text-gray-400 mt-2">
            <kbd className="px-1.5 sm:px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono text-xs">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 sm:px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono text-xs">Enter</kbd>
            <span>to submit</span>
          </div>
          </div>

        {/* Footer Section*/}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-t from-gray-50 to-white border-t border-gray-100 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
             <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTask(false);
                      setNewTaskTitle('');
                      setNewTaskDescription('');
                      setSelectedTasks([]); // Clear any selected tasks
                      setTasks('No task today'); // Set summary for admin/member section
                    }}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                  >
                    No Task Today
                  </button>
                </div>
              <button
            onClick={handleApply}
            disabled={!tasks.trim() || isSaving}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-sm"
          >
            {isSaving ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </div>
            ) : (
              'Start Working'
            )}
              </button>
            </div>
            </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TaskModal;
