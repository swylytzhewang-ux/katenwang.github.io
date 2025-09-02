// 模拟服务端 - 使用Node.js Express框架
// 在实际部署时，这将是一个独立的后端服务

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 数据存储路径
const DATA_DIR = './data';
const INTERVIEWS_FILE = path.join(DATA_DIR, 'interviews.json');
const CHAT_HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');

// 确保数据目录存在
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// 读取JSON文件
async function readJsonFile(filePath, defaultValue = []) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // 文件不存在时返回默认值
        return defaultValue;
    }
}

// 写入JSON文件
async function writeJsonFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 面试相关API
app.get('/api/interviews', async (req, res) => {
    try {
        const interviews = await readJsonFile(INTERVIEWS_FILE);
        res.json({
            success: true,
            data: interviews
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/interviews', async (req, res) => {
    try {
        const interviews = await readJsonFile(INTERVIEWS_FILE);
        const newInterview = {
            id: generateId(),
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        interviews.push(newInterview);
        await writeJsonFile(INTERVIEWS_FILE, interviews);

        res.json({
            success: true,
            data: newInterview
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.put('/api/interviews/:id', async (req, res) => {
    try {
        const interviews = await readJsonFile(INTERVIEWS_FILE);
        const index = interviews.findIndex(interview => interview.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        interviews[index] = {
            ...interviews[index],
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        await writeJsonFile(INTERVIEWS_FILE, interviews);

        res.json({
            success: true,
            data: interviews[index]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.delete('/api/interviews/:id', async (req, res) => {
    try {
        const interviews = await readJsonFile(INTERVIEWS_FILE);
        const index = interviews.findIndex(interview => interview.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        const deletedInterview = interviews.splice(index, 1)[0];
        await writeJsonFile(INTERVIEWS_FILE, interviews);

        res.json({
            success: true,
            data: deletedInterview
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 面试题相关API
app.post('/api/interviews/:id/questions', async (req, res) => {
    try {
        const interviews = await readJsonFile(INTERVIEWS_FILE);
        const interview = interviews.find(i => i.id === req.params.id);

        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        const { type, question } = req.body;
        const newQuestion = {
            id: generateId(),
            ...question,
            createdAt: new Date().toISOString()
        };

        if (type === 'mock') {
            if (!interview.mockQuestions) interview.mockQuestions = [];
            interview.mockQuestions.push(newQuestion);
        } else if (type === 'real') {
            if (!interview.realQuestions) interview.realQuestions = [];
            interview.realQuestions.push(newQuestion);
        }

        interview.updatedAt = new Date().toISOString();
        await writeJsonFile(INTERVIEWS_FILE, interviews);

        res.json({
            success: true,
            data: newQuestion
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// AI相关API
app.post('/api/ai/generate-answer', async (req, res) => {
    try {
        const { question, jobDescription, type } = req.body;

        // 模拟AI生成延迟
        await new Promise(resolve => setTimeout(resolve, 1000));

        let answer;
        if (type === 'mock') {
            answer = await generateMockAnswer(question, jobDescription);
        } else {
            answer = await generateReviewAnswer(question);
        }

        res.json({
            success: true,
            data: { answer }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/ai/chat', async (req, res) => {
    try {
        const { message, context } = req.body;

        // 模拟AI处理延迟
        await new Promise(resolve => setTimeout(resolve, 1500));

        const response = await processAIChat(message, context);

        res.json({
            success: true,
            data: response
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 通义千问（Qwen）直连代理（OpenAI 兼容模式）
// 需要设置环境变量 QWEN_API_KEY
app.post('/api/ai/qwen-chat', async (req, res) => {
    try {
        const apiKey = process.env.QWEN_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: '缺少环境变量 QWEN_API_KEY，请先配置后重试'
            });
        }

        const { message, history = [] } = req.body || {};
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ success: false, error: '参数 message 必填' });
        }

        const model = process.env.QWEN_MODEL || 'qwen-turbo';

        const messages = [
            { role: 'system', content: '你是一个专业的秋招面试助手，帮助求职者管理安排、准备面试、复盘与求职建议。回答清晰、结构化、可执行。' },
            ...history.map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content })),
            { role: 'user', content: message }
        ];

        const payload = JSON.stringify({
            model,
            messages,
            stream: false,
            temperature: 0.7
        });

        const options = {
            hostname: 'dashscope.aliyuncs.com',
            path: '/compatible-mode/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(payload)
            },
            timeout: 15000
        };

        const responseBody = await new Promise((resolve, reject) => {
            const reqQ = https.request(options, (resp) => {
                let data = '';
                resp.on('data', chunk => data += chunk);
                resp.on('end', () => resolve({ statusCode: resp.statusCode, data }));
            });
            reqQ.on('error', reject);
            reqQ.on('timeout', () => {
                reqQ.destroy(new Error('请求 Qwen 超时'));
            });
            reqQ.write(payload);
            reqQ.end();
        });

        if (responseBody.statusCode >= 400) {
            return res.status(502).json({ success: false, error: `Qwen API 错误: ${responseBody.data}` });
        }

        let parsed;
        try { parsed = JSON.parse(responseBody.data); } catch {
            return res.status(502).json({ success: false, error: 'Qwen 返回了非 JSON 数据' });
        }

        const content = parsed?.choices?.[0]?.message?.content || '';
        return res.json({ success: true, data: { content } });
    } catch (error) {
        console.error('Qwen 代理错误:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 聊天历史API
app.get('/api/chat-history', async (req, res) => {
    try {
        const chatHistory = await readJsonFile(CHAT_HISTORY_FILE);
        res.json({
            success: true,
            data: chatHistory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/chat-history', async (req, res) => {
    try {
        const { messages } = req.body;
        await writeJsonFile(CHAT_HISTORY_FILE, messages);

        res.json({
            success: true,
            message: 'Chat history saved'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 数据同步API
app.post('/api/sync', async (req, res) => {
    try {
        const { interviews, chatHistory } = req.body;

        if (interviews) {
            await writeJsonFile(INTERVIEWS_FILE, interviews);
        }

        if (chatHistory) {
            await writeJsonFile(CHAT_HISTORY_FILE, chatHistory);
        }

        res.json({
            success: true,
            message: 'Data synced successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 数据备份API
app.get('/api/backup', async (req, res) => {
    try {
        const interviews = await readJsonFile(INTERVIEWS_FILE);
        const chatHistory = await readJsonFile(CHAT_HISTORY_FILE);

        const backup = {
            interviews,
            chatHistory,
            exportTime: new Date().toISOString(),
            version: '1.0'
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=backup_${new Date().toISOString().slice(0, 10)}.json`);
        res.json(backup);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/restore', async (req, res) => {
    try {
        const { interviews, chatHistory } = req.body;

        if (interviews) {
            await writeJsonFile(INTERVIEWS_FILE, interviews);
        }

        if (chatHistory) {
            await writeJsonFile(CHAT_HISTORY_FILE, chatHistory);
        }

        res.json({
            success: true,
            message: 'Data restored successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 统计API
app.get('/api/statistics', async (req, res) => {
    try {
        const interviews = await readJsonFile(INTERVIEWS_FILE);
        const chatHistory = await readJsonFile(CHAT_HISTORY_FILE);

        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const statistics = {
            totalInterviews: interviews.length,
            thisMonthInterviews: interviews.filter(interview => {
                const interviewDate = new Date(interview.datetime);
                return interviewDate.getMonth() === thisMonth &&
                    interviewDate.getFullYear() === thisYear;
            }).length,
            upcomingInterviews: interviews.filter(interview => {
                return new Date(interview.datetime) > now;
            }).length,
            totalChatMessages: chatHistory.length,
            companiesCount: new Set(interviews.map(i => i.company)).size,
            questionsCount: interviews.reduce((total, interview) => {
                return total +
                    (interview.mockQuestions?.length || 0) +
                    (interview.realQuestions?.length || 0);
            }, 0)
        };

        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// AI辅助函数
async function generateMockAnswer(question, jobDescription) {
    // 这里应该调用真实的AI API（如Qwen）
    // 现在使用模拟实现

    const templates = {
        '自我介绍': '您好，我是[姓名]，[专业]专业毕业。在校期间，我主要学习了[相关技能]，并参与了[项目经历]。我选择应聘这个岗位是因为[选择原因]，希望能在贵公司发挥我的专长，实现共同成长。',

        '项目经历': '在[项目名称]中，我担任[角色]，主要负责[具体职责]。项目采用了[技术栈]，解决了[问题]。在实施过程中，我遇到了[挑战]，通过[解决方案]成功解决。最终取得了[成果]。',

        '优势': '我的主要优势包括：1）专业技能扎实，具备[具体技能]；2）学习能力强，能快速掌握新技术；3）沟通协作能力好，有良好的团队合作经验；4）工作态度认真负责，注重质量和效率。',

        '为什么选择': '我选择贵公司主要基于：1）公司在行业中的领先地位和技术实力；2）良好的企业文化和发展前景；3）岗位与我的专业背景高度匹配；4）能够提供良好的学习和成长机会。'
    };

    for (const [key, template] of Object.entries(templates)) {
        if (question.includes(key)) {
            return template;
        }
    }

    return `针对"${question}"这个问题，建议从以下角度回答：\n\n1. 结合具体实例说明\n2. 突出与岗位相关的技能\n3. 展现个人优势和特色\n4. 与公司需求建立连接\n\n请根据个人情况完善答案。`;
}

async function generateReviewAnswer(question) {
    return `【面试复盘分析】\n\n**问题：** "${question}"\n\n**考察要点：**\n• 核心能力和专业素养\n• 思维逻辑和表达能力\n• 与岗位的匹配度\n\n**回答建议：**\n• 结构化表达，逻辑清晰\n• 用具体案例支撑观点\n• 展现学习能力和成长潜力\n\n**改进方向：**\n• 提前准备相关问题模板\n• 练习表达的流畅度和自信度\n• 深入了解公司和岗位要求`;
}

async function processAIChat(message, context) {
    // 这里应该调用真实的AI API
    // 现在使用简单的规则匹配

    const responses = {
        '简历': '简历撰写要点：突出重点经历、量化工作成果、优化关键词、保持格式清晰、针对性调整。需要我帮您分析具体内容吗？',
        '面试': '面试准备建议：研究公司背景、准备常见问题、练习自我介绍、准备提问问题、注意仪表形象。有具体问题需要解答吗？',
        '薪资': '薪资谈判技巧：了解市场行情、展现个人价值、选择合适时机、保持专业态度、考虑综合福利。',
        '职业规划': '职业规划建议：明确短中长期目标、分析个人优劣势、了解行业发展趋势、制定具体行动计划、定期回顾调整。'
    };

    for (const [key, response] of Object.entries(responses)) {
        if (message.includes(key)) {
            return {
                content: response,
                type: 'text',
                timestamp: new Date().toISOString()
            };
        }
    }

    return {
        content: '感谢您的提问！我可以帮您管理面试安排、生成面试题目、提供求职建议。请告诉我您的具体需求。',
        type: 'text',
        timestamp: new Date().toISOString()
    };
}

// 静态文件服务
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 启动服务器
async function startServer() {
    await ensureDataDir();

    app.listen(PORT, () => {
        console.log(`\n🚀 秋招面试AI助手服务器已启动`);
        console.log(`📱 访问地址: http://localhost:${PORT}`);
        console.log(`📊 API文档: http://localhost:${PORT}/api`);
        console.log(`📂 数据目录: ${DATA_DIR}`);
        console.log(`\n按 Ctrl+C 停止服务器\n`);
    });
}

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 正在关闭服务器...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 正在关闭服务器...');
    process.exit(0);
});

if (require.main === module) {
    startServer().catch(console.error);
}

module.exports = app;