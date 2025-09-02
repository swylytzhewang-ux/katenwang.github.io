// 数据管理器 - 处理本地存储和数据同步
class DataManager {
    constructor() {
        this.interviews = this.loadInterviews();
        this.initializeDefaultData();
    }

    // 初始化默认数据
    initializeDefaultData() {
        // 只有在第一次访问且没有任何数据时才添加示例数据
        const hasInitialized = localStorage.getItem('hasInitialized');
        if (this.interviews.length === 0 && !hasInitialized) {
            // 添加一些示例数据
            const sampleInterviews = [
                {
                    id: this.generateId(),
                    company: '字节跳动',
                    datetime: '2025-06-15T14:00',
                    position: '产品经理',
                    jobDescription: '负责用户增长相关产品的设计和优化，需要具备数据分析能力和产品思维。',
                    notes: '提前15分钟到前台签到',
                    mockQuestions: [
                        {
                            id: this.generateId(),
                            question: '请介绍一个你负责的产品项目',
                            answer: '我曾负责开发一个用户行为分析工具...'
                        }
                    ],
                    realQuestions: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    company: '腾讯',
                    datetime: '2025-06-20T10:30',
                    position: '前端开发工程师',
                    jobDescription: '负责微信小程序前端开发，要求熟悉Vue.js、React等主流框架。',
                    notes: '携带身份证和简历',
                    mockQuestions: [],
                    realQuestions: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
            
            this.interviews = sampleInterviews;
            this.saveInterviews();
            // 标记已经初始化过
            localStorage.setItem('hasInitialized', 'true');
        }
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 从本地存储加载面试数据
    loadInterviews() {
        try {
            const data = localStorage.getItem('interviews');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('加载面试数据失败:', error);
            return [];
        }
    }

    // 保存面试数据到本地存储
    saveInterviews() {
        try {
            localStorage.setItem('interviews', JSON.stringify(this.interviews));
            this.syncToCloud(); // 触发云端同步
        } catch (error) {
            console.error('保存面试数据失败:', error);
        }
    }

    // 获取所有面试
    getAllInterviews() {
        return [...this.interviews];
    }

    // 根据ID获取面试
    getInterviewById(id) {
        return this.interviews.find(interview => interview.id === id);
    }

    // 根据日期获取面试
    getInterviewsByDate(date) {
        const dateStr = this.formatDate(date);
        return this.interviews.filter(interview => {
            const interviewDate = this.formatDate(new Date(interview.datetime));
            return interviewDate === dateStr;
        });
    }

    // 添加面试
    addInterview(interviewData) {
        const interview = {
            id: this.generateId(),
            company: interviewData.company || '',
            datetime: interviewData.datetime || '',
            position: interviewData.position || '',
            jobDescription: interviewData.jobDescription || '',
            notes: interviewData.notes || '',
            mockQuestions: interviewData.mockQuestions || [],
            realQuestions: interviewData.realQuestions || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.interviews.push(interview);
        this.saveInterviews();
        this.notifyDataChange('add', interview);
        return interview;
    }

    // 更新面试
    updateInterview(id, updateData) {
        const index = this.interviews.findIndex(interview => interview.id === id);
        if (index !== -1) {
            this.interviews[index] = {
                ...this.interviews[index],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            this.saveInterviews();
            this.notifyDataChange('update', this.interviews[index]);
            return this.interviews[index];
        }
        return null;
    }

    // 删除面试
    deleteInterview(id) {
        const index = this.interviews.findIndex(interview => interview.id === id);
        if (index !== -1) {
            const deletedInterview = this.interviews.splice(index, 1)[0];
            this.saveInterviews();
            this.notifyDataChange('delete', deletedInterview);
            return deletedInterview;
        }
        return null;
    }

    // 添加模拟面试题
    addMockQuestion(interviewId, questionData) {
        const interview = this.getInterviewById(interviewId);
        if (interview) {
            const question = {
                id: this.generateId(),
                question: questionData.question || '',
                answer: questionData.answer || '',
                createdAt: new Date().toISOString()
            };
            interview.mockQuestions.push(question);
            interview.updatedAt = new Date().toISOString();
            this.saveInterviews();
            return question;
        }
        return null;
    }

    // 添加真实面试题
    addRealQuestion(interviewId, questionData) {
        const interview = this.getInterviewById(interviewId);
        if (interview) {
            const question = {
                id: this.generateId(),
                question: questionData.question || '',
                answer: questionData.answer || '',
                feedback: questionData.feedback || '',
                createdAt: new Date().toISOString()
            };
            interview.realQuestions.push(question);
            interview.updatedAt = new Date().toISOString();
            this.saveInterviews();
            return question;
        }
        return null;
    }

    // 删除面试题
    deleteQuestion(interviewId, questionId, type = 'mock') {
        const interview = this.getInterviewById(interviewId);
        if (interview) {
            const questions = type === 'mock' ? interview.mockQuestions : interview.realQuestions;
            const index = questions.findIndex(q => q.id === questionId);
            if (index !== -1) {
                const deletedQuestion = questions.splice(index, 1)[0];
                interview.updatedAt = new Date().toISOString();
                this.saveInterviews();
                return deletedQuestion;
            }
        }
        return null;
    }

    // 获取日期范围内的面试（用于日历显示）
    getInterviewsInRange(startDate, endDate) {
        return this.interviews.filter(interview => {
            const interviewDate = new Date(interview.datetime);
            return interviewDate >= startDate && interviewDate <= endDate;
        });
    }

    // 搜索面试
    searchInterviews(keyword) {
        if (!keyword.trim()) return this.interviews;
        
        const lowerKeyword = keyword.toLowerCase();
        return this.interviews.filter(interview => {
            return interview.company.toLowerCase().includes(lowerKeyword) ||
                   interview.position.toLowerCase().includes(lowerKeyword) ||
                   interview.jobDescription.toLowerCase().includes(lowerKeyword) ||
                   interview.notes.toLowerCase().includes(lowerKeyword);
        });
    }

    // 格式化日期为 YYYY-MM-DD
    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 格式化日期时间
    formatDateTime(date) {
        const d = new Date(date);
        return d.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // 数据变更通知（用于更新UI）
    notifyDataChange(action, data) {
        // 触发自定义事件，通知其他组件数据变更
        const event = new CustomEvent('dataChanged', {
            detail: { action, data }
        });
        document.dispatchEvent(event);
    }

    // 云端同步（模拟实现）
    async syncToCloud() {
        try {
            // 检查是否有服务器环境
            if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
                // 文件协议下不进行云端同步
                console.log('本地模式：跳过云端同步');
                localStorage.setItem('lastSyncTime', new Date().toISOString());
                return;
            }
            
            // 模拟API调用延迟
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 在实际项目中，这里应该调用真实的API
            console.log('数据已同步到云端');
            
            // 更新同步状态
            localStorage.setItem('lastSyncTime', new Date().toISOString());
            
        } catch (error) {
            console.error('云端同步失败:', error);
        }
    }

    // 从云端拉取数据（模拟实现）
    async syncFromCloud() {
        try {
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 在实际项目中，这里应该从服务器获取最新数据
            console.log('已从云端拉取最新数据');
            
        } catch (error) {
            console.error('从云端拉取数据失败:', error);
        }
    }

    // 导出数据
    exportData() {
        const data = {
            interviews: this.interviews,
            exportTime: new Date().toISOString(),
            version: '1.0'
        };
        
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `面试数据备份_${this.formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 导入数据
    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.interviews && Array.isArray(data.interviews)) {
                        this.interviews = data.interviews;
                        this.saveInterviews();
                        this.notifyDataChange('import', data);
                        resolve(data.interviews.length);
                    } else {
                        reject(new Error('无效的数据格式'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    // 清空所有数据
    clearAllData() {
        this.interviews = [];
        this.saveInterviews();
        this.notifyDataChange('clear', null);
    }

    // 获取统计信息
    getStatistics() {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        const thisMonthInterviews = this.interviews.filter(interview => {
            const interviewDate = new Date(interview.datetime);
            return interviewDate.getMonth() === thisMonth && 
                   interviewDate.getFullYear() === thisYear;
        });

        const upcomingInterviews = this.interviews.filter(interview => {
            const interviewDate = new Date(interview.datetime);
            return interviewDate > now;
        });

        const completedInterviews = this.interviews.filter(interview => {
            const interviewDate = new Date(interview.datetime);
            return interviewDate < now;
        });

        return {
            total: this.interviews.length,
            thisMonth: thisMonthInterviews.length,
            upcoming: upcomingInterviews.length,
            completed: completedInterviews.length,
            companies: [...new Set(this.interviews.map(i => i.company))].length
        };
    }
}

// 创建全局数据管理器实例
window.dataManager = new DataManager();