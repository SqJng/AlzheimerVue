/**
 * 帧数据分段预加载播放调度器（全相联缓存版）
 *
 * 核心思路：全相联批次缓存 + LRU 淘汰 + requestAnimationFrame 驱动
 * - 将帧数据分成固定大小的批次（batchSize），每批同时包含坐标数据和图片
 * - 使用 N 个缓存槽位，任意批次可存入任意槽位（全相联映射）
 * - 展示第 i 帧时，通过 batchId 标签检查缓存是否命中
 * - 缓存满时使用 LRU（最近最少使用）策略淘汰
 * - 支持 seekTo(k) 跳转：缓存命中即时展示，未命中则短暂加载后展示
 * - _cache[slotIdx] = {
 * - batchId: 2,                  // 这个槽存的是第几批
 * - coordData: [帧0, 帧1, ..., 帧49],  // 50 个坐标数据
 * - images:    [img0, img1, ..., img49]  // 50 个 Image 对象
}
 * 
 */
export class FrameBufferScheduler {
  /**
   * @param {Object} opts
   * @param {number}   opts.totalFrames        - 总帧数
   * @param {number}  [opts.batchSize=50]       - 每批帧数
   * @param {number}  [opts.preloadOffset=8]    - 播放到批次内第几帧时触发预加载下一批
   * @param {number}  [opts.interval=75]        - 播放间隔 (ms)
   * @param {number}  [opts.cacheSlots=4]       - 缓存槽位数（控制最大内存占用）
   * @param {(startFrame:number, batchSize:number) => Promise<any[]>} opts.fetchBatch
   * @param {(raw:any) => any}  [opts.transformFrame]
   * @param {(frameData:any|null, frameIndex:number) => void} opts.onFrameUpdate
   * @param {(playing:boolean) => void} [opts.onPlayStateChange]
   * @param {string[]} [opts.imageUrls]         - 图片 URL 列表
   */
  constructor(opts) {
    this._totalFrames = opts.totalFrames;
    this._batchSize = opts.batchSize || 50;
    this._preloadOffset = opts.preloadOffset || 8;
    this._baseInterval = opts.interval || 75;
    this._interval = this._baseInterval;
    this._cacheSlots = opts.cacheSlots || 4;

    this._fetchBatch = opts.fetchBatch || null;
    this._transformFrame = opts.transformFrame || null;
    this._onFrameUpdate = opts.onFrameUpdate;
    this._onPlayStateChange = opts.onPlayStateChange || null;
    this._onLoadingChange = opts.onLoadingChange || null;
    this._onError = opts.onError || null;

    this._imageUrls = opts.imageUrls || null;

    // 全相联缓存：每个槽位 { batchId, coordData[], images[] } 或 null
    this._cache = new Array(this._cacheSlots).fill(null);
    this._lruOrder = [];       // 槽位索引，末尾 = 最近使用
    this._pendingLoads = {};   // batchId → Promise，防止重复加载并支持等待

    this._currentFrame = 1;
    this._isPlaying = false;
    this._rafId = null;
    this._destroyed = false;

    // 启动：加载首批 + 发出首帧
    this._loadBatchForFrame(1);
    this._emitFrame();
  }

  // ===== 公开只读属性 =====

  get currentFrame() { return this._currentFrame; }
  get isPlaying() { return this._isPlaying; }
  get totalFrames() { return this._totalFrames; }

  // ===== 公开方法 =====

  play() {
    if (this._isPlaying || this._destroyed) return;
    this._isPlaying = true;
    this._startLoop();
    if (this._onPlayStateChange) this._onPlayStateChange(true);
  }

  pause() {
    if (!this._isPlaying) return;
    this._isPlaying = false;
    this._stopLoop();
    if (this._onPlayStateChange) this._onPlayStateChange(false);
  }

  toggle() {
    this._isPlaying ? this.pause() : this.play();
  }

