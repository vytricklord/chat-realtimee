// Khởi tạo biến
let socket;
let currentUser = null;
let isConnected = false;
let typingTimeout;

// DOM Elements
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const logoutBtn = document.getElementById('logout-btn');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const usersList = document.getElementById('users-list');
const onlineCount = document.getElementById('online-count');
const userForm = document.getElementById('user-form');
const userInfo = document.getElementById('user-info');
const currentUsername = document.getElementById('current-username');
const messageInputSection = document.getElementById('message-input-section');
const connectionStatus = document.getElementById('connection-status');
const statusDot = document.getElementById('status-dot');
const typingIndicator = document.getElementById('typing-indicator');
const typingText = document.getElementById('typing-text');
const totalMessages = document.getElementById('total-messages');
const uptimeElement = document.getElementById('uptime');
const refreshBtn = document.getElementById('refresh-btn');

// Khởi tạo kết nối Socket.io
function initSocket() {
    // Kết nối tới server (Railway sẽ tự động cung cấp URL)
    const serverUrl = window.location.origin;
    socket = io(serverUrl);
    
    // Xử lý sự kiện kết nối
    socket.on('connect', () => {
        console.log('Connected to server');
        isConnected = true;
        updateConnectionStatus(true);
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        isConnected = false;
        updateConnectionStatus(false);
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateConnectionStatus(false, 'Connection failed');
    });
    
    // Xử lý đăng ký thành công
    socket.on('registered', (userData) => {
        currentUser = userData;
        showUserInfo();
        enableMessageInput();
        showNotification(`Welcome ${userData.username}!`, 'success');
    });
    
    // Xử lý tin nhắn mới
    socket.on('newMessage', (message) => {
        addMessageToUI(message);
        scrollToBottom();
        updateServerStats();
    });
    
    // Xử lý lịch sử tin nhắn
    socket.on('messageHistory', (history) => {
        messagesContainer.innerHTML = '';
        if (history.length === 0) {
            showWelcomeMessage();
        } else {
            history.forEach(message => addMessageToUI(message));
            scrollToBottom();
        }
        updateServerStats();
    });
    
    // Xử lý cập nhật người dùng online
    socket.on('onlineUsers', (users) => {
        updateOnlineUsers(users);
    });
    
    // Xử lý chỉ báo đang nhập
    socket.on('userTyping', (username) => {
        showTypingIndicator(username);
    });
    
    socket.on('userStopTyping', () => {
        hideTypingIndicator();
    });
}

// Cập nhật trạng thái kết nối
function updateConnectionStatus(connected, message = null) {
    if (connected) {
        statusDot.className = 'status-dot connected';
        connectionStatus.textContent = 'Connected';
        connectionStatus.style.color = '#2ed573';
    } else {
        statusDot.className = 'status-dot';
        connectionStatus.textContent = message || 'Disconnected';
        connectionStatus.style.color = '#ff4757';
    }
}

