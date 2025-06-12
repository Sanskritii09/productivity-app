document.addEventListener('DOMContentLoaded', () => {
  // Ensure inner containers exist before rendering
  document.getElementById('pomodoro-section').innerHTML = `
    <h2>Pomodoro Timer</h2>
    <div id="pomodoro-timer"></div>
    <div id="pomodoro-controls"></div>
    <div id="pomodoro-settings"></div>
  `;
  document.getElementById('taskboard-section').innerHTML = `
    <h2>Task Board</h2>
    <div id="kanban-board"></div>
    <div id="task-filters"></div>
  `;
  document.getElementById('analytics-section').innerHTML = `
    <h2>Productivity Analytics</h2>
    <div id="analytics-dashboard"></div>
  `;

  // --- Simple Login/Signup System ---
  let user = JSON.parse(localStorage.getItem('user') || 'null');
  function renderAuth() {
    const authDiv = document.getElementById('user-auth');
    if (user) {
      authDiv.innerHTML = `<span>Welcome, <b>${user.username}</b></span> <button id="logout-btn">Logout</button>`;
      document.getElementById('logout-btn').onclick = () => {
        user = null;
        localStorage.removeItem('user');
        renderAuth();
        renderAnalytics();
      };
    } else {
      authDiv.innerHTML = `
        <form class="auth-form" id="login-form">
          <input type="text" id="auth-username" placeholder="Username" required />
          <button type="submit">Login</button>
        </form>
      `;
      document.getElementById('login-form').onsubmit = e => {
        e.preventDefault();
        const username = document.getElementById('auth-username').value.trim();
        if (username) {
          user = { username };
          localStorage.setItem('user', JSON.stringify(user));
          renderAuth();
          renderAnalytics();
        }
      };
    }
  }
  renderAuth();

  // --- Pomodoro Timer Implementation ---
  const pomodoroPresets = [
    { label: 'Work', minutes: 25 },
    { label: 'Short Break', minutes: 5 },
    { label: 'Long Break', minutes: 15 },
  ];
  let timerState = {
    duration: pomodoroPresets[0].minutes * 60,
    remaining: pomodoroPresets[0].minutes * 60,
    running: false,
    interval: null,
    preset: 0,
  };

  function renderPomodoro() {
    // Timer Circle
    const percent = 1 - timerState.remaining / timerState.duration;
    const radius = 65;
    const circumference = 2 * Math.PI * radius;
    const dash = circumference * percent;
    const dashArray = `${dash} ${circumference - dash}`;
    document.getElementById('pomodoro-timer').innerHTML = `
      <div class="flex flex-col items-center">
        <div class="relative mb-4">
          <svg class="w-36 h-36" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="65" fill="none" stroke="#FFD700" stroke-width="10"/>
            <circle class="pomodoro-fg" cx="70" cy="70" r="65" fill="none" stroke-width="10" stroke-dasharray="${dashArray}" />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center text-3xl font-bold text-sunriseAccent night:text-nightAccent">${formatTime(timerState.remaining)}</div>
        </div>
      </div>
    `;
    // Controls
    document.getElementById('pomodoro-controls').innerHTML = `
      <button class="pomodoro-btn" id="start-btn">${timerState.running ? 'Pause' : 'Start'}</button>
      <button class="pomodoro-btn" id="reset-btn">Reset</button>
      ${pomodoroPresets.map((p, i) => `<button class="pomodoro-btn${timerState.preset === i ? ' active' : ''}" data-preset="${i}">${p.label}</button>`).join('')}
    `;
    // Settings
    document.getElementById('pomodoro-settings').innerHTML = `
      <span class="pomodoro-label">Custom:</span>
      <input class="pomodoro-input" id="custom-minutes" type="number" min="1" max="90" value="${Math.floor(timerState.duration/60)}" />
      <span class="pomodoro-label">min</span>
      <button class="pomodoro-btn" id="set-custom">Set</button>
    `;
    // Event Listeners
    document.getElementById('start-btn').onclick = toggleStartPause;
    document.getElementById('reset-btn').onclick = resetTimer;
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.onclick = () => setPreset(+btn.dataset.preset);
    });
    document.getElementById('set-custom').onclick = () => {
      const min = parseInt(document.getElementById('custom-minutes').value, 10);
      if (min > 0 && min <= 90) setCustom(min);
    };
  }
  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  function toggleStartPause() {
    if (timerState.running) {
      clearInterval(timerState.interval);
      timerState.running = false;
    } else {
      timerState.running = true;
      timerState.interval = setInterval(() => {
        if (timerState.remaining > 0) {
          timerState.remaining--;
          renderPomodoro();
        } else {
          clearInterval(timerState.interval);
          timerState.running = false;
          pomodoroCompleteAnalytics();
          renderPomodoro();
        }
      }, 1000);
    }
    renderPomodoro();
  }
  function resetTimer() {
    clearInterval(timerState.interval);
    timerState.remaining = timerState.duration;
    timerState.running = false;
    renderPomodoro();
  }
  function setPreset(idx) {
    clearInterval(timerState.interval);
    timerState.preset = idx;
    timerState.duration = pomodoroPresets[idx].minutes * 60;
    timerState.remaining = timerState.duration;
    timerState.running = false;
    renderPomodoro();
  }
  function setCustom(min) {
    clearInterval(timerState.interval);
    timerState.duration = min * 60;
    timerState.remaining = timerState.duration;
    timerState.running = false;
    timerState.preset = -1;
    renderPomodoro();
  }
  renderPomodoro();

  // Add analytics tracking to Pomodoro complete
  function pomodoroCompleteAnalytics() {
    if (!user) return;
    const stats = JSON.parse(localStorage.getItem('analyticsStats') || '{}');
    const today = new Date().toISOString().slice(0, 10);
    if (!stats[today]) stats[today] = { pomodoros: 0, time: 0, tasks: 0 };
    stats[today].pomodoros++;
    stats[today].time += Math.floor(timerState.duration / 60);
    localStorage.setItem('analyticsStats', JSON.stringify(stats));
  }

  // --- Kanban Board Implementation ---
  const KANBAN_COLUMNS = [
    { id: 'todo', name: 'To Do' },
    { id: 'inprogress', name: 'In Progress' },
    { id: 'done', name: 'Done' },
  ];
  let kanbanData = JSON.parse(localStorage.getItem('kanbanData') || 'null') || {
    tasks: [],
    lastId: 0,
  };
  let kanbanFilter = { status: 'all', tag: null };

  function saveKanban() {
    localStorage.setItem('kanbanData', JSON.stringify(kanbanData));
  }

  function renderKanban() {
    const board = document.getElementById('kanban-board');
    board.innerHTML = '';
    KANBAN_COLUMNS.forEach(col => {
      const colDiv = document.createElement('div');
      colDiv.className = 'kanban-column';
      colDiv.dataset.col = col.id;
      colDiv.innerHTML = `
        <div class="kanban-column-title">${col.name}</div>
        <div class="kanban-tasks" id="tasks-${col.id}"></div>
      `;
      // Add task form only to To Do
      if (col.id === 'todo') {
        colDiv.innerHTML += `
          <form class="kanban-add-task" id="add-task-form">
            <input type="text" id="task-title" placeholder="Task title" required />
            <select id="task-priority">
              <option value="medium">Priority: Medium</option>
              <option value="high">Priority: High</option>
              <option value="low">Priority: Low</option>
            </select>
            <input type="text" id="task-tags" placeholder="Tags (comma separated)" />
            <input type="date" id="task-due" />
            <button class="kanban-btn" type="submit">Add Task</button>
          </form>
        `;
      }
      board.appendChild(colDiv);
    });
    // Render tasks
    KANBAN_COLUMNS.forEach(col => {
      const tasksDiv = document.getElementById(`tasks-${col.id}`);
      let tasks = kanbanData.tasks.filter(t => t.status === col.id);
      // Apply filters
      if (kanbanFilter.status === 'completed' && col.id !== 'done') tasks = [];
      if (kanbanFilter.status === 'pending' && col.id === 'done') tasks = [];
      if (kanbanFilter.tag) tasks = tasks.filter(t => t.tags.includes(kanbanFilter.tag));
      tasks.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'kanban-task';
        taskDiv.draggable = true;
        taskDiv.dataset.id = task.id;
        taskDiv.dataset.priority = task.priority;
        taskDiv.innerHTML = `
          <div class="kanban-task-title">${task.title}</div>
          <div class="kanban-task-tags">${task.tags.map(tag => `<span class="kanban-tag">${tag}</span>`).join('')}</div>
          <div class="kanban-task-date">${task.due ? 'Due: ' + task.due : ''}</div>
          <div class="kanban-task-date">${task.pomodoros ? 'Pomodoros: ' + task.pomodoros : ''}</div>
          <div class="kanban-task-actions">
            <button class="kanban-btn" data-action="edit">Edit</button>
            <button class="kanban-btn" data-action="delete">Delete</button>
            <button class="kanban-btn" data-action="pomodoro">+Pomodoro</button>
          </div>
        `;
        // Drag events
        taskDiv.addEventListener('dragstart', e => {
          e.dataTransfer.setData('text/plain', task.id);
          setTimeout(() => taskDiv.classList.add('dragging'), 0);
        });
        taskDiv.addEventListener('dragend', () => {
          taskDiv.classList.remove('dragging');
        });
        // Task actions
        taskDiv.querySelectorAll('button').forEach(btn => {
          btn.onclick = e => {
            const action = btn.dataset.action;
            if (action === 'delete') {
              kanbanData.tasks = kanbanData.tasks.filter(t => t.id !== task.id);
              saveKanban();
              renderKanban();
            } else if (action === 'edit') {
              editTask(task.id);
            } else if (action === 'pomodoro') {
              task.pomodoros = (task.pomodoros || 0) + 1;
              saveKanban();
              renderKanban();
            }
          };
        });
        tasksDiv.appendChild(taskDiv);
      });
      // Drag-over events for columns
      tasksDiv.addEventListener('dragover', e => {
        e.preventDefault();
        tasksDiv.classList.add('drag-over');
      });
      tasksDiv.addEventListener('dragleave', () => {
        tasksDiv.classList.remove('drag-over');
      });
      tasksDiv.addEventListener('drop', e => {
        e.preventDefault();
        tasksDiv.classList.remove('drag-over');
        const id = +e.dataTransfer.getData('text/plain');
        const task = kanbanData.tasks.find(t => t.id === id);
        if (task && task.status !== col.id) {
          task.status = col.id;
          saveKanban();
          renderKanban();
        }
      });
    });
    // Add task form
    const addForm = document.getElementById('add-task-form');
    if (addForm) {
      addForm.onsubmit = e => {
        e.preventDefault();
        const title = document.getElementById('task-title').value.trim();
        const priority = document.getElementById('task-priority').value;
        const tags = document.getElementById('task-tags').value.split(',').map(t => t.trim()).filter(Boolean);
        const due = document.getElementById('task-due').value;
        kanbanData.lastId++;
        kanbanData.tasks.push({
          id: kanbanData.lastId,
          title,
          priority,
          tags,
          due,
          status: 'todo',
          pomodoros: 0,
        });
        saveKanban();
        renderKanban();
      };
    }
    renderKanbanFilters();
  }

  function editTask(id) {
    const task = kanbanData.tasks.find(t => t.id === id);
    if (!task) return;
    const title = prompt('Edit task title:', task.title);
    if (title === null) return;
    task.title = title.trim();
    saveKanban();
    renderKanban();
  }

  function renderKanbanFilters() {
    const filterDiv = document.getElementById('task-filters');
    if (!filterDiv) return;
    const tags = Array.from(new Set(kanbanData.tasks.flatMap(t => t.tags))).filter(Boolean);
    filterDiv.innerHTML = `
      <button class="kanban-filter-btn${kanbanFilter.status === 'all' ? ' active' : ''}" data-filter="all">All</button>
      <button class="kanban-filter-btn${kanbanFilter.status === 'completed' ? ' active' : ''}" data-filter="completed">Completed</button>
      <button class="kanban-filter-btn${kanbanFilter.status === 'pending' ? ' active' : ''}" data-filter="pending">Pending</button>
      ${tags.map(tag => `<button class="kanban-filter-btn${kanbanFilter.tag === tag ? ' active' : ''}" data-tag="${tag}">${tag}</button>`).join('')}
      ${kanbanFilter.tag ? '<button class="kanban-filter-btn" data-tag="clear">Clear Tag</button>' : ''}
    `;
    filterDiv.querySelectorAll('[data-filter]').forEach(btn => {
      btn.onclick = () => {
        kanbanFilter.status = btn.dataset.filter;
        renderKanban();
      };
    });
    filterDiv.querySelectorAll('[data-tag]').forEach(btn => {
      btn.onclick = () => {
        kanbanFilter.tag = btn.dataset.tag === 'clear' ? null : btn.dataset.tag;
        renderKanban();
      };
    });
  }

  // Add analytics tracking to task completion
  function taskCompleteAnalytics() {
    if (!user) return;
    const stats = JSON.parse(localStorage.getItem('analyticsStats') || '{}');
    const today = new Date().toISOString().slice(0, 10);
    if (!stats[today]) stats[today] = { pomodoros: 0, time: 0, tasks: 0 };
    stats[today].tasks++;
    localStorage.setItem('analyticsStats', JSON.stringify(stats));
  }

  // Patch drag-and-drop to call analytics on move to Done
  const origRenderKanban = renderKanban;
  renderKanban = function() {
    const prevDone = new Set((kanbanData.tasks || []).filter(t => t.status === 'done').map(t => t.id));
    origRenderKanban();
    // After render, check for new done tasks
    const nowDone = new Set((kanbanData.tasks || []).filter(t => t.status === 'done').map(t => t.id));
    nowDone.forEach(id => {
      if (!prevDone.has(id)) taskCompleteAnalytics();
    });
  }
  renderKanban();

  // --- Analytics Dashboard ---
  function renderAnalytics() {
    const dash = document.getElementById('analytics-dashboard');
    if (!user) {
      dash.innerHTML = '<div class="analytics-card">Login to see your stats.</div>';
      return;
    }
    const stats = JSON.parse(localStorage.getItem('analyticsStats') || '{}');
    const today = new Date().toISOString().slice(0, 10);
    const week = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    });
    // Aggregate
    let todayStats = stats[today] || { pomodoros: 0, time: 0, tasks: 0 };
    let weekStats = { pomodoros: 0, time: 0, tasks: 0 };
    week.forEach(day => {
      const s = stats[day];
      if (s) {
        weekStats.pomodoros += s.pomodoros;
        weekStats.time += s.time;
        weekStats.tasks += s.tasks;
      }
    });
    dash.innerHTML = `
      <div class="analytics-card">
        <div class="analytics-title">Today</div>
        <div class="analytics-value">${todayStats.pomodoros}</div>
        <div class="analytics-label">Pomodoros</div>
        <div class="analytics-value">${todayStats.time} min</div>
        <div class="analytics-label">Time Spent</div>
        <div class="analytics-value">${todayStats.tasks}</div>
        <div class="analytics-label">Tasks Done</div>
      </div>
      <div class="analytics-card">
        <div class="analytics-title">This Week</div>
        <div class="analytics-value">${weekStats.pomodoros}</div>
        <div class="analytics-label">Pomodoros</div>
        <div class="analytics-value">${weekStats.time} min</div>
        <div class="analytics-label">Time Spent</div>
        <div class="analytics-value">${weekStats.tasks}</div>
        <div class="analytics-label">Tasks Done</div>
      </div>
    `;
  }
  renderAnalytics();
  // Re-render analytics on storage change
  window.addEventListener('storage', renderAnalytics);

  const themeBtn = document.getElementById('theme-toggle');
  function setTheme(theme) {
    document.body.classList.remove('sunrise', 'night');
    document.body.classList.add(theme);
    themeBtn.textContent = theme === 'night' ? 'Switch to Sunrise' : 'Switch to Night';
    localStorage.setItem('theme', theme);
  }
  themeBtn.onclick = () => setTheme(document.body.classList.contains('sunrise') ? 'night' : 'sunrise');
  setTheme(localStorage.getItem('theme') || (new Date().getHours() >= 18 ? 'night' : 'sunrise'));
}); 