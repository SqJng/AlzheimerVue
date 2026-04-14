<template>
  <div>
    <div class="box" style="background-color: #ffffff;">

      <!-- 头像 -->
      <div class="row">
        <span>头像</span>
        <div class="input-group">
          <img :src="avatar_url" width="148px" height="148px" />
          <el-upload class="avatar-uploader" action="http://localhost:9090/file/uploadAvatar_url"
            :headers="{ token: currentUser.token }" :show-file-list="false"
            :on-success="(URL) => upload_avatar_url_to_database(URL)" >
            <el-button type="primary" style="margin-left: 10px ; margin-top: 100px">上传头像</el-button>
          </el-upload>
        </div>
      </div>

      <!-- 用户名 -->
      <div class="row">
        <span>用户名</span>
        <div class="input-group">
          <div>
            <el-input class="shurukuang-length" v-model="name"></el-input>
          </div>
          <el-button class="update-btn" type="primary" :disabled="!isNameChanged" @click="updateName">
            修改
          </el-button>
        </div>
      </div>

      <!-- 账号 -->
      <div class="row">
        <span>账号</span>
        <div>
          <div style="line-height: 32px; padding: 0 15px;">
            {{ username }}
          </div>
        </div>
      </div>

      <!-- 原密码 -->
      <div class="row">
        <span>原密码</span>
        <div class="input-group">
          <div>
            <el-input type="password" v-model="password" class="shurukuang-length"></el-input>
          </div>
        </div>
      </div>
      <!-- 密码 -->
      <div class="row">
        <span>新密码</span>
        <div class="input-group">
          <div>
            <el-input type="password" v-model="newpassword" class="shurukuang-length"></el-input>
          </div>
        </div>
      </div>
      <!-- 确认密码 -->
      <div class="row">
        <span>确认密码</span>
        <div class="input-group">
          <div>
            <el-input type="password" v-model="checkPass" class="shurukuang-length"></el-input>
          </div>

        </div>
      </div>

      <div class="row">
        <span></span> <!-- 空的 span 保持对齐 -->
        <div>
          如修改密码，已登陆账号会被强制登出。

        </div>
      </div>

      <div class="row">
        <span></span> <!-- 空的 span 保持对齐 -->
        <el-button @click="updatePassword" class="shurukuang-length" type="danger" style="width: auto">
          修改密码
        </el-button>
      </div>

      <!-- 绑定人 -->
      <div class="row">
        <span>绑定人</span>
        <div class="input-group">
          <div>
            <el-input v-model="subject" class="shurukuang-length" disabled></el-input>
          </div>
        </div>
      </div>

      <div class="row">
        <span></span>
        <el-button @click="reset" class="shurukuang-length" type="primary" style="width: auto">
          重置
        </el-button>
      </div>


    </div>
  </div>
</template>

<script>
import request from '@/utils/request'
import router from '@/router';
import { EventBus } from '@/utils/eventBus'
import { webSocketService } from '@/utils/websocket'
//import { mapActions } from 'vuex'