// Hiển thị thông báo
function showNotification(message, type = 'info') {
    // Tạo thông báo tạm thời
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ed573' : '#ff4757'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Tự động xóa sau 3 giây
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Thêm CSS cho animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Xử lý đăng ký người dùng
function registerUser() {
    const username = usernameInput.value.trim();
    
    if (!username) {
        showNotification('Please enter a username', 'error');
        return;
    }
    
    if (username.length > 20) {
        showNotification('Username must be less than 20 characters', 'error');
        return;
    }
    
    if (!isConnected) {
        showNotification('Not connected to server', 'error');
        return;
    }
    
    socket.emit('register', username);
}

// Hiển thị thông tin người dùng
function showUserInfo() {
    userForm.style.display = 'none';
    userInfo.style.display = 'block';
    currentUsername.textContent = currentUser.username;
}

// Hiển thị form đăng ký
function showUserForm() {
    userForm.style.display = 'block';
    userInfo.style.display = 'none';
    currentUser = null;
    disableMessageInput();
    messagesContainer.innerHTML = '';
    showWelcomeMessage();
}

// Bật input nhắn tin
function enableMessageInput() {
    messageInputSection.style.display = 'block';
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
}

// Tắt input nhắn tin
function disableMessageInput() {
    messageInput.value = '';
    messageInputSection.style.display = 'none';
    messageInput.disabled = true;
    sendBtn.disabled = true;
}

// Hiển thị tin nhắn chào mừng
function showWelcomeMessage() {
    const welcomeHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">
                <i class="fas fa-comment-dots"></i>
            </div>
            <h2>Welcome to Realtime Chat</h2>
            <p>Join the conversation by entering a username in the sidebar</p>
            <div class="features">
                <div class="feature">
                    <i class="fas fa-bolt"></i>
                    <span>Realtime messaging</span>
                </div>
                <div class="feature">
                    <i class="fas fa-user-check"></i>
                    <span>See who's online</span>
                </div>
                <div class="feature">
                    <i class="fas fa-typing"></i>
                    <span>Typing indicators</span>
                </div>
            </div>
        </div>
    `;
    messagesContainer.innerHTML = welcomeHTML;
}

// Thêm tin nhắn vào giao diện
function addMessageToUI(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    // Xác định loại tin nhắn
    if (message.isSystem) {
        messageElement.classList.add('system');
    } else if (message.userId === socket.id) {
        messageElement.classList.add('user');
    } else {
        messageElement.classList.add('other');
    }
    
    // Định dạng thời gian
    const time = new Date(message.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Tạo nội dung tin nhắn
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-user">${message.username}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-text">${escapeHtml(message.text)}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
}

// Escape HTML để tránh XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Cuộn xuống cuối tin nhắn
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Gửi tin nhắn
function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || !currentUser || !isConnected) return;
    
    socket.emit('sendMessage', message);
    messageInput.value = '';
    clearTypingIndicator();
}

// Xử lý nhập tin nhắn
function handleMessageInput() {
    if (!currentUser || !isConnected) return;
    
    socket.emit('typing');
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stopTyping');
    }, 1000);
}

// Xóa chỉ báo đang nhập
function clearTypingIndicator() {
    socket.emit('stopTyping');
    clearTimeout(typingTimeout);
}

// Hiển thị chỉ báo đang nhập
function showTypingIndicator(username) {
    typingText.textContent = `${username} is typing...`;
    typingIndicator.style.display = 'flex';
}

// Ẩn chỉ báo đang nhập
function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

// Cập nhật danh sách người dùng online
function updateOnlineUsers(users) {
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="empty-users">No users online</div>';
        onlineCount.textContent = '0';
        return;
    }
    
    onlineCount.textContent = users.length.toString();
    
    // Sắp xếp người dùng theo thời gian tham gia
    const sortedUsers = [...users].sort((a, b) => 
        new Date(a.joinedAt) - new Date(b.joinedAt)
    );
    
    // Thêm người dùng hiện tại lên đầu
    if (currentUser) {
        const currentUserData = sortedUsers.find(u => u.username === currentUser.username);
        if (currentUserData) {
            const index = sortedUsers.indexOf(currentUserData);
            sortedUsers.splice(index, 1);
            sortedUsers.unshift(currentUserData);
        }
    }
    
    // Tạo danh sách người dùng
    sortedUsers.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        
        // Lấy ký tự đầu tiên của tên người dùng
        const firstLetter = user.username.charAt(0).toUpperCase();
        
        userElement.innerHTML = `
            <div class="user-avatar">${firstLetter}</div>
            <div class="user-name">${user.username}</div>
        `;
        
        // Đánh dấu người dùng hiện tại
        if (currentUser && user.username === currentUser.username) {
            userElement.style.backgroundColor = '#e6f7ff';
            userElement.style.borderLeft = '3px solid #1890ff';
        }
        
        usersList.appendChild(userElement);
    });
}

// Cập nhật thông tin server
async function updateServerStats() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        totalMessages.textContent = data.messages;
        
        // Định dạng thời gian uptime
        const hours = Math.floor(data.uptime / 3600);
        const minutes = Math.floor((data.uptime % 3600) / 60);
        const seconds = Math.floor(data.uptime % 60);
        
        if (hours > 0) {
            uptimeElement.textContent = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            uptimeElement.textContent = `${minutes}m ${seconds}s`;
        } else {
            uptimeElement.textContent = `${seconds}s`;
        }
    } catch (error) {
        console.error('Error fetching server stats:', error);
    }
}

// Đăng xuất
function logout() {
    if (currentUser && isConnected) {
        socket.disconnect();
        showNotification(`Goodbye ${currentUser.username}!`, 'info');
    }
    
    showUserForm();
    updateOnlineUsers([]);
    
    // Kết nối lại
    setTimeout(() => {
        initSocket();
    }, 100);
}

// Xử lý sự kiện bàn phím
function handleKeyPress(e) {
    // Gửi tin nhắn khi nhấn Enter (không kèm Shift)
    if (e.key === 'Enter' && !e.shiftKey && messageInput === document.activeElement) {
        e.preventDefault();
        sendMessage();
    }
}

// Khởi tạo sự kiện
function initEvents() {
    // Đăng ký người dùng
    joinBtn.addEventListener('click', registerUser);
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') registerUser();
    });
    
    // Đăng xuất
    logoutBtn.addEventListener('click', logout);
    
    // Gửi tin nhắn
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', handleKeyPress);
    messageInput.addEventListener('input', handleMessageInput);
    
    // Làm mới thông tin server
    refreshBtn.addEventListener('click', updateServerStats);
}

// Khởi động ứng dụng
function initApp() {
    initSocket();
    initEvents();
    showWelcomeMessage();
    
    // Cập nhật thông tin server mỗi 30 giây
    setInterval(updateServerStats, 1);
    updateServerStats();
}

// Khởi động khi trang tải xong
document.addEventListener('DOMContentLoaded', initApp);