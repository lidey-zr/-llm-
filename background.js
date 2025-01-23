// DeepSeek API配置
const API_KEY = '填入用户自己的apikey';
const API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

// 规范化分类提示词
const PROMPT_TEMPLATE = `请分析网页内容，判断其属于哪个预定义类别。请返回最精确的三级分类路径。

预定义分类目录：
1. 超算与高性能计算
   1.1 并行计算框架
       - MPI
       - OpenMP
       - CUDA
       - OpenCL
   1.2 作业调度与管理
       - Slurm
       - PBS
       - LSF
   1.3 性能分析工具
       - Intel VTune
       - NVIDIA Nsight
       - TAU
   1.4 科学计算库
       - BLAS/LAPACK
       - FFTW
       - PETSc
       - Trilinos
   1.5 容器与虚拟化
       - Singularity
       - Docker
       - Kubernetes

2. 量子化学与计算化学
   2.1 量子化学软件
       - Gaussian
       - ORCA
       - Q-Chem
       - GAMESS
       - NWChem
       - Psi4
   2.2 密度泛函理论与固体态模拟
       - VASP
       - ABINIT
       - CASTEP
       - SIESTA
   2.3 分子动力学
       - LAMMPS
       - GROMACS
       - NAMD
   2.4 电子结构计算
       - Gaussian
       - ORCA
       - NWChem

3. 材料科学与工程
   3.1 材料建模与仿真
       - MatCalc
       - Thermo-Calc
   3.2 多尺度模拟
       - LAMMPS
       - QuantumWise's ATK

4. 有限元分析与计算流体力学
   4.1 有限元分析
       - ABAQUS
       - ANSYS
       - COMSOL
       - Nastran
   4.2 计算流体力学
       - OpenFOAM
       - STAR-CCM+

5. 编程学习
   5.1 Python
       - 基础语法
       - 爬虫与数据分析
       - 自动化测试
   5.2 Java
       - 基础语法
       - Spring框架
       - 并发编程
   5.3 C/C++
       - 基础语法
       - 内存管理
       - STL
   5.4 Shell脚本
       - Bash
       - Zsh

6. 电子与电路设计
   6.1 电路仿真
       - SPICE
       - LTspice
   6.2 电磁仿真
       - CST Studio Suite
       - HFSS

7. 系统仿真与自动化
   7.1 系统仿真
       - MATLAB
       - Simulink
       - Ptolemy II
   7.2 机器人与自动化
       - ABB RobotStudio
8.大模型官网
   8.1 大模型
       - deepseek
       - 智谱清言
       - 通义千问
       - 文心一言
       - 星火大模型
       - 百度文心
       - 腾讯混元
       - 华为盘古
       - 科大讯飞

规则：
1. 返回格式必须为：一级分类->二级分类->具体工具/主题
   例如：量子化学与计算化学->分子动力学->LAMMPS

2. 如果内容明确属于某个具体工具/主题，必须精确到第三级
   例如：编程学习->Python->基础语法

3. 如果无法确定具体工具/主题，但能确定类别，则在最后加"其他"
   例如：超算与高性能计算->并行计算框架->其他
   或者如果你能确定这个网页所指示的软件是哪个，那就再其所属的分类下再创建一个文件夹，文件夹名就是软件名,软件名称一律用大写字母
   例如：量子化学与计算化学 -> 电子结构计算 -> CP2K

4. 如果完全不属于任何预定义类别，直接返回：其他

请只返回分类路径，不要包含任何解释性文字。

网页内容：`;

// 添加新的提示词模板
const BOOKMARK_NAMING_PROMPT = `作为一个专业的网页分类助手，请你帮我分析这个网页的类型和内容，并按照以下规范生成一个规范的书签名称：

1. 命名格式：[类型标签]核心内容-补充信息

2. 类型标签规范：
- [教程]: 教学类内容
- [文档]: 官方文档、使用手册
- [工具]: 在线工具、实用网站
- [手册]: 完整的使用指南、参考手册
- [资源]: 资源下载、素材网站
- [论坛]: 社区、讨论平台
- [博客]: 个人博客、技术文章
- [视频]: 视频教程、在线课程

3. 命名要求：
- 保持简洁明了,不能超过15字
- 包含关键信息，比如具体的版本号
- 便于后续检索
- 区分内容来源
- 只要书签名称，不要包含任何解释性文字。，且每次只需要一个书签名称
请分析以下网页内容，生成一个符合上述规范的书签名称：`;