  /** 设置播放速度倍率，重启播放循环以立即生效 */
  setSpeed(multiplier) {
    this._interval = this._baseInterval / multiplier;
    if (this._isPlaying) {
      this._stopLoop();
      this._startLoop();
    }
  }

  /**
   * 跳转到指定帧
   * 缓存命中 → 即时展示；未命中 → 触发加载，就绪后展示
   */
  seekTo(frameIndex) {
    if (this._destroyed) return;
    if (frameIndex < 1) frameIndex = 1;
    if (frameIndex > this._totalFrames) frameIndex = this._totalFrames;
    this._currentFrame = frameIndex;

    // 先立刻发出帧（命中则有数据，未命中则 null）
    this._emitFrame();
    //打印缓冲区状态，包含各缓冲区存的是那一段数据
    console.log('缓冲区状态:', this._cache.map(slot => slot ? `第${slot.batchId * this._batchSize + 1}帧到第${(slot.batchId + 1) * this._batchSize}帧` : '空'));
    // 如果未命中，等加载完再补发一次
    var batchId = this._getBatchId(frameIndex);
    if (this._findSlot(batchId) === -1) {
      console.log('未命中，等加载完再补发一次');
      var self = this;
      if (this._onLoadingChange) this._onLoadingChange(true);
      this._loadBatchForFrame(frameIndex).then(function () {
        if (self._onLoadingChange) self._onLoadingChange(false);
        if (!self._destroyed && self._currentFrame === frameIndex) {
          self._emitFrame();
        }
      });
    }


    // 预加载相邻批次
    this._preloadAdjacent(frameIndex);
  }

  /**
   * 获取指定帧的预加载 Image 对象（用于 canvas 绘制）
   */
  getImage(frameIndex) {
    if (this._destroyed) return null;
    var batchId = this._getBatchId(frameIndex);
    var slotIdx = this._findSlot(batchId);
    if (slotIdx === -1) return null;
    var offset = this._getOffset(frameIndex);
    var slot = this._cache[slotIdx];
    return (slot && slot.images) ? slot.images[offset] : null;
  }

  reset() {
    this.pause();
    this._currentFrame = 1;
    this._emitFrame();
  }

  destroy() {
    this._stopLoop();
    this._isPlaying = false;
    this._destroyed = true;
    this._cache = null;
    this._lruOrder = null;
    this._pendingLoads = null;
  }

  // ===== 内部：批次 ID 与偏移计算 =====

  _getBatchId(frameIndex) {
    return Math.floor((frameIndex - 1) / this._batchSize);
  }

  _getOffset(frameIndex) {
    return (frameIndex - 1) % this._batchSize;
  }

  _getBatchStartFrame(batchId) {
    return batchId * this._batchSize + 1;
  }

  // ===== 内部：全相联缓存操作 =====

  /** 查找包含指定批次的槽位索引，未命中返回 -1 */
  _findSlot(batchId) {
    if (!this._cache) return -1;
    for (var i = 0; i < this._cache.length; i++) {
      if (this._cache[i] && this._cache[i].batchId === batchId) {
        return i;
      }
    }
    return -1;
  }

  /** 标记某槽位为"最近使用"（移到 LRU 队尾） */
  _touchSlot(slotIdx) {
    this._lruOrder = this._lruOrder.filter(function (s) { return s !== slotIdx; });//过滤等于slotIdx的元素，并赋给自己
    this._lruOrder.push(slotIdx);//压回队尾
  }

  /** 分配一个槽位：优先空槽，否则淘汰 LRU 队首 */
  _allocateSlot() {
    for (var i = 0; i < this._cache.length; i++) {
      if (!this._cache[i]) return i;
    }
    var victim = this._lruOrder.shift();
    this._cache[victim] = null;
    return victim;
  }

  // ===== 内部：帧调度 =====

