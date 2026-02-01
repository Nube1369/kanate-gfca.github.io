// =============================================
// IT Helpdesk - Supabase Configuration
// =============================================
// วิธีใช้: แก้ไข SUPABASE_URL และ SUPABASE_ANON_KEY ด้านล่าง
// =============================================

const SUPABASE_CONFIG = {
    // ⚠️ แก้ไขค่านี้ให้ตรงกับ Supabase project ของคุณ
    // หาได้จาก: Supabase Dashboard > Settings > API
    URL: 'https://edcxqxbktztoovdnshxr.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3hxeGJrdHp0b292ZG5zaHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NzEyNjQsImV4cCI6MjA4NTM0NzI2NH0.hUEm4xN0XmBJknUgBry59bqebI9MuLg3hpD63tlhFW0',

    // n8n Webhook URLs
    // ⚠️ แก้ไขค่านี้ให้ตรงกับ n8n instance ของคุณ
    N8N_EVALUATION_EMAIL_WEBHOOK: 'https://YOUR_N8N_URL/webhook/evaluation-email',
    N8N_FOLLOWUP_EMAIL_WEBHOOK: 'https://YOUR_N8N_URL/webhook/problem-followup-email',

    // Teams Webhook URL (ใช้ค่าเดิม)
    TEAMS_WEBHOOK_URL: 'https://gfca01.webhook.office.com/webhookb2/de97901a-eefb-492a-8fb7-c03c603f6195@19af367e-c732-4ec7-8827-53efe436e9b4/IncomingWebhook/b3b24608d3b947228730d9c82a30262f/f3d1fd26-08ff-4a9f-abe5-849e27434f09/V2vUwqPWN-YVmEAjezmU9cTCSoI9WjUyLZpcOgGGbvNZI1',

    // GitHub Pages Base URL (สำหรับสร้าง link ในอีเมล)
    BASE_URL: 'https://nube1369.github.io/gfca-it-by-kanate-h'
};

// Supabase Client
class SupabaseClient {
    constructor() {
        this.url = SUPABASE_CONFIG.URL;
        this.key = SUPABASE_CONFIG.ANON_KEY;
        this.headers = {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    // ==================== TICKETS ====================

    async getTickets(lastUpdated = null) {
        let url = `${this.url}/rest/v1/tickets?select=*&order=created_at.desc`;
        if (lastUpdated) {
            url += `&last_updated=gt.${lastUpdated}`;
        }
        const response = await fetch(url, { headers: this.headers });
        return response.json();
    }

    async getTicketByCaseId(caseId) {
        const url = `${this.url}/rest/v1/tickets?case_id=eq.${caseId}&select=*`;
        const response = await fetch(url, { headers: this.headers });
        const data = await response.json();
        return data.length > 0 ? data[0] : null;
    }

    async createTicket(ticketData) {
        const url = `${this.url}/rest/v1/tickets`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(ticketData)
        });
        return response.json();
    }

    async updateTicket(caseId, updates) {
        const url = `${this.url}/rest/v1/tickets?case_id=eq.${caseId}`;
        const response = await fetch(url, {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify({
                ...updates,
                last_updated: Date.now()
            })
        });
        return response.json();
    }

    async closeTicket(caseId, resolutionComment, closedBy) {
        const now = new Date();
        const thaiDate = this.getThaiDateTime(now);

        return this.updateTicket(caseId, {
            status: 'Closed',
            closed_date: thaiDate.date,
            closed_time: thaiDate.time,
            resolution_comment: resolutionComment,
            closed_by: closedBy
        });
    }

    async submitEvaluation(caseId, scoreQ, scoreD, scoreC, comment) {
        return this.updateTicket(caseId, {
            score_q: parseInt(scoreQ),
            score_d: parseInt(scoreD),
            score_c: parseInt(scoreC),
            evaluation_comment: comment
        });
    }

    async submitProblemFollowup(caseId, problemStatus, comment) {
        const now = new Date();
        const thaiDate = this.getThaiDateTime(now);
        const statusText = problemStatus === 'ok' ? 'ใช้งานได้ปกติแล้ว' : 'ยังมีปัญหาอยู่';
        const fullComment = `[${thaiDate.date} ${thaiDate.time}] ${statusText}${comment ? ': ' + comment : ''}`;

        return this.updateTicket(caseId, {
            comment_problem: fullComment
        });
    }

    // ==================== USERS ====================

    async getUsers() {
        const url = `${this.url}/rest/v1/users?select=id,username,created_at`;
        const response = await fetch(url, { headers: this.headers });
        return response.json();
    }

    async login(username, password) {
        const url = `${this.url}/rest/v1/users?username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}&select=id,username`;
        const response = await fetch(url, { headers: this.headers });
        const users = await response.json();

        if (users.length > 0) {
            const token = this.generateToken();
            sessionStorage.setItem('authToken', token);
            sessionStorage.setItem('authUser', username);
            return { success: true, token, username };
        }
        return { success: false, message: 'Invalid credentials' };
    }

