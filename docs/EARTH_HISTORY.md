# ORBIT 2.0 — 地球历史（EARTH HISTORY）

本文档说明 ORBIT 2.0 地球地质历史系统的数据结构、时期划分、事件表与「历史可视化」边界。

> 数据边界（详见 docs/DATA_SOURCES.md）：时期边界以 ICS《国际年代地层表》为基准并采用常用约值；无法可靠确定的历史数据一律标记 **approximation**。第一版**不伪造历史地球纹理**，只调整云层/大气等实况参数表达大致时代氛围，UI 明确标注「历史可视化 · 近似示意，非精确复原」。

---

## 1. 数据结构

### 历史时期（src/universe-time/geological-time.js）

```js
{
  id: 'cretaceous',
  name: '白垩纪',          // 中文名
  englishName: 'Cretaceous',
  startYear: -145000000,   // 内部模拟年（负 = 公元前的年数）
  endYear: -66000000,      // endYear 0 = 至今
  color: '#3e5a66',        // 时间轴/标记配色
  description: '……'
}
```

### 历史事件（src/universe-time/historical-events.js）

```js
{
  id: 'dinosaur-extinction',
  year: -66000000,
  name: '恐龙灭绝（K-Pg）',
  englishName: 'Dinosaur Extinction',
  description: '……',
  category: 'extinction'
}
```

## 2. 时期层级（Eon → Era → Period → Epoch）

| 层 | 包含 | 边界（距今，常用约值） |
|---|---|---|
| 冥古宙 Hadean | — | 4,600 – 4,000 Ma |
| 太古宙 Archean | — | 4,000 – 2,500 Ma |
| 元古宙 Proterozoic | — | 2,500 – 541 Ma |
| 显生宙 Phanerozoic | 古生代 / 中生代 / 新生代 | 541 Ma – 今 |
| 古生代 Paleozoic | 寒武纪 奥陶纪 志留纪 泥盆纪 石炭纪 二叠纪 | 541 – 252.2 Ma |
| 中生代 Mesozoic | 三叠纪 侏罗纪 白垩纪 | 252.2 – 66 Ma |
| 新生代 Cenozoic | 古近纪 新近纪 第四纪 | 66 Ma – 今 |
| 第四纪 Quaternary | 更新世 全新世 | 2.58 Ma – 今 |
| 更新世 Pleistocene | — | 2.58 Ma – 11.7 ka |
| 全新世 Holocene | — | 11.7 ka – 今 |

## 3. 事件表（historical-events.js，共 19 项）

| 事件 | 年份 | 类别 |
|---|---|---|
| 地球形成 Earth Formation | 4.54 Ga | origin |
| 月球形成 Moon Formation | 4.51 Ga | origin |
| 最早的海洋 First Oceans | 4.4 Ga | origin |
| 最早的生命 Early Life | 3.8 Ga | life |
| 大氧化事件 Great Oxidation Event | 2.4 Ga | climate |
| 寒武纪生命大爆发 Cambrian Explosion | 541 Ma | life |
| 最早的陆生植物 First Land Plants | 470 Ma | life |
| 最早的森林 First Forests | 385 Ma | life |
| 最早的恐龙 First Dinosaurs | 230 Ma | life |
| 最早的哺乳动物 First Mammals | 225 Ma | life |
| 恐龙灭绝（K-Pg）Dinosaur Extinction | 66 Ma | extinction |
| 最早的灵长类 Early Primates | 55 Ma | life |
| 人族谱系 Hominins | 6 Ma | human |
| 智人出现 Homo sapiens | 300 ka | human |
| 农业起源 Agriculture | 12 ka | human |
| 工业革命 Industrial Revolution | 1760 | human |
| 现在 Present | 2026 | present |

每个事件附带一段中文描述与英文名；`getEventsAround(year)` 用于在历史面板中展示当前时期前后的关键事件。

## 4. 时期检测（geological-time.js）

- `getGeologicalContext(year)`：返回 `{ eon, era, period, epoch }` 四层命中结果。
- `findGeologicalUnit(query)`：按中文名/英文名检索时期（供搜索框 Enter 定位时间轴）。

## 5. 地球视觉状态（earth-history.js）

`getEarthVisualForYear(year)` 返回随时代变化的**可视化参数**（不是纹理）：

| 时代 | 云层密度 | 大气颜色 | 大气强度 | 语义 |
|---|---|---|---|---|
| 冥古宙 | 0.12 | 红橙色 | 1.35 | 岩浆洋 / 高温大气 |
| 太古宙 | 0.28 | 暗绿 | 1.0 | 稀薄云、还原大气 |
| 元古宙 | 0.34 | 深蓝 | 1.15 | 雪球地球冷事件 |
| 古生代 | 0.50 | 深绿 | 1.05 | 早期生命繁盛 |
| 中生代 | 0.68 | 墨绿 | 1.0 | 温暖温室 |
| 新生代（前第四纪） | 0.58 | 深蓝 | 1.0 | 接近现代气候 |
| 第四纪及以后 | 恢复实况 | 恢复实况 | 恢复实况 | 回到真实地球 |

所有非实况状态均带 `approximation: true`，UI 历史面板固定显示「历史可视化 · 近似示意，非精确复原」。

## 6. 与时间轴/银河系的联动

用户拖动 COSMIC TIME 时间轴（simulationYear 变化）时，系统同步更新：
1. 地球历史时期面板（时期名、年代范围、事件列表）；
2. 太阳系在银河系中的位置（`getSolarSystemGalacticPosition(year)`）；
3. 地球视觉状态（云/大气参数）；
4. URL 状态（`?time=<simulationYear>`）；
5. 历史事件高亮（`getEventsAround`）。

示例：选择 66 Ma → 面板显示「古近纪 Paleogene / 66–23 Ma / 恐龙灭绝（K-Pg）」→ 银河视角中太阳系移动到 66 Ma 对应轨道位置 → URL 变为 `?time=-66000000`。

## 7. 后续方向（Paleomap）

- 若未来引入可靠的古地理重建（PaleoMap、GPlates 等公开数据），可将地球视觉升级为真实历史大陆形态与海陆分布。
- 当前版本刻意不做：不伪造历史纹理、不声称精确复原。
