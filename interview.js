// 面试管理功能
class InterviewManager {
    constructor() {
        this.currentInterview = null;
        this.autoSaveTimer = null;
        this.init();
    }

    init() {
        this.initEventListeners();
        this.initFormValidation();
        console.log('面试管理器已初始化');
    }

    // 初始化事件监听器
    initEventListeners() {
        // 表单输入事件
        document.addEventListener('input', (e) => {
            if (e.target.closest('#interview-form')) {
                this.handleFormInput(e);
                this.scheduleAutoSave();
            }
        });

        // 表单失焦事件
        document.addEventListener('blur', (e) => {
            if (e.target.closest('#interview-form')) {
                this.handleFormBlur(e);
            }
        }, true);

        // 监听数据变更
        document.addEventListener('dataChanged', (e) => {
            this.handleDataChange(e.detail);
        });
    }

    // 初始化表单验证
    initFormValidation() {
        const requiredFields = ['company-name', 'interview-datetime'];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('invalid', (e) => {
                    e.preventDefault();
                    this.showFieldError(field, '此字段为必填项');
                });

                field.addEventListener('input', () => {
                    this.clearFieldError(field);
                });
            }
        });
    }

    // 处理表单输入
    handleFormInput(e) {
        const field = e.target;
        
        // 字符计数
        if (field.id === 'job-description') {
            this.updateCharCount(field);
        }

        // 实时验证
        if (field.hasAttribute('required')) {
            this.validateField(field);
        }

        // 更新当前面试数据
        this.updateCurrentInterviewData();
    }

    // 处理表单失焦
    handleFormBlur(e) {
        const field = e.target;
        
        // 验证字段
        if (field.hasAttribute('required')) {
            this.validateField(field);
        }

        // 格式化日期时间
        if (field.type === 'datetime-local') {
            this.formatDateTime(field);
        }
    }

    // 更新字符计数
    updateCharCount(textarea) {
        const counter = document.getElementById('jd-char-count');
        if (counter) {
            const length = textarea.value.length;
            counter.textContent = length;
            
            // 字符数限制提示
            if (length > 5000) {
                counter.style.color = '#dc3545';
                this.showFieldError(textarea, '内容过长，请精简到5000字以内');
            } else {
                counter.style.color = '#666';
                this.clearFieldError(textarea);
            }
        }
    }

    // 验证字段
    validateField(field) {
        const value = field.value.trim();
        
        if (field.hasAttribute('required') && !value) {
            this.showFieldError(field, '此字段为必填项');
            return false;
        }

        // 日期时间验证
        if (field.type === 'datetime-local' && value) {
            const date = new Date(value);
            const minDate = new Date('2025-06-01');
            const maxDate = new Date('2027-06-01');
            
            if (date < minDate || date > maxDate) {
                this.showFieldError(field, '面试时间必须在2025年6月1日至2027年6月1日之间');
                return false;
            }
        }

        this.clearFieldError(field);
        return true;
    }

    // 显示字段错误
    showFieldError(field, message) {
        this.clearFieldError(field);
        
        field.classList.add('error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
    }

    // 清除字段错误
    clearFieldError(field) {
        field.classList.remove('error');
        
        const errorDiv = field.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    // 格式化日期时间
    formatDateTime(field) {
        const value = field.value;
        if (value) {
            try {
                const date = new Date(value);
                const formatted = this.formatToLocalInputValue(date);
                field.value = formatted;
            } catch (error) {
                console.warn('日期格式化失败:', error);
            }
        }
    }

    // 将 Date 转为适用于 input[type="datetime-local"] 的本地时间字符串
    formatToLocalInputValue(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d}T${hh}:${mm}`;
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
        this.setDefaultDateTime();
    }

    // 设置默认日期时间
    setDefaultDateTime() {
        const datetimeField = document.getElementById('interview-datetime');
        if (datetimeField && !datetimeField.value) {
            const now = new Date();
            // 设置为下一个工作日的上午10点
            const nextWorkday = this.getNextWorkday(now);
            nextWorkday.setHours(10, 0, 0, 0);

            const formatted = this.formatToLocalInputValue(nextWorkday);
            datetimeField.value = formatted;
        }
    }

    // 获取下一个工作日
    getNextWorkday(date) {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // 如果是周末，跳到下周一
        if (nextDay.getDay() === 0) { // 周日
            nextDay.setDate(nextDay.getDate() + 1);
        } else if (nextDay.getDay() === 6) { // 周六
            nextDay.setDate(nextDay.getDate() + 2);
        }
        
        return nextDay;
    }

    // 加载面试到表单
    loadInterviewToForm(interview) {
        document.getElementById('company-name').value = interview.company || '';
        document.getElementById('interview-datetime').value = interview.datetime || '';
        document.getElementById('job-description').value = interview.jobDescription || '';
        document.getElementById('notes').value = interview.notes || '';

        // 更新字符计数
        this.updateCharCount(document.getElementById('job-description'));

        // 加载面试题
        this.loadQuestions('mock', interview.mockQuestions || []);
        this.loadQuestions('real', interview.realQuestions || []);

        // 清除所有错误状态
        this.clearAllErrors();
    }

    // 加载问题列表
    loadQuestions(type, questions) {
        const container = document.getElementById(`${type}-questions-container`);
        if (!container) return;

        container.innerHTML = '';
        
        questions.forEach(question => {
            this.addQuestionToForm(type, question);
        });
    }

    // 添加问题到表单
    addQuestionToForm(type, question = null) {
        const container = document.getElementById(`${type}-questions-container`);
        if (!container) return;

        const questionId = question ? question.id : window.dataManager.generateId();
        const isReal = type === 'real';
        
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.dataset.questionId = questionId;
        questionDiv.dataset.questionType = type;
        
        questionDiv.innerHTML = `
            <div class="question-header">
                <span class="question-title">${isReal ? '真实面经' : '模拟面试题'}</span>
                <div class="question-actions">
                    <button type="button" class="btn-edit" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn-delete" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="question-content">
                <div class="question-pair">
                    <div class="question-group">
                        <label class="question-label">${isReal ? '真实问题' : '模拟问题'}</label>
                        <textarea class="question-input" data-field="question" 
                                  placeholder="请输入面试问题..." rows="3">${question ? question.question || '' : ''}</textarea>
                    </div>
                    <div class="question-group">
                        <label class="question-label">${isReal ? '复盘答案' : '模拟答案'}</label>
                        <textarea class="answer-input" data-field="answer" 
                                  placeholder="请输入答案..." rows="4">${question ? question.answer || '' : ''}</textarea>
                        <button type="button" class="btn btn-generate">
                            ${isReal ? '根据真实面经生成复盘' : '生成AI答案'}
                        </button>
                    </div>
                </div>
                ${isReal ? `
                    <div class="question-group">
                        <label class="question-label">反馈建议</label>
                        <textarea class="feedback-input" data-field="feedback" 
                                  placeholder="请输入面试反馈和改进建议..." rows="3">${question ? question.feedback || '' : ''}</textarea>
                    </div>
                ` : ''}
            </div>
        `;
        
        container.appendChild(questionDiv);
        
        // 添加事件监听器
        this.attachQuestionEventListeners(questionDiv);
        
        // 如果是新问题，添加到当前面试数据
        if (!question && this.currentInterview) {
            const newQuestion = {
                id: questionId,
                question: '',
                answer: '',
                feedback: isReal ? '' : undefined,
                createdAt: new Date().toISOString()
            };
            
            if (isReal) {
                this.currentInterview.realQuestions.push(newQuestion);
            } else {
                this.currentInterview.mockQuestions.push(newQuestion);
            }
        }
        
        return questionDiv;
    }

    // 为问题项添加事件监听器
    attachQuestionEventListeners(questionDiv) {
        // 输入事件
        const textareas = questionDiv.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.addEventListener('input', () => {
                this.updateQuestionData(questionDiv);
                this.scheduleAutoSave();
            });
        });

        // 编辑按钮
        const editBtn = questionDiv.querySelector('.btn-edit');
        editBtn.addEventListener('click', () => {
            this.toggleQuestionEdit(questionDiv);
        });

        // 删除按钮
        const deleteBtn = questionDiv.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', () => {
            this.deleteQuestion(questionDiv);
        });

        // 生成按钮
        const generateBtn = questionDiv.querySelector('.btn-generate');
        generateBtn.addEventListener('click', () => {
            this.generateQuestionContent(questionDiv);
        });
    }

    // 更新问题数据
    updateQuestionData(questionDiv) {
        if (!this.currentInterview) return;

        const questionId = questionDiv.dataset.questionId;
        const questionType = questionDiv.dataset.questionType;
        
        const question = questionDiv.querySelector('[data-field="question"]').value;
        const answer = questionDiv.querySelector('[data-field="answer"]').value;
        const feedbackElement = questionDiv.querySelector('[data-field="feedback"]');
        const feedback = feedbackElement ? feedbackElement.value : '';

        // 更新内存中的数据
        const questionArray = questionType === 'mock' ? 
            this.currentInterview.mockQuestions : 
            this.currentInterview.realQuestions;
            
        let questionObj = questionArray.find(q => q.id === questionId);
        
        if (questionObj) {
            questionObj.question = question;
            questionObj.answer = answer;
            if (questionType === 'real') {
                questionObj.feedback = feedback;
            }
            questionObj.updatedAt = new Date().toISOString();
        }
    }

    // 切换问题编辑状态
    toggleQuestionEdit(questionDiv) {
        const textareas = questionDiv.querySelectorAll('textarea');
        const isReadonly = textareas[0].hasAttribute('readonly');
        
        textareas.forEach(textarea => {
            if (isReadonly) {
                textarea.removeAttribute('readonly');
                textarea.classList.remove('readonly');
            } else {
                textarea.setAttribute('readonly', 'true');
                textarea.classList.add('readonly');
            }
        });
        
        const editBtn = questionDiv.querySelector('.btn-edit');
        const icon = editBtn.querySelector('i');
        
        if (isReadonly) {
            icon.className = 'fas fa-save';
            editBtn.title = '保存';
        } else {
            icon.className = 'fas fa-edit';
            editBtn.title = '编辑';
            this.updateQuestionData(questionDiv);
        }
    }

    // 删除问题
    deleteQuestion(questionDiv) {
        const questionId = questionDiv.dataset.questionId;
        const questionType = questionDiv.dataset.questionType;
        
        window.app.showConfirmDialog(
            `确定要删除这道${questionType === 'mock' ? '模拟面试题' : '真实面经'}吗？`,
            () => {
                // 从DOM中移除
                questionDiv.remove();
                
                // 从数据中移除
                if (this.currentInterview) {
                    const questionArray = questionType === 'mock' ? 
                        this.currentInterview.mockQuestions : 
                        this.currentInterview.realQuestions;
                        
                    const index = questionArray.findIndex(q => q.id === questionId);
                    if (index !== -1) {
                        questionArray.splice(index, 1);
                    }
                }
                
                this.scheduleAutoSave();
            }
        );
    }

    // 生成问题内容
    async generateQuestionContent(questionDiv) {
        const questionType = questionDiv.dataset.questionType;
        const questionInput = questionDiv.querySelector('[data-field="question"]');
        const answerInput = questionDiv.querySelector('[data-field="answer"]');
        const generateBtn = questionDiv.querySelector('.btn-generate');
        
        const questionText = questionInput.value.trim();
        
        if (!questionText) {
            window.app.showMessage('请先输入问题内容', 'warning');
            return;
        }
        
        // 显示加载状态
        generateBtn.disabled = true;
        const originalText = generateBtn.textContent;
        generateBtn.innerHTML = '<div class="loading"></div> 生成中...';
        
        try {
            let generatedContent;
            
            if (questionType === 'mock') {
                generatedContent = await this.generateMockAnswer(questionText);
            } else {
                generatedContent = await this.generateReviewAnswer(questionText);
            }
            
            answerInput.value = generatedContent;
            this.updateQuestionData(questionDiv);
            
            window.app.showMessage(
                questionType === 'mock' ? 'AI答案生成成功' : '复盘答案生成成功', 
                'success'
            );
            
        } catch (error) {
            console.error('生成内容失败:', error);
            window.app.showMessage('生成失败，请重试', 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = originalText;
        }
    }

    // 生成模拟答案
    async generateMockAnswer(question) {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const jobDescription = document.getElementById('job-description').value;
        
        // 这里应该调用真实的AI API
        const mockAnswers = {
            "项目经历": "我在大学期间主要参与了以下几个重要项目：\n\n1. 校园二手交易平台\n- 技术栈：Vue.js + Spring Boot + MySQL\n- 负责前端开发和部分后端接口\n- 用户量达到2000+，成交量500+\n- 学到了完整的前后端开发流程\n\n2. 智能推荐系统\n- 参与推荐算法设计和前端展示\n- 使用协同过滤和内容推荐算法\n- 提升用户点击率15%\n- 获得校级创新大赛一等奖\n\n通过这些项目，我不仅提升了技术能力，还学会了团队协作和项目管理。",
            
            "优势": "我的主要优势包括：\n\n1. 技术能力扎实\n- 熟练掌握主流开发技术\n- 快速学习新技术的能力\n- 良好的代码规范和文档习惯\n\n2. 沟通协作能力强\n- 善于团队合作\n- 能够清晰表达技术方案\n- 主动分享和学习\n\n3. 解决问题能力\n- 遇到问题能够系统性分析\n- 善于查找资料和寻求帮助\n- 有创新思维\n\n4. 责任心强\n- 能够按时保质完成任务\n- 对代码质量有较高要求\n- 主动承担责任",
            
            "选择公司": "我选择贵公司主要基于以下几个方面：\n\n1. 技术实力\n- 贵公司在行业中的技术创新能力突出\n- 有机会接触到前沿技术\n- 技术团队实力强劲\n\n2. 发展前景\n- 公司业务发展迅速\n- 个人成长空间大\n- 有清晰的职业发展路径\n\n3. 企业文化\n- 注重人才培养\n- 开放包容的工作环境\n- 鼓励创新和学习\n\n4. 岗位匹配\n- 岗位要求与我的技能高度匹配\n- 能够发挥我的专业优势\n- 有挑战性，能促进个人成长"
        };
        
        // 简单关键词匹配
        for (const [key, value] of Object.entries(mockAnswers)) {
            if (question.includes(key)) {
                return value;
            }
        }
        
        // 如果没有匹配到，返回通用模板
        return `针对"${question}"这个问题，建议从以下几个角度回答：\n\n1. 结合具体实例说明\n2. 展示相关技能和经验\n3. 体现个人特色和优势\n4. 与岗位要求建立连接\n\n请根据自己的实际情况完善答案内容。`;
    }

    // 生成复盘答案
    async generateReviewAnswer(realQuestion) {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return `【面试复盘分析】\n\n问题："${realQuestion}"\n\n【考察要点】\n1. 这道题主要考察的核心能力和知识点\n2. 面试官想要了解的求职者素质\n3. 回答中的关键信息点\n\n【标准回答思路】\n1. 回答框架和逻辑结构\n2. 需要包含的核心内容\n3. 可以加分的额外信息\n\n【改进建议】\n1. 回答要更加结构化和逻辑清晰\n2. 增加具体案例和数据支撑\n3. 体现个人思考深度和独特见解\n4. 注意表达方式和沟通技巧\n\n【下次优化方向】\n建议提前准备类似问题的回答模板，结合自身经历进行个性化调整，多练习表达的流畅度和自信度。`;
    }

    // 更新当前面试数据
    updateCurrentInterviewData() {
        if (!this.currentInterview) return;

        this.currentInterview.company = document.getElementById('company-name').value.trim();
        this.currentInterview.datetime = document.getElementById('interview-datetime').value;
        this.currentInterview.jobDescription = document.getElementById('job-description').value.trim();
        this.currentInterview.notes = document.getElementById('notes').value.trim();
        
        // 从JD中提取职位信息
        const jd = this.currentInterview.jobDescription;
        if (jd && !this.currentInterview.position) {
            this.currentInterview.position = this.extractPositionFromJD(jd);
        }
    }

    // 从JD中提取职位信息
    extractPositionFromJD(jobDescription) {
        const lines = jobDescription.split('\n');
        const firstLine = lines[0];
        
        // 常见职位关键词
        const positions = ['工程师', '开发', '产品', '设计', '运营', '市场', '销售', '管理'];
        
        for (const position of positions) {
            if (firstLine.includes(position)) {
                return firstLine.trim();
            }
        }
        
        return firstLine.substring(0, 20); // 取前20个字符
    }

    // 保存面试
    async saveInterview() {
        if (!this.validateForm()) {
            return false;
        }

        this.updateCurrentInterviewData();
        
        try {
            let savedInterview;
            
            if (this.currentInterview.id) {
                // 更新现有面试
                savedInterview = window.dataManager.updateInterview(
                    this.currentInterview.id, 
                    this.currentInterview
                );
            } else {
                // 创建新面试
                savedInterview = window.dataManager.addInterview(this.currentInterview);
                if (savedInterview) {
                    this.currentInterview.id = savedInterview.id;
                }
            }
            
            if (savedInterview) {
                window.app.showMessage('面试信息保存成功', 'success');
                this.clearAutoSave();
                return true;
            } else {
                window.app.showMessage('保存失败，请重试', 'error');
                return false;
            }
            
        } catch (error) {
            console.error('保存面试失败:', error);
            window.app.showMessage('保存失败：' + error.message, 'error');
            return false;
        }
    }

    // 验证表单
    validateForm() {
        const requiredFields = [
            { id: 'company-name', name: '公司名称' },
            { id: 'interview-datetime', name: '面试时间' }
        ];
        
        let isValid = true;
        
        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!this.validateField(element)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            window.app.showMessage('请检查并填写所有必填项', 'error');
        }
        
        return isValid;
    }

    // 清除所有错误
    clearAllErrors() {
        document.querySelectorAll('.field-error').forEach(error => error.remove());
        document.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
    }

    // 计划自动保存
    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            if (this.currentInterview && this.currentInterview.id) {
                this.saveInterview();
            }
        }, 3000); // 3秒后自动保存
    }

    // 清除自动保存
    clearAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    // 处理数据变更
    handleDataChange(detail) {
        // 可以在这里处理外部数据变更
        console.log('面试数据变更:', detail);
    }

    // 重置表单
    resetForm() {
        const form = document.getElementById('interview-form');
        if (form) {
            form.reset();
        }
        
        // 清空问题容器
        document.getElementById('mock-questions-container').innerHTML = '';
        document.getElementById('real-questions-container').innerHTML = '';
        
        // 重置字符计数
        const counter = document.getElementById('jd-char-count');
        if (counter) {
            counter.textContent = '0';
        }
        
        // 清除错误状态
        this.clearAllErrors();
        
        // 重置当前面试
        this.currentInterview = null;
    }

    // 导出面试信息
    exportInterview() {
        if (!this.currentInterview) {
            window.app.showMessage('没有面试信息可导出', 'warning');
            return;
        }

        const data = {
            ...this.currentInterview,
            exportTime: new Date().toISOString()
        };
        
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `面试信息_${this.currentInterview.company}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 加载面试
    loadInterview(interviewId) {
        const interview = window.dataManager.getInterviewById(interviewId);
        if (interview) {
            this.currentInterview = { ...interview };
            this.loadInterviewToForm(this.currentInterview);
            return true;
        }
        return false;
    }

    // 获取表单数据
    getFormData() {
        this.updateCurrentInterviewData();
        return { ...this.currentInterview };
    }

    // 检查表单是否有变更
    hasUnsavedChanges() {
        if (!this.currentInterview) return false;
        
        const currentFormData = this.getFormData();
        const originalData = window.dataManager.getInterviewById(this.currentInterview.id);
        
        if (!originalData) return true; // 新面试
        
        return JSON.stringify(currentFormData) !== JSON.stringify(originalData);
    }
}

// 创建全局面试管理器实例
window.interviewManager = new InterviewManager();