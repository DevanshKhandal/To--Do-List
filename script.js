document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const filterButtonsContainer = document.getElementById('filter-buttons');

    // --- State Initialization ---
    let tasks = []; // CORRECTED: Initialized as an empty array
    let currentFilter = 'all';
    let isEditing = false;

    // --- Core Functions ---

    /**
     * Renders the task list to the DOM based on the current state of the 'tasks' array and 'currentFilter'.
     */
    const render = () => {
        taskList.innerHTML = ''; // Clear the list to prevent duplication

        // Filter tasks based on the current filter setting
        const filteredTasks = tasks.filter(task => {
            if (currentFilter === 'active') return!task.completed;
            if (currentFilter === 'completed') return task.completed;
            return true; // 'all' shows all tasks
        });

        if (filteredTasks.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No tasks here. Add one to get started!';
            // Basic styling for the empty message
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '1rem';
            emptyMessage.style.color = '#888';
            taskList.appendChild(emptyMessage);
            return;
        }

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.dataset.id = task.id;
            if (task.completed) {
                li.classList.add('completed');
            }
            // Flag for entry animation
            if (task.isNew) {
                li.classList.add('new-item');
                setTimeout(() => {
                    li.classList.remove('new-item');
                    delete task.isNew;
                }, 500);
            }

            li.innerHTML = `
                <input type="checkbox" class="complete-checkbox" ${task.completed? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <div class="action-buttons">
                    <button class="edit-btn" aria-label="Edit Task"><i class="fi fi-rr-pencil"></i></button>
                    <button class="delete-btn" aria-label="Delete Task"><i class="fi fi-rr-trash"></i></button>
                </div>
            `;
            taskList.appendChild(li);
        });
    };

    /**
     * Saves the current 'tasks' array to the browser's localStorage.
     */
    const saveTasks = () => {
        localStorage.setItem('todo-tasks', JSON.stringify(tasks));
    };

    /**
     * Loads tasks from localStorage when the application starts.
     */
    const loadTasks = () => {
        const storedTasks = localStorage.getItem('todo-tasks');
        if (storedTasks) {
            // CORRECTED: Use try...catch to handle potential JSON parsing errors
            try {
                tasks = JSON.parse(storedTasks);
            } catch (e) {
                console.error("Error parsing tasks from localStorage:", e);
                tasks = []; // Reset to empty array if data is corrupted
            }
        }
        render();
    };

    /**
     * Adds a new task to the 'tasks' array.
     * @param {string} text - The content of the task.
     */
    const addTask = (text) => {
        if (text.trim() === '') return; // Prevent adding empty tasks
        const newTask = {
            id: Date.now(),
            text: text,
            completed: false,
            isNew: true // Flag for entry animation
        };
        tasks.unshift(newTask); // Add to the beginning for visibility
        saveTasks();
        render();
    };

    /**
     * Toggles the 'completed' status of a task.
     * @param {number} id - The ID of the task to toggle.
     */
    const toggleComplete = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed =!task.completed;
            saveTasks();
            render();
        }
    };

    /**
     * Deletes a task after a CSS transition.
     * @param {number} id - The ID of the task to delete.
     */
    const deleteTask = (id) => {
        const taskElement = document.querySelector(`[data-id="${id}"]`);
        if (taskElement) {
            taskElement.classList.add('removing');
            // Wait for the animation to finish before removing from state and re-rendering
            taskElement.addEventListener('transitionend', () => {
                tasks = tasks.filter(t => t.id!== id);
                saveTasks();
                render();
            }, { once: true });
        }
    };

    /**
     * Initiates the editing UI for a task.
     * @param {number} id - The ID of the task to edit.
     * @param {HTMLElement} element - The <li> element of the task.
     */
    const startEdit = (id, element) => {
        if (isEditing) return; // Prevent multiple edits at once
        isEditing = true;

        const taskTextSpan = element.querySelector('.task-text');
        const currentText = taskTextSpan.textContent;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className = 'edit-input';
        // Style the input to blend in with the UI
        input.style.cssText = `
            flex-grow: 1; border: none; background: transparent; 
            color: var(--font-color); font-family: var(--font-family-main); 
            font-size: 1rem; padding: 0; outline: none;
        `;

        taskTextSpan.replaceWith(input);
        input.focus();
        input.select();

        const saveEdit = () => {
            const newText = input.value.trim();
            const task = tasks.find(t => t.id === id);
            if (task && newText) {
                task.text = newText;
            }
            isEditing = false;
            saveTasks();
            render();
        };

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            } else if (e.key === 'Escape') {
                isEditing = false;
                render(); // Re-render to cancel the edit and restore original text
            }
        });
    };

    // --- Event Listeners ---

    // Handles form submission for adding new tasks
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addTask(taskInput.value);
        taskInput.value = '';
    });

    // Uses event delegation for all actions on the task list
    taskList.addEventListener('click', (e) => {
        const target = e.target;
        const taskItem = target.closest('.task-item');
        // CORRECTED: Use logical OR (||) and ignore clicks if not on a task or while another is being edited.
        if (!taskItem || isEditing) return;


        const taskId = Number(taskItem.dataset.id);

        if (target.matches('.complete-checkbox')) {
            toggleComplete(taskId);
        } else if (target.closest('.delete-btn')) {
            deleteTask(taskId);
        } else if (target.closest('.edit-btn')) {
            startEdit(taskId, taskItem);
        }
    });

    // Handles clicks on the filter buttons
    filterButtonsContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('.filter-btn')) {
            const currentActive = filterButtonsContainer.querySelector('.active');
            if (currentActive) {
                currentActive.classList.remove('active');
            }
            target.classList.add('active');
            currentFilter = target.dataset.filter;
            render();
        }
    });

    // --- Initial Application Load ---
    loadTasks();
});