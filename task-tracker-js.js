// DOM Elements
const addTaskBtn = document.getElementById('add-task-btn');
const addTaskModal = document.getElementById('add-task-modal');
const taskDetailsModal = document.getElementById('task-details-modal');
const addTaskForm = document.getElementById('add-task-form');
const closeButtons = document.querySelectorAll('.close-btn');
const cancelAddBtn = document.getElementById('cancel-add');
const updateTaskBtn = document.getElementById('update-task-btn');
const deleteTaskBtn = document.getElementById('delete-task-btn');
const notificationsBtn = document.getElementById('notifications-btn');
const notificationsPanel = document.getElementById('notifications-panel');
const closeNotificationsBtn = document.getElementById('close-notifications');
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const detailStatus = document.getElementById('detail-status');

// Task Lists
const pendingList = document.getElementById('pending-list');
const inProgressList = document.getElementById('in-progress-list');
const completedList = document.getElementById('completed-list');

// Counter Elements
const totalTasksEl = document.getElementById('total-tasks');
const pendingTasksEl = document.getElementById('pending-tasks');
const inProgressTasksEl = document.getElementById('in-progress-tasks');
const completedTasksEl = document.getElementById('completed-tasks');
const pendingCountEl = document.getElementById('pending-count');
const inProgressCountEl = document.getElementById('in-progress-count');
const completedCountEl = document.getElementById('completed-count');

// Notification Elements
const notificationBadge = document.getElementById('notification-badge');
const notificationsList = document.getElementById('notifications-list');

// Initial Data & State
let tasks = [];
let currentTaskId = null;
let notifications = [];
let searchQuery = '';
let statusFilter = 'all';

// API URL
const API_URL = 'http://localhost:3000/api';

// Load data on init
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadNotifications();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Add task modal
    addTaskBtn.addEventListener('click', () => openModal(addTaskModal));
    cancelAddBtn.addEventListener('click', () => closeModal(addTaskModal));
    
    // Close modals
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            closeModal(addTaskModal);
            closeModal(taskDetailsModal);
        });
    });
    
    // Form submission
    addTaskForm.addEventListener('submit', handleAddTask);
    
    // Task update & delete
    updateTaskBtn.addEventListener('click', handleUpdateTask);
    deleteTaskBtn.addEventListener('click', handleDeleteTask);
    detailStatus.addEventListener('change', handleStatusChange);
    
    // Notifications panel
    notificationsBtn.addEventListener('click', toggleNotificationsPanel);
    closeNotificationsBtn.addEventListener('click', toggleNotificationsPanel);
    
    // Search and filter
    searchInput.addEventListener('input', handleSearch);
    filterStatus.addEventListener('change', handleFilter);
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === addTaskModal) closeModal(addTaskModal);
        if (e.target === taskDetailsModal) closeModal(taskDetailsModal);
    });
}

// Modal Controls
function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

// API Functions
async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        if (!response.ok) throw new Error('Failed to load tasks');
        
        tasks = await response.json();
        renderTasks();
        updateCounters();
    } catch (error) {
        showToast('Error loading tasks', 'error');
        console.error(error);
    }
}

async function loadNotifications() {
    try {
        const response = await fetch(`${API_URL}/notifications`);
        if (!response.ok) throw new Error('Failed to load notifications');
        
        notifications = await response.json();
