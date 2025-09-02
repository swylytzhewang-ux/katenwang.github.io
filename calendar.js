// 日历功能实现
class Calendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.minDate = new Date('2025-06-01');
        this.maxDate = new Date('2027-06-01');
        this.interviews = [];
        this.init();
    }

    init() {
        this.initEventListeners();

        // 确保DOM完全加载后再初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.loadInterviews();
                this.render();
                this.goToToday();
            });
        } else {
            this.loadInterviews();
            this.render();
            this.goToToday();
        }
    }

    // 初始化事件监听器
    initEventListeners() {
        // 月份导航
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.previousMonth();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextMonth();
            });
        }

        // 监听数据变更
        document.addEventListener('dataChanged', () => {
            this.loadInterviews();
            this.render();
        });
    }

    // 加载面试数据
    loadInterviews() {
        if (window.dataManager) {
            this.interviews = window.dataManager.getAllInterviews();
        } else {
            // 如果数据管理器还没准备好，等待一下再重试
            setTimeout(() => {
                this.loadInterviews();
                this.render(); // 重新渲染
            }, 100);
            this.interviews = [];
        }
    }

    // 渲染日历
    render() {
        this.renderHeader();
        this.renderDays();
        this.updateSelectedDateInfo();
    }

    // 渲染头部
    renderHeader() {
        const monthEl = document.getElementById('current-month');
        if (monthEl) {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth() + 1;
            monthEl.textContent = `${year}年${month}月`;
        }
    }

    // 渲染日期
    renderDays() {
        const daysGrid = document.getElementById('days-grid');
        if (!daysGrid) return;

        daysGrid.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // 获取当月第一天是星期几 (0=周日, 1=周一, ...)
        const firstDay = new Date(year, month, 1);
        const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // 转换为周一开始

        // 获取当月天数
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // 获取上月天数
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

        // 添加上个月的尾部日期
        for (let i = startDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const date = new Date(prevYear, prevMonth, day);
            this.createDayCell(date, true);
        }

        // 添加当月日期
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            this.createDayCell(date, false);
        }

        // 添加下个月的开始日期，确保总共6行（42个格子）
        const cellsRendered = startDay + daysInMonth;
        const remainingCells = 42 - cellsRendered;
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;

        for (let day = 1; day <= remainingCells; day++) {
            const date = new Date(nextYear, nextMonth, day);
            this.createDayCell(date, true);
        }
    }

    // 创建日期单元格
    createDayCell(date, isOtherMonth) {
        const daysGrid = document.getElementById('days-grid');
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';

        // 检查是否在允许的日期范围内
        const isInRange = date >= this.minDate && date <= this.maxDate;

        if (isOtherMonth) {
            dayCell.classList.add('other-month');
        }

        if (!isInRange) {
            dayCell.classList.add('disabled');
        }

        // 检查是否是今天
        const today = new Date();
        if (this.isSameDate(date, today)) {
            dayCell.classList.add('today');
        }

        // 检查是否是选中的日期
        if (this.selectedDate && this.isSameDate(date, this.selectedDate)) {
            dayCell.classList.add('selected');
        }

        // 获取当日面试
        const dayInterviews = this.getInterviewsForDate(date);
        if (dayInterviews.length > 0) {
            dayCell.classList.add('has-interview');
        }

        // 创建日期内容
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();

        dayCell.appendChild(dayNumber);

        // 添加面试指示器
        if (dayInterviews.length > 0) {
            const indicator = document.createElement('div');
            indicator.className = 'interview-indicator';

            if (dayInterviews.length === 1) {
                indicator.textContent = dayInterviews[0].company;
            } else {
                indicator.textContent = `${dayInterviews.length}个面试`;
            }

            dayCell.appendChild(indicator);
        }

        // 添加点击事件
        if (isInRange) {
            dayCell.addEventListener('click', (event) => {
                this.selectDate(date, event.currentTarget);
            });

            // 添加悬停提示
            if (dayInterviews.length > 0) {
                const tooltip = this.createTooltip(dayInterviews);
                dayCell.appendChild(tooltip);

                dayCell.addEventListener('mouseenter', () => {
                    tooltip.style.visibility = 'visible';
                    tooltip.style.opacity = '1';
                });

                dayCell.addEventListener('mouseleave', () => {
                    tooltip.style.visibility = 'hidden';
                    tooltip.style.opacity = '0';
                });
            }
        }

        daysGrid.appendChild(dayCell);
    }

    // 创建悬停提示
    createTooltip(interviews) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip tooltiptext';

        let content = '';
        interviews.forEach(interview => {
            const time = this.formatTime(interview.datetime);
            content += `${interview.company} ${time}\n`;
        });

        tooltip.textContent = content.trim();
        return tooltip;
    }

    // 获取指定日期的面试
    getInterviewsForDate(date) {
        const dateStr = this.formatDate(date);
        return this.interviews.filter(interview => {
            const interviewDate = this.formatDate(new Date(interview.datetime));
            return interviewDate === dateStr;
        });
    }

    // 选择日期
    selectDate(date, cellEl) {
        // 移除之前选中的日期样式
        document.querySelectorAll('.day-cell.selected').forEach(cell => {
            cell.classList.remove('selected');
        });

        this.selectedDate = date;

        // 添加新的选中样式
        if (cellEl) {
            cellEl.classList.add('selected');
        } else {
            // 回退查找对应单元格
            const allCells = document.querySelectorAll('.day-cell');
            allCells.forEach(c => {
                const num = c.querySelector('.day-number');
                if (num && Number(num.textContent) === date.getDate() && !c.classList.contains('other-month')) {
                    c.classList.add('selected');
                }
            });
        }

        this.updateSelectedDateInfo();
    }

    // 更新选中日期信息
    updateSelectedDateInfo() {
        const infoContainer = document.getElementById('selected-date-info');
        const interviewList = document.getElementById('interview-list');

        if (!infoContainer || !interviewList) return;

        if (!this.selectedDate) {
            infoContainer.style.display = 'none';
            return;
        }

        const interviews = this.getInterviewsForDate(this.selectedDate);

        if (interviews.length === 0) {
            infoContainer.style.display = 'none';
            return;
        }

        infoContainer.style.display = 'block';

        // 更新标题
        const title = infoContainer.querySelector('.selected-date-title');
        if (title) {
            const dateStr = this.formatDateForDisplay(this.selectedDate);
            title.textContent = `${dateStr} 的面试安排`;
        }

        // 清空现有列表
        interviewList.innerHTML = '';

        // 显示面试列表（最多3个）
        const displayInterviews = interviews.slice(0, 3);
        displayInterviews.forEach(interview => {
            const item = this.createInterviewItem(interview);
            interviewList.appendChild(item);
        });

        // 如果有更多面试，显示"查看全部"链接
        if (interviews.length > 3) {
            const viewAllLink = document.createElement('div');
            viewAllLink.className = 'view-all-link';
            viewAllLink.innerHTML = `<a href="#" onclick="app.showAllInterviews('${this.formatDate(this.selectedDate)}')">查看全部 ${interviews.length} 个面试</a>`;
            interviewList.appendChild(viewAllLink);
        }
    }

    // 创建面试项目
    createInterviewItem(interview) {
        const item = document.createElement('div');
        item.className = 'interview-item';

        const time = this.formatTime(interview.datetime);
        const position = interview.position || '面试';

        item.innerHTML = `
            <div class="interview-info">
                <h4>${interview.company} ${position}</h4>
                <p><i class="fas fa-clock"></i> ${time}</p>
                ${interview.notes ? `<p><i class="fas fa-sticky-note"></i> ${interview.notes}</p>` : ''}
            </div>
            <div class="interview-actions">
                <button class="btn btn-edit" onclick="app.editInterview('${interview.id}')" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-delete" onclick="calendar.deleteInterview('${interview.id}')" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        return item;
    }

    // 删除面试
    deleteInterview(interviewId) {
        const interview = window.dataManager.getInterviewById(interviewId);
        if (interview) {
            window.app.showConfirmDialog(
                `确定删除 ${interview.company} 的面试吗？`,
                () => {
                    window.dataManager.deleteInterview(interviewId);
                    this.refresh();
                }
            );
        }
    }

    // 上一个月
    previousMonth() {
        const newDate = new Date(this.currentDate);
        newDate.setMonth(newDate.getMonth() - 1);

        // 检查是否超出最小日期范围
        if (newDate >= new Date(this.minDate.getFullYear(), this.minDate.getMonth(), 1)) {
            this.currentDate = newDate;
            this.render();
        }
    }

    // 下一个月
    nextMonth() {
        const newDate = new Date(this.currentDate);
        newDate.setMonth(newDate.getMonth() + 1);

        // 检查是否超出最大日期范围
        if (newDate <= new Date(this.maxDate.getFullYear(), this.maxDate.getMonth(), 1)) {
            this.currentDate = newDate;
            this.render();
        }
    }

    // 跳转到今天
    goToToday() {
        const today = new Date();

        // 检查今天是否在允许的范围内
        if (today >= this.minDate && today <= this.maxDate) {
            this.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
            this.selectedDate = today;
            this.render();
        } else {
            // 如果今天不在范围内，跳转到最接近的月份
            if (today < this.minDate) {
                this.currentDate = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), 1);
            } else {
                this.currentDate = new Date(this.maxDate.getFullYear(), this.maxDate.getMonth(), 1);
            }
            this.render();
        }
    }

    // 跳转到指定日期
    goToDate(date) {
        const targetDate = new Date(date);

        if (targetDate >= this.minDate && targetDate <= this.maxDate) {
            this.currentDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            this.selectedDate = targetDate;
            this.render();
            return true;
        }

        return false;
    }

    // 刷新日历
    refresh() {
        this.loadInterviews();
        this.render();
    }

    // 检查两个日期是否相同
    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    }

    // 格式化日期为 YYYY-MM-DD
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 格式化日期用于显示
    formatDateForDisplay(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[date.getDay()];
        return `${month}月${day}日 ${weekday}`;
    }

    // 格式化时间
    formatTime(datetime) {
        const date = new Date(datetime);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // 获取日历统计信息
    getStatistics() {
        const currentMonth = this.currentDate.getMonth();
        const currentYear = this.currentDate.getFullYear();

        const monthInterviews = this.interviews.filter(interview => {
            const interviewDate = new Date(interview.datetime);
            return interviewDate.getMonth() === currentMonth &&
                interviewDate.getFullYear() === currentYear;
        });

        const today = new Date();
        const upcomingInterviews = this.interviews.filter(interview => {
            const interviewDate = new Date(interview.datetime);
            return interviewDate > today;
        });

        return {
            thisMonth: monthInterviews.length,
            upcoming: upcomingInterviews.length,
            total: this.interviews.length
        };
    }

    // 获取指定月份的面试统计
    getMonthStatistics(year, month) {
        const monthInterviews = this.interviews.filter(interview => {
            const interviewDate = new Date(interview.datetime);
            return interviewDate.getMonth() === month &&
                interviewDate.getFullYear() === year;
        });

        // 按日期分组
        const dailyStats = {};
        monthInterviews.forEach(interview => {
            const day = new Date(interview.datetime).getDate();
            dailyStats[day] = (dailyStats[day] || 0) + 1;
        });

        return {
            total: monthInterviews.length,
            daily: dailyStats,
            companies: [...new Set(monthInterviews.map(i => i.company))]
        };
    }

    // 导出当月面试安排
    exportMonthSchedule() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const monthInterviews = this.interviews.filter(interview => {
            const interviewDate = new Date(interview.datetime);
            return interviewDate.getMonth() === month &&
                interviewDate.getFullYear() === year;
        });

        // 按日期排序
        monthInterviews.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

        // 生成CSV内容
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += '日期,时间,公司,职位,备注\n';

        monthInterviews.forEach(interview => {
            const date = this.formatDate(new Date(interview.datetime));
            const time = this.formatTime(interview.datetime);
            const company = interview.company || '';
            const position = interview.position || '';
            const notes = interview.notes || '';

            csvContent += `${date},${time},${company},${position},"${notes}"\n`;
        });

        // 下载文件
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `面试安排_${year}年${month + 1}月.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 快速跳转到有面试的日期
    goToNextInterview() {
        const today = new Date();
        const upcomingInterviews = this.interviews
            .filter(interview => new Date(interview.datetime) > today)
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

        if (upcomingInterviews.length > 0) {
            const nextInterview = upcomingInterviews[0];
            const nextDate = new Date(nextInterview.datetime);
            this.goToDate(nextDate);
            return nextInterview;
        }

        return null;
    }

    // 获取忙碌程度颜色
    getBusyLevelColor(interviewCount) {
        if (interviewCount === 0) return 'transparent';
        if (interviewCount === 1) return '#e3f2fd';
        if (interviewCount === 2) return '#bbdefb';
        if (interviewCount >= 3) return '#90caf9';
        return '#64b5f6';
    }

    // 添加键盘导航支持
    handleKeyboard(e) {
        if (!this.selectedDate) return;

        let newDate = new Date(this.selectedDate);

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                newDate.setDate(newDate.getDate() - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                newDate.setDate(newDate.getDate() + 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                newDate.setDate(newDate.getDate() - 7);
                break;
            case 'ArrowDown':
                e.preventDefault();
                newDate.setDate(newDate.getDate() + 7);
                break;
            case 'Enter':
                e.preventDefault();
                if (this.getInterviewsForDate(this.selectedDate).length > 0) {
                    this.updateSelectedDateInfo();
                }
                return;
            default:
                return;
        }

        // 检查新日期是否在有效范围内
        if (newDate >= this.minDate && newDate <= this.maxDate) {
            // 如果跨月了，更新当前月份
            if (newDate.getMonth() !== this.currentDate.getMonth() ||
                newDate.getFullYear() !== this.currentDate.getFullYear()) {
                this.currentDate = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
                this.render();
            }

            this.selectedDate = newDate;
            this.render();
        }
    }
}

// 创建全局日历实例
window.calendar = new Calendar();

// 添加键盘事件监听
document.addEventListener('keydown', (e) => {
    if (window.app && window.app.currentTab === 'calendar') {
        window.calendar.handleKeyboard(e);
    }
});