<template>
    <div class="chat-container">
        <el-card class="chat-card" :body-style="{ padding: '0px', height: '100%' }">
            <div class="chat-layout">

                <!-- ================= 左侧：用户列表 (仅管理员可见) ================= -->
                <div class="sidebar" v-if="isAdmin">
                    <div class="sidebar-header">待接入用户 ({{ waitingUsers.length }})</div>
                    <div class="user-list">
                        <div v-for="u in waitingUsers" :key="u.id" class="user-item"
                            :class="{ 'active': currentChatUser && currentChatUser.id === u.id }"
                            @click="selectUser(u)">

                            <el-avatar :size="40" :src="u.avatar_url || defaultUserAvatar"></el-avatar>

                            <div class="user-info">
                                <span class="username">{{ u.username }}</span>
                                <!-- 红点提示 -->
                                <el-badge v-if="u.hasNewMsg" is-dot class="new-msg-badge"></el-badge>
                                <!-- 状态标签 -->
                                <el-tag size="mini" v-if="u.serviceStatus === 1" type="warning" effect="dark"
                                    style="margin-left:5px">申请中</el-tag>
                                <el-tag size="mini" v-else-if="u.serviceStatus === 2" type="success" effect="plain"
                                    style="margin-left:5px">服务中</el-tag>
                            </div>
                        </div>
                        <div v-if="waitingUsers.length === 0" class="empty-list">暂无用户</div>
                    </div>
                </div>

                <!-- ================= 右侧：聊天主区域 ================= -->
                <div class="main-area" :class="{ 'full-width': !isAdmin }">

                    <!-- 1. 顶部栏 -->
                    <div class="chat-header">
                        <!-- 标题 -->
                        <span v-if="isAdmin">
                            {{ currentChatUser ? currentChatUser.username : '未选择用户' }}
                            <el-tag v-if="currentStatus === 1" type="warning" size="small">申请人工中</el-tag>
                            <el-tag v-if="currentStatus === 2" type="success" size="small">人工服务中</el-tag>
                        </span>
                        <span v-else>
                            {{ currentStatus === 2 ? '人工客服 (管理员)' : '智能客服 (AI)' }}
                        </span>

                        <!-- ========== 按钮操作区 ========== -->
                        <div style="float: right">
                            <!-- 场景1: 普通用户 & AI模式 -> 申请人工 -->
                            <el-button v-if="!isAdmin && currentStatus === 0" size="mini" type="primary" plain
                                @click="applyHumanService">
                                申请人工服务
                            </el-button>

                            <!-- 场景2: 普通用户 & 申请中 -> 提示等待 -->
                            <el-tag v-if="!isAdmin && currentStatus === 1" type="warning">
                                <i class="el-icon-loading"></i> 排队中，请稍候...
                            </el-tag>

                            <!-- 场景3: 普通用户 & 服务中 -> 结束服务 -->
                            <el-button v-if="!isAdmin && currentStatus === 2" size="mini" type="danger" plain
                                @click="endService">
                                结束本次服务
                            </el-button>

                            <!-- 场景4: 管理员 & 对方申请中 -> 接入 -->
                            <el-button v-if="isAdmin && currentChatUser && currentStatus === 1" size="mini"
                                type="success" @click="acceptService">
                                接入服务
                            </el-button>

                            <!-- 场景5: 管理员 & 服务中 -> 结束 -->
                            <el-button v-if="isAdmin && currentChatUser && currentStatus === 2" size="mini"
                                type="danger" @click="endService">
                                结束服务
                            </el-button>
                        </div>
                    </div>

                    <!-- 2. 消息滚动区 -->
                    <div class="message-box" ref="msgBox">
                        <div v-if="isAdmin && !currentChatUser" class="empty-tip">
                            <i class="el-icon-chat-dot-round" style="font-size: 48px; color: #ddd;"></i>
                            <p>请在左侧选择一个用户开始回复</p>
                        </div>

                        <div v-else>
                            <div v-for="(msg, index) in displayMessages" :key="index" class="msg-row"
                                :class="msg.isMe ? 'msg-right' : 'msg-left'">

                                <el-avatar shape="square" :size="36"
                                    :src="msg.isMe ? myAvatar : (isAdmin && currentChatUser ? currentChatUser.avatar_url : targetAvatar)"
                                    @error="errorHandler">
                                    <img :src="msg.isMe ? defaultAgentAvatar : defaultUserAvatar" />
                                </el-avatar>

                                <div class="msg-content">
                                    <div class="msg-text">{{ msg.content }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 3. 底部输入区 -->
                    <div class="input-area" v-if="!isAdmin || currentChatUser">
                        <el-input type="textarea" :rows="3" resize="none" placeholder="请输入内容... (Enter发送)"
                            v-model="inputMsg" @keyup.enter.native="sendMessage">
                        </el-input>
                        <div class="btn-wrapper">
                            <el-button type="primary" size="small" @click="sendMessage">发送</el-button>
                        </div>
                    </div>

                </div>
            </div>
        </el-card>
    </div>
</template>

<script>
import request from "@/utils/request";
import { webSocketService } from '@/utils/websocket';

export default {
    name: "ChatPart",
    data() {
        return {
            user: {},
            isAdmin: false,
            inputMsg: "",

            // 当前状态：0=AI, 1=申请中, 2=人工中
            // 如果是管理员，这个状态代表“当前选中的那个用户的状态”
            currentStatus: 0,

            waitingUsers: [],
            currentChatUser: null,
            messages: [],

            defaultUserAvatar: "https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png",
            defaultAgentAvatar: "https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png",
            myAvatar: "",
            targetAvatar: ""
        };
    },
    computed: {
        displayMessages() {
            if (this.isAdmin) {
                return this.currentChatUser ? this.currentChatUser.msgs : [];
            } else {
                return this.messages;
            }
        }
    },
    created() {
        this.initUser();
        webSocketService.addMessageHandler(this.onWebSocketMessage);
    },
    beforeDestroy() {
        webSocketService.removeMessageHandler(this.onWebSocketMessage);
    },
    mounted() {
        if (!this.isAdmin) {
            // 普通用户: 加载历史 + 获取自己的状态
            this.loadHistory(4);
            this.checkMyStatus();
        } else {
            // 管理员: 加载列表
            this.getContacts();
        }
        this.scrollToBottom();
    },
    methods: {
        initUser() {
            let storedUser = JSON.parse(localStorage.getItem("honey-user") || "{}");
            this.user = storedUser;
            // 请确认你的管理员 ID 是 4
            this.isAdmin = (String(this.user.id) === '4');

            this.myAvatar = this.user.avatar_url || (this.isAdmin ? this.defaultAgentAvatar : this.defaultUserAvatar);

            // 普通用户默认对方是AI头像
            if (!this.isAdmin) {
                this.targetAvatar = this.defaultAgentAvatar;
            }
        },

        errorHandler() { return true; },

        // ================== API 交互 ==================

        // 1. 检查状态 (仅普通用户用)
        checkMyStatus() {
            request.get("/chat/status", { params: { userId: this.user.id } }).then(res => {
                this.currentStatus = res.data || 0;
            });
        },

        // 2. 获取联系人 (管理员用)
        getContacts() {
            if (!this.isAdmin) return;
            request.get("/chat/contacts", { params: { adminId: this.user.id } }).then(res => {
                const list = res.data || res;
                if (Array.isArray(list)) {
                    this.waitingUsers = list.map(item => ({
                        id: item.id,
                        username: item.username || ('用户' + item.id),
                        avatar_url: item.avatar_url,
                        msgs: [],
                        hasNewMsg: false,
                        serviceStatus: 0 // 列表里先默认0，点击时再更新
                    }));
                    // 选中第一个
                    if (this.waitingUsers.length > 0) {
                        this.selectUser(this.waitingUsers[0]);
                    }
                }
            });
        },

        // 3. 加载历史
        loadHistory(targetUserId) {
            if (!targetUserId) return;
            request.get("/chat/history", {
                params: { userId1: this.user.id, userId2: targetUserId }
            }).then(res => {
                let list = [];
                if (Array.isArray(res)) list = res;
                else if (res && Array.isArray(res.data)) list = res.data;

                const historyMsgs = list.map(item => ({
                    content: item.content,
                    isMe: String(item.senderId) === String(this.user.id),
                    type: 'human'
                }));

                if (this.isAdmin) {
                    if (this.currentChatUser) this.currentChatUser.msgs = historyMsgs;
                } else {
                    this.messages = historyMsgs;
                    // 如果没历史且是AI模式，显示欢迎语
                    if (this.messages.length === 0 && this.currentStatus === 0) {
                        this.messages.push({ content: "您好，我是AI智能客服，请问有什么可以帮您？", isMe: false, type: 'ai' });
                    }
                }
                this.scrollToBottom();
            });
        },

        // ================== 核心操作：状态流转 ==================

        // 申请人工 (用户点)
        applyHumanService() {
            this.$confirm('确认申请人工客服介入吗?', '提示', { type: 'info' }).then(() => {
                this.currentStatus = 1; // 变为申请中
                this.messages.push({ content: "系统: 已申请人工，请等待管理员接入...", isMe: false, type: 'system' });

                webSocketService.sendChatMessage({
                    type: 'REQUEST_HUMAN',
                    userId: this.user.id
                });
            });
        },

        // 接入服务 (管理员点)
        acceptService() {
            if (!this.currentChatUser) return;
            this.currentStatus = 2; // 变为服务中
            this.currentChatUser.serviceStatus = 2; // 更新列表显示

            this.currentChatUser.msgs.push({ content: "系统: 您已接入该用户", isMe: true, type: 'system' });

            webSocketService.sendChatMessage({
                type: 'ACCEPT_SERVICE',
                userId: this.currentChatUser.id
            });
        },

        // 结束服务 (双方都能点)
        endService() {
            this.$confirm('确认结束本次人工服务吗?', '提示', { type: 'warning' }).then(() => {
                this.currentStatus = 0; // 回归AI

                if (this.isAdmin) {
                    if (this.currentChatUser) {
                        this.currentChatUser.serviceStatus = 0;
                        this.currentChatUser.msgs.push({ content: "系统: 服务已结束", isMe: true, type: 'system' });
                        webSocketService.sendChatMessage({ type: 'END_SERVICE', userId: this.currentChatUser.id });
                    }
                } else {
                    this.messages.push({ content: "系统: 服务已结束，已切换回AI模式", isMe: false, type: 'system' });
                    webSocketService.sendChatMessage({ type: 'END_SERVICE', userId: this.user.id });
                }
            });
        },

        // ================== 消息处理 ==================
        sendMessage() {
            if (!this.inputMsg.trim()) return;
            const content = this.inputMsg;
            const uiMsg = { content: content, isMe: true, type: 'human' };

            if (this.isAdmin) {
                if (!this.currentChatUser) return;
                this.currentChatUser.msgs.push(uiMsg);
                webSocketService.sendChatMessage({
                    senderId: this.user.id,
                    receiverId: this.currentChatUser.id,
                    content: content
                });
            } else {
                // --- 普通用户发送 ---
                this.messages.push(uiMsg);

                // 【关键】必须严格判断 currentStatus
                // 因为上面 onWebSocketMessage 已经修好了，这里获取到的 status 绝对是实时的
                if (this.currentStatus === 2) {
                    webSocketService.sendChatMessage({
                        senderId: this.user.id,
                        receiverId: 4,
                        content: content
                    });
                } else {
                    // 状态是 0(AI) 或 1(申请中)，都拦截，不发给管理员
                    this.simulateAIResponse(content);
                }
            }
            this.inputMsg = "";
            this.scrollToBottom();
        },

        simulateAIResponse(question) {
            this.messages.push({ content: "AI正在思考...", isMe: false, type: 'ai', loading: true });
            this.scrollToBottom();

            // 传入 userId 以便后端维护上下文记忆
            request.get("/chat/ai", {
                params: {
                    userId: this.user.id,
                    question: question
                }
            }).then(res => {
                this.messages = this.messages.filter(m => !m.loading);

                const answer = res.data || "我没听懂，请再说一遍";
                this.messages.push({ content: answer, isMe: false, type: 'ai' });
                this.scrollToBottom();
            });
        },

        // 接收 WebSocket 消息
        // 监听 WebSocket 消息的核心入口
        onWebSocketMessage(data) {
            console.log("前端收到WS消息:", data); // F12 看这里，确认收到了没

            // ----------------------
            // 1. 聊天消息
            // ----------------------
            if (data.type === 'CHAT_MESSAGE') {
                this.handleChatMessage(data);
            }

            // ----------------------
            // 2. 申请人工 (管理员收到)
            // ----------------------
            else if (data.type === 'REQUEST_HUMAN') {
                if (this.isAdmin) {
                    console.log("管理员收到：用户申请人工");
                    this.updateUserStatus(data.userId, 1, "用户申请接入");
                    this.$notify.info({ title: '新服务', message: '有用户申请人工服务' });
                }
            }

            // ----------------------
            // 3. 接入服务 (【重点】用户收到)
            // ----------------------
            else if (data.type === 'ACCEPT_SERVICE') {
                // 如果我是普通用户，且管理员接入了我
                if (!this.isAdmin) {
                    console.log("用户收到：管理员已接入！切换状态...");
                    this.currentStatus = 2; // 【关键】强制切换为“服务中”
                    this.messages.push({
                        content: "系统: 管理员已接入，现在可以开始人工对话了",
                        isMe: false,
                        type: 'system'
                    });
                    this.scrollToBottom();
                }
                // 如果我是管理员，虽然是我自己点的，但为了多端同步，也更新一下状态
                else if (this.isAdmin) {
                    this.updateUserStatus(data.userId, 2, "您已接入该用户");
                }
            }

            // ----------------------
            // 4. 结束服务 (双方收到)
            // ----------------------
            else if (data.type === 'END_SERVICE') {
                console.log("收到结束服务指令，涉及用户ID:", data.userId);

                if (this.isAdmin) {
                    // 管理员收到：更新左侧列表状态
                    this.updateUserStatus(data.userId, 0, "用户结束了服务");
                } else {
                    // 普通用户收到：强制切回AI
                    // 判断一下是不是关的我的服务 (防止 bug)
                    if (String(data.userId) === String(this.user.id)) {
                        this.currentStatus = 0; // 【关键】强制切回AI模式
                        this.messages.push({
                            content: "系统: 本次人工服务已结束",
                            isMe: false,
                            type: 'system'
                        });
                        this.scrollToBottom();
                    }
                }
            }
        },

        // 辅助: 管理员更新左侧用户状态
        updateUserStatus(userId, status, tip) {
            // 在列表里找这个用户
            let u = this.waitingUsers.find(u => String(u.id) === String(userId));

            if (u) {
                u.serviceStatus = status; // 更新列表上的标签
                u.hasNewMsg = true;       // 亮红点

                // 【关键】如果管理员当前正打开着这个人的聊天窗口
                if (this.currentChatUser && String(this.currentChatUser.id) === String(userId)) {
                    console.log("管理员当前窗口状态同步更新 ->", status);
                    this.currentStatus = status; // 更新右上角的按钮状态

                    // 只有当提示语不一样时才推，防止重复
                    let lastMsg = this.currentChatUser.msgs[this.currentChatUser.msgs.length - 1];
                    if (!lastMsg || lastMsg.content !== `系统: ${tip}`) {
                        this.currentChatUser.msgs.push({ content: `系统: ${tip}`, isMe: false, type: 'system' });
                    }
                    this.scrollToBottom();
                }
            } else {
                // 如果列表里没这个人，刷新列表获取最新状态
                this.getContacts();
            }
        },

        handleChatMessage(data) {
            const myId = String(this.user.id);
            const senderId = String(data.senderId);
            if (senderId === myId) return;

            if (this.isAdmin) {
                let targetUser = this.waitingUsers.find(u => String(u.id) === senderId);
                if (targetUser) {
                    targetUser.msgs.push({ content: data.content, isMe: false, type: 'human' });
                    if (!this.currentChatUser || String(this.currentChatUser.id) !== senderId) {
                        targetUser.hasNewMsg = true;
                    }
                }
            } else {
                this.messages.push({ content: data.content, isMe: false, type: 'human' });
            }
            this.scrollToBottom();
        },

        selectUser(u) {
            this.currentChatUser = u;
            u.hasNewMsg = false;
            this.loadHistory(u.id);

            // 点击用户时，去后台查一下他现在的真实状态
            request.get("/chat/status", { params: { userId: u.id } }).then(res => {
                u.serviceStatus = res.data || 0;
                this.currentStatus = u.serviceStatus;
            });

            this.scrollToBottom();
        },

        scrollToBottom() {
            this.$nextTick(() => {
                const div = this.$refs.msgBox;
                if (div) div.scrollTop = div.scrollHeight;
            });
        }
    }
};
</script>

<style scoped>
/* 样式保持不变，复用上一版的即可 */
.chat-container {
    height: 85vh;
    padding: 10px;
    box-sizing: border-box;
}

.chat-card {
    height: 100%;
    border-radius: 8px;
    overflow: hidden;
}

.chat-layout {
    display: flex;
    height: 100%;
}

.sidebar {
    width: 260px;
    background: #fff;
    border-right: 1px solid #e6e6e6;
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    height: 50px;
    line-height: 50px;
    padding-left: 15px;
    font-weight: bold;
    background: #f7f7f7;
    border-bottom: 1px solid #eee;
    color: #333;
}

.user-list {
    flex: 1;
    overflow-y: auto;
}

.user-list::-webkit-scrollbar {
    width: 6px;
}

.user-list::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
}

