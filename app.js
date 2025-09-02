// 主应用逻辑
class App {
    constructor() {
        this.currentTab = 'calendar';
        this.currentInterview = null;
        this.init();
    }

    applySavedTheme() {
        try {
            const saved = localStorage.getItem('theme');
            if (saved === 'dark') {
                document.body.classList.add('dark');
                const themeToggle = document.getElementById('theme-toggle');
                if (themeToggle) {
                    const icon = themeToggle.querySelector('i');
                    if (icon) icon.className = 'fas fa-sun';
                }
            }
        } catch (e) {
            // ignore
        }
    }

    init() {
        this.initEventListeners();
        this.initModals();
        this.showTab('calendar');
        this.applySavedTheme();

        // 监听数据变更事件
        document.addEventListener('dataChanged', (e) => {
            this.handleDataChange(e.detail);
        });

        // 页面完全加载后刷新日历显示
        window.addEventListener('load', () => {
            setTimeout(() => {
                if (window.calendar && this.currentTab === 'calendar') {
                    window.calendar.loadInterviews();
                    window.calendar.refresh();
                }
            }, 200);
        });

        console.log('秋招面试AI助手已启动');
    }

    // 初始化事件监听器
    initEventListeners() {
        // 导航标签切换
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.showTab(tabName);
            });
        });

        // 顶部搜索
        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const keyword = globalSearch.value.trim();
                    this.openListModalForSearch(keyword);
                }
            });
        }

        // 主题切换
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark');
                const icon = themeToggle.querySelector('i');
                if (document.body.classList.contains('dark')) {
                    icon.className = 'fas fa-sun';
                    localStorage.setItem('theme', 'dark');
                } else {
                    icon.className = 'fas fa-moon';
                    localStorage.setItem('theme', 'light');
                }
            });
        }

        // 添加面试按钮
        const addInterviewBtn = document.getElementById('add-interview-btn');
        if (addInterviewBtn) {
            addInterviewBtn.addEventListener('click', () => {
                this.showAddInterviewModal();
            });
        }

        // （已移除浮动添加按钮）

        // 今日按钮
        const todayBtn = document.getElementById('today-btn');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                if (window.calendar) {
                    window.calendar.goToToday();
                }
            });
        }

        // 下一场面试
        const nextInterviewBtn = document.getElementById('next-interview-btn');
        if (nextInterviewBtn) {
            nextInterviewBtn.addEventListener('click', () => {
                if (window.calendar) {
                    const next = window.calendar.goToNextInterview();
                    if (!next) {
                        this.showMessage('没有找到后续面试', 'info');
                    }
                }
            });
        }

        // 保存面试按钮
        const saveInterviewBtn = document.getElementById('save-interview');
        if (saveInterviewBtn) {
            saveInterviewBtn.addEventListener('click', () => {
                this.saveCurrentInterview();
            });
        }

        // 返回按钮
        const cancelInterviewBtn = document.getElementById('cancel-interview');
        if (cancelInterviewBtn) {
            cancelInterviewBtn.addEventListener('click', () => {
                this.showTab('calendar');
            });
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });

        // 表单自动保存
        this.initAutoSave();
    }

    // 初始化模态框
    initModals() {
        // 添加面试模态框
        const interviewModal = document.getElementById('interview-modal');
        const closeModalBtn = document.getElementById('close-modal');
        const modalCancelBtn = document.getElementById('modal-cancel');
        const modalSaveBtn = document.getElementById('modal-save');

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.hideModal('interview-modal');
            });
        }

        if (modalCancelBtn) {
            modalCancelBtn.addEventListener('click', () => {
                this.hideModal('interview-modal');
            });
        }

        if (modalSaveBtn) {
            modalSaveBtn.addEventListener('click', () => {
                this.saveQuickInterview();
            });
        }

        // 确认删除模态框
        const confirmModal = document.getElementById('confirm-modal');
        const confirmCancelBtn = document.getElementById('confirm-cancel');
        const confirmDeleteBtn = document.getElementById('confirm-delete');

        if (confirmCancelBtn) {
            confirmCancelBtn.addEventListener('click', () => {
                this.hideModal('confirm-modal');
            });
        }

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.confirmDelete();
            });
        }

        // 点击模态框外部关闭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });

        // 列表模态框按钮
        const listModalClose = document.getElementById('list-modal-close');
        const listModalCancel = document.getElementById('list-modal-cancel');
        if (listModalClose) listModalClose.addEventListener('click', () => this.hideModal('list-modal'));
        if (listModalCancel) listModalCancel.addEventListener('click', () => this.hideModal('list-modal'));
    }

    // 显示标签页
    showTab(tabName) {
        // 更新导航状态
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 更新内容区域
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;

        // 初始化对应的功能模块
        switch (tabName) {
            case 'calendar':
                if (window.calendar) {
                    window.calendar.loadInterviews();
                    window.calendar.refresh();
                }
                break;
            case 'interview':
                this.initInterviewForm();
                break;
            case 'ai-assistant':
                if (window.aiAssistant) {
                    window.aiAssistant.focus();
                }
                break;
        }
    }

    // 供外部链接调用（例如 AI 消息中的查看链接）


    // 显示添加面试模态框
    showAddInterviewModal() {
        const modal = document.getElementById('interview-modal');
        const form = document.getElementById('quick-interview-form');

        // 重置表单
        form.reset();

        // 设置默认时间为当前时间
        const now = new Date();
        const isoString = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16);
        document.getElementById('modal-datetime').value = isoString;

        this.showModal('interview-modal');
    }

    // 列表模态：搜索结果或某日全部面试
    openListModalForSearch(keyword) {
        const titleEl = document.getElementById('list-modal-title');
        const container = document.getElementById('list-modal-container');
        if (!titleEl || !container) return;

        if (!keyword) {
            titleEl.textContent = '全部面试';
            const list = window.dataManager.getAllInterviews();
            this.renderInterviewList(container, list);
        } else {
            titleEl.textContent = `搜索结果：${keyword}`;
            const list = window.dataManager.searchInterviews(keyword);
            this.renderInterviewList(container, list);
        }

        this.showModal('list-modal');
    }

    showAllInterviews(dateStr) {
        const titleEl = document.getElementById('list-modal-title');
        const container = document.getElementById('list-modal-container');
        if (!titleEl || !container) return;
        titleEl.textContent = `${dateStr} 的全部面试`;
        const list = window.dataManager.getInterviewsByDate(new Date(dateStr));
        this.renderInterviewList(container, list);
        this.showModal('list-modal');
    }

    renderInterviewList(container, list) {
        container.innerHTML = '';
        if (!list || list.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'list-empty';
            empty.textContent = '没有找到相关面试记录';
            container.appendChild(empty);
            return;
        }

        list
            .slice()
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
            .forEach(item => {
                const el = document.createElement('div');
                el.className = 'list-item';
                const time = new Date(item.datetime);
                const dateStr = time.toLocaleDateString('zh-CN');
                const hm = time.toTimeString().slice(0, 5);
                el.innerHTML = `
                    <div>
                        <h4>${item.company} ${item.position || ''}</h4>
                        <p><i class="fas fa-clock"></i> ${dateStr} ${hm}</p>
                    </div>
                    <div class="interview-actions">
                        <button class="btn btn-edit" title="编辑"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-delete" title="删除"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                el.querySelector('.btn-edit').addEventListener('click', () => {
                    this.hideModal('list-modal');
                    this.editInterview(item.id);
                });
                el.querySelector('.btn-delete').addEventListener('click', () => {
                    this.hideModal('list-modal');
                    if (window.calendar) window.calendar.deleteInterview(item.id);
                });
                container.appendChild(el);
            });
    }

    // 显示模态框
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    // 隐藏模态框
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // 保存快速添加的面试
    saveQuickInterview() {
        const form = document.getElementById('quick-interview-form');
        const formData = new FormData(form);

        const company = document.getElementById('modal-company').value.trim();
        const datetime = document.getElementById('modal-datetime').value;
        const position = document.getElementById('modal-position').value.trim();

        if (!company || !datetime) {
            this.showMessage('请填写公司名称和面试时间', 'error');
            return;
        }

        const interviewData = {
            company,
            datetime,
            position,
            jobDescription: '',
            notes: '',
            mockQuestions: [],
            realQuestions: []
        };

        const interview = window.dataManager.addInterview(interviewData);

        if (interview) {
            this.hideModal('interview-modal');
            this.showMessage('面试添加成功', 'success');

            // 刷新日历显示
            if (window.calendar) {
                window.calendar.refresh();
            }

            // 切换到面试详情页面
            this.editInterview(interview.id);
        } else {
            this.showMessage('添加面试失败', 'error');
        }
    }

    // 编辑面试
    editInterview(interviewId) {
        const interview = window.dataManager.getInterviewById(interviewId);
        if (interview) {
            this.currentInterview = interview;
            this.loadInterviewToForm(interview);
            this.showTab('interview');
        }
    }

    // 将面试数据加载到表单
    loadInterviewToForm(interview) {
        document.getElementById('company-name').value = interview.company || '';
        document.getElementById('interview-datetime').value = interview.datetime || '';
        document.getElementById('job-description').value = interview.jobDescription || '';
        document.getElementById('notes').value = interview.notes || '';

        // 更新字符计数
        this.updateCharCount();

        // 加载模拟面试题
        this.loadMockQuestions(interview.mockQuestions || []);

        // 加载真实面经
        this.loadRealQuestions(interview.realQuestions || []);
    }

    // 加载模拟面试题
    loadMockQuestions(questions) {
        const container = document.getElementById('mock-questions-container');
        container.innerHTML = '';

        questions.forEach(question => {
            this.addQuestionItem(container, question, 'mock');
        });
    }

    // 加载真实面经
    loadRealQuestions(questions) {
        const container = document.getElementById('real-questions-container');
        container.innerHTML = '';

        questions.forEach(question => {
            this.addQuestionItem(container, question, 'real');
        });
    }

    // 添加面试题项目
    addQuestionItem(container, question, type) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.dataset.questionId = question.id;

        const isReal = type === 'real';

        questionDiv.innerHTML = `
            <div class="question-header">
                <span class="question-title">${isReal ? '真实面经' : '模拟面试题'}</span>
                <div class="question-actions">
                    <button type="button" class="btn-edit" onclick="app.editQuestion('${question.id}', '${type}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn-delete" onclick="app.deleteQuestion('${question.id}', '${type}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="question-content">
                <div class="question-pair">
                    <div class="question-group">
                        <label class="question-label">${isReal ? '真实问题' : '模拟问题'}</label>
                        <textarea class="question-input" data-field="question" placeholder="请输入面试问题...">${question.question || ''}</textarea>
                    </div>
                    <div class="question-group">
                        <label class="question-label">${isReal ? '复盘答案' : '模拟答案'}</label>
                        <textarea class="answer-input" data-field="answer" placeholder="请输入答案...">${question.answer || ''}</textarea>
                        ${!isReal ? `<button type="button" class="btn btn-generate" onclick="app.generateAnswer('${question.id}')">生成AI答案</button>` :
                `<button type="button" class="btn btn-generate" onclick="app.generateReview('${question.id}')">根据真实面经生成复盘</button>`}
                    </div>
                </div>
                ${isReal ? `
                    <div class="question-group">
                        <label class="question-label">反馈建议</label>
                        <textarea class="feedback-input" data-field="feedback" placeholder="请输入面试反馈和改进建议...">${question.feedback || ''}</textarea>
                    </div>
                ` : ''}
            </div>
        `;

        container.appendChild(questionDiv);

        // 添加输入事件监听器
        this.addQuestionEventListeners(questionDiv);
    }

    // 为面试题添加事件监听器
    addQuestionEventListeners(questionDiv) {
        const inputs = questionDiv.querySelectorAll('textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.saveQuestionChanges(questionDiv);
            });
        });
    }

    // 保存面试题变更
    saveQuestionChanges(questionDiv) {
        if (!this.currentInterview) return;

        const questionId = questionDiv.dataset.questionId;
        const question = questionDiv.querySelector('[data-field="question"]').value;
        const answer = questionDiv.querySelector('[data-field="answer"]').value;
        const feedbackInput = questionDiv.querySelector('[data-field="feedback"]');
        const feedback = feedbackInput ? feedbackInput.value : '';

        // 更新内存中的数据
        const mockQuestion = this.currentInterview.mockQuestions.find(q => q.id === questionId);
        const realQuestion = this.currentInterview.realQuestions.find(q => q.id === questionId);

        if (mockQuestion) {
            mockQuestion.question = question;
            mockQuestion.answer = answer;
        } else if (realQuestion) {
            realQuestion.question = question;
            realQuestion.answer = answer;
            realQuestion.feedback = feedback;
        }

        // 保存到数据管理器
        window.dataManager.updateInterview(this.currentInterview.id, this.currentInterview);
    }

    // 初始化面试表单
    initInterviewForm() {
        // 添加模拟题按钮
        const addMockBtn = document.getElementById('add-mock-question');
        if (addMockBtn) {
            addMockBtn.onclick = () => this.addNewQuestion('mock');
        }

        // 添加真实面经按钮
        const addRealBtn = document.getElementById('add-real-question');
        if (addRealBtn) {
            addRealBtn.onclick = () => this.addNewQuestion('real');
        }

        // 字符计数
        const jdTextarea = document.getElementById('job-description');
        if (jdTextarea) {
            jdTextarea.addEventListener('input', () => {
                this.updateCharCount();
            });
        }

        // 如果没有当前面试，创建新面试
        if (!this.currentInterview) {
            this.createNewInterview();
        }
    }

    // 创建新面试
    createNewInterview() {
        this.currentInterview = {
            id: null,
            company: '',
            datetime: '',
            position: '',
            jobDescription: '',
            notes: '',
            mockQuestions: [],
            realQuestions: []
        };
        this.loadInterviewToForm(this.currentInterview);
    }

    // 添加新问题
    addNewQuestion(type) {
        if (!this.currentInterview) return;

        const newQuestion = {
            id: window.dataManager.generateId(),
            question: '',
            answer: '',
            feedback: type === 'real' ? '' : undefined,
            createdAt: new Date().toISOString()
        };

        const container = document.getElementById(`${type}-questions-container`);
        this.addQuestionItem(container, newQuestion, type);

        // 添加到当前面试数据
        if (type === 'mock') {
            this.currentInterview.mockQuestions.push(newQuestion);
        } else {
            this.currentInterview.realQuestions.push(newQuestion);
        }
    }

    // 删除问题
    deleteQuestion(questionId, type) {
        this.showConfirmDialog(
            `确定要删除这道${type === 'mock' ? '模拟面试题' : '真实面经'}吗？`,
            () => {
                if (!this.currentInterview) return;

                // 从界面移除
                const questionDiv = document.querySelector(`[data-question-id="${questionId}"]`);
                if (questionDiv) {
                    questionDiv.remove();
                }

                // 从数据中移除
                if (type === 'mock') {
                    const index = this.currentInterview.mockQuestions.findIndex(q => q.id === questionId);
                    if (index !== -1) {
                        this.currentInterview.mockQuestions.splice(index, 1);
                    }
                } else {
                    const index = this.currentInterview.realQuestions.findIndex(q => q.id === questionId);
                    if (index !== -1) {
                        this.currentInterview.realQuestions.splice(index, 1);
                    }
                }

                // 保存变更
                if (this.currentInterview.id) {
                    window.dataManager.updateInterview(this.currentInterview.id, this.currentInterview);
                }
            }
        );
    }

    // 生成AI答案
    async generateAnswer(questionId) {
        const questionDiv = document.querySelector(`[data-question-id="${questionId}"]`);
        const questionText = questionDiv.querySelector('[data-field="question"]').value;

        if (!questionText.trim()) {
            this.showMessage('请先输入问题内容', 'warning');
            return;
        }

        const answerTextarea = questionDiv.querySelector('[data-field="answer"]');
        const generateBtn = questionDiv.querySelector('.btn-generate');

        // 显示加载状态
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<div class="loading"></div> 生成中...';

        try {
            // 模拟AI生成答案
            await new Promise(resolve => setTimeout(resolve, 2000));

            const aiAnswer = await this.callAIForAnswer(questionText, this.currentInterview.jobDescription);
            answerTextarea.value = aiAnswer;

            // 保存变更
            this.saveQuestionChanges(questionDiv);

            this.showMessage('AI答案生成成功', 'success');
        } catch (error) {
            this.showMessage('生成答案失败，请重试', 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '生成AI答案';
        }
    }

    // 生成复盘
    async generateReview(questionId) {
        const questionDiv = document.querySelector(`[data-question-id="${questionId}"]`);
        const questionText = questionDiv.querySelector('[data-field="question"]').value;

        if (!questionText.trim()) {
            this.showMessage('请先输入真实面经内容', 'warning');
            return;
        }

        const answerTextarea = questionDiv.querySelector('[data-field="answer"]');
        const generateBtn = questionDiv.querySelector('.btn-generate');

        // 显示加载状态
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<div class="loading"></div> 生成中...';

        try {
            // 模拟AI生成复盘
            await new Promise(resolve => setTimeout(resolve, 2000));

            const aiReview = await this.callAIForReview(questionText);
            answerTextarea.value = aiReview;

            // 保存变更
            this.saveQuestionChanges(questionDiv);

            this.showMessage('复盘答案生成成功', 'success');
        } catch (error) {
            this.showMessage('生成复盘失败，请重试', 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '根据真实面经生成复盘';
        }
    }

    // 调用AI生成答案（模拟实现）
    async callAIForAnswer(question, jobDescription) {
        // 这里应该调用真实的AI API，现在先返回模拟内容
        const mockAnswers = {
            "请介绍你的项目经历": "我在大学期间主要参与了两个重要项目。第一个是开发了一个校园二手交易平台，使用Vue.js和Spring Boot技术栈，用户量达到了2000+。第二个项目是参与了智能推荐系统的开发，主要负责前端交互设计和数据可视化模块，该项目获得了校级创新大赛一等奖。在这些项目中，我不仅提升了技术能力，还学会了团队协作和项目管理。",
            "为什么选择我们公司": "我选择贵公司主要基于三个方面：首先，贵公司在行业中的技术实力和创新能力都非常突出；其次，公司的企业文化和价值观与我的个人理念高度契合；最后，这个岗位能够充分发挥我的专业技能，同时为我提供良好的成长平台和发展空间。",
            "你的优势是什么": "我的主要优势包括：1）扎实的技术基础和快速学习能力，能够迅速适应新技术和新环境；2）良好的沟通协调能力，善于团队合作；3）强烈的责任心和执行力，能够保质保量完成任务；4）具备一定的创新思维，能够提出优化方案。"
        };

        // 简单匹配或返回通用答案
        for (const [key, value] of Object.entries(mockAnswers)) {
            if (question.includes(key.substring(0, 4))) {
                return value;
            }
        }

        return `针对"${question}"这个问题，建议从以下几个角度回答：\n\n1. 结合具体实例说明\n2. 展示相关技能和经验\n3. 体现个人特色和优势\n4. 与岗位要求建立连接\n\n建议您根据自己的实际情况完善答案内容。`;
    }

    // 调用AI生成复盘（模拟实现）
    async callAIForReview(realQuestion) {
        return `【面试复盘分析】\n\n问题："${realQuestion}"\n\n【分析要点】\n1. 这道题主要考察的核心能力\n2. 标准回答思路和框架\n3. 可能的加分项和注意事项\n\n【改进建议】\n1. 回答要更加结构化\n2. 增加具体案例支撑\n3. 体现个人思考深度\n\n【下次优化方向】\n建议提前准备类似问题的回答模板，并结合自身经历进行个性化调整。`;
    }

    // 保存当前面试
    saveCurrentInterview() {
        if (!this.currentInterview) return;

        const company = document.getElementById('company-name').value.trim();
        const datetime = document.getElementById('interview-datetime').value;

        if (!company || !datetime) {
            this.showMessage('请填写公司名称和面试时间', 'error');
            return;
        }

        const interviewData = {
            company,
            datetime,
            position: document.getElementById('job-description').value.split('\n')[0] || '', // 从JD中提取职位
            jobDescription: document.getElementById('job-description').value.trim(),
            notes: document.getElementById('notes').value.trim(),
            mockQuestions: this.currentInterview.mockQuestions,
            realQuestions: this.currentInterview.realQuestions
        };

        let savedInterview;
        if (this.currentInterview.id) {
            // 更新现有面试
            savedInterview = window.dataManager.updateInterview(this.currentInterview.id, interviewData);
        } else {
            // 创建新面试
            savedInterview = window.dataManager.addInterview(interviewData);
            this.currentInterview.id = savedInterview.id;
        }

        if (savedInterview) {
            this.showMessage('面试信息保存成功', 'success');
        } else {
            this.showMessage('保存失败，请重试', 'error');
        }
    }

    // 更新字符计数
    updateCharCount() {
        const textarea = document.getElementById('job-description');
        const counter = document.getElementById('jd-char-count');
        if (textarea && counter) {
            counter.textContent = textarea.value.length;
        }
    }

    // 初始化自动保存
    initAutoSave() {
        let saveTimeout;

        // 监听表单输入
        document.addEventListener('input', (e) => {
            if (e.target.closest('#interview-form')) {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    if (this.currentTab === 'interview' && this.currentInterview && this.currentInterview.id) {
                        this.saveCurrentInterview();
                    }
                }, 3000); // 3秒后自动保存
            }
        });
    }

    // 键盘快捷键处理
    handleKeyboard(e) {
        // Ctrl/Cmd + S 保存
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (this.currentTab === 'interview') {
                this.saveCurrentInterview();
            }
        }

        // ESC 关闭模态框
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="block"]');
            if (openModal) {
                this.hideModal(openModal.id);
            }
        }
    }

    // 显示确认对话框
    showConfirmDialog(message, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        const messageEl = document.getElementById('confirm-message');

        messageEl.textContent = message;
        this.showModal('confirm-modal');

        this.confirmCallback = onConfirm;
    }

    // 确认删除
    confirmDelete() {
        if (this.confirmCallback) {
            this.confirmCallback();
            this.confirmCallback = null;
        }
        this.hideModal('confirm-modal');
    }

    // 显示消息提示
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message-toast message-${type}`;
        messageEl.innerHTML = `
            <i class="fas fa-${this.getIconForType(type)}"></i>
            <span>${message}</span>
        `;

        // 添加样式
        Object.assign(messageEl.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '10000',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px'
        });

        // 设置背景色
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        messageEl.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(messageEl);

        // 显示动画
        setTimeout(() => {
            messageEl.style.transform = 'translateX(0)';
        }, 100);

        // 自动移除
        setTimeout(() => {
            messageEl.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(messageEl)) {
                    document.body.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    // 获取消息类型对应的图标
    getIconForType(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }

    // 处理数据变更
    handleDataChange(detail) {
        const { action, data } = detail;

        switch (action) {
            case 'add':
                this.showMessage(`成功添加面试：${data.company}`, 'success');
                break;
            case 'update':
                this.showMessage(`面试信息已更新：${data.company}`, 'success');
                break;
            case 'delete':
                this.showMessage(`已删除面试：${data.company}`, 'info');
                break;
        }

        // 刷新相关组件
        if (window.calendar) {
            window.calendar.refresh();
        }
    }
}

// 创建全局应用实例
window.app = new App();