import { EventBus } from "@/utils/eventBus";

class WebSocketService {
  constructor() {
    this.ws = null;
    this.messageHandlers = new Set();
    this.isConnecting = false;
    this.connectionPromise = null;
  }

  connect() {
    if (this.isConnecting) {
      return this.connectionPromise;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // --- 【修改开始】获取当前用户ID并拼接到 URL ---
        let user = JSON.parse(localStorage.getItem("honey-user") || "{}");
        let userId = user.id;

        // 如果没有登录（没有ID），暂时不连或者连了也没法收定向消息
        // 这里假设一定有 ID，或者是游客
        const wsUrl = userId
          ? `ws://localhost:9090/api/ws/user?userId=${userId}`
          : "ws://localhost:9090/api/ws/user";

        this.ws = new WebSocket(wsUrl);
        // --- 【修改结束】 ---

        this.ws.onopen = () => {
          console.log("WebSocket连接成功");
          this.isConnecting = false;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // 1. 处理用户更新 (防顶号逻辑保持不变)
            if (data.type === "USER_UPDATE") {
              const currentUser = JSON.parse(
                localStorage.getItem("honey-user") || "{}",
              );
              if (String(currentUser.id) === String(data.user.id)) {
                console.log("收到自己的更新消息，更新本地缓存", data.user);
                localStorage.setItem("honey-user", JSON.stringify(data.user));
                this.messageHandlers.forEach((handler) => handler(data.user));
              }
            }

            // 2. 处理密码更新 (保持不变)
            else if (data.type === "PASSWORD_UPDATE") {
              const currentUser = JSON.parse(
                localStorage.getItem("honey-user") || "{}",
              );
              if (String(currentUser.id) === String(data.userId)) {
                localStorage.removeItem("honey-user");
                EventBus.$emit("logout"); // 如果你有这个逻辑
                window.location.reload(); // 或者直接刷新强制登出
              }
            }

            // 3. 【核心修复】转发所有业务消息给 Vue 组件
            // 之前你漏掉了 ACCEPT_SERVICE 和 END_SERVICE，导致界面没反应
            else {
              // 只要不是上面的系统级消息，统统发给 ChatPart.vue 处理
              // 包含: CHAT_MESSAGE, REQUEST_HUMAN, ACCEPT_SERVICE, END_SERVICE
              this.messageHandlers.forEach((handler) => handler(data));
            }
          } catch (error) {
            console.error("处理WebSocket消息失败:", error);
          }
        };

        this.ws.onclose = () => {
          console.log("WebSocket连接关闭");
          this.isConnecting = false;
          this.ws = null;
          setTimeout(() => this.connect(), 3000);
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket错误:", error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        console.error("建立WebSocket连接失败:", error);
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // 保持不变
  sendUserUpdate(user) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: "USER_UPDATE",
        user: user,
      });
      console.log("发送用户更新消息:", message);
      this.ws.send(message);
    } else {
      console.error("WebSocket未连接");
    }
  }

  // 保持不变
  sendPasswordUpdate(user) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: "PASSWORD_UPDATE",
        userId: user.id,
        timestamp: new Date().getTime(),
      });
      this.ws.send(message);
    } else {
      console.error("WebSocket未连接");
    }
  }

  // 【新增】发送聊天消息
  sendChatMessage(msgData) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // 组装消息体，后端可以用同一个类接收，或者用Map接收
      // 建议结构：{ type: 'CHAT_MESSAGE', senderId: 1, receiverId: 2, content: 'xx' }
      const message = JSON.stringify({
        type: "CHAT_MESSAGE",
        ...msgData,
      });
      console.log("发送聊天消息:", message);
      this.ws.send(message);
    } else {
      console.error("WebSocket未连接");
      // 可以选择在这里尝试重连
      this.connect();
    }
  }

  addMessageHandler(handler) {
    if (typeof handler === "function") {
      this.messageHandlers.add(handler);
    }
  }

  removeMessageHandler(handler) {
    this.messageHandlers.delete(handler);
  }
}

export const webSocketService = new WebSocketService();