export default {
  name: "PersonalCenter",
  data() {
    return {
      currentUser: JSON.parse(localStorage.getItem('honey-user') || '{}'),
      isNameChanged: false,
      id: "",
      name: "",
      username: "",
      password: "",
      newpassword: "",
      checkPass: "",
      subject: "",
      avatar_url: "",


    };
  },
  created() {
    this.getData();

    // 接收端
    // EventBus.$on('userUpdated_Receiver', (user) => {
    //   console.log('4-p')//websocket发送来的
    //   this.currentUser = user // 只改了接收端
    //   this.getData(); // 响应式处理
    // })
    // 添加WebSocket消息处理器
    webSocketService.addMessageHandler(this.handleUserUpdate);
  },
  
  beforeDestroy() {
    // 移除WebSocket消息处理器
    webSocketService.removeMessageHandler(this.handleUserUpdate);
  },
  // -----------------------------------------------------------------------
  watch: {
    name(newVal) {
      this.isNameChanged = newVal !== this.currentUser.name;
    },
  },
  methods: {
    //...mapActions(['updateUser']),
    
    getData() {
      this.currentUser = JSON.parse(localStorage.getItem('honey-user') || '{}'),
        this.name = this.currentUser.name,
        this.username = this.currentUser.username,
        this.subject = this.currentUser.subject,
        this.avatar_url = this.currentUser.avatar_url,
        this.password = "",
        this.newpassword = "",
        this.checkPass = ""
    },
    
    // WebSocket消息处理函数
    handleUserUpdate(user) {
      console.log('PersonalCenter收到用户更新:', user);
      this.currentUser = user;
      this.getData();
    },
    
    upload_avatar_url_to_database(URL) {
      console.log('返回的URL:', URL);
      request.post("/user/uploadAvatar", null, {
        params: {
          id: this.currentUser.id,
          avatar_url: URL
        }
      }).then(() => {
        // 更新本地存储和Vuex
        const user = JSON.parse(localStorage.getItem('honey-user') || '{}');
        user.avatar_url = URL;
        
        // 使用Vuex更新用户信息（同时会通过WebSocket广播）
        this.updateUser(user);
        
        this.getData();
        this.$message.success('头像上传成功');
      }).catch(error => {
        console.error('更新头像失败:', error);
        this.$message.error('更新头像失败');
      });
    },
    
    updateName() {
      if (!this.name) {
        this.$message.error('用户名不能为空')
        return false
      } else if (this.name.length > 20) {
        this.$message.error('用户名过长')
        return false
      }

      request.post('/user/updateName', null, {
        params: {
          id: this.currentUser.id,
          name: this.name
        }
      }).then((response) => {
        if (response) {
          // 更新用户信息
          const user = JSON.parse(localStorage.getItem('honey-user') || '{}')
          user.name = this.name
          
          // 使用Vuex更新用户信息（同时会通过WebSocket广播）
          this.$store.dispatch('updateUser',user)
          
          
          this.getData();
          this.isNameChanged = false;
          this.$message.success("更新成功");
        } else {
          this.$message.error("更新失败");
        }
      });
    },
    updatePassword() {
      // 实现保存的逻辑
      if (!this.password || !this.newpassword || !this.checkPass) {
        this.$message.error('密码不能为空')
        return false
      } else if (this.newpassword !== this.checkPass) {
        this.$message.error('两次密码不一致')
        return false
      } else if (this.newpassword.length > 20) {
        this.$message.error('密码过长')
        return false
      } else if (this.password !== this.currentUser.password) {
        this.$message.error('原密码错误')
        return false
      } else if (this.password == this.newpassword) {
        this.$message.error('新旧密码不能相同')
        return false
      }

      request.post('/user/updatePassword', null, {
        params: {
          id: this.currentUser.id,
          newpassword: this.newpassword
        }
      }).then((response) => {
        if (response) {
          EventBus.$emit('userPassword_Sender', this.currentUser) // 发送到content .。。。。。。。。。a1
          this.$message.success("修改成功，请重新登录")
          
          localStorage.removeItem('honey-user')
          router.replace('/')
        } else {
          this.$message.error("修改失败")
        }
      }).catch(error => {
        this.$message.error("修改失败：" + error.message)
      })
    },
    reset() {
      // 实现重置的逻辑
      console.log("重置1", this.currentUser.password);
      console.log("重置2");
      this.getData();
    }
  }
};
</script>

<style scoped>
.card {
  background: #fff;
  padding: 20px;
}

.box {
  max-width: 800px;
  margin: 0 auto;
}

.row {
  background-color: #ffffff;
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.row>span {
  width: 80px;
  text-align: right;
  margin-right: 20px;
  font-weight: bold;
  /* 添加这行来设置文字加粗 */
}

.input-group {
  background-color: #ffffff;
  display: flex;
  gap: 10px;
  flex: 1;
}

.input-wrap {
  flex: 1;
}

.update-btn {
  margin-left: -1px;
  border-top-left-radius: 0;
  /* 移除左侧圆角 */
  border-bottom-left-radius: 0;
}

.shurukuang-length {
  width: 110%;
  /* 让按钮和输入框边框重叠 */
}
</style>