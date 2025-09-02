// 模拟面试功能模块
class MockInterview {
    constructor() {
        this.agentServiceUrl = 'http://localhost:8001';
        this.currentSession = null;
        this.isInterviewActive = false;
        this.conversationHistory = [];
        this.init();
    }

    init() {
        this.initEventListeners();
        this.initUI();
        console.log('模拟面试模块已初始化');
    }

    initEventListeners() {
        // 开始面试按钮
        const startBtn = document.getElementById('start-mock-interview');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.showStartInterviewModal();
            });
        }

        // 提交回答按钮
        const submitBtn = document.getElementById('submit-answer');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.submitAnswer();
            });
        }

        // 结束面试按钮
        const endBtn = document.getElementById('end-interview');
        if (endBtn) {
            endBtn.addEventListener('click', () => {
                this.endInterview();
            });
        }

        // 语音输入（如果支持）
        const voiceBtn = document.getElementById('voice-answer');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.toggleVoiceInput();
            });
        }

        // Enter键快速提交
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey && this.isInterviewActive) {
                this.submitAnswer();
            }
        });
    }

    initUI() {
        // 如果页面上没有模拟面试UI，就动态创建
        if (!document.getElementById('mock-interview-container')) {
            this.createMockInterviewUI();
        }
    }

    createMockInterviewUI() {
        // 在面试管理页面添加模拟面试入口
        const interviewContainer = document.querySelector('.interview-container');
        if (interviewContainer) {
            const mockInterviewSection = document.createElement('div');
            mockInterviewSection.className = 'mock-interview-section';
            mockInterviewSection.innerHTML = `
                <div class="form-section">
                    <h3>🎭 模拟面试</h3>
                    <div class="mock-interview-intro">
                        <p>AI面试官将根据当前面试信息进行模拟面试，帮您提前练习和准备。</p>
                        <button class="btn btn-primary" id="start-mock-interview">
                            <i class="fas fa-play"></i>
                            开始模拟面试
                        </button>
                    </div>
                </div>
            `;
            
            // 插入到表单的最后
            interviewContainer.appendChild(mockInterviewSection);
            
            // 重新绑定事件
            const startBtn = mockInterviewSection.querySelector('#start-mock-interview');
            startBtn.addEventListener('click', () => {
                this.showStartInterviewModal();
            });
        }

        // 创建模拟面试对话界面
        this.createInterviewModal();
    }

    createInterviewModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'mock-interview-modal';
        modal.innerHTML = `
            <div class="modal-content mock-interview-content">
                <div class="modal-header">
                    <h3>🎭 模拟面试进行中</h3>
                    <div class="interview-status">
                        <span class="status-indicator" id="interview-status">准备中...</span>
                        <button class="close-btn" id="close-interview-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="interview-chat" id="interview-chat">
                        <div class="chat-messages" id="interview-messages">
                            <!-- 对话消息将在这里显示 -->
                        </div>
                        <div class="chat-input-area">
                            <div class="input-container">
                                <button class="voice-btn" id="voice-answer" title="语音回答">
                                    <i class="fas fa-microphone"></i>
                                </button>
                                <textarea 
                                    class="answer-input" 
                                    id="interview-answer-input" 
                                    placeholder="请输入您的回答...（Ctrl+Enter快速提交）"
                                    rows="3"></textarea>
                                <button class="btn btn-primary" id="submit-answer">
                                    <i class="fas fa-paper-plane"></i>
                                    提交回答
                                </button>
                            </div>
                            <div class="input-tips">
                                <small>💡 建议用完整句子回答，尽量详细具体</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <div class="interview-progress">
                        <span id="question-progress">第 1 题 / 共 5 题</span>
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
                        </div>
                    </div>
                    <button class="btn btn-secondary" id="end-interview">结束面试</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定事件
        modal.querySelector('#close-interview-modal').addEventListener('click', () => {
            this.closeInterviewModal();
        });

        modal.querySelector('#submit-answer').addEventListener('click', () => {
            this.submitAnswer();
        });

        modal.querySelector('#end-interview').addEventListener('click', () => {
            this.endInterview();
        });

        modal.querySelector('#voice-answer').addEventListener('click', () => {
            this.toggleVoiceInput();
        });

        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeInterviewModal();
            }
        });
    }

    async showStartInterviewModal() {
        // 获取当前面试信息
        const currentInterview = window.app.currentInterview;
        if (!currentInterview || !currentInterview.company) {
            window.app.showMessage('请先填写面试基本信息（公司名称、职位等）', 'warning');
            return;
        }

        const confirmStart = confirm(`确定要开始模拟面试吗？\n\n公司：${currentInterview.company}\n职位：${currentInterview.position || '未填写'}\n\n建议在安静的环境中进行，预计耗时20-30分钟。`);
        
        if (confirmStart) {
            await this.startMockInterview(currentInterview);
        }
    }

    async startMockInterview(interviewData) {
        try {
            this.showMessage('正在准备模拟面试...', 'info');
            
            // 调用Agent服务开始面试
            const response = await fetch(`${this.agentServiceUrl}/api/mock-interview/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    company: interviewData.company,
                    position: interviewData.position || '相关岗位',
                    job_description: interviewData.jobDescription || '',
                    user_profile: this.getUserProfile()
                })
            });

            if (!response.ok) {
                throw new Error('无法连接到AI面试服务');
            }

            const result = await response.json();
            
            if (result.success) {
                this.currentSession = {
                    session_id: result.session_id,
                    company: interviewData.company,
                    position: interviewData.position,
                    total_questions: result.total_questions,
                    current_question: 0
                };
                
                this.isInterviewActive = true;
                this.conversationHistory = [];
                
                // 显示面试界面
                this.showInterviewModal();
                
                // 显示面试官的开场白
                this.addInterviewerMessage(result.interviewer_response);
                
                this.showMessage('模拟面试已开始，祝您好运！', 'success');
                
            } else {
                throw new Error(result.message || '启动面试失败');
            }
            
        } catch (error) {
            console.error('启动模拟面试失败:', error);
            this.showMessage(`启动失败: ${error.message}`, 'error');
            
            // 提供降级方案
            this.showFallbackInterview(interviewData);
        }
    }

    showFallbackInterview(interviewData) {
        // 如果Agent服务不可用，提供基础模拟面试
        this.currentSession = {
            session_id: `fallback_${Date.now()}`,
            company: interviewData.company,
            position: interviewData.position,
            total_questions: 3,
            current_question: 0,
            fallback: true
        };
        
        this.isInterviewActive = true;
        this.showInterviewModal();
        
        const fallbackMessage = `您好！我是${interviewData.company}的面试官。由于技术原因，我们将进行简化版模拟面试。请简单介绍一下您自己，包括教育背景和相关经验。`;
        this.addInterviewerMessage(fallbackMessage);
        
        this.showMessage('正在使用基础模拟面试模式', 'info');
    }

    showInterviewModal() {
        const modal = document.getElementById('mock-interview-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // 重置界面
            this.resetInterviewUI();
            
            // 聚焦到输入框
            setTimeout(() => {
                const input = document.getElementById('interview-answer-input');
                if (input) input.focus();
            }, 300);
        }
    }

    closeInterviewModal() {
        if (this.isInterviewActive) {
            const confirmClose = confirm('面试还在进行中，确定要关闭吗？');
            if (!confirmClose) return;
        }
        
        const modal = document.getElementById('mock-interview-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        
        if (this.isInterviewActive) {
            this.endInterview();
        }
    }

    resetInterviewUI() {
        // 清空消息区域
        const messagesContainer = document.getElementById('interview-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // 重置输入框
        const input = document.getElementById('interview-answer-input');
        if (input) {
            input.value = '';
        }
        
        // 更新状态
        this.updateInterviewStatus('面试进行中');
        this.updateProgress(0);
    }

    async submitAnswer() {
        if (!this.isInterviewActive || !this.currentSession) {
            this.showMessage('面试未开始', 'warning');
            return;
        }

        const input = document.getElementById('interview-answer-input');
        const answer = input.value.trim();
        
        if (!answer) {
            this.showMessage('请输入您的回答', 'warning');
            return;
        }

        // 禁用输入和按钮
        this.setInputEnabled(false);
        
        // 添加用户回答到对话
        this.addUserMessage(answer);
        
        // 清空输入框
        input.value = '';
        
        try {
            if (this.currentSession.fallback) {
                // 降级模式
                await this.handleFallbackAnswer(answer);
            } else {
                // 调用Agent处理回答
                await this.processAnswerWithAgent(answer);
            }
            
        } catch (error) {
            console.error('处理回答失败:', error);
            this.showMessage('处理回答时出错，请重试', 'error');
        } finally {
            this.setInputEnabled(true);
        }
    }

    async processAnswerWithAgent(answer) {
        try {
            const response = await fetch(`${this.agentServiceUrl}/api/mock-interview/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.currentSession.session_id,
                    answer: answer
                })
            });

            if (!response.ok) {
                throw new Error('服务器响应错误');
            }

            const result = await response.json();
            
            if (result.success) {
                // 更新会话状态
                this.currentSession.current_question = result.current_question || 0;
                
                // 显示面试官回复
                this.addInterviewerMessage(result.interviewer_response);
                
                // 更新进度
                if (result.total_questions) {
                    const progress = ((result.current_question || 0) / result.total_questions) * 100;
                    this.updateProgress(progress);
                    this.updateQuestionProgress(result.current_question || 0, result.total_questions);
                }
                
                // 检查是否完成
                if (result.is_completed) {
                    this.handleInterviewCompletion(result.score);
                }
                
            } else {
                throw new Error(result.message || '处理失败');
            }
            
        } catch (error) {
            // 降级到简单回复
            await this.handleFallbackAnswer(answer);
        }
    }

    async handleFallbackAnswer(answer) {
        // 简单的降级处理
        const responses = [
            "很好，您的回答很清晰。请继续下一个问题：请描述一个您解决问题的经历。",
            "不错的回答。最后一个问题：您为什么选择我们公司？",
            "感谢您的回答。面试结束，整体表现不错，我们会在3个工作日内给您反馈。"
        ];
        
        const currentQ = this.currentSession.current_question || 0;
        const response = responses[currentQ] || responses[responses.length - 1];
        
        setTimeout(() => {
            this.addInterviewerMessage(response);
            
            this.currentSession.current_question = currentQ + 1;
            this.updateProgress((currentQ + 1) / this.currentSession.total_questions * 100);
            this.updateQuestionProgress(currentQ + 1, this.currentSession.total_questions);
            
            if (currentQ + 1 >= this.currentSession.total_questions) {
                setTimeout(() => {
                    this.handleInterviewCompletion({overall_score: 7.5});
                }, 2000);
            }
        }, 1500);
    }

    addInterviewerMessage(message) {
        const messagesContainer = document.getElementById('interview-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message interviewer-message';
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user-tie"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">面试官</span>
                    <span class="message-time">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message-text">${this.formatMessage(message)}</div>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        // 添加到历史记录
        this.conversationHistory.push({
            role: 'interviewer',
            content: message,
            timestamp: new Date().toISOString()
        });
    }

    addUserMessage(message) {
        const messagesContainer = document.getElementById('interview-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">我</span>
                    <span class="message-time">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message-text">${this.formatMessage(message)}</div>
            </div>
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        // 添加到历史记录
        this.conversationHistory.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });
    }

    formatMessage(message) {
        // 简单的消息格式化
        return message.replace(/\n/g, '<br>');
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('interview-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    setInputEnabled(enabled) {
        const input = document.getElementById('interview-answer-input');
        const submitBtn = document.getElementById('submit-answer');
        
        if (input) input.disabled = !enabled;
        if (submitBtn) submitBtn.disabled = !enabled;
    }

    updateInterviewStatus(status) {
        const statusEl = document.getElementById('interview-status');
        if (statusEl) statusEl.textContent = status;
    }

    updateProgress(percentage) {
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
    }

    updateQuestionProgress(current, total) {
        const progressEl = document.getElementById('question-progress');
        if (progressEl) {
            progressEl.textContent = `第 ${current + 1} 题 / 共 ${total} 题`;
        }
    }

    handleInterviewCompletion(score) {
        this.isInterviewActive = false;
        this.updateInterviewStatus('面试已完成');
        
        // 显示评分和建议
        const completionMessage = `
            <div class="interview-completion">
                <h4>🎉 面试完成！</h4>
                <div class="score-summary">
                    <div class="overall-score">
                        <span class="score-label">综合评分</span>
                        <span class="score-value">${score?.overall_score || 'N/A'}</span>
                    </div>
                    <div class="completion-note">
                        <p>感谢您参加本次模拟面试！您的表现已被记录，建议您：</p>
                        <ul>
                            <li>回顾刚才的回答，思考可以改进的地方</li>
                            <li>针对薄弱环节进行针对性练习</li>
                            <li>准备更多具体的项目案例</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            this.addInterviewerMessage(completionMessage);
        }, 1000);
        
        // 保存面试记录
        this.saveInterviewRecord();
    }

    async endInterview() {
        if (!this.currentSession) return;
        
        const confirmEnd = confirm('确定要结束当前面试吗？');
        if (!confirmEnd) return;
        
        try {
            if (!this.currentSession.fallback) {
                // 通知服务端结束面试
                await fetch(`${this.agentServiceUrl}/api/mock-interview/${this.currentSession.session_id}`, {
                    method: 'DELETE'
                });
            }
        } catch (error) {
            console.warn('结束面试会话失败:', error);
        }
        
        this.isInterviewActive = false;
        this.currentSession = null;
        this.closeInterviewModal();
        
        this.showMessage('面试已结束', 'info');
    }

    saveInterviewRecord() {
        // 保存面试记录到本地存储
        const record = {
            session_id: this.currentSession.session_id,
            company: this.currentSession.company,
            position: this.currentSession.position,
            conversation_history: this.conversationHistory,
            completed_at: new Date().toISOString(),
            type: 'mock_interview'
        };
        
        try {
            const existingRecords = JSON.parse(localStorage.getItem('mock_interview_records') || '[]');
            existingRecords.push(record);
            
            // 只保留最近10次记录
            const recentRecords = existingRecords.slice(-10);
            localStorage.setItem('mock_interview_records', JSON.stringify(recentRecords));
            
            console.log('模拟面试记录已保存');
        } catch (error) {
            console.error('保存面试记录失败:', error);
        }
    }

    getUserProfile() {
        // 从现有系统获取用户信息
        return {
            experience_years: 1, // 可以从简历分析中获取
            skills: [], // 从JD中提取
            education: '', // 用户输入
            summary: '应届毕业生' // 默认
        };
    }

    toggleVoiceInput() {
        // 语音输入功能（如果浏览器支持）
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            // 实现语音识别
            this.showMessage('语音功能开发中...', 'info');
        } else {
            this.showMessage('您的浏览器不支持语音识别', 'warning');
        }
    }

    showMessage(message, type = 'info') {
        // 复用主应用的消息提示
        if (window.app && window.app.showMessage) {
            window.app.showMessage(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // 获取历史面试记录
    getMockInterviewHistory() {
        try {
            return JSON.parse(localStorage.getItem('mock_interview_records') || '[]');
        } catch (error) {
            console.error('获取面试历史失败:', error);
            return [];
        }
    }

    // 检查Agent服务是否可用
    async checkAgentService() {
        try {
            const response = await fetch(`${this.agentServiceUrl}/`, {
                method: 'GET',
                timeout: 3000
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// 创建全局实例
window.mockInterview = new MockInterview();
