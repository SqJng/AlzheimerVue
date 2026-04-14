!<template>
  <div>

    <body>
      <div class="shell">
        <img src="../assets/lyx.jpg" alt="" class="cover" />
        <div class="head">
          <div class="data">
            <div class="title1">刘宜鑫<span>江西中医药大学</span></div>
            <div class="title2">数据库管理及样本收集</div>
          </div>
        </div>
        <div class="foot">
          <div class="tags">
            <span class="tag">#开摆</span>
            <span class="tag">#拖延症晚期</span><br>
            <span class="tag">#社恐</span>
            <span class="tag">#精神状态</span>
            <!-- <span class="tag">#bootstrap</span>
            <span class="tag">#PR</span>
            <span class="tag">#AE</span>
            <span class="tag">#Vscode</span> -->
          </div>
          <div class="introduce">
            <p>
              国家一级退堂鼓表演家<br>
              德智体美劳全面不发展代表<br>
              不愿应对现实的奶茶爱好者<br>
              国家一级嗜睡症演员<br>
              从哪里跌倒就从哪里睡着<br>
              性格内向，吃饱了不说一直吃
            </p>
          </div>
        </div>
      </div>
    </body>
  </div>
</template>

<script>
export default {
  name: "HW",
};
</script>

<style lang="css" scoped>
* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

body {
  width: 100%;
  height: 94vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-image: linear-gradient(to top, #9795f0 0%, #ffffff 100%);
}

.shell {
  width: 780px;
  height: 580px;
  background: #ffffff;
  position: relative;
}

.head {
  height: 340px;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.head::before {
  content: "";
  width: 100%;
  height: 100%;
  position: absolute;
  background: url("../assets/1.jpg");
  background-size: cover;
  z-index: -1;
  transform: skewY(-4deg);
  transform-origin: 0 0;
}

.cover {
  position: absolute;
  top: 190px;
  left: 25px;
  width: 220px;
  z-index: 2;
  border-radius: 500px;
  border: 10px #fff solid;
  box-shadow: 0 5px 10px #00000065;
}

.data {
  padding: 190px 0 0 280px;
  text-shadow: 0 0 20px #000;
}

.data .title1 {
  color: white;
  font-size: 50px;
  font: 900 50px "";
  margin-bottom: 5px;
  position: relative;
}

.data .title1 span {
  position: absolute;
  top: 17px;
  margin-left: 12px;
  background: #ffe44c;
  border-radius: 5px;
  color: #000000;
  font-size: 14px;
  padding: 0px 4px;
}

.data .title2 {
  color: #fff;
  font: 500 24px "";
}

.foot {
  line-height: 26px;
  color: #444;
  font-weight: 200px;
}

.tags {
  padding-left: 30px;
  padding-top: 100px;
  width: 250px;
  float: left;
  text-align: center;
}

.tag {
  background: rgb(149, 178, 255);
  color: #fff;
  border-radius: 10px;
  padding: 3px 8px;
  font-size: 14px;
  margin-right: 4px;
  line-height: 35px;
  cursor: pointer;
}

.tag:hover {
  background: #eee4ad;
  color: #444;
}

.introduce {
  padding: 25px 0 0 35px;
  width: 480px;
  float: left;
}
</style>