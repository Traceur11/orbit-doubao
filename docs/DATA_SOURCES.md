# ORBIT 2.0 — 数据来源说明（DATA SOURCES）

本文件记录 ORBIT 2.0 宇宙时间系统（地球地质历史、银河系太阳系运动、历史事件）所使用的数据来源。原则：优先采用 NASA / USGS / Smithsonian / Britannica / ICS 等公开科学资料；凡无法可靠确定的数值一律在代码与 UI 中标记为 **approximation（近似）**。

> 注意：本仓库另有原 Orbit 项目的 `docs/data-sources.md`（原项目天体纹理与数据来源），与本文件不冲突。本文件只覆盖 ORBIT 2.0 新增的宇宙时间部分。

---

## 1. 地质历史时期边界（geological-time.js）

| 数据名称 | 使用值（距今） | 常用来源口径 | 状态 |
|---|---|---|---|
| 冥古宙 Hadean | 4,600 – 4,000 Ma | 地球形成后最早的冥古宙；ICS 不细分前寒武纪单元 | 近似 |
| 太古宙 Archean | 4,000 – 2,500 Ma | ICS/USGS 前寒武纪划分 | 常用值 |
| 元古宙 Proterozoic | 2,500 – 541 Ma | ICS/USGS | 常用值 |
| 显生宙 Phanerozoic 底界 | 541 Ma | ICS 精确值 538.8 Ma（GSSP 用 538.8），本产品采用常用约值 541 Ma | **近似（约值）** |
| 古生代 Paleozoic | 541 – 252.2 Ma | ICS | 常用值 |
| 中生代 Mesozoic | 252.2 – 66 Ma | ICS | 常用值 |
| 新生代 Cenozoic | 66 – 0 Ma | ICS | 常用值 |
| 寒武纪 Cambrian | 541 – 485.4 Ma | ICS（底界精确 538.8 Ma） | 近似（底界约值） |
| 奥陶纪 Ordovician | 485.4 – 443.8 Ma | ICS | 常用值 |
| 志留纪 Silurian | 443.8 – 419.2 Ma | ICS | 常用值 |
| 泥盆纪 Devonian | 419.2 – 358.9 Ma | ICS | 常用值 |
| 石炭纪 Carboniferous | 358.9 – 298.9 Ma | ICS | 常用值 |
| 二叠纪 Permian | 298.9 – 252.2 Ma | ICS（底界精确 251.9 Ma） | 近似（底界约值） |
| 三叠纪 Triassic | 252.2 – 201.4 Ma | ICS（精确 251.902 Ma） | 近似（底界约值） |
| 侏罗纪 Jurassic | 201.4 – 145 Ma | ICS | 常用值 |
| 白垩纪 Cretaceous | 145 – 66 Ma | ICS（顶界精确 66.0 Ma，K-Pg） | 常用值 |
| 古近纪 Paleogene | 66 – 23.03 Ma | ICS | 常用值 |
| 新近纪 Neogene | 23.03 – 2.58 Ma | ICS | 常用值 |
| 第四纪 Quaternary | 2.58 Ma – 今 | ICS（底界精确 2.58 Ma） | 常用值 |
| 更新世 Pleistocene | 2.58 Ma – 11.7 ka | ICS | 常用值 |
| 全新世 Holocene | 11.7 ka – 今 | ICS（GSSP 11,700 yr b2k） | 常用值 |

**主要来源**
- ICS（国际地层委员会）《国际年代地层表》Chronostratigraphic Chart（v2023/09）：https://stratigraphy.org/ICSchart/ChronostratChart2023-09.pdf
- USGS Geologic Time Scale：https://www.usgs.gov/media/images/usgs-geologic-time-scale
- Smithsonian National Museum of Natural History — Deep Time：https://naturalhistory.si.edu/education/teaching-resources/paleontology/deep-time

---

## 2. 地球视觉状态（earth-history.js）

第一版**不伪造历史地球真实纹理**，仅调整现有地球模型的云层密度、大气颜色与大气强度来表达大致时代氛围（如冥古宙岩浆洋高温大气、元古宙雪球事件冷色调、中生代温室）。所有调整均带 `approximation: true` 并在 UI 标注「历史可视化 · 近似示意，非精确复原」。

来源：时代气候特征综述（Smithsonian Deep Time / Britannica 地质时期条目），数值本身为可视化设计参数，**非观测数据**，状态一律为 approximation。

---

## 3. 关键历史事件（historical-events.js）

