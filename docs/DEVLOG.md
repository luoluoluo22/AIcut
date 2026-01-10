# Antigravity Studio 开发日志

## 2026-01-09: 视频缩放抖动问题解决方案

### 🐛 问题描述

在 Remotion 中对 `<Video>` 或 `<OffthreadVideo>` 元素应用 CSS `transform: scale()` 时，视频画面会出现明显的**抖动/跳动（Jitter）**。

**现象**：
- 图片缩放完全平滑，无任何抖动
- 视频缩放时画面会轻微跳动
- 尝试了多种方案均无效：
  - 使用 `width/height` 代替 `transform` ❌
  - 使用 `OffthreadVideo` 组件 ❌
  - 添加 `translateZ(0)` 强制 GPU 加速 ❌
  - 添加 `will-change: transform` ❌
  - 添加 `backface-visibility: hidden` ❌
  - 提高帧率到 60fps ❌

### 🔍 根本原因

这是一个**浏览器级别的已知问题**：

> 浏览器对 `<video>` 元素的 CSS transform 处理与普通元素（如 `<img>`）不同。视频解码是由浏览器的媒体引擎处理的，与 CSS 渲染管线不完全同步，导致缩放时产生抖动。

参考资料：
- [GSAP Forums - Firefox scale jitter](https://gsap.com/community/forums/)
- [Stack Overflow - CSS transform scale video jitter](https://stackoverflow.com/)

### ✅ 解决方案

**添加极小的旋转角度 `rotate(0.02deg)`**：

```tsx
transform: `scale3d(${scale}, ${scale}, 1) rotate(0.02deg)`
```

### 📝 原理解释

添加极小的旋转角度会**强制浏览器使用不同的渲染路径**，触发完整的 GPU 合成层优化，从而稳定渲染管线。

这个技巧最初是为了解决 Firefox 的缩放抖动问题而发现的，但在 Chrome 和其他浏览器上同样有效。

### 💡 最佳实践

在 Remotion 中对视频应用 Ken Burns 效果时，使用以下模式：

```tsx
<div style={{
    width: '100%',
    height: '100%',
    // 关键：添加 rotate(0.02deg) 修复视频缩放抖动
    transform: `scale3d(${scale}, ${scale}, 1) rotate(0.02deg)`,
    transformOrigin: '50% 50%',
    willChange: 'transform',
}}>
    <OffthreadVideo
        src={videoUrl}
        style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
        }}
        muted
    />
</div>
```

### ⚠️ 注意事项

1. `0.02deg` 的旋转肉眼完全不可见，不会影响画面质量
2. 建议使用 `OffthreadVideo` 而不是 `Video`，可以获得更好的性能
3. 图片不需要此修复，直接使用 `scale3d` 即可

---

## 2026-01-09: 视频切换时音频骤停问题

### 🐛 问题描述

在 MV 项目中，当一个视频片段切换到下一个视频片段时，背景音乐会出现**短暂的骤停**。

**现象**：
- 音乐在视频衔接处突然中断一瞬间
- 每次视频切换都会发生
- 严重影响观看体验

### 🔍 根本原因

Remotion 的视频组件在加载时需要时间解码，当下一个视频还未加载完成时，整个渲染管线会等待，导致音频也暂停。

这是 Remotion 的一个**已知问题**，官方文档有详细说明：
- [Remotion - Flickering](https://www.remotion.dev/docs/troubleshooting/flickering)
- [Remotion - Player Seek](https://www.remotion.dev/docs/player/player-seek)

### ✅ 解决方案

**使用 `premountFor` 属性预加载视频**：

```tsx
<Sequence
    key={clip.id}
    from={Math.round(clip.start * fps)}
    durationInFrames={Math.round(clip.duration * fps)}
    premountFor={60}  // 关键：预加载 60 帧（2秒）
>
    <ClipItem ... />
</Sequence>
```

**同时确保视频完全静音**：

```tsx
<OffthreadVideo
    src={videoUrl}
    muted
    volume={0}  // 双重保险：确保视频完全静音
/>
```

### 📝 原理解释

`premountFor` 会在 Sequence 实际开始播放前的指定帧数就开始挂载组件。这样当视频切换时，下一个视频已经加载好了，不会产生等待时间。

- `premountFor={60}` = 提前 60 帧（30fps 下为 2 秒）开始加载
- 对于长视频片段（>10 秒），60 帧通常足够
- 对于短视频片段（<5 秒），可以增加到 90 帧（3 秒）

### 💡 最佳实践

```tsx
// 根据轨道类型决定是否需要预加载
const isMediaTrack = track.type === 'video' || track.type === 'image';
const premountFrames = isMediaTrack ? 60 : 0;

<Sequence
    key={clip.id}
    from={Math.round(clip.start * fps)}
    durationInFrames={Math.round(clip.duration * fps)}
    premountFor={premountFrames}
>
    <ClipItem ... />
</Sequence>
```

### ⚠️ 注意事项

1. 不要对所有 Sequence 都添加 `premountFor`，只对需要加载资源的（视频、图片）添加
2. 音频轨道不需要预加载，Remotion 会自动处理
3. 如果预加载后仍有问题，可以尝试在 `OffthreadVideo` 上添加 `pauseWhenBuffering` 属性

---

## 日志模板

```markdown
## YYYY-MM-DD: [问题标题]

### 🐛 问题描述
[描述遇到的问题]

### 🔍 根本原因
[分析问题原因]

### ✅ 解决方案
[具体的解决代码或步骤]

### 💡 最佳实践
[总结的最佳实践]
```
