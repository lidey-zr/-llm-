let searchTimeout = null;

// 初始化搜索功能
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // 清除之前的定时器
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // 如果搜索框为空，隐藏结果
        if (!query) {
            searchResults.style.display = 'none';
            return;
        }

        // 设置300ms的防抖
        searchTimeout = setTimeout(() => {
            searchBookmarks(query);
        }, 300);
    });
});

// 搜索书签
async function searchBookmarks(query) {
    const searchResults = document.getElementById('searchResults');
    
    try {
        // 使用chrome.bookmarks.search API搜索书签
        const results = await chrome.bookmarks.search(query);
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-item">没有找到相关书签</div>';
            searchResults.style.display = 'block';
            return;
        }

        // 显示搜索结果
        const resultsHtml = await Promise.all(results.map(async (bookmark) => {
            const path = await getBookmarkPath(bookmark.id);
            return `
                <div class="search-item" data-url="${bookmark.url || ''}" data-id="${bookmark.id}">
                    <div class="search-item-title">${bookmark.title}</div>
                    <div class="search-item-path">${path}</div>
                </div>
            `;
        }));

        searchResults.innerHTML = resultsHtml.join('');
        searchResults.style.display = 'block';

        // 添加点击事件
        document.querySelectorAll('.search-item').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                if (url) {
                    chrome.tabs.create({ url });
                }
            });
        });

    } catch (error) {
        console.error('搜索书签时出错:', error);
        searchResults.innerHTML = '<div class="search-item">搜索出错，请重试</div>';
        searchResults.style.display = 'block';
    }
}

// 获取书签完整路径
async function getBookmarkPath(bookmarkId) {
    const path = [];
    let current = await chrome.bookmarks.get(bookmarkId);
    current = current[0];

    while (current.parentId) {
        const parent = await chrome.bookmarks.get(current.parentId);
        if (parent[0].title) {
            path.unshift(parent[0].title);
        }
        current = parent[0];
    }

    return path.join(' > ');
} 