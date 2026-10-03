# EARTH EVOLUTION — 地球演化系统说明

本文档说明 ORBIT 的 **Earth Evolution（地球历史演化）** 系统：拖动 COSMIC TIME 时，3D 地球本体的表面、云层、大气、城市灯光、极地冰盖与冥古宙岩浆海如何随地质时间变化，以及科学数据来源与边界。

## 一、系统结构

| 模块 | 职责 |
| --- | --- |
| `src/universe-time/earth-evolution.js` | 纯数据状态机：`getEarthEvolution(year, nowYear)` 返回 `EarthVisualState`；导出 `ageMaFromYear` / `formatEarthAge` / `getEvolutionLabel` |
| `src/earth/paleogeography.js` | 启动时一次性程序生成 6 张古地理示意纹理（1024×512，CanvasTexture，离线可用，无外部请求） |
| `src/earth/lighting.js` | Earth shader：新增 10 个历史 uniforms（地图 A/B 交叉过渡、陆地／海洋色调、夜灯、冰盖、熔岩、表面亮度），熔岩为程序化噪声（无每帧纹理） |
| `src/app.js` | `applyEarthVisual(year)` 将状态写入 shader uniforms、云层 opacity、大气颜色／强度，并更新 SURFACE STATE 标签；EarthSense 期间临时显示现代地表，退出恢复 |
| `src/ui/geological-timeline.js` | 地质时间轴（上一功能），与 COSMIC TIME 共用同一时钟，拖动即触发 `setYear → applyEarthVisual` 实时更新 |

`EarthVisualState` 字段：

```
ageMa, periodId, surfaceMode(modern|paleo|ancient|lava),
mapA, mapB, mapBlend, historyStrength,
landTint, oceanTint, cloudOpacity,
nightFactor, iceFactor, lavaFactor,
atmosphereColor, atmosphereStrength, surfaceBrightness,
description, label, surfaceState, approximation
```

## 二、时间刻度约定

- simulationYear 采用 BCE 刻度：66 Ma = 年份 `-66_000_000`（与 `?time=-66000000`、TIMELINE_KEYS、银河轨道一致）。
- `ageMaFromYear(year) = max(0, -year / 1_000_000)`；`formatEarthAge(年数)`：0 → NOW、12_000 → 12 ka、2_580_000 → 2.58 Ma、4_540_000_000 → 4.54 Ga。
- 单一时间源：只有 COSMIC TIME 时钟。不设第二套 `geologicalYear`。

## 三、年代视觉状态（ICS 2026/06 边界）

| 年代 | 边界 | surfaceMode | 主要视觉 |
| --- | --- | --- | --- |
| 现代 | 0 Ma | modern | 现代大陆、城市灯光（nightFactor=1）、现代云与蓝色大气 |
| 第四纪 | 0 → 2.58 Ma | modern | 现代大陆不动；冰盖峰值 ≈ 12 ka（0.35→0.62）；夜灯快速渐隐（0.1 Ma 以上为 0）；冷色大气 |
| 新生代 | 2.58 → 66 Ma | paleo | 现代表面 → paleo-66 平滑过渡（66 Ma 时权重 ≈ 0.95）；印度板块漂移；无城市灯光 |
| 白垩纪 | 66 → 143.1 Ma | paleo | paleo-66 ↔ paleo-100 交叉过渡；温暖气候 |
| 侏罗纪 | 143.1 → 201.4 Ma | paleo | paleo-100 ↔ paleo-180：Pangaea 裂解、裂谷海洋扩大 |
| 三叠纪 | 201.4 → 251.902 Ma | paleo | paleo-180 ↔ paleo-250：Pangaea 联合 |
| 二叠纪 | 251.902 → 298.9 Ma | paleo | paleo-250 保持：巨型联合大陆、大范围内陆 |
| 古生代其余 | 298.9 → 538.8 Ma | paleo | paleo-250 → paleo-540：冈瓦纳、劳伦西亚，海洋占主导 |
| 前寒武纪 | 538.8 → 4000 Ma | ancient | 抽象古地球：高海洋占比、少量原始陆块、深蓝海洋、较厚大气（PRECAMBRIAN VISUALIZATION） |
| 冥古宙 | 4000 → 4567 Ma | lava | 程序化岩浆海洋：深红／橙／黄热斑、暗区保留、强烈大气辉光（MAGMA EARTH） |

- nightFactor：0 Ma = 1；0.01 Ma ≈ 0.65；0.05 Ma ≈ 0.05；≥ 0.1 Ma = 0。
- iceFactor：现代 ≈ 0.35；12 ka 峰值 ≈ 0.62；温室年代（中生代等）≈ 0。
- lavaFactor：仅冥古宙 > 0（4000 Ma ≈ 0.9 → 4567 Ma ≈ 1）。

## 四、科学数据来源

1. **International Commission on Stratigraphy (ICS) — International Chronostratigraphic Chart v2026/06**，官方：https://stratigraphy.org/chart/。地质年代边界（冥古宙 4567→4031 Ma、太古宙 4031→2500 Ma、元古宙 2500→538.8 Ma、显生宙 538.8 Ma→Present、三叠纪 251.902→201.4 Ma、侏罗纪 201.4→143.1 Ma、白垩纪 143.1→66 Ma 等）以该表为准。
2. **EarthByte / GPlates**（https://www.earthbyte.org/、https://www.gplates.org/）：未来更精细古地理重建的参考来源。当前版本**不依赖**其在线服务，全部纹理在本地程序生成。
3. 太阳系银河轨迹仍为参数化视觉模型（见 `docs/GALACTIC_TIME_MODEL.md`），不是历史真实星历。

## 五、重要声明

- 古地理纹理为 **SCIENCE-INSPIRED VISUALIZATION**：陆块形状、位置与海陆比例是示意，不是精确古地理复原（PALEOMAP 级重建留待后续接入）。
- Hadean 熔岩海、前寒武纪"抽象古地球"为视觉近似，界面同步标注 PRECAMBRIAN / MAGMA EARTH。
- 数值年龄可能随国际地层表更新而修订（Numeric ages are subject to ongoing revision）。

## 六、性能与约束

- 古地理纹理启动时生成一次（6 张 1024×512），拖动时间只改 shader uniforms 与云层 opacity；无每帧 Canvas / Texture / Geometry / Material 创建。
- 不新建第二个 Earth Mesh；复用现有 Earth 材质、云层与大气；现代表面可完整恢复（year ≥ 现在时 historyStrength = 0、nightFactor = 1、大气回到基准）。
- 移动端不关闭该功能；古地理纹理可在 `src/earth/paleogeography.js` 中降为 512×256。
- 调试：`window.ORBIT.earthEvolution.getState()` / `window.ORBIT.earthEvolution.setYear(-180000000)`。

## 七、测试

`tests/earth-evolution.test.js`：NOW / 12 ka / 300 ka / 2.58 Ma / 66 Ma / 100 Ma / 143.1 Ma / 180 Ma / 201.4 Ma / 250 Ma / 538.8 Ma / 2.5 Ga / 4.0 Ga / 4.54 Ga 的年代状态、边界识别、nightFactor / lavaFactor / iceFactor / historyStrength 跨年代不变量、`ageMaFromYear` / `formatEarthAge`、古地理模块键与纹理类型。运行：`npm test`。