.user-item {
    display: flex;
    align-items: center;
    padding: 12px 15px;
    cursor: pointer;
    transition: background 0.2s;
    border-bottom: 1px solid #f0f0f0;
}

.user-item:hover {
    background: #f5f7fa;
}

.user-item.active {
    background: #ecf5ff;
    border-right: 3px solid #409EFF;
}

.user-info {
    margin-left: 12px;
    flex: 1;
    display: flex;
    align-items: center;
    overflow: hidden;
}

.username {
    font-size: 14px;
    color: #333;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 5px;
}

.empty-list {
    text-align: center;
    color: #999;
    margin-top: 50px;
    font-size: 13px;
}

.main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
    min-width: 0;
}

.full-width {
    width: 100%;
}

.chat-header {
    height: 50px;
    line-height: 50px;
    padding: 0 20px;
    background: #fff;
    border-bottom: 1px solid #ddd;
    font-size: 16px;
    font-weight: bold;
}

.message-box {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
}

.message-box::-webkit-scrollbar {
    width: 6px;
}

.message-box::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
}

.empty-tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
}

.msg-row {
    display: flex;
    margin-bottom: 20px;
    align-items: flex-start;
}

.msg-right {
    flex-direction: row-reverse;
}

.msg-left {
    flex-direction: row;
}

.msg-content {
    max-width: 70%;
    padding: 10px 14px;
    border-radius: 6px;
    margin: 0 12px;
    word-break: break-all;
    line-height: 1.5;
    font-size: 14px;
    position: relative;
}

.msg-left .msg-content {
    background: #fff;
    color: #333;
    border: 1px solid #eee;
}

.msg-right .msg-content {
    background: #95ec69;
    color: #000;
}

.input-area {
    height: 160px;
    background: #fff;
    border-top: 1px solid #ddd;
    padding: 10px 20px;
    display: flex;
    flex-direction: column;
}

::v-deep .el-textarea__inner {
    border: none;
    padding: 10px 0;
    font-family: inherit;
}

.btn-wrapper {
    text-align: right;
    margin-top: 10px;
}
</style>