| 事件 | 使用年份 | 常用来源口径 | 状态 |
|---|---|---|---|
| 地球形成 Earth Formation | 4.54 Ga | NASA 行星科学（锆石/陨石定年） | 常用值 |
| 月球形成 Moon Formation | 4.51 Ga | 大撞击假说（Theia） | 近似（假说） |
| 最早的海洋 First Oceans | 4.4 Ga | 早期地球冷却凝结（锆石证据） | 近似 |
| 最早的生命 Early Life | 3.8 Ga | 太古宙叠层石/同位素证据，学界有争议 | 近似 |
| 大氧化事件 Great Oxidation Event | 2.4 Ga | 氧同位素记录 | 常用值 |
| 寒武纪生命大爆发 Cambrian Explosion | 541 Ma | 化石记录（约 538.8 Ma） | 近似（约值） |
| 最早的陆生植物 First Land Plants | 470 Ma | 植物演化记录 | 近似 |
| 最早的森林 First Forests | 385 Ma | 泥盆纪森林化石 | 近似 |
| 最早的恐龙 First Dinosaurs | 230 Ma | 三叠纪恐龙化石（约 230-235 Ma） | 常用值 |
| 最早的哺乳动物 First Mammals | 225 Ma | 化石记录 | 近似 |
| 恐龙灭绝（K-Pg）Dinosaur Extinction | 66 Ma | 希克苏鲁伯撞击与 K-Pg 界线 | 常用值 |
| 最早的灵长类 Early Primates | 55 Ma | 古近纪化石 | 近似 |
| 人族谱系 Hominins | 6 Ma | 人亚科分化的分子钟/化石估算 | 近似 |
| 智人出现 Homo sapiens | 300 ka | 摩洛哥杰贝尔依罗出土化石（约 300 ka） | 常用值 |
| 农业起源 Agriculture | 12 ka | 西亚新月沃地农业革命 | 常用值 |
| 工业革命 Industrial Revolution | 1760 | 历史纪年 | 常用值 |
| 现在 Present | 2026 | 当前年份 | 观测 |

**主要来源**
- NASA Solar System Exploration（地球与太阳系）：https://solarsystem.nasa.gov/
- NASA Astrobiology / 行星形成与早期地球资料
- Britannica（地质时代、生物演化条目）：https://www.britannica.com/
- Smithsonian National Museum of Natural History — Deep Time

---

## 4. 银河系与太阳系轨道参数（galactic-orbit.js / solar-system-motion.js）

| 参数 | 使用值 | 说明 | 状态 |
|---|---|---|---|
| 太阳到银心距离 | ≈ 26,000 ly | 场景中 18,000 视觉单位 ≈ 26,000 ly | 常用值（观测估计） |
| 银河年（太阳公转周期） | 230 Myr（代码）/ UI 显示 ≈230 Myr | 太阳绕银心一圈约 2.25–2.5 亿年 | 常用值（估计区间 225–250 Myr） |
| 参考年份 | 2026 | 相位锚点：`referenceAngle` 定义“现在”的参考位置 | 约定 |
| 轨道半径（视觉） | 18,000 单位 | 与场景银河盘半径匹配的视觉比例 | 可视化参数 |
| 垂直振幅 | 1,400 单位 | 太阳相对银盘面的上下振荡（可视化近似） | 可视化参数 |
| 盘面倾角 | 0.13 rad | 匹配场景银河显示 | 可视化参数 |
| 旋臂参考 | 猎户臂（UI 文案） | 太阳位于猎户臂内侧边缘（观测事实） | 常用值 |

**来源**
- NASA/JPL 与 ESA 关于太阳系与银河系的科普资料（太阳到银心距离、银河年）：https://science.nasa.gov/
- 银河年（Galactic Year）估计区间 225–250 Myr 常见于 ESA/NASA 资料与天文教科书

**重要声明（见 docs/GALACTIC_TIME_MODEL.md）**：太阳系过去在银河系中的**真实历史位置无法精确重建**（涉及银河系差速自转、旋臂密度波、太阳本动等复杂因素），本产品第一版采用**参数化近似轨道**，仅在 UI 中显示「Approximate trajectory（近似轨迹）」。

---

## 5. 数据使用许可

| 来源 | 许可/使用说明 |
|---|---|
| ICS 国际年代地层表 | 公开科学标准图表，注明出处即可引用 |
| NASA | 公开内容（NASA Media Usage Guidelines），注明来源 |
| USGS | 公共领域（Public Domain），注明来源 |
| Smithsonian | 教学与研究用途，注明来源 |
| Britannica | 仅作为背景综述参考，不复制原文 |

凡标注「近似」的数据均不代表任何机构的精确发布值，仅为本产品可视化而采用的简化表达。
