!<template>
  <!-- npm run serve -->

  <div>
    <div class="add">
      <el-input style="width: 250px; height: 10px" suffix-icon="el-icon-search" v-if="hasPermission(['admin'])"
        placeholder="请输入行为人名字" v-model="Actor" />
      <el-input style="width: 250px; height: 10px; margin-left: 5px" suffix-icon="el-icon-search" placeholder="请输入动作类型"
        v-model="VideoType" />

      <el-input style="width: 250px; height: 10px; margin-left: 5px" suffix-icon="el-icon-search" placeholder="请输入文件名"
        v-model="FileName" />

      <el-button type="primary" icon="el-icon-search" style="margin-left: 10px; height: 40px"
        @click="pageNum = 1, getData()">搜索</el-button>

      <el-button type="warning" icon="el-icon-refresh-left" style="margin-left: 10px; height: 40px"
        @click="reset">重置</el-button>

      <!-- 新增的待上传按钮，靠右对齐 -->
      <el-button type="info" icon="el-icon-upload2" style="float: right; margin-right: 30px; height: 40px;width: 90px"
        @click="$router.push('/home/To_be_uploaded')">待上传</el-button>
    </div>




    <el-table :data="newsList" stripe style="width: 100%; margin-left: 20px">
      <el-table-column label="序号" width="180">
        <template slot-scope="scope">
          {{ scope.$index + 1 }}
        </template>
      </el-table-column>
      <el-table-column prop="actor" label="行为人" width="180">
      </el-table-column>
      <el-table-column prop="videoType" label="行为动作"> </el-table-column>
      <el-table-column prop="fileName" label="文件名"> </el-table-column>
      <el-table-column label="样本上传" v-if="hasPermission(['admin'])">
        <template v-slot="scope">

          <div style="margin: 10px 0">
            <el-upload multiple action="http://localhost:9090/file/upload" :headers="{ token: user.token }"
              :show-file-list="false" :on-success="(row, res, file, fileList) =>
                handleMultipleTableFileUpload(scope.row, res, file, fileList)
                ">
              <el-button size="small" type="success">文件上传</el-button>
            </el-upload>
          </div>

        </template>
      </el-table-column>

      <el-table-column label="样本回放">
        <template v-slot="scope">
          <el-button @click="show(scope.row)">详情</el-button>
        </template>
      </el-table-column>


      <el-table-column label="操作" v-if="hasPermission(['admin', 'user'])">
        <template v-slot="scope">
          <el-button @click="confirmDelete(scope.row.fileName)">删除</el-button>
          <el-button @click="edit(scope.row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div style="padding: 10px 0">
      <el-pagination @size-change="handleSizeChange" @current-change="handleCurrentChange" :current-page="pageNum"
        :page-sizes="[5, 10, 15, 20]" :page-size="pageSize" layout="total, sizes, prev, pager, next, jumper"
        :total="total">
      </el-pagination>
    </div>

    <!-- 编辑界面 -->
    <el-dialog title="数据信息" :visible.sync="editlist" width="30%">
      <el-form label-width="80px">
        <el-form-item label="行为人">
          <el-input v-model="editDetail.actor"></el-input>
        </el-form-item>

        <el-form-item label="行为动作">
          <el-input v-model="editDetail.videoType"></el-input>
        </el-form-item>

        <el-form-item label="文件名">
          <el-input v-model="editDetail.fileName"></el-input>
        </el-form-item>

        <el-form-item style="text-align: center">
          <el-button type="primary" @click="update" style="height: 30px; margin-left: -70px">立即更新</el-button>
          <el-button @click="editlist = false" style="height: 30px">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>



    <!-- 骨骼点照片展示 -->
    <!-- 骨骼点照片展示 -->
    <el-dialog title="数据信息" :visible.sync="datalist" width="1240px" display="flex" justify-content="center"
      align-items="center">

      <!-- 【滚动图-数据】切换按钮 -->
      <el-button @click="toggleView"
        style="position: absolute;height: auto; padding: 5px 5px; top: 58px; right: 377px; z-index: 1000;">
        {{ showScrollImages ? '数据' : '详情' }}
      </el-button>

      <table style="background-color: #ffffff;">
        <tr>
          <!-- 帧播放器 -->
          <td style="background-color: #ffffff; text-align: right; padding-right: 0px;">
            <!--
              :image-urls="我的图片URL数组"
              :fetch-batch="关联数据获取函数"
              :transform-frame="关联数据显示规则"
              @frame-update="拿到每帧数据后我想干什么"
            -->
            <FramePlayer
              v-if="playerImageUrls.length"
              :image-urls="playerImageUrls"
              :fetch-batch="playerFetchBatch"
              :transform-frame="playerTransformFrame"
              :width="800"
              :height="450"
              @frame-update="onPlayerFrameUpdate"
            />
          </td>

          <td style="text-align: left; padding-left: 5px;background-color: #ffffff;">
            <!-- 滚动图 --><!-- 添加 key 绑定 ，每次打开新文件时，Vue 会强制重新创建这个容器-->
            <div v-show="showScrollImages" :key="FILENAME" style="background-color: #ffffff; width: 395px; height: 450px; 
    overflow-y: auto; display: flex; flex-direction: column; flex-wrap: nowrap; overflow-x: hidden;">
              <div v-for="(url, index) in imgList.slice(0, imgList.length - 1)" :key="index">
                <el-image style="width: 100%; height: auto; cursor: pointer;" :src="url" lazy
                  @click="openImageViewer(index);" title="详情">
                </el-image>
                <div style="color: black; text-align: center; margin-top: 0px;">{{ index + 1 }}</div>
              </div>
            </div>

            <!-- 空白div -->
            <!-- <div v-show="!showScrollImages"
              style="width: 395px; height: 450px; background-color: #f0f0f0; overflow-y: auto;"
              v-loading="loadingStatus === 'loading'" element-loading-text="加载中..."
              element-loading-spinner="el-icon-loading" element-loading-background="rgba(0, 0, 0, 0.8)"> -->
            <div v-show="!showScrollImages"
              style="width: 395px; height: 450px; background-color: #f0f0f0; overflow-y: auto;">
              <table class="coordinate-table">
                <thead>
                  <tr>
                    <th>骨骼点</th>
                    <th>X</th>
                    <th>Y</th>
                    <th>Z</th>
                  </tr>
                </thead>
                <tbody v-if="currentFrameData">
                  <tr>
                    <!-- <td>frameOrder</td> -->
                    <!-- <td colspan="3">{{ this.currentFrameIndex }}</td> -->
                  </tr>
                  <tr v-for="(coordinates, boneName) in currentFrameData" :key="boneName">
                    <td>{{ boneName }}</td>
                    <td>{{ (coordinates[0]) }}</td>
                    <td>{{ (coordinates[1]) }}</td>
                    <td>{{ (coordinates[2]) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      </table>



    </el-dialog>


    <!-- 图片查看器 -->
    <div v-if="imageViewerVisible" class="image-viewer" @click.self="imageViewerVisible = false"
      @wheel="handleWheelScroll">
      <div
        style="display: flex; justify-content: center; align-items: center; position: relative;background-color: rgba(0, 0, 0, 0.5);">
        <!-- 下载 -->
        <el-button class="download-btn" circle @click.stop="downloadImage" icon="el-icon-download"
          style="position: fixed; top: 10px; right: 60px; z-index: 10;"></el-button>
        <!-- 关闭 -->
        <el-button class="close-btn" circle @click.stop="imageViewerVisible = false" icon="el-icon-close"
          style="position: fixed; top: 10px; right: 10px; z-index: 10;"></el-button>
        <!-- 上一页 -->
        <el-button class="shangxiabtn" circle @click.stop="prevImage" :disabled="currentImageIndex <= 0"
          icon="el-icon-arrow-left" style="position: fixed; left: 10px; z-index: 10;"></el-button>

        <transition name="move">
          <div class="donghua1" style="text-align: center;"> <!-- 用来居中下标（index + 1） -->

            <img :src="imgList[currentImageIndex]" style="width: 1066px; height: 600px; " />

            <div style="color: white; font-size: 18px; margin-top: 10px;">
              {{ currentImageIndex + 1 }}
            </div>
          </div>

        </transition>

        <div style="width: 400px; height: 637px; ">
          <table class="zbtb" style="margin: 0 auto; color: white; border-collapse: collapse;">
            <tr>
              <th>坐标类型</th>
              <th>X</th>
              <th>Y</th>
              <th>Z</th>
            </tr>
            <tbody>
              <tr v-for="point in tableData" :key="point.name">
                <td>{{ point.name }}</td>
                <td>{{ point.x }}</td>
                <td>{{ point.y }}</td>
                <td>{{ point.z }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 下一页 -->
        <el-button class="shangxiabtn" circle @click.stop="nextImage"
          :disabled="currentImageIndex >= imgList.length - 2" icon="el-icon-arrow-right"
          style="position: fixed; right:10px; z-index: 10;"></el-button>
      </div>
    </div>


  </div>


</template>

<!-- 图片查看器的样式 -->
<style lang="css" scoped>
.image-viewer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  /* 半透明黑色背景 */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  /* 确保在最上层 */
}

.image-viewer img {
  max-width: 90%;
  max-height: 90%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.shangxiabtn {
  background-color: rgba(255, 255, 255, 0.5);
  /* 半透明白色按钮背景 */
}

.download-btn,
.close-btn {
  background-color: rgba(255, 255, 255, 0.5);
  color: #333;
}

.download-btn:hover,
.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.8);
}


.zbtb {
  margin: 0 auto;
  font-size: 12px;
  color: white;
  border-collapse: collapse;
  width: 80%;
  border: 1px solid white;
  /* 添加白色边框 */
  table-layout: fixed;
  /* 使用 fixed 布局时，才能设置th,td的高度、宽度 */
}

.zbtb th,
.zbtb td {
  border: 0.2px solid white;
  /* 为所有的 th 和 td 添加白色边框 */
  padding: 3px;
  /* 添加一些内边距，使内容不贴近边框 */
  text-align: center;
  width: 100px;
}
</style>
<!-- 分步分时查询样式 -->
<style scoped>
.coordinate-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1px;
  font-size: 12px;
}

