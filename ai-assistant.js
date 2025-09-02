// AI助手功能实现
class AIAssistant {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.chatHistory = [];
        this.pendingMessage = null;
        this.apiEndpoint = `${window.location.origin}/api/ai/qwen-chat`;
        this.apiKey = null; // 使用服务端环境变量，不在前端暴露
        this.init();
    }

    init() {
        this.initEventListeners();
        this.initSpeechRecognition();
        this.loadChatHistory();
        this.showWelcomeMessage();
        console.log('AI助手已初始化');
    }

    // 初始化事件监听器
    initEventListeners() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const voiceBtn = document.getElementById('voice-btn');

        // 发送消息
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // 回车发送
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // 输入时调整按钮状态
            chatInput.addEventListener('input', () => {
                this.updateSendButtonState();
            });
        }

        // 语音输入
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.toggleVoiceRecognition();
            });
        }

        // 监听数据变更
        document.addEventListener('dataChanged', (e) => {
            this.handleDataChange(e.detail);
        });
    }

    // 初始化语音识别
    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();

            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'zh-CN';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateVoiceButtonState();
                window.app.showMessage('正在听取语音...', 'info');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('chat-input').value = transcript;
                this.updateSendButtonState();
                window.app.showMessage('语音识别完成', 'success');
            };

            this.recognition.onerror = (event) => {
                console.error('语音识别错误:', event.error);
                window.app.showMessage('语音识别失败，请重试', 'error');
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateVoiceButtonState();
            };
        } else {
            console.warn('浏览器不支持语音识别');
        }
    }

    // 显示欢迎消息
    showWelcomeMessage() {
        if (this.chatHistory.length === 0) {
            const welcomeMessage = {
                type: 'ai',
                content: '您好！我是您的秋招面试助手。我可以帮您：\n\n• 添加和管理面试安排\n• 生成模拟面试题和答案\n• 总结真实面经和复盘分析\n• 回答秋招相关问题\n\n请告诉我您需要什么帮助？',
                timestamp: new Date().toISOString()
            };

            this.addMessageToChat(welcomeMessage);
        }
    }

    // 发送消息
    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();

        if (!message) return;

        // 添加用户消息到聊天
        const userMessage = {
            type: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };

        this.addMessageToChat(userMessage);
        this.chatHistory.push(userMessage);

        // 清空输入框
        chatInput.value = '';
        this.updateSendButtonState();

        // 显示AI思考状态
        this.showTypingIndicator();

        try {
            // 处理用户消息
            const response = await this.processUserMessage(message);

            // 添加AI回复到聊天
            const aiMessage = {
                type: 'ai',
                content: response.content,
                timestamp: new Date().toISOString(),
                actions: response.actions || []
            };

            this.addMessageToChat(aiMessage);
            this.chatHistory.push(aiMessage);

            // 执行相关操作
            if (response.actions && response.actions.length > 0) {
                await this.executeActions(response.actions);
            }

        } catch (error) {
            console.error('处理消息失败:', error);

            const errorMessage = {
                type: 'ai',
                content: '抱歉，我遇到了一些问题。请稍后再试，或者尝试重新描述您的需求。',
                timestamp: new Date().toISOString()
            };

            this.addMessageToChat(errorMessage);

        } finally {
            this.hideTypingIndicator();
            this.saveChatHistory();
        }
    }

    // 处理用户消息
    async processUserMessage(message) {
        // 意图识别
        const intent = this.identifyIntent(message);

        switch (intent.type) {
            case 'add_interview':
                return await this.handleAddInterview(message, intent);
            case 'delete_interview':
                return await this.handleDeleteInterview(message, intent);
            case 'add_question':
                return await this.handleAddQuestion(message, intent);
            case 'general_query':
                return await this.handleGeneralQuery(message);
            default:
                return await this.handleGeneralQuery(message);
        }
    }

    // 意图识别
    identifyIntent(message) {
        const lowerMessage = message.toLowerCase();

        // 添加面试相关关键词
        const addInterviewKeywords = ['添加面试', '新增面试', '面试安排', '面试时间', '有面试'];
        if (addInterviewKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return {
                type: 'add_interview',
                confidence: 0.9,
                entities: this.extractInterviewEntities(message)
            };
        }

        // 删除面试相关关键词
        const deleteInterviewKeywords = ['删除面试', '取消面试', '移除面试'];
        if (deleteInterviewKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return {
                type: 'delete_interview',
                confidence: 0.9,
                entities: this.extractInterviewEntities(message)
            };
        }

        // 添加面试题相关关键词
        const addQuestionKeywords = ['面试题', '面经', '面试官问了', '复盘', '刚面试'];
        if (addQuestionKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return {
                type: 'add_question',
                confidence: 0.8,
                entities: this.extractQuestionEntities(message)
            };
        }

        return {
            type: 'general_query',
            confidence: 0.5,
            entities: {}
        };
    }

    // 提取面试相关实体
    extractInterviewEntities(message) {
        const entities = {};

        // 提取公司名称（简单实现）
        const companyPatterns = [
            /(?:在|去|到)(.{2,10})(?:面试|公司)/g,
            /(.{2,10})(?:的面试|面试)/g
        ];

        companyPatterns.forEach(pattern => {
            const matches = message.match(pattern);
            if (matches) {
                entities.company = matches[0].replace(/面试|公司|的|在|去|到/g, '').trim();
            }
        });

        // 提取时间
        const timePatterns = [
            /(?:明天|后天|下周|这周|今天)/g,
            /\d{1,2}[点:：]\d{0,2}/g,
            /\d{1,2}月\d{1,2}[日号]/g,
            /\d{4}[-年]\d{1,2}[-月]\d{1,2}/g
        ];

        timePatterns.forEach(pattern => {
            const matches = message.match(pattern);
            if (matches) {
                entities.time = matches[0];
            }
        });

        // 提取职位
        const positionPatterns = [
            /(.{2,10})(?:岗位|职位|工程师|经理|专员)/g
        ];

        positionPatterns.forEach(pattern => {
            const matches = message.match(pattern);
            if (matches) {
                entities.position = matches[0];
            }
        });

        return entities;
    }

    // 提取问题相关实体
    extractQuestionEntities(message) {
        const entities = {};

        // 判断是否为真实面经
        const realQuestionIndicators = ['面试官问了', '刚面试', '今天面试', '面试中'];
        entities.isReal = realQuestionIndicators.some(indicator =>
            message.includes(indicator)
        );

        // 提取问题内容
        const questionMatch = message.match(/[问题内容：]["'"](.+)["'"]/);
        if (questionMatch) {
            entities.question = questionMatch[1];
        }

        return entities;
    }

    // 处理添加面试
    async handleAddInterview(message, intent) {
        const entities = intent.entities;

        // 如果信息不完整，要求用户补充
        if (!entities.company || !entities.time) {
            const missingInfo = [];
            if (!entities.company) missingInfo.push('公司名称');
            if (!entities.time) missingInfo.push('面试时间');

            return {
                content: `好的，我来帮您添加面试。请补充以下信息：${missingInfo.join('、')}`,
                actions: []
            };
        }

        // 解析时间
        const datetime = this.parseDateTime(entities.time);
        if (!datetime) {
            return {
                content: '抱歉，我无法理解这个时间格式。请使用类似"明天下午2点"或"6月15日14:00"的格式。',
                actions: []
            };
        }

        // 创建面试数据
        const interviewData = {
            company: entities.company,
            datetime: datetime.toISOString().slice(0, 16),
            position: entities.position || '',
            jobDescription: '',
            notes: `由AI助手自动添加于 ${new Date().toLocaleString()}`
        };

        try {
            const interview = window.dataManager.addInterview(interviewData);

            const actions = [{
                type: 'interview_added',
                data: interview
            }];

            return {
                content: `已成功为您添加面试：${entities.company} ${entities.position || ''}（${this.formatDateTime(datetime)}）。\n\n[点击查看详情](javascript:app.editInterview('${interview.id}'))`,
                actions: actions
            };

        } catch (error) {
            return {
                content: '添加面试时出现错误，请稍后重试。',
                actions: []
            };
        }
    }

    // 处理删除面试
    async handleDeleteInterview(message, intent) {
        const entities = intent.entities;

        if (!entities.company && !entities.time) {
            return {
                content: '请告诉我要删除哪家公司的面试，或者具体的面试时间。',
                actions: []
            };
        }

        // 查找匹配的面试
        const interviews = window.dataManager.getAllInterviews();
        let matchedInterviews = [];

        if (entities.company) {
            matchedInterviews = interviews.filter(interview =>
                interview.company.includes(entities.company)
            );
        }

        if (entities.time) {
            const targetDate = this.parseDateTime(entities.time);
            if (targetDate) {
                const dateStr = targetDate.toISOString().slice(0, 10);
                matchedInterviews = matchedInterviews.length > 0 ?
                    matchedInterviews.filter(interview =>
                        interview.datetime.startsWith(dateStr)
                    ) :
                    interviews.filter(interview =>
                        interview.datetime.startsWith(dateStr)
                    );
            }
        }

        if (matchedInterviews.length === 0) {
            return {
                content: '没有找到匹配的面试记录。',
                actions: []
            };
        } else if (matchedInterviews.length === 1) {
            const interview = matchedInterviews[0];
            window.dataManager.deleteInterview(interview.id);

            return {
                content: `已删除面试：${interview.company} ${interview.position || ''}`,
                actions: [{
                    type: 'interview_deleted',
                    data: interview
                }]
            };
        } else {
            const list = matchedInterviews.map((interview, index) =>
                `${index + 1}. ${interview.company} ${interview.position || ''} (${this.formatDateTime(new Date(interview.datetime))})`
            ).join('\n');

            return {
                content: `找到多条匹配的面试记录：\n${list}\n\n请提供更具体的信息来确定要删除哪一条。`,
                actions: []
            };
        }
    }

    // 处理添加面试题
    async handleAddQuestion(message, intent) {
        const entities = intent.entities;

        // 获取最近的面试或让用户选择
        const recentInterviews = window.dataManager.getAllInterviews()
            .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
            .slice(0, 3);

        if (recentInterviews.length === 0) {
            return {
                content: '您还没有面试记录。请先添加面试安排。',
                actions: []
            };
        }

        // 如果只有一个面试，直接添加到该面试
        let targetInterview = recentInterviews[0];

        // 生成问题内容
        const questionText = entities.question || message;
        const isReal = entities.isReal;

        try {
            let response;
            if (isReal) {
                // 添加真实面经
                const question = {
                    question: questionText,
                    answer: '',
                    feedback: ''
                };

                window.dataManager.addRealQuestion(targetInterview.id, question);

                // 生成复盘答案
                const reviewAnswer = await this.generateReviewAnswer(questionText);
                question.answer = reviewAnswer;

                response = {
                    content: `已为您添加真实面经到 ${targetInterview.company} 的面试记录，并生成了复盘答案。\n\n[点击查看完整复盘](javascript:app.editInterview('${targetInterview.id}'))`,
                    actions: [{
                        type: 'question_added',
                        data: { interview: targetInterview, question, type: 'real' }
                    }]
                };
            } else {
                // 添加模拟面试题
                const question = {
                    question: questionText,
                    answer: ''
                };

                window.dataManager.addMockQuestion(targetInterview.id, question);

                // 生成模拟答案
                const mockAnswer = await this.generateMockAnswer(questionText, targetInterview.jobDescription);
                question.answer = mockAnswer;

                response = {
                    content: `已为您添加模拟面试题到 ${targetInterview.company} 的面试记录，并生成了参考答案。\n\n[点击查看详情](javascript:app.editInterview('${targetInterview.id}'))`,
                    actions: [{
                        type: 'question_added',
                        data: { interview: targetInterview, question, type: 'mock' }
                    }]
                };
            }

            return response;

        } catch (error) {
            console.error('添加面试题失败:', error);
            return {
                content: '添加面试题时出现错误，请稍后重试。',
                actions: []
            };
        }
    }

    // 处理一般问询
    async handleGeneralQuery(message) {
        try {
            // 调用后端Qwen代理
            const response = await this.callQwenAPI(message);
            return {
                content: response,
                actions: []
            };
        } catch (error) {
            console.error('调用Qwen API失败:', error);
            return {
                content: this.getLocalResponse(message),
                actions: []
            };
        }
    }

    // 调用Qwen API（模拟实现）
    async callQwenAPI(message) {
        try {
            const resp = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history: this.chatHistory })
            });
            if (!resp.ok) {
                throw new Error('Qwen 代理请求失败');
            }
            const data = await resp.json();
            if (data.success && data.data?.content) {
                return data.data.content;
            }
            // 回退
            return this.getLocalResponse(message);
        } catch (e) {
            console.error('调用Qwen失败，使用本地回退:', e);
            return this.getLocalResponse(message);
        }
    }

    // 获取本地回复（模拟AI回复）
    getLocalResponse(message) {
        const responses = {
            '简历': '关于简历撰写，建议您：\n\n1. **突出重点**：将最相关的经历放在前面\n2. **量化成果**：用具体数字体现您的贡献\n3. **关键词优化**：包含岗位要求的技能关键词\n4. **格式清晰**：使用简洁的格式，便于阅读\n5. **定制化**：针对不同公司和岗位调整内容\n\n需要我帮您分析具体的简历内容吗？',

            '面试技巧': '面试成功的关键技巧：\n\n**准备阶段**\n• 深入研究目标公司和岗位\n• 准备常见问题的回答\n• 练习自我介绍和项目介绍\n\n**面试过程**\n• 保持自信和专业形象\n• 用STAR法则回答行为问题\n• 主动提问展现对公司的兴趣\n\n**收尾阶段**\n• 总结自己的优势\n• 询问下一步流程\n• 及时发送感谢邮件',

            '薪资谈判': '薪资谈判建议：\n\n1. **做好调研**：了解行业和地区薪资水平\n2. **展现价值**：强调您能为公司带来的价值\n3. **灵活谈判**：除了基本工资，考虑其他福利\n4. **时机把握**：在收到offer后再谈具体薪资\n5. **态度诚恳**：保持专业和合作的态度\n\n记住，薪资谈判是双向的，要找到双方都满意的平衡点。',

            '职业规划': '职业规划思路：\n\n**短期目标（1-2年）**\n• 快速适应工作环境\n• 掌握核心技能\n• 建立职场人脉\n\n**中期目标（3-5年）**\n• 成为某个领域的专家\n• 承担更多责任\n• 考虑纵向或横向发展\n\n**长期目标（5年以上）**\n• 明确自己的职业方向\n• 培养领导能力\n• 考虑创业或转行机会\n\n建议定期回顾和调整您的职业规划。'
        };

        // 简单关键词匹配
        for (const [key, response] of Object.entries(responses)) {
            if (message.includes(key)) {
                return response;
            }
        }

        // 默认回复
        return '感谢您的提问！作为您的面试助手，我可以帮您：\n\n• 管理面试安排和时间\n• 生成针对性的面试题目\n• 提供面试技巧和建议\n• 协助进行面试复盘\n\n如果您有具体的面试相关问题，请随时告诉我。我会尽力为您提供专业的建议和帮助。';
    }

    // 生成模拟答案
    async generateMockAnswer(question, jobDescription) {
        // 这里应该调用AI API来生成更智能的答案
        await new Promise(resolve => setTimeout(resolve, 500));

        const mockAnswers = {
            '自我介绍': '我是一名充满热情的应届毕业生，主修[专业名称]。在校期间，我参与了多个项目，包括[具体项目]，在其中担任[角色]，积累了[相关技能]的经验。我的优势是[个人优势]，我选择贵公司是因为[选择原因]。我希望能在这个岗位上发挥我的专长，为公司创造价值的同时实现个人成长。',

            '项目经历': '在[项目名称]项目中，我担任[角色]，主要负责[具体职责]。项目的目标是[项目目标]，我们团队采用了[技术方案/方法]来解决问题。在实施过程中，我遇到了[具体挑战]，通过[解决方案]成功解决了这个问题。最终项目取得了[具体成果]，我从中学到了[收获]。',

            '优势': '我的主要优势包括：1）[技术优势]：具备扎实的专业基础和快速学习能力；2）[软技能优势]：良好的沟通协作能力和团队合作精神；3）[个人特质]：强烈的责任心和持续改进的态度。这些优势使我能够快速适应工作环境并为团队带来价值。'
        };

        for (const [key, value] of Object.entries(mockAnswers)) {
            if (question.includes(key)) {
                return value;
            }
        }

        return `针对"${question}"这个问题，建议从以下角度回答：\n\n1. 结合具体实例进行说明\n2. 突出与岗位相关的技能和经验\n3. 展现个人的思考深度和独特见解\n4. 与公司文化和岗位要求建立连接\n\n请根据自己的实际情况完善答案内容。`;
    }

    // 生成复盘答案
    async generateReviewAnswer(realQuestion) {
        await new Promise(resolve => setTimeout(resolve, 800));

        return `【面试复盘分析】\n\n**问题：** "${realQuestion}"\n\n**分析要点：**\n1. 这道题主要考察的核心能力和素质\n2. 面试官期望听到的关键信息\n3. 优秀回答应该包含的要素\n\n**改进建议：**\n1. 结构化回答，逻辑清晰\n2. 用具体案例支撑观点\n3. 展现深度思考和学习能力\n4. 注意表达的自信和专业度\n\n**下次优化：**\n建议针对此类问题准备一个回答框架，结合个人经历进行个性化调整。`;
    }

    // 解析日期时间
    parseDateTime(timeStr) {
        const now = new Date();

        // 处理相对时间
        if (timeStr.includes('明天')) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return this.parseTimeFromString(timeStr, tomorrow);
        } else if (timeStr.includes('后天')) {
            const dayAfterTomorrow = new Date(now);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
            return this.parseTimeFromString(timeStr, dayAfterTomorrow);
        } else if (timeStr.includes('下周')) {
            const nextWeek = new Date(now);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return this.parseTimeFromString(timeStr, nextWeek);
        }

        // 处理具体日期
        const datePatterns = [
            /(\d{1,2})月(\d{1,2})[日号]/,
            /(\d{4})[-年](\d{1,2})[-月](\d{1,2})/
        ];

        for (const pattern of datePatterns) {
            const match = timeStr.match(pattern);
            if (match) {
                let year, month, day;
                if (pattern.source.includes('年')) {
                    [, year, month, day] = match;
                } else {
                    month = match[1];
                    day = match[2];
                    year = now.getFullYear();
                }

                const date = new Date(year, month - 1, day);
                return this.parseTimeFromString(timeStr, date);
            }
        }

        return null;
    }

    // 从字符串中解析时间
    parseTimeFromString(timeStr, baseDate) {
        const timePatterns = [
            /(\d{1,2})[点:：](\d{0,2})/,
            /(\d{1,2})[点:：]/,
            /上午|早上/,
            /下午|晚上/
        ];

        let hour = 10; // 默认上午10点
        let minute = 0;

        // 解析小时和分钟
        const timeMatch = timeStr.match(/(\d{1,2})[点:：](\d{0,2})/);
        if (timeMatch) {
            hour = parseInt(timeMatch[1]);
            minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        }

        // 处理上下午
        if (timeStr.includes('下午') || timeStr.includes('晚上')) {
            if (hour < 12) hour += 12;
        } else if (timeStr.includes('上午') || timeStr.includes('早上')) {
            if (hour === 12) hour = 0;
        }

        const result = new Date(baseDate);
        result.setHours(hour, minute, 0, 0);

        return result;
    }

    // 格式化日期时间
    formatDateTime(date) {
        return date.toLocaleString('zh-CN', {
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'long'
        });
    }

    // 执行操作
    async executeActions(actions) {
        for (const action of actions) {
            switch (action.type) {
                case 'interview_added':
                case 'interview_deleted':
                case 'question_added':
                    this.showOperationResult(action);
                    break;
            }
        }
    }

    // 显示操作结果
    showOperationResult(action) {
        const messagesContainer = document.getElementById('chat-messages');
        const syncNotice = document.createElement('div');
        syncNotice.className = 'sync-notice';
        syncNotice.textContent = '操作已同步至日历和面试记录';

        messagesContainer.appendChild(syncNotice);
        this.scrollToBottom();
    }

    // 添加消息到聊天
    addMessageToChat(message) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // 处理消息内容
        const content = this.formatMessageContent(message.content);
        contentDiv.innerHTML = content;

        messageDiv.appendChild(contentDiv);

        // 添加操作链接
        if (message.actions && message.actions.length > 0) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';

            message.actions.forEach(action => {
                const link = document.createElement('a');
                link.className = 'operation-link';
                link.href = '#';
                link.textContent = this.getActionLinkText(action);
                link.onclick = (e) => {
                    e.preventDefault();
                    this.handleActionClick(action);
                };

                actionsDiv.appendChild(link);
            });

            messageDiv.appendChild(actionsDiv);
        }

        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    // 格式化消息内容
    formatMessageContent(content) {
        // 处理换行
        content = content.replace(/\n/g, '<br>');

        // 处理列表
        content = content.replace(/^[•·]/gm, '&bull;');

        // 处理链接
        content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="operation-link">$1</a>');

        return content;
    }

    // 获取操作链接文本
    getActionLinkText(action) {
        switch (action.type) {
            case 'interview_added':
                return '查看面试详情';
            case 'interview_deleted':
                return '撤销删除';
            case 'question_added':
                return '查看完整内容';
            default:
                return '查看详情';
        }
    }

    // 处理操作点击
    handleActionClick(action) {
        switch (action.type) {
            case 'interview_added':
            case 'question_added':
                if (action.data.interview) {
                    window.app.editInterview(action.data.interview.id);
                }
                break;
            case 'interview_deleted':
                // 重新添加已删除的面试
                window.dataManager.addInterview(action.data);
                window.app.showMessage('面试已恢复', 'success');
                break;
        }
    }

    // 显示输入状态指示器
    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message typing-indicator';
        typingDiv.id = 'typing-indicator';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = '<div class="loading"></div> AI助手正在思考...';

        typingDiv.appendChild(contentDiv);
        messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    // 隐藏输入状态指示器
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // 切换语音识别
    toggleVoiceRecognition() {
        if (!this.recognition) {
            window.app.showMessage('您的浏览器不支持语音识别', 'warning');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    // 更新语音按钮状态
    updateVoiceButtonState() {
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            if (this.isListening) {
                voiceBtn.classList.add('active');
                voiceBtn.title = '停止录音';
            } else {
                voiceBtn.classList.remove('active');
                voiceBtn.title = '语音输入';
            }
        }
    }

    // 更新发送按钮状态
    updateSendButtonState() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');

        if (chatInput && sendBtn) {
            const hasContent = chatInput.value.trim().length > 0;
            sendBtn.disabled = !hasContent;
        }
    }

    // 滚动到底部
    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // 加载聊天历史
    loadChatHistory() {
        try {
            const history = localStorage.getItem('chatHistory');
            if (history) {
                this.chatHistory = JSON.parse(history);
                this.chatHistory.forEach(message => {
                    this.addMessageToChat(message);
                });
            }
        } catch (error) {
            console.error('加载聊天历史失败:', error);
        }
    }

    // 保存聊天历史
    saveChatHistory() {
        try {
            // 只保存最近50条消息
            const recentHistory = this.chatHistory.slice(-50);
            localStorage.setItem('chatHistory', JSON.stringify(recentHistory));
        } catch (error) {
            console.error('保存聊天历史失败:', error);
        }
    }

    // 清空聊天历史
    clearChatHistory() {
        this.chatHistory = [];
        localStorage.removeItem('chatHistory');

        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }

        this.showWelcomeMessage();
    }

    // 聚焦输入框
    focus() {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.focus();
        }
    }

    // 处理数据变更
    handleDataChange(detail) {
        // 当数据发生变更时，可以在这里添加相应的处理逻辑
        console.log('AI助手收到数据变更通知:', detail);
    }

    // 导出聊天记录
    exportChatHistory() {
        const data = {
            chatHistory: this.chatHistory,
            exportTime: new Date().toISOString(),
            version: '1.0'
        };

        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `AI助手聊天记录_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 创建全局AI助手实例
window.aiAssistant = new AIAssistant();