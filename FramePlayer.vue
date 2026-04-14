<template>
  <div class="frame-player" :style="{ width: width + 'px' }">
    <!-- 画布区域 -->
    <div class="frame-player__canvas-wrap" :style="{ width: width + 'px', height: height + 'px' }">
      <canvas ref="canvas" :width="width" :height="height"
        :style="{ width: width + 'px', height: height + 'px' }"
        @click="toggle">
      </canvas>
      <div class="frame-player__play-icon" :class="{ visible: !playing }"></div>
      <div v-show="buffering" class="frame-player__loading">
        <i class="el-icon-loading" style="font-size: 36px; color: #fff;"></i>
      </div>
    </div>

    <!-- 控制栏 -->
    <div class="frame-player__controls">
      <el-slider v-model="localFrame" :min="1" :max="totalFrames"
        :show-tooltip="true" @change="onSliderSeek"
        style="flex: 1; margin-right: 12px;">
      </el-slider>
      <span class="frame-player__counter">
        {{ localFrame }} / {{ totalFrames }}
      </span>
      <el-select v-model="speed" size="mini" @change="onSpeedChange" style="width: 80px;">
        <el-option :value="0.5" label="0.5x"></el-option>
        <el-option :value="1" label="1x"></el-option>
        <el-option :value="2" label="2x"></el-option>
      </el-select>
    </div>
  </div>
</template>

<script>
import { FrameBufferScheduler } from "@/utils/FrameBufferScheduler";

/**
 * 通用帧播放器组件
 *
 * 使用示例：
 * <FramePlayer
 *   :image-urls="imageUrlList"
 *   :fetch-batch="fetchBatchFn"
 *   :transform-frame="transformFn"
 *   :width="800"
 *   :height="450"
 *   @frame-update="onFrame"
 * />
 */
export default {
  name: "FramePlayer",

  props: {
    /** 帧图片 URL 数组（决定总帧数） */
    imageUrls: { type: Array, required: true },

    /**
     * 批量获取坐标数据的函数，可选
     * (startFrame: number, batchSize: number) => Promise<any[]>
     * 不传则只播放图片，不获取关联数据
     */
    fetchBatch: { type: Function, default: null },

    /** 每帧数据的变换/清洗函数，可选 */
    transformFrame: { type: Function, default: null },

    /** 画布宽度（像素） */
    width: { type: Number, default: 800 },

    /** 画布高度（像素） */
    height: { type: Number, default: 450 },

    /** 每批帧数 */
    batchSize: { type: Number, default: 50 },

    /** 缓存槽位数 */
    cacheSlots: { type: Number, default: 4 },

    /** 基准播放间隔（毫秒） */
    interval: { type: Number, default: 75 },
  },

  data() {
    return {
      scheduler: null,
      localFrame: 1,
      playing: false,
      buffering: false,
      speed: 1,
    };
  },

  computed: {
    totalFrames() {
      return this.imageUrls.length;
    },
  },

  watch: {
    imageUrls() {
      this.initScheduler();
    },
  },

  mounted() {
    window.addEventListener("keydown", this.handleKeydown);
    if (this.imageUrls && this.imageUrls.length) {
      this.initScheduler();
    }
  },

  beforeDestroy() {
    window.removeEventListener("keydown", this.handleKeydown);
    this.destroyScheduler();
  },

  methods: {
    // ── 生命周期 ──

    initScheduler() {
      this.destroyScheduler();
      this.localFrame = 1;
      this.speed = 1;
      this.$nextTick(() => {
        var c = this.$refs.canvas;
        if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
      });

      var self = this;
      this.scheduler = new FrameBufferScheduler({
        totalFrames: this.totalFrames,
        batchSize: this.batchSize,
        cacheSlots: this.cacheSlots,
        interval: this.interval,
        fetchBatch: this.fetchBatch,
        transformFrame: this.transformFrame,
        imageUrls: this.imageUrls,

        onFrameUpdate: function (frameData, frameIndex) {
          self.localFrame = frameIndex;
          self.$emit("frame-update", frameData, frameIndex);
          self.drawFrame(frameIndex);
        },
        onPlayStateChange: function (isPlaying) {
          self.playing = isPlaying;
          self.$emit("play-state-change", isPlaying);
        },
        onLoadingChange: function (loading) {
          self.buffering = loading;
        },
        onError: function (msg) {
          self.$message.warning(msg);
        },
      });
    },

    destroyScheduler() {
      if (this.scheduler) {
        this.scheduler.destroy();
        this.scheduler = null;
      }
      this.playing = false;
    },

    // ── 交互 ──

    toggle() {
      if (this.scheduler) this.scheduler.toggle();
    },

    onSliderSeek(val) {
      if (this.scheduler) this.scheduler.seekTo(val);
    },

    onSpeedChange(val) {
      if (this.scheduler) this.scheduler.setSpeed(val);
    },

    handleKeydown(event) {
      if (!this.scheduler) return;
      if (event.code === "Space") {
        event.preventDefault();
        this.toggle();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        this.scheduler.pause();
        this.scheduler.seekTo(this.localFrame + 1);
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        this.scheduler.pause();
        this.scheduler.seekTo(this.localFrame - 1);
      }
    },

    // ── 渲染 ──

    drawFrame(frameIndex) {
      var canvas = this.$refs.canvas;
      if (!canvas) {
        this.$nextTick(() => this.drawFrame(frameIndex));
        return;
      }
      if (!this.scheduler) return;
      var img = this.scheduler.getImage(frameIndex);
      if (img && img.complete) {
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      } else if (img) {
        var self = this;
        img.onload = function () {
          if (self.localFrame === frameIndex) {
            var c = self.$refs.canvas;
            if (c) c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          }
        };
      }
    },
  },
};
</script>

<style scoped>
.frame-player__canvas-wrap {
  overflow: hidden;
  position: relative;
  background: #000;
}
.frame-player__canvas-wrap canvas {
  display: block;
}

.frame-player__controls {
  padding: 4px 10px 0;
  display: flex;
  align-items: center;
}
.frame-player__counter {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  margin-right: 8px;
}

/* 播放/暂停按钮 */
.frame-player__play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: all 0.2s ease;
  visibility: hidden;
}
.frame-player__play-icon.visible {
  opacity: 1;
  visibility: visible;
}
.frame-player__play-icon::before {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 15px 0 15px 26px;
  border-color: transparent transparent transparent #fff;
  margin-left: 5px;
}
.frame-player__play-icon:hover {
  background: rgba(0, 0, 0, 0.7);
}
.frame-player__play-icon:active {
  transform: translate(-50%, -50%) scale(0.95);
}

/* 加载遮罩 */
.frame-player__loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
