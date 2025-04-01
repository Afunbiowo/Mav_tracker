// Modified frontend code to work with the backend API

// API service
const API_URL = '/api';

const api = {
  // Task endpoints
  getTasks: async () => {
    const response = await fetch(`${API_URL}/tasks`, {
      headers: {
        'x-auth-token': localStorage.getItem('token')
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }
    
    return await response.json();
  },
  
  addTask: async (taskData) => {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': localStorage.getItem('token')
      },
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to add task');
    }
    
    return await response.json();
  },
  
  updateTask: async (taskId, taskData) => {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': localStorage.getItem('token')
      },
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update task');
    }
    
    return await response.json();
  },
  
  deleteTask: async (taskId) => {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'x-auth-token': localStorage.getItem('token')
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete task');
    }
    
    return await response.json();
  },
  
  // Auth endpoints
  register: async (userData) => {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to register');
    }
    
    return await response.json();
  },
  
  login: async (credentials) => {
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    if (!response.ok) {
      throw new Error('Invalid credentials');
    }
    
    return await response.json();
  },
  
  getUserProfile: async () => {
    const response = await fetch(`${API_URL}/users/me`, {
      headers: {
        'x-auth-token': localStorage.getItem('token')
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    
    return await response.json();
  },
  
  updateUserSettings: async (settings) => {
    const response = await fetch(`${API_URL}/users/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': localStorage.getItem('token')
      },
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update settings');
    }
    
    return await response.json();
  },
  
  // Notification endpoints
  getNotifications: async () => {
    const response = await fetch(`${API_URL}/notifications`, {
      headers: {
        'x-auth-token': localStorage.getItem('token')
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }
    
    return await response.json();
  },
  
  markNotificationAsRead: async (notificationId) => {
    const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'x-auth-token': localStorage.getItem('token')
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }
    
    return await response.json();
  }
};

// Usage in your app:
document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    // Show login/register form
    showAuthForm();
    return;
  }
  
  try {
    // Get user profile
    const user = await api.getUserProfile();
    
    // Update UI with user info
    document.querySelector('.logo span').textContent = `${user.name}'s Task Tracker`;
    
    // Load tasks from backend
    const tasks = await api.getTasks();
    renderTasksFromAPI(tasks);
    
    // Load notifications
    loadAndDisplayNotifications();
    
  } catch (error) {
    console.error('Authentication error:', error);
    localStorage.removeItem('token');
    showAuthForm();
  }
  
  // Rest of your existing event listeners...
  
  // Modified addNewTask function
  async function addNewTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const status = document.getElementById('taskStatus').value;
    const dueDate = document.getElementById('taskDueDate').value;
    
    if (!title || !description || !dueDate) {
      showToast('Please fill all required fields', 'warning');
      return;
    }
    
    try {
      const newTask = await api.addTask({
        title,
        description,
        status,
        dueDate
      });
      
      // Add to local tasks array
      tasks.push(newTask);
      renderTasks();
      updateStatistics();
      closeModal(addTaskModal);
      showToast('Task added successfully!', 'success');
      setupReminders();
    } catch (error) {
      console.error('Error adding task:', error);
      showToast('Failed to add task. Please try again.', 'warning');
    }
  }
  
  // Modified moveTask function
  async function moveTask(newStatus) {
    if (!selectedTaskId) return;
    
    const taskIndex = tasks.findIndex(t => t.id === selectedTaskId);
    if (taskIndex === -1) return;
    
    const oldStatus = tasks[taskIndex].status;
    
    try {
      const updatedTask = await api.updateTask(selectedTaskId, {
        status: newStatus
      });
      
      // Update in local array
      tasks[taskIndex] = updatedTask;
      
      renderTasks();
      updateStatistics();
      closeModal(taskDetailsModal);
      
      if (newStatus === 'completed') {
        showToast(
          `Task Completed: ${tasks[taskIndex].title}`,
          'success',
          `Task marked as completed`
        );
      } else {
        showToast(
          `Task moved to ${newStatus === 'pending' ? 'Pending' : 'In Progress'}`,
          'success'
        );
      }
    } catch (error) {
      console.error('Error updating task:', error);
      showToast('Failed to update task status. Please try again.', 'warning');
    }
  }
  
  // Modified deleteSelectedTask function
  async function deleteSelectedTask() {
    if (!selectedTaskId) return;
    
    try {
      await api.deleteTask(selectedTaskId);
      
      // Remove from local array
      tasks = tasks.filter(t => t.id !== selectedTaskId);
      
      renderTasks();
      updateStatistics();
      closeModal(taskDetailsModal);
      showToast('Task deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting task:', error);
      showToast('Failed to delete task. Please try again.', 'warning');
    }
  }
  
  // New function to load notifications
  async function loadAndDisplayNotifications() {
    try {
      const notifications = await api.getNotifications();
      
      // Display unread notifications as toasts
      notifications.filter(n => !n.read).forEach(notification => {
        showToast(
          notification.task ? notification.task.title : 'Task Update',
          notification.type === 'completion' ? 'success' : 'warning',
          notification.message,
          async () => {
            // Mark as read when clicked
            await api.markNotificationAsRead(notification._id);
          }
        );
      });
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }
  
  // Authentication UI functions
  function showAuthForm() {
    // Create login/register form
    const authForm = document.createElement('div');
    authForm.className = 'auth-container';
    authForm.innerHTML = `
      <div class="auth-card">
        <div class="auth-header">
          <h2>Task Tracker</h2>
          <p>Please login or register to continue</p>
        </div>
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">Login</button>
          <button class="auth-tab" data-tab="register">Register</button>
        </div>
        <div class="auth-form-container">
          <form id="loginForm" class="auth-form active">
            <div class="form-group">
              <label for="loginEmail">Email</label>
              <input type="email" id="loginEmail" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="loginPassword">Password</label>
              <input type="password" id="loginPassword" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Login</button>
          </form>
          <form id="registerForm" class="auth-form">
            <div class="form-group">
              <label for="registerName">Name</label>
              <input type="text" id="registerName" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="registerEmail">Email</label>
              <input type="email" id="registerEmail" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="registerPassword">Password</label>
              <input type="password" id="registerPassword" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="registerPasswordConfirm">Confirm Password</label>
              <input type="password" id="registerPasswordConfirm" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Register</button>
          </form>
        </div>
      </div>
    `;
    
    document.body.innerHTML = '';
    document.body.appendChild(authForm);
    
    // Add styles for auth form
    const authStyles = document.createElement('style');
    authStyles.textContent = `
      .