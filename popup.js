// 与background script和content script通信
let currentTab = null;

// 添加波纹效果
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - button.offsetLeft - radius}px`;
    ripple.style.top = `${event.clientY - button.offsetTop - radius}px`;
    ripple.className = 'ripple';

    button.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
}

// 显示加载动画
function showLoading() {
    const loading = document.getElementById('loading');
    loading.classList.add('active');
    document.getElementById('content').style.opacity = '0.5';
}

// 隐藏加载动画
function hideLoading() {
    const loading = document.getElementById('loading');
    loading.classList.remove('active');
    document.getElementById('content').style.opacity = '1';
}

// 更新分类路径显示
function updatePathDisplay(path) {
    const pathContainer = document.getElementById('pathContainer');
    pathContainer.innerHTML = '';
    pathContainer.style.display = 'flex';

    const categories = path.split('->').map(cat => cat.trim());
    categories.forEach((category, index) => {
        const item = document.createElement('div');
        item.className = 'breadcrumb-item';
        
        const icon = document.createElement('i');
        icon.className = index === 0 ? 'fas fa-folder' : 'fas fa-chevron-right';
        item.appendChild(icon);
        
        const text = document.createElement('span');
        text.textContent = category;
        text.style.color = `hsl(${(index * 40) % 360}, 70%, 45%)`;
        item.appendChild(text);
        
        pathContainer.appendChild(item);
    });
}

// 显示错误信息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.getElementById('content').appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// 显示成功信息
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.getElementById('content').appendChild(successDiv);
    setTimeout(() => {
        successDiv.remove();
        window.close();
    }, 1000);
}

// 显示空状态
function showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    emptyState.style.display = 'block';
    document.getElementById('searchResults').style.display = 'none';
}

// 隐藏空状态
function hideEmptyState() {
    const emptyState = document.getElementById('emptyState');
    emptyState.style.display = 'none';
    document.getElementById('searchResults').style.display = 'block';
}

// 搜索书签
async function searchBookmarks(query) {
    if (!query) {
        document.getElementById('searchResults').style.display = 'none';
        return;
    }

    const results = await chrome.bookmarks.search(query);
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';

    if (results.length === 0) {
        showEmptyState();
        return;
    }

    hideEmptyState();
    searchResults.style.display = 'block';

    results.forEach(bookmark => {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        const title = document.createElement('div');
        title.className = 'search-result-title';
        title.textContent = bookmark.title;

        const path = document.createElement('div');
        path.className = 'search-result-path';
        path.textContent = bookmark.url;

        item.appendChild(title);
        item.appendChild(path);
        
        item.addEventListener('click', () => {
            chrome.tabs.create({ url: bookmark.url });
        });

        searchResults.appendChild(item);
    });
}

// 预览书签名称
async function previewBookmarkName(title, path) {
    const preview = document.getElementById('bookmarkPreview');
    const nameSpan = document.getElementById('bookmarkName');
    
    // 调用background script获取规范化的书签名称
    const newTitle = await chrome.runtime.sendMessage({
        action: "getBookmarkName",
        title: title
    });
    
    nameSpan.textContent = newTitle;
    preview.style.display = 'block';
    
    return newTitle;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const classifyBtn = document.getElementById('classifyBtn');
    const saveBtn = document.getElementById('saveBtn');
    const searchInput = document.getElementById('searchInput');

    // 添加波纹效果
    classifyBtn.addEventListener('click', createRipple);
    saveBtn.addEventListener('click', createRipple);

    // 搜索功能
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchBookmarks(e.target.value.trim());
        }, 300);
    });

    // 分类按钮点击事件
    classifyBtn.addEventListener('click', async () => {
        showLoading();
        try {
            // 获取当前标签页
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            currentTab = tab;
            
            // 注入content script
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
            } catch (e) {
                console.log('Content script 可能已经注入');
            }
            
            // 获取页面内容
            const content = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: "getPageContent" }, response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            // 发送到background script进行分类
            const category = await chrome.runtime.sendMessage({
                action: "classify",
                url: tab.url,
                title: tab.title,
                content: content
            });

            if (category.error) {
                throw new Error(category.error);
            }

            updatePathDisplay(category);
            saveBtn.disabled = false;
            hideEmptyState();
            
            // 预览书签名称
            await previewBookmarkName(tab.title, category);
        } catch (error) {
            console.error('分类失败:', error);
            showError(error.message);
            showEmptyState();
        } finally {
            hideLoading();
        }
    });

    // 保存按钮点击事件
    saveBtn.addEventListener('click', async () => {
        showLoading();
        try {
            const path = Array.from(document.querySelectorAll('.breadcrumb-item span'))
                .map(span => span.textContent)
                .join('->');
            
            const bookmarkName = document.getElementById('bookmarkName').textContent;
            
            const result = await chrome.runtime.sendMessage({
                action: "saveBookmark",
                url: currentTab.url,
                title: bookmarkName,
                path: path
            });

            if (result.success) {
                hideLoading();
                showSuccess('书签保存成功！');
            } else if (result.error) {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('保存失败:', error);
            showError(error.message);
            hideLoading();
        }
    });
}); 