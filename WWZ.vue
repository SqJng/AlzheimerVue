!<template>
  <div>
    <body>
      <div class="shell">
        <img src="../assets/xzc2.jpg" alt="" class="cover" />
        <div class="head">
          <div class="data">
            <div class="title1">王文震<span>江西中医药大学</span></div>
            <div class="title2">模型训练</div>
          </div>
        </div>
        <div class="foot">
          <div class="tags">
            <span class="tag">#黄焖鸡</span>
            <span class="tag">#白切鸡</span>
            <br>
            <span class="tag">#战斧牛排</span>
            <span class="tag">#茶树菇排骨汤</span>
            <!-- <span class="tag">#bootstrap</span>
            <span class="tag">#PR</span>
            <span class="tag">#AE</span>
            <span class="tag">#Vscode</span> -->
          </div>
          <div class="introduce">
            <p>
              1999 年星球大战参与者 <br>
              2006 年美国周刊年度风云人物 <br>
              2008 年感动中国组委会特别大奖 <br>
              2009 年年度地球卫士奖 <br>
              2012 年世界末日生存者 <br>
              2022 年奥林匹克杯获得者 <br>
              2023 年荣登艾尔登之王
            </p>
          </div>
        </div>
      </div>
    </body>
  </div>
</template>

<script>
export default {
  name: "XZC",
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