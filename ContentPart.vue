<template>
  <div>
    <!-- 使用 flex 布局替代原来的 float，方便对齐 -->
    <div id="content"
      style="background-color: #ffffff; display: flex; justify-content: flex-end; align-items: center; height: 60px; padding-right: 20px;">

      <!-- 【新增】消息通知图标 -->
      <div class="message-icon-wrapper" @click="goToChat">
        <el-badge :is-dot="hasNewMessage" class="item">
          <i class="el-icon-s-comment"></i>
        </el-badge>
      </div>

      <!-- 原有的用户下拉菜单 -->
      <div>
        <el-dropdown>
          <span class="el-dropdown-link">
            当前用户：{{ currentUser.name || '测试人员' }}
            <i class="el-icon-arrow-down el-icon--right"></i>
          </span>
          <el-dropdown-menu slot="dropdown" style="width:160px;text-align: center;">
            <el-dropdown-item @click.native="$router.push('/home/PersonalCenter')">个人中心</el-dropdown-item>
            <el-dropdown-item @click.native="logout">注销</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>

    </div>
  </div>
</template>

<script>
import { EventBus } from '@/utils/eventBus'
import { webSocketService } from '@/utils/websocket'

export default {
  name: "ContentPart",
  data() {
    return {
      currentUser: JSON.parse(localStorage.getItem('honey-user') || '{}'),
      hasNewMessage: false, // 【新增】控制红点显示
    }
  },
  computed: {
    QJuser() {
      return this.$store.state.user
    }
  },
  watch: {
    QJuser(newVal) {
      this.currentUser = newVal
    }
  },
  created() {
    console.log('ContentPart组件创建');

    // 1. 监听 WebSocket 消息（既处理用户更新，后续也处理聊天消息）
    webSocketService.addMessageHandler(this.handleWebSocketMessage);

    // 2. 监听 EventBus (用于组件间通信，比如 ChatPart 也可以触发红点)
    EventBus.$on('show-msg-badge', () => {
      if (this.$route.name !== 'ChatPart') {
        this.hasNewMessage = true;
      }
    });

    EventBus.$on('userPassword_Sender', (user) => {
      webSocketService.sendPasswordUpdate(user);
    })

    EventBus.$on('logout', () => {
      this.logout()
    })
  },
  beforeDestroy() {
    webSocketService.removeMessageHandler(this.handleWebSocketMessage);
  },
  methods: {
    // 【核心修复】统一处理 WebSocket 消息
    handleWebSocketMessage(data) {
      console.log("ContentPart收到消息:", data);

      // 1. 先判断是不是聊天消息/请求人工 (必须先判断这个！)
      if (data.type === 'CHAT_MESSAGE' || data.type === 'REQUEST_HUMAN') {
        // 如果不在聊天页面，显示红点
        if (this.$route.name !== 'ChatPart') {
          this.hasNewMessage = true;
          this.$notify.info({
            title: '新消息',
            message: data.type === 'REQUEST_HUMAN' ? '有用户申请人工服务' : '您收到一条新消息',
            position: 'bottom-right',
            duration: 3000
          });
        }

        // 转发给 ChatPart (通过 EventBus)，防止 ChatPart 没收到
        EventBus.$emit('receive-chat-msg', data);

        // 【重要】处理完聊天消息后，立刻 return！
        // 绝对不能让它往下走去执行 handleUserUpdate，否则会覆盖用户信息导致登出
        return;
      }

      // 2. 如果不是聊天消息，才认为是用户信息更新
      // WebSocketService 里的 USER_UPDATE 逻辑传递过来的是 data.user (没有 type 字段)
      if (data && (data.username || data.name) && !data.type) {
        this.handleUserUpdate(data);
      }
    },

    handleUserUpdate(user) {
      console.log('收到WebSocket用户更新:', user);
      this.$store.dispatch('receiveUserUpdate', user);
    },

    // 【新增】跳转到聊天界面
    goToChat() {
      this.hasNewMessage = false; // 点击即消除红点
      if (this.$route.name !== 'ChatPart') {
        this.$router.push('/home/ChatPart');
      }
    },

    logout() {
      localStorage.removeItem('honey-user')
      this.$router.replace('/')
        .then(() => {
          this.$message.success('退出成功')
        })
        .catch(err => {
          if (err.name === 'NavigationDuplicated') {
            this.$message.success('退出成功')
          } else {
            console.error('导航错误:', err)
          }
        })
    }
  }
};
</script>

<style lang="css" scoped>
#content {
  width: 100%;
  position: relative;
  margin-right: 0;
  /* 增加底部阴影，让顶栏更好看一点 */
  box-shadow: 0 1px 4px rgba(0, 21, 41, .08);
}

/* 【新增】消息图标样式 */
.message-icon-wrapper {
  margin-right: 30px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.3s;
}

.message-icon-wrapper:hover {
  opacity: 0.8;
}

.el-icon-s-comment {
  font-size: 24px;
  color: #5a5e66;
  /* 图标颜色，深灰色 */
}

.el-dropdown-link {
  cursor: pointer;
  font-size: 15px;
  user-select: none;
}

.el-icon-arrow-down {
  font-size: 12px;
}
</style>