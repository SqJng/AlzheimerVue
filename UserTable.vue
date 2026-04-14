!<template>
  <div>
    <div class="add">
      <el-input style="width: 250px; height: 10px" suffix-icon="el-icon-search" placeholder="请输入用户名" v-model="name" />
      <el-input style="width: 250px; height: 10px; margin-left: 5px" suffix-icon="el-icon-search" placeholder="请输入账号"
        v-model="username" />

      <el-input style="width: 250px; height: 10px; margin-left: 5px" suffix-icon="el-icon-search" placeholder="请输入密码"
        v-model="password" />

      <el-button type="primary" icon="el-icon-search" style="margin-left: 10px; height: 40px"
        @click="getData">搜索</el-button>

      <el-button type="warning" icon="el-icon-refresh-left" style="margin-left: 10px; height: 40px"
        @click="reset">重置</el-button>
    </div>


    <div style="margin: 10px 0">
      <el-table :data="UserList" stripe style="width: 100%; margin-left: 20px">
        <!-- <el-table-column prop="id" label="序号" width="180"> </el-table-column> -->
        <el-table-column prop="username" label="账号" width="280"> </el-table-column>
        <el-table-column prop="password" label="密码" width="280"> </el-table-column>
        <el-table-column prop="name" label="用户名" width="280"></el-table-column>
        <el-table-column prop="subject" label="绑定人" width="280"></el-table-column>
        <el-table-column prop="role" label="身份" width="280"></el-table-column>


        <el-table-column label="操作">
          <template v-slot="scope">
            <el-button @click="confirmDelete(scope.row.id)">删除</el-button><el-button
              @click="edit(scope.row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div style="padding: 10px 0">
      <el-pagination @size-change="handleSizeChange" @current-change="handleCurrentChange" :current-page="pageNum"
        :page-sizes="[5, 10, 15, 20]" :page-size="pageSize" layout="total, sizes, prev, pager, next, jumper"
        :total="total">
      </el-pagination>
    </div>

    <!-- 编辑界面 -->
    <el-dialog title="数据信息" :visible.sync="editlist" width="30%">
      <el-form label-width="80px">
        <el-form-item label="账号">
          <el-input v-model="editDetail.username"></el-input>
        </el-form-item>

        <el-form-item label="密码">
          <el-input v-model="editDetail.password"></el-input>
        </el-form-item>

        <el-form-item label="用户名">
          <el-input v-model="editDetail.name"></el-input>
        </el-form-item>

        <el-form-item label="绑定人">
          <el-input v-model="editDetail.subject"></el-input>
        </el-form-item>

        <el-form-item label="身份">
          <el-input v-model="editDetail.role"></el-input>
        </el-form-item>

        <el-form-item style="text-align: center">
          <el-button type="primary" @click="update" style="height: 30px; margin-left: -70px">
            立即更新
          </el-button>
          <el-button @click="editlist = false" style="height: 30px">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>



<script>
import request from "@/utils/request";
import { EventBus } from '@/utils/eventBus'
import { mapActions } from "vuex";
import { webSocketService } from '@/utils/websocket'

export default {
  name: "UserTable",
  data() {
    return {
      editlist: false,
      UserList: [],
      editDetail: {},
      pageNum: 1,
      pageSize: 5,
      total: 0,
      id: "",
      name: "",
      username: "",
      password: "",
    };
  },
  created() {
    this.getData();

    // 添加WebSocket消息处理器
    webSocketService.addMessageHandler(this.handleUserUpdate);
  },
  beforeDestroy() {
    // 移除WebSocket消息处理器
    webSocketService.removeMessageHandler(this.handleUserUpdate);
  },
  methods: {
    ...mapActions(['updateUser']),

    // WebSocket消息处理函数
    handleUserUpdate(user) {
      console.log('UserTable收到用户更新:', user);
      // 如果当前正在编辑的是被更新的用户，可以更新编辑表单
      if (this.editlist && this.editDetail.id === user.id) {
        this.editDetail = { ...this.editDetail, ...user };
      }

      // 刷新用户列表
      this.getData();
    },

    getData() {
      request
        .get("/user/page", {
          params: {
            pageNum: this.pageNum,
            pageSize: this.pageSize,
            id: this.id,
            name: this.name,
            username: this.username,
            password: this.password,
          },
        }) // 替换为你的后端接口地址
        .then((res) => {
          //   console.log(res);
          this.UserList = res.records; // 将返回的数据赋值给dataList
          this.total = res.total;
          // console.log(this.UserList);
        })
        .catch((error) => {
          console.error(error);
        });
    },

    //重置
    reset() {
      this.name = "";
      this.username = "";
      this.password = "";
      this.getData();
    },

    // 编辑
    edit(item) {
      this.editDetail = {
        // title: item.title,
        id: item.id,
        username: item.username,
        password: item.password,
        name: item.name,
        subject: item.subject,
        role: item.role,
      };
      this.editlist = true;
      this.editid = item.id;
      // console.log(this.editlist);
    },

    // 更新
    update() { // 更新密码退出登录的操作在request.js的拦截器里
      request.post("/user/update", this.editDetail).then((response) => {
        if (response) {
          this.$message.success("更新成功")

          // 如果更新的是当前登录用户，需要同步更新localStorage和其他组件
          const currentUser = JSON.parse(localStorage.getItem('honey-user') || '{}')
          if (currentUser.id === this.editDetail.id) {
            if (this.editDetail.password !== '' && this.editDetail.password !== currentUser.password) {
              // 如果密码已更改，发送密码更新消息
              this.currentUser = { ...this.editDetail }
              EventBus.$emit('userPassword_Sender', this.currentUser) // 发送到content //发送端退出靠jwt
              console.log('CCCCCCCCCCCCCC', this.currentUser)
            }
            const updatedUser = { ...currentUser, ...this.editDetail } // 把editDetail所有的值覆盖给currentUser

            // 使用Vuex更新用户信息（同时会通过WebSocket广播）
            this.updateUser(updatedUser);
          }

        } else {
          this.$message.error("更新失败")
        }

        this.getData()
        this.editlist = false
      })
    },
    // 确认删除
    confirmDelete(id, i) {
      this.$confirm('此操作将永久删除该账号, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 用户点击确定，执行删除操作
        this.deletelist(id, i);
      }).catch(() => {
        // 用户点击取消，显示取消消息
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
    // 删除
    deletelist(id, i) {
      request.delete("/user/" + id)
        .then((response) => {
          console.log("接收一下返回值不然报错response", response);
          // 如果删除的是当前登录用户，需要登出
          const currentUser = JSON.parse(localStorage.getItem('honey-user') || '{}')
          if (currentUser.id === id) {
            localStorage.removeItem('honey-user')
            EventBus.$emit('userUpdated_Sender', {})

            this.$router.push('/')
          }

          this.UserList.splice(i, 1)
          this.$message.success("删除成功")
        })
        .catch((response) => {
          console.log(response, id)
          this.$message.error("删除失败")
        })
    },

    handleSizeChange(pageSize) {
      // console.log(pageSize);
      this.pageSize = pageSize;
      this.getData();
    },

    handleCurrentChange(pageNum) {
      // console.log(pageNum);
      this.pageNum = pageNum;
      this.getData();
    },
  },
};
</script>

<style lang="css" scoped>
.add {
  border: 1px solid #eee;
  margin: 10px 0;
  padding: 15px;
}
</style>