# 元素周期表 · 今日价格（Element Price Periodic Table）

一个自包含的单页网站：标准 18 列元素周期表，鼠标悬停任意元素即可查看该元素的「今日价格」详情（价格、规格、数据日期、来源、较前日涨跌）。

在线地址：部署到 GitHub Pages 后为 `https://<用户名>.github.io/element-price-table/`

## 功能

- 118 个元素按标准周期表排列（含镧系/锕系独立两行），按化学类别着色
- 鼠标悬停显示今日价格详情卡；无公开行情的元素（放射性/人工合成等）会说明原因
- 顶部搜索框：按中文名/符号/原子序数搜索并高亮；点击图例可高亮对应类别
- 联网时页面内自动获取金/银/铂/钯实时价（gold-api.com，按实时汇率折算为人民币）
- 「刷新价格」按钮可手动重新获取实时价

## 每日自动更新价格

仓库内置 GitHub Actions 工作流 `.github/workflows/daily.yml`，每天 **北京时间 08:15 和 20:15** 自动运行 `node src/build.mjs`：

1. 读取上次快照 `data.json`（接口失败时价格不回退）
2. 从公开接口抓取当日价格：
   - 金/银/铂/钯：gold-api.com 国际现货（美元/盎司 → 元/克）
   - 铜/铝：Yahoo Finance 期货（COMEX 铜、LME 铝），按实时汇率折算
   - 人民币汇率：open.er-api.com
3. 重新生成自包含的 `index.html` 并提交推送；GitHub Pages 自动生效

> 说明：其余元素（钴、锂、稀土、工业金属等）的价格来自国内公开现货参考价（上海金属网、长江有色、SMM、生意社、Mysteel、新华·包头稀土指数等），它们没有免费日度 API，属于「参考价」并标注采集日期；有免费接口的元素会每日自动更新。

## 目录结构

```
deploy/
├── index.html            # 生成的成品页面（每日由构建脚本重写）
├── data.json             # 价格快照（构建脚本维护）
├── src/
│   ├── base-data.mjs     # 元素基础数据 + 参考价基线
│   ├── build.mjs         # 每日构建脚本
│   ├── style.css         # 页面样式
│   └── app.js            # 页面交互逻辑
└── .github/workflows/daily.yml   # 每日自动更新工作流
```

## 本地运行 / 手动构建

```bash
# 本地预览：直接双击 index.html，或用任意静态服务器
npx serve .

# 手动重新抓取价格并生成页面
node src/build.mjs
```

## 部署到 GitHub Pages（一次性）

1. 把本目录内容推送到一个公开 GitHub 仓库（推荐仓库名 `element-price-table`）
2. 在仓库 Settings → Pages 中把发布来源设为 `Deploy from a branch` → `main` / `/ (root)`
3. 工作流 `daily.yml` 会自动每日更新价格；手动触发：Actions → 每日价格更新 → Run workflow

## 免责声明

页面中的价格均为公开渠道的参考价/行情，可能因规格、地区、纯度不同而有差异且存在滞后，仅供学习参考，不构成投资建议；实际交易请以交易所或市场实时报价为准。
