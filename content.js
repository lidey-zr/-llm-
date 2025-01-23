// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    if (message.action === "getPageContent") {
        try {
            // 获取页面主要内容
            const content = extractPageContent();
            console.log('Extracted content:', content);
            // 直接返回内容
            sendResponse(content);
        } catch (error) {
            console.error('Error extracting content:', error);
            sendResponse({ error: error.message });
        }
    }
    return true; // 保持消息通道开放
});

// 提取页面主要内容
function extractPageContent() {
    // 获取页面标题
    const title = document.title;
    console.log('Page title:', title);
    
    // 获取meta描述
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    
    // 获取主要文本内容
    const mainContent = [];
    
    try {
        // 获取h1-h3标题
        document.querySelectorAll('h1, h2, h3').forEach(heading => {
            mainContent.push(heading.textContent.trim());
        });
        
        // 获取文章主体内容
        const article = document.querySelector('article') || document.querySelector('main') || document.body;
        if (!article) {
            throw new Error('找不到主要内容区域');
        }
        
        const paragraphs = article.querySelectorAll('p');
        paragraphs.forEach(p => {
            const text = p.textContent.trim();
            if (text.length > 50) { // 只获取较长的段落
                mainContent.push(text);
            }
        });
        
        // 如果没有找到任何内容，尝试获取所有可见文本
        if (mainContent.length === 0) {
            const visibleText = Array.from(document.body.getElementsByTagName('*'))
                .filter(element => {
                    const style = window.getComputedStyle(element);
                    return style.display !== 'none' && style.visibility !== 'hidden' && element.textContent.trim().length > 50;
                })
                .map(element => element.textContent.trim())
                .slice(0, 5); // 只取前5段
            mainContent.push(...visibleText);
        }
    } catch (error) {
        console.error('Error extracting content:', error);
    }
    
    return {
        title,
        metaDescription,
        mainContent: mainContent.join('\n').slice(0, 1000) // 限制内容长度
    };
}

// 通知popup脚本已加载
console.log('Content script loaded and ready'); 