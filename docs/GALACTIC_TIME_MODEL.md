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

## 5.1 轨迹即地球历史时间轴（ORBIT 2.0）

为了让「太阳系在银河系中的运行」与「地球历史」在同一个空间里被理解，轨道被进一步画成一条时间轴：

- **分段着色轨道环**：原单色环改为 512 段 `LineSegments` + 每顶点颜色；每一段取其中点年份对应的地质时期颜色（`getOrbitYearColor` → `getGeologicalContext().color`）。整条环按地质年代着色的色带，即「地球历史沿银河轨道展开」。
- **时期节点（epoch nodes）**：在轨道真实位置上（含垂直振荡）放置 27 个可点击节点，来源与优先级：
  - 一级（kind 1，常显标签）：COSMIC TIME 时间轴的 10 个关键节点（4.54 Ga … NOW）；
  - 二级（kind 2）：纪/代/宙/世边界年份（寒武纪、奥陶纪、侏罗纪、白垩纪…）；
  - 三级（kind 3）：`HISTORICAL_EVENTS` 17 个历史事件（月形成、大氧化、寒武纪大爆发、K-Pg、智人…）。
  - 两年份相差 ≤ 2 Myr 时按优先级合并去重（如 541 Ma 只保留一个节点）。
- **渲染**：单个 `InstancedMesh`（复用球体几何/材质），按节点类型缩放，`setColorAt` 时期色；随相机距离自适应放大（同 marker），银河远景依然可点。
- **交互**：点击节点（3D 拾取或标签）→ `cosmic.setYear(year)`：太阳系标记移到该位置、底部 COSMIC TIME 同步、右侧历史面板更新。
- **当前时期高亮**：当前年份所在纪的边界节点每帧提亮（颜色向白色靠 45%）。
- **标签**：一级节点常显、二级节点在拉近距离（<45,000）显示，复用 labels.js 投影与防重叠；三级事件点不常显标签，保留 3D 点击。
- 节点与着色均为可视化近似，与 §1 声明一致；纯数据层在 `galactic-epoch-nodes.js`（无 THREE 依赖，可单测）。

## 6. 局限与后续方向

| 局限 | 说明 | 后续方向 |
|---|---|---|
| 圆形轨道 | 真实太阳轨道近圆但偏心，且受旋臂影响 | 加入旋臂密度波势场 |
| 固定半径/周期 | 忽略银河系质量分布演化 | 采用更接近实测的旋转曲线 |
| 无差速自转 | 银盘内部各半径转速不同 | 分半径角速度 |
| 垂直振荡理想化 | 真实垂直运动准周期且与径向运动耦合 | 采用垂向振荡模型 |
| 旋臂位置固定 | 真实旋臂自身也在演化 | 引入旋臂模式速度 |

第一版的目的不是精确重建，而是让用户**直观理解「太阳系也在绕银心运动」**这一尺度关系，并在时间与空间两个维度建立直观感受。