// 错误处理工具函数
const handleError = (error, context) => {
    console.error(`错误发生在 ${context}:`, error);
    return { error: `${context}: ${error.message}` };
};

// API调用工具函数
async function callDeepSeekAPI(messages, context) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "deepseek-ai/DeepSeek-V2.5",
                messages: messages,
                temperature: 0.3,
                max_tokens: 100
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API响应错误:', errorText);
            throw new Error(`API请求失败(${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            console.error('API返回数据异常:', data);
            throw new Error("API返回数据格式错误，请检查API响应");
        }

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error(`${context}错误:`, error);
        throw new Error(`${context}: ${error.message}`);
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "classify") {
        classifyBookmark(message.url, message.title, message.content)
            .then(category => sendResponse(category))
            .catch(error => sendResponse(handleError(error, "分类过程")));
        return true;
    }
    
    if (message.action === "saveBookmark") {
        saveBookmarkWithPath(message.url, message.title, message.path)
            .then(result => sendResponse(result))
            .catch(error => sendResponse(handleError(error, "保存书签")));
        return true;
    }

    // 处理获取规范化书签名称的请求
    if (message.action === "getBookmarkName") {
        const messages = [{
            role: "user",
            content: `${BOOKMARK_NAMING_PROMPT}\n标题：${message.title}`
        }];
        
        callDeepSeekAPI(messages, "生成书签名称")
            .then(response => sendResponse(response))
            .catch(error => {
                console.error('生成书签名称失败:', error);
                sendResponse(message.title); // 如果失败则使用原标题
            });
        return true;
    }
});

// 分类书签
async function classifyBookmark(url, title, content) {
    try {
        if (!content || !content.title) {
            throw new Error("页面内容获取失败");
        }
        
        const messages = [{
            role: "user",
            content: `${PROMPT_TEMPLATE}\n标题：${content.title}\n描述：${content.metaDescription}\n内容：${content.mainContent}`
        }];

        return await callDeepSeekAPI(messages, "分类请求");
    } catch (error) {
        console.error('分类请求失败:', error);
        throw new Error(`分类请求失败: ${error.message}`);
    }
}

// 创建书签文件夹路径
async function createBookmarkPath(pathArray) {
    let parentId = '1'; // 书签栏的ID
    
    for (const folderName of pathArray) {
        try {
            const existing = await chrome.bookmarks.search({ title: folderName });
            const folder = existing.find(b => b.parentId === parentId);
            
            if (folder) {
                parentId = folder.id;
            } else {
                const newFolder = await chrome.bookmarks.create({
                    parentId: parentId,
                    title: folderName
                });
                parentId = newFolder.id;
            }
        } catch (error) {
            throw new Error(`创建文件夹 "${folderName}" 失败: ${error.message}`);
        }
    }
    
    return parentId;
}

// 保存书签
async function saveBookmarkWithPath(url, title, path) {
    try {
        const categories = path === "其他" ? ["其他"] : path.split('->').map(c => c.trim());
        
        // 获取AI生成的规范书签名称
        const messages = [{
            role: "user",
            content: `${BOOKMARK_NAMING_PROMPT}\n标题：${title}`
        }];
        
        const newTitle = await callDeepSeekAPI(messages, "生成书签名称");
        const parentId = await createBookmarkPath(categories);
        
        const bookmark = await chrome.bookmarks.create({
            parentId: parentId,
            title: newTitle,
            url: url
        });
        
        return {
            success: true,
            path: path,
            bookmarkId: bookmark.id,
            newTitle: newTitle
        };
    } catch (error) {
        throw error;
    }
} 
