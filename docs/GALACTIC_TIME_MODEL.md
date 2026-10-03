# ORBIT 2.0 — 银河系时间模型（GALACTIC TIME MODEL）

> **声明**：本模型**不是**精确的天文学 N-body 模拟，而是用于科学可视化的**参数化近似模型**（parameterized galactic orbit）。太阳系过去在银河系中的真实位置涉及银河系差速自转、旋臂密度波、太阳本动、恒星漂移等复杂因素，无法精确重建。代码与 UI 均明确标注：**Visualization / educational approximation**、**Approximate trajectory（近似轨迹）**。

---

## 1. 模型目标

让整个太阳系（以太阳为中心的整体）作为一个点，在银河系尺度下沿银心轨道运动：

```
Galactic Center  →  Milky Way  →  Solar System Orbit  →  Current Solar Position
```

位置完全由模拟时间 `simulationYear` 计算得出，从而支持时间旅行：拖动 COSMIC TIME 时间轴 → 太阳系在银河系中移动到对应历史位置。

---

## 2. 核心参数（src/universe-time/galactic-orbit.js 的 GALACTIC_ORBIT_PARAMS）

| 参数 | 值 | 含义 |
|---|---|---|
| `galacticCenter` | `[-18000, 0, 0]` | 银心在场景中的位置（视觉单位） |
| `orbitRadius` | `18000` | 太阳轨道半径（视觉单位，≈ 26,000 ly） |
| `galacticYear` | `230_000_000` | 银河年：绕银心一圈所需年数（NASA 常用 ≈230 Myr） |
| `referenceYear` | `2026` | 相位锚点年份 |
| `referenceAngle` | `0` | 锚点年份的相位角（rad） |
| `verticalAmplitude` | `1400` | 垂直振荡最大幅度（|y|，视觉单位） |
| `verticalWaves` | `3` | 每圈垂直振荡波数（产生上下起伏而非平面圆） |
| `tilt` | `0.13` | 轨道盘相对显示平面的倾角（匹配场景银河） |

## 3. 位置计算

```
angle = referenceAngle + ((year - referenceYear) / galacticYear) * TAU

ox = cos(angle) * orbitRadius          # 盘面内 x
oy = sin(angle * verticalWaves) * verticalAmplitude   # 垂直振荡
oz = sin(angle) * orbitRadius          # 盘面内 z

# 施加盘面倾角
y = oy * cos(tilt) - oz * sin(tilt)
z = oy * sin(tilt) + oz * cos(tilt)
x = ox + galacticCenter.x

→ { x, y, z, angle }
```

公开函数：
- `getSolarSystemGalacticPosition(year) → {x, y, z, angle}`（本次时间对应的太阳系位置）
- `sampleGalacticOrbit(count=512, params, startAngle, endAngle) → Float32Array`（整圈轨迹点，供轨迹环/尾迹使用）
- `getGalacticYear() → 230_000_000`

## 4. 场景实现（solar-system-motion.js）

- **轨道环（ring）**：512 点 `Float32Array` + `Line`，用 `AdditiveBlending` 的发光材质，弱化显示整圈轨道。
- **尾迹（tail）**：56 点，覆盖 `TAU * 0.16` 弧度，表示近期的运动方向（跟随当前角度动态生成）。
- **标记（markerGroup）**：位于当前太阳系位置；脉冲呼吸（透明度 + 缩放）；`setMarkerScale(dist)` 按相机距离自适应（银河视角放大、深空回缩），保证「进入银河系后始终能找到太阳系」。
- **标签（labels.js）**：银河视角下 `galactic-solar` 投影出界时边缘锚定显示（clamp 到可视区、opacity 0.8、右缘贴边时向左展开），并跳过与太阳同位置的遮挡误判。
- 可见条件：相机距离 > 4,000（`scene.js updateWorldVisibility`）。

## 5. 时间刻度

- 太阳绕银心一圈 = 230 Myr → 时间轴上拖动数百万年即可看到标记沿轨道明显移动；亿年尺度可观察整圈运动。
- UI 显示「银河年 ≈230 Myr」并标注「近似」。

## 6. 局限与后续方向

| 局限 | 说明 | 后续方向 |
|---|---|---|
| 圆形轨道 | 真实太阳轨道近圆但偏心，且受旋臂影响 | 加入旋臂密度波势场 |
| 固定半径/周期 | 忽略银河系质量分布演化 | 采用更接近实测的旋转曲线 |
| 无差速自转 | 银盘内部各半径转速不同 | 分半径角速度 |
| 垂直振荡理想化 | 真实垂直运动准周期且与径向运动耦合 | 采用垂向振荡模型 |
| 旋臂位置固定 | 真实旋臂自身也在演化 | 引入旋臂模式速度 |

第一版的目的不是精确重建，而是让用户**直观理解「太阳系也在绕银心运动」**这一尺度关系，并在时间与空间两个维度建立直观感受。