.coordinate-table th,
.coordinate-table td {
  border: 1px solid #dcdfe6;
  padding: 6px;
  width: 100px;
  text-align: center;
}

.coordinate-table th {
  background-color: #f5f7fa;
  font-weight: bold;
}

.coordinate-table tr:hover {
  background-color: #f5f7fa;
}
</style>


<script>
import request from "@/utils/request";
import FramePlayer from "@/components/FramePlayer.vue";

export default {
  name: "TablePart",
  components: { FramePlayer },
  data() {
    return {
      // addDetail: {},
      editlist: false, // 用于控制编辑对话框的显示
      datalist: false, // 用于控制数据信息对话框的显示
      editDetail: {}, // 用于存储编辑时的详细信息
      showDetail: {}, // 未在提供的代码中使用
      newsList: [], // 用于存储表格数据
      editid: "", // 未在提供的代码中明确使用，可能在未显示的部分使用
      total: 0, // 用于分页
      pageNum: 1, // 用于分页
      pageSize: 5, // 用于分页
      Actor: "", // 用于搜索
      VideoType: "", // 用于搜索
      FileName: "", // 用于搜索
      imgList: [], // 用于存储图片URL列表
      FILENAME: "", // 用于详情里记录文件名
      imageViewerVisible: false, // 控制图片查看器的显示
      currentImageIndex: 0, // 当前查看的图片索引
      user: JSON.parse(localStorage.getItem("honey-user") || "{}"), // 用于存储用户信息
      urls: [], // 上传图片的URL列表
      url: "http://localhost:9090/file/download/1.jpg", // 未使用
      tableData: [], // 用于存储骨骼点坐标数据
      showScrollImages: true, // 控制显示滚动图还是空白div
      //------分步分时播放器（已封装为 FramePlayer 组件）------
      currentFrameIndex: 1,
      currentFrameData: {},
    };
  },
  created() {// 获取页面初始数据
    console.log('user:', this.user);
    this.getData();
    this.getUploadableNum();
  },
  computed: {
    playerImageUrls() {
      return this.imgList.length > 1 ? this.imgList.slice(0, -1) : [];
    },
  },
  watch: {},
  mounted() {},
  beforeDestroy() {},

  methods: {
    hasPermission(roles) {// 权限判断
      return roles.includes(this.user.role)
    },
    // -------------------------------------------------------
    openImageViewer(index) {// 打开图片查看器
      this.fileName = this.FILENAME;
      this.currentImageIndex = index;
      this.imageViewerVisible = true;
      this.getggd(this.FILENAME, this.currentImageIndex + 1);
    },
    getggd(FileName, FrameOrder) {//图片查看器骨骼点坐标获取
      request
        .get("/data/query", {
          params: {
            FileName: FileName,
            FrameOrder: FrameOrder,
          },
        })
        .then((res) => {
          this.tableData = res; // 将返回的数据赋值给tableData
          console.log("获取骨骼点函数的tableData: ", this.tableData);
        })
        .catch((error) => {
          console.error(error);
        });
    },
    handleWheelScroll(event) {// 图片查看器的滚轮事件
      if (event.deltaY > 0) {
        this.nextImage();
      } else if (event.deltaY < 0) {
        this.prevImage();
      }
    },
    prevImage() {// 图片查看器上一页
      if (this.currentImageIndex > 0) {
        this.currentImageIndex--;
        this.getggd(this.FILENAME, this.currentImageIndex + 1);
      }
    },
    nextImage() {// 图片查看器下一页
      if (this.currentImageIndex < this.imgList.length - 2) {
        this.currentImageIndex++;
        this.getggd(this.FILENAME, this.currentImageIndex + 1);

      }
    },
    downloadImage() {// 图片查看器下载图片到本地
      const image = this.imgList[this.currentImageIndex];
      fetch(image)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `image_${this.currentImageIndex + 1}.jpg`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
        });
    },
    //--------------------------------------------------------------------------------------------------
    handleMultipleTableFileUpload(row, res, file) {//上传图片
      // console.log(row,res, file, fileList);
      // console.log(file);
      this.urls = file.map((v) => v.response?.data);
      this.urls.join(",");

      let result = "";
      this.urls.forEach((item) => {
        result += item + ",";
      });
      row.avatar = result;
      // console.log(row.avatar);
      request.post("/data/update", row).then(() => {
        // console.log(res);
        // if (res.code === "200") {
        //   this.$message.success("上传成功");
        // } else {
        //   this.$message.error(res.msg);
        // }
      });
    },

    getData() {//获取整个页面的初始表格数据

      request
        .get("/data/page", {
          params: {
            pageNum: this.pageNum,
            pageSize: this.pageSize,
            subject: this.user.subject,
            Actor: this.Actor,
            VideoType: this.VideoType,
            FileName: this.FileName,
          },
        }) // 替换为你的后端接口地址
        .then((res) => {
          this.newsList = res.records; // 将返回的数据赋值给dataList
          this.total = res.total;
        })
        .catch((error) => {
          console.error(error);
        });
    },
    getUploadableNum() {//获取待上传的表格数量
      request
        .get("/data/uploadable_num", {
          params: {
            subject: this.user.subject,
          },
        })
        .then((num) => {
          console.log("获取待上传的表格数据:", num);//12
          this.uploadableNum = num; // 将返回的数据赋值给uploadableNum
        })
        .catch((error) => {
          console.error(error);
        });
    },

    toggleView() {// 切换滚动图和空白div
      this.showScrollImages = !this.showScrollImages;
    },
    show(item) {
      this.imgList = item.avatar.split(",");
      this.FILENAME = item.fileName;
      this.showScrollImages = true;
      this.currentFrameIndex = 1;
      this.currentFrameData = {};
      this.datalist = true;
    },

    //----------------------------分步分时播放器（已封装为 FramePlayer 组件）--------------------------------

    /** FramePlayer 传入的 fetchBatch 函数 */
    async playerFetchBatch(startFrame, batchSize) {
      const response = await request.get('/data/coordinate/batch', {
        params: { fileName: this.FILENAME, startFrame, batchSize }
      });
      if (response && response.code == 200 && response.data) {
        return response.data;
      }
      throw new Error('Invalid response');
    },

    /** 关联数据处理规则，自己看是什么数据自定义处理规则 */
    playerTransformFrame(frame) {
      const formatted = {};
      Object.entries(frame).forEach(([key, value]) => {
        if (value != null) {
          formatted[key] = value;
        }
      });
      return formatted;
    },

    /** 关联数据展示规则，自己看是什么数据自定义展示规则 */
    onPlayerFrameUpdate(frameData, frameIndex) {
      this.currentFrameIndex = frameIndex;
      if (frameData) {
        this.currentFrameData = frameData;
      }
    },


    //---------------------------------下面是表格的增删改查--------------------------------
    //重置
    reset() {
      this.Actor = "";
      this.VideoType = "";
      this.FileName = "";
      this.getData();
    },
    // 确认删除
    confirmDelete(fileName) {
      this.$confirm('此操作将永久删除该文件, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 用户点击确定，执行删除操作
        this.deletelist(fileName);
      }).catch(() => {
        // 用户点击取消，显示取消消息
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
    //删除
    deletelist(fileName) {
      request
        .delete("/data/delete/" + fileName)
        .then((response) => {
          console.log(response);
          this.$message.success("删除成功");
          // 重新加载数据
          this.getData();
        })
        .catch((error) => {
          console.error(error);
          this.$message.error("删除失败");
        });
    },
    //编辑
    edit(item) {
      this.editDetail = {
        // title: item.title,
        actor: item.actor,
        videoType: item.videoType,

        tableKey: item.tableKey,
        fileName: item.fileName,
      };
      this.editlist = true;
      this.editid = item.tableKey;
      // console.log(this.editlist);
    },
    //确认更新
    update() {
      //编辑的话，也是传id去服务端
      request.post("/data/update", this.editDetail).then((response) => {
        if (response) {
          this.$message.success("更新成功");
        } else {
          this.$message.error("更新失败");
        }

        this.getData();
        this.editlist = false;
      });
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
    handleFileUpload(response, file, fileList) {
      this.fileList = fileList;
    },

  },

};
</script>

<style lang="css" scoped>
#table table {
  width: 100%;
  font-size: 14px;
  border: 1px solid #eee;
}

#table {
  padding: 0 10px;
}

table thead th {
  background: #f5f5f5;
  padding: 10px;
  text-align: left;
}

.add {
  border: 1px solid #eee;
  margin: 10px 0;
  padding: 15px;
}

input {
  border: 1px solid #ccc;
  padding: 5px;
  border-radius: 3px;
  margin-right: 15px;
}

button {
  background: #008cd5;
  border: 0;
  padding: 4px 15px;
  border-radius: 3px;
  color: #fff;
}

#mask {
  background: rgba(0, 0, 0, 0.5);
  width: 100%;
  height: 100%;
  position: fixed;
  z-index: 4;
  top: 0;
  left: 0;
}

.mask {
  width: 300px;
  height: 250px;
  background: rgba(255, 255, 255, 1);
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  margin: auto;
  z-index: 47;
  border-radius: 5px;
}

.title {
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.title span {
  float: right;
  cursor: pointer;
}

.content {
  padding: 10px;
}

.content input {
  width: 270px;
  margin-bottom: 15px;
}


.el-button {
  height: 40px;
}



.el-upload__input {
  display: none;
}
</style>