  _emitFrame() {
    if (this._destroyed) return;

    if (this._currentFrame > this._totalFrames) {
      this._currentFrame = 1;
    }

    var batchId = this._getBatchId(this._currentFrame);
    var slotIdx = this._findSlot(batchId);

    if (slotIdx !== -1) {
      this._touchSlot(slotIdx);
      var offset = this._getOffset(this._currentFrame);
      var coord = this._cache[slotIdx].coordData
        ? this._cache[slotIdx].coordData[offset]
        : null;
      this._onFrameUpdate(coord, this._currentFrame);//传数据获取或者不传
    } else {
      this._onFrameUpdate(null, this._currentFrame);
      this._loadBatchForFrame(this._currentFrame);
    }

    // 预加载触发：进入当前批次的第 preloadOffset 帧时，加载下一批
    if (this._getOffset(this._currentFrame) === this._preloadOffset - 1) {
      this._preloadAdjacent(this._currentFrame);
    }
  }

  /** 预加载当前帧的下一个批次（顺序播放和循环播放通用） */
  _preloadAdjacent(frameIndex) {
    var nextBatchId = this._getBatchId(frameIndex) + 1;
    var nextStart = this._getBatchStartFrame(nextBatchId);
    if (nextStart <= this._totalFrames) {
      this._loadBatchForFrame(nextStart);
    } else {
      this._loadBatchForFrame(1);
    }
  }

  // ===== 内部：数据与图片加载 =====

  /**
   * 加载包含 frameIndex 的批次（坐标 + 图片），返回 Promise
   * 同一批次不会重复加载：已缓存直接返回，正在加载则复用 Promise
   */
  _loadBatchForFrame(frameIndex) {
    if (this._destroyed) return Promise.resolve();
    var batchId = this._getBatchId(frameIndex);

    if (this._findSlot(batchId) !== -1) return Promise.resolve();
    if (this._pendingLoads[batchId]) return this._pendingLoads[batchId];

    var self = this;
    var startFrame = this._getBatchStartFrame(batchId);

    var dataPromise = self._fetchBatch
      ? self._fetchBatch(startFrame, self._batchSize)
      : Promise.resolve(null);

    this._pendingLoads[batchId] = dataPromise//关联数据默认不传，就是不获取关联数据
      .then(function (rawData) {
        if (self._destroyed) return;

        var coordData = null;
        if (rawData) {
          coordData = self._transformFrame
            ? rawData.map(self._transformFrame)
            : rawData;//关联数据默认不传，就是不获取关联数据
        }

        // 同批次图片一起预加载
        var images = null;
        if (self._imageUrls) {
          images = [];
          var imgStart = batchId * self._batchSize;
          var imgEnd = Math.min(imgStart + self._batchSize, self._imageUrls.length);
          for (var i = imgStart; i < imgEnd; i++) {
            var img = new Image();
            img.src = self._imageUrls[i];
            images[i - imgStart] = img;
          }
        }

        var slotIdx = self._allocateSlot();
        self._cache[slotIdx] = {
          batchId: batchId,
          coordData: coordData,
          images: images
        };
        self._touchSlot(slotIdx);
      })
      .catch(function (err) {
        if (self._destroyed) return;
        console.error('FrameBufferScheduler: load failed, retrying in 3s', err);
        if (self._onError) self._onError('数据加载失败，3 秒后自动重试');
        return new Promise(function (resolve) {
          setTimeout(function () {
            delete self._pendingLoads[batchId];
            resolve(self._loadBatchForFrame(frameIndex));
          }, 3000);
        });
      })
      .finally(function () {
        delete self._pendingLoads[batchId];
      });

    return this._pendingLoads[batchId];
  }

  // ===== 内部：播放循环 =====

  _startLoop() {
    if (this._rafId) return;
    var self = this;
    var lastTime = performance.now();

    var tick = function (timestamp) {
      if (!self._rafId || self._destroyed) return;
      var elapsed = timestamp - lastTime;
      if (elapsed >= self._interval) {
        lastTime = timestamp - (elapsed % self._interval);
        self._currentFrame++;
        self._emitFrame();
      }
      self._rafId = requestAnimationFrame(tick);
    };

    this._rafId = requestAnimationFrame(tick);
  }

  _stopLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
}