    async addUser(username, password) {
        const url = `${this.url}/rest/v1/users`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            return { success: true };
        }
        const error = await response.json();
        return { success: false, message: error.message || 'Failed to add user' };
    }

    async updateUser(userId, username, password) {
        const url = `${this.url}/rest/v1/users?id=eq.${userId}`;
        const updates = { username };
        if (password) updates.password = password;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify(updates)
        });

        return { success: response.ok };
    }

    async deleteUser(userId) {
        const url = `${this.url}/rest/v1/users?id=eq.${userId}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: this.headers
        });

        return { success: response.ok };
    }

    // ==================== EMAIL WEBHOOKS ====================

    async sendEvaluationEmail(ticket) {
        const evaluationUrl = `${SUPABASE_CONFIG.BASE_URL}/evaluate.html?caseId=${ticket.case_id}`;

        const response = await fetch(SUPABASE_CONFIG.N8N_EVALUATION_EMAIL_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ticket.submitter_name,
                caseId: ticket.case_id,
                submitterName: ticket.submitter_name,
                problemDetails: ticket.problem_details,
                submissionDate: ticket.submission_date,
                submissionTime: ticket.submission_time,
                evaluationUrl: evaluationUrl
            })
        });

        const result = await response.json();

        // Update email status in database
        const now = new Date();
        const thaiDate = this.getThaiDateTime(now);
        await this.updateTicket(ticket.case_id, {
            email_status: result.success ? 'Sent' : 'Failed',
            last_email_sent_date: thaiDate.date,
            last_email_sent_time: thaiDate.time,
            email_send_count: (ticket.email_send_count || 0) + 1
        });

        return result;
    }

    async sendProblemFollowupEmail(ticket) {
        const followupUrl = `${SUPABASE_CONFIG.BASE_URL}/problem-followup.html?caseId=${ticket.case_id}`;

        const response = await fetch(SUPABASE_CONFIG.N8N_FOLLOWUP_EMAIL_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ticket.submitter_name,
                caseId: ticket.case_id,
                problem: ticket.problem_details,
                closedDate: ticket.closed_date,
                followupUrl: followupUrl
            })
        });

        const result = await response.json();

        // Update status
        const now = new Date();
        const thaiDate = this.getThaiDateTime(now);
        await this.updateTicket(ticket.case_id, {
            email_problem_status: result.success ? `SENT: ${thaiDate.date} ${thaiDate.time}` : 'Failed'
        });

        return result;
    }

    async sendTeamsNotification(ticket, type = 'new') {
        const dashboardUrl = `${SUPABASE_CONFIG.BASE_URL}/dashboard.html?ticketId=${ticket.case_id}`;

        let payload;
        if (type === 'new') {
            payload = {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "summary": "IT Helpdesk - แจ้งปัญหาใหม่",
                "themeColor": "0072C6",
                "title": "มีปัญหาใหม่ถูกแจ้งเข้ามา",
                "sections": [{
                    "activityTitle": "แบบฟอร์มแจ้งปัญหา",
                    "activitySubtitle": "มีการส่งคำร้องขอความช่วยเหลือใหม่เข้ามา",
                    "facts": [
                        { "name": "ชื่อผู้แจ้ง", "value": ticket.submitter_name },
                        { "name": "เบอร์ติดต่อกลับ / 3CX", "value": ticket.contact_number },
                        { "name": "รหัสพนักงาน", "value": ticket.department },
                        { "name": "ประเภทปัญหา", "value": ticket.problem_type }
                    ],
                    "text": `**รายละเอียดปัญหา:**\n${ticket.problem_details}\n\n[คลิกเพื่อจัดการงานนี้](${dashboardUrl})`
                }]
            };
        } else {
            payload = {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "summary": "IT Helpdesk - ปิดเคสแล้ว",
                "themeColor": "22C55E",
                "title": "✅ เคสถูกปิดเรียบร้อยแล้ว",
                "sections": [{
                    "activityTitle": "แจ้งปิดเคส IT Helpdesk",
                    "activitySubtitle": `เคส ${ticket.case_id} ได้รับการแก้ไขและปิดเรียบร้อยแล้ว`,
                    "facts": [
                        { "name": "หมายเลขเคส", "value": ticket.case_id },
                        { "name": "ผู้แจ้ง", "value": ticket.submitter_name },
                        { "name": "ประเภทปัญหา", "value": ticket.problem_type },
                        { "name": "วันที่ปิดเคส", "value": `${ticket.closed_date} ${ticket.closed_time}` }
                    ],
                    "text": `**สรุปการแก้ไข:**\n${ticket.resolution_comment || 'ไม่มีหมายเหตุ'}\n\n[คลิกเพื่อดูรายละเอียด](${dashboardUrl})`
                }]
            };
        }

        try {
            await fetch(SUPABASE_CONFIG.TEAMS_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return { success: true };
        } catch (e) {
            console.error('Teams notification failed:', e);
            return { success: false, error: e.message };
        }
    }

    // ==================== HELPERS ====================

    getThaiDateTime(date) {
        const optionsDate = { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Bangkok' };
        const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' };
        return {
            date: date.toLocaleDateString('th-TH', optionsDate),
            time: date.toLocaleTimeString('th-TH', optionsTime)
        };
    }

    generateCaseId() {
        return 'CASE-' + Date.now();
    }

    generateToken() {
        return 'token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    isAuthenticated() {
        return sessionStorage.getItem('authToken') !== null;
    }

    logout() {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('authUser');
    }

    getCurrentUser() {
        return sessionStorage.getItem('authUser');
    }
}

// Export global instance
const supabase = new SupabaseClient();
