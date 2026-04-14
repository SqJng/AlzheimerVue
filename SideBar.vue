<template>
  <div>
    <div id="sidebar">
      <header>
        <a href="#">后台管理</a>
      </header>
      <el-col :span="24">
        <el-menu :default-active="$route.path" class="el-menu-vertical-demo" background-color="#37474f"
          text-color="white" active-text-color="#ffd04b" router>
          <el-menu-item v-if="hasPermission(['admin', 'user'])" index="/home/TablePart">
            <i class="el-icon-menu"></i>
            <span style="color: white">已上传</span>
          </el-menu-item>

          <el-menu-item v-if="hasPermission(['admin', 'user'])" index="/home/To_be_uploaded">
            <i class="el-icon-menu"></i>
            <span style="color: white">待上传</span>
          </el-menu-item>

          <el-menu-item v-if="hasPermission(['admin'])" index="/home/UserTable">
            <i class="el-icon-menu"></i>
            <span style="color: white">用户管理</span>
          </el-menu-item>

          <el-submenu v-if="hasPermission(['admin', 'user'])" index="3">
            <template slot="title">
              <i class="el-icon-menu"></i>
              <span style="color: white">关于我们</span>
            </template>

            <el-menu-item-group>
              <el-menu-item index="/home/PY">
                <span style="color: white">彭雁</span>
              </el-menu-item>
              <el-menu-item index="/home/LYX">
                <span style="color: white">刘宜鑫</span>
              </el-menu-item>
              <el-menu-item index="/home/WWZ">
                <span style="color: white">王文震</span>
              </el-menu-item>
            </el-menu-item-group>
          </el-submenu>

          <el-menu-item v-if="hasPermission(['admin', 'user'])" index="/home/CallUs">
            <i class="el-icon-menu"></i>
            <span style="color: white">联系我们</span>
          </el-menu-item>

          <el-menu-item v-if="hasPermission(['admin', 'user'])" index="/home/PersonalCenter">
            <i class="el-icon-menu"></i>
            <span style="color: white">个人中心</span>
          </el-menu-item>
        </el-menu>
      </el-col>
    </div>
  </div>
</template>

<script>
export default {
  name: "SideBar",
  data() {
    return {
      currentUser: JSON.parse(localStorage.getItem('honey-user') || '{}')
    }
  },
  methods: {
    hasPermission(roles) {
      return roles.includes(this.currentUser.role)
    }
  }
};
</script>

<!-- <script>
export default {
  name: "SideBar",
};
</script> -->

<style lang="css" scoped>
/* Sidebar Styles */

#sidebar {
  z-index: 1000;
  position: fixed;
  left: 250px;
  width: 200px;
  height: 100%;
  margin-left: -250px;
  overflow-y: auto;
  background: #37474f;
  -webkit-transition: all 0.5s ease;
  -moz-transition: all 0.5s ease;
  -o-transition: all 0.5s ease;
  transition: all 0.5s ease;
}

#sidebar header {
  background-color: #263238;
  font-size: 20px;
  line-height: 52px;
  text-align: center;
}

#sidebar header a {
  color: #fff;
  display: block;
  text-decoration: none;
}

#sidebar header a:hover {
  color: #fff;
}

#sidebar .nav {
  list-style: none;
}

#sidebar .nav a {
  background: none;
  border-bottom: 1px solid #455a64;
  color: #cfd8dc;
  font-size: 14px;
  padding: 16px 24px;
  margin: 5px, 0;
}

#sidebar .nav a:hover {
  background: none;
  color: #eceff1;
}

#sidebar .nav a i {
  margin-right: 16px;
}
</style>