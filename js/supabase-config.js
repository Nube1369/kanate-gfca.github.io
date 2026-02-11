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

    // Edge Function URLs (ซ่อน internal URLs ไว้ฝั่ง server)
    AUTH_EDGE_FUNCTION_URL: 'https://edcxqxbktztoovdnshxr.supabase.co/functions/v1/auth',
    SEND_EMAIL_EDGE_FUNCTION_URL: 'https://edcxqxbktztoovdnshxr.supabase.co/functions/v1/send-email',

    // Teams Notification via Supabase Edge Function (ป้องกัน CORS)
    TEAMS_EDGE_FUNCTION_URL: 'https://edcxqxbktztoovdnshxr.supabase.co/functions/v1/teams-notify',

    // GitHub Pages Base URL (สำหรับสร้าง link ในอีเมล)
    BASE_URL: 'https://nube1369.github.io/kanate-gfca.github.io'
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
        const url = `${this.url}/rest/v1/users?select=id,username,role,created_at`;
        const response = await fetch(url, { headers: this.headers });
        return response.json();
    }

    async login(username, password) {
        const response = await fetch(SUPABASE_CONFIG.AUTH_EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.key}`
            },
            body: JSON.stringify({ action: 'login', username, password })
        });
        const result = await response.json();

        if (result.success) {
            const token = this.generateToken();
            sessionStorage.setItem('authToken', token);
            sessionStorage.setItem('authUser', result.username);
            sessionStorage.setItem('authRole', result.role || 'admin');
            return { success: true, token, username: result.username, role: result.role };
        }
        return { success: false, message: result.message || 'Invalid credentials' };
    }

    async addUser(username, password) {
        const response = await fetch(SUPABASE_CONFIG.AUTH_EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.key}`
            },
            body: JSON.stringify({ action: 'addUser', username, password })
        });
        return response.json();
    }

    async updateUser(userId, username, password) {
        const response = await fetch(SUPABASE_CONFIG.AUTH_EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.key}`
            },
            body: JSON.stringify({ action: 'updateUser', userId, username, password })
        });
        return response.json();
    }

    async deleteUser(userId) {
        const response = await fetch(SUPABASE_CONFIG.AUTH_EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.key}`
            },
            body: JSON.stringify({ action: 'deleteUser', userId })
        });
        return response.json();
    }

    // ==================== EMAIL WEBHOOKS ====================

    async sendEvaluationEmail(ticket) {
        const evaluationUrl = `${SUPABASE_CONFIG.BASE_URL}/evaluate.html?caseId=${ticket.case_id}`;

        try {
            const response = await fetch(SUPABASE_CONFIG.SEND_EMAIL_EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.key}`
                },
                body: JSON.stringify({
                    type: 'evaluation',
                    email: ticket.submitter_name,
                    caseId: ticket.case_id,
                    submitterName: ticket.submitter_name,
                    problemDetails: ticket.problem_details,
                    submissionDate: ticket.submission_date,
                    submissionTime: ticket.submission_time,
                    evaluationUrl: evaluationUrl
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Failed - only update status with error, don't update timestamp
                await this.updateTicket(ticket.case_id, {
                    email_status: `Failed: ${errorText.substring(0, 100)}`
                });
                return { success: false, message: errorText };
            }

            const result = await response.json();

            if (result.success) {
                // Success - update everything
                const now = new Date();
                const thaiDate = this.getThaiDateTime(now);
                await this.updateTicket(ticket.case_id, {
                    email_status: 'Sent',
                    last_email_sent_date: thaiDate.date,
                    last_email_sent_time: thaiDate.time,
                    email_send_count: (ticket.email_send_count || 0) + 1
                });
            } else {
                // n8n returned failure - only update status with error
                await this.updateTicket(ticket.case_id, {
                    email_status: `Failed: ${result.message || 'Unknown error'}`
                });
            }

            return result;
        } catch (error) {
            // Network error - only update status, don't update timestamp
            await this.updateTicket(ticket.case_id, {
                email_status: `Failed: ${error.message}`
            });
            return { success: false, message: error.message };
        }
    }

    async sendProblemFollowupEmail(ticket) {
        const followupUrl = `${SUPABASE_CONFIG.BASE_URL}/problem-followup.html?caseId=${ticket.case_id}`;

        try {
            const response = await fetch(SUPABASE_CONFIG.SEND_EMAIL_EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.key}`
                },
                body: JSON.stringify({
                    type: 'problem-followup',
                    email: ticket.submitter_name,
                    caseId: ticket.case_id,
                    problem: ticket.problem_details,
                    closedDate: ticket.closed_date,
                    followupUrl: followupUrl
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Failed - only update status with error
                await this.updateTicket(ticket.case_id, {
                    email_problem_status: `Failed: ${errorText.substring(0, 100)}`
                });
                return { success: false, message: errorText };
            }

            const result = await response.json();

            // Only update with timestamp when success
            const now = new Date();
            const thaiDate = this.getThaiDateTime(now);
            await this.updateTicket(ticket.case_id, {
                email_problem_status: result.success ? `SENT: ${thaiDate.date} ${thaiDate.time}` : `Failed: ${result.message || 'Unknown error'}`
            });

            return result;
        } catch (error) {
            // Network error - only update status with error
            await this.updateTicket(ticket.case_id, {
                email_problem_status: `Failed: ${error.message}`
            });
            return { success: false, message: error.message };
        }
    }

    async sendTeamsNotification(ticket, type = 'new') {
        try {
            const response = await fetch(SUPABASE_CONFIG.TEAMS_EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.key}`
                },
                body: JSON.stringify({ ticket, type })
            });

            const result = await response.json();
            return result;
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
        sessionStorage.removeItem('authRole');
    }

    getCurrentUser() {
        return sessionStorage.getItem('authUser');
    }

    getCurrentRole() {
        return sessionStorage.getItem('authRole') || 'admin';
    }
}

// Export global instance
const supabase = new SupabaseClient();
