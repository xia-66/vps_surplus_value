# VPS 剩余价值计算器 v2

> 一款极简、专业、可分享的 VPS（或其他订阅制服务）剩余价值计算工具。
> 帮助用户在交易二手服务时，快速、精确地评估其剩余价值和溢价情况。

![项目截图](https://raw.githubusercontent.com/Tomzhao1016/vps_surplus_value_v2/main/screenshot.png)

---

## ✨ 功能特性

### 🧮 核心功能
- **精确估值**：根据续费价格、汇率、周期、到期日与交易日，计算服务剩余价值。
- **溢价分析**：根据出价，自动计算溢价或折价。
- **实时汇率**：通过 [ExchangeRate-API](https://www.exchangerate-api.com/) 自动获取主流货币兑人民币 (CNY) 汇率。
- **多周期支持**：支持月付、季付、半年、年付、两年、三年周期。

### 💡 用户体验
- **响应式布局**：兼容桌面端与移动端。  
- **亮 / 暗主题**：支持系统偏好与手动切换。  
- **动态通知 (Toast)**：实时反馈操作结果（计算、复制、清空等）。  
- **一键分享**：自动生成包含参数的分享链接，打开即可复现计算场景。

### 🔒 健壮性与安全性
- 防止负数与非法字符输入。
- 安全解析 URL 参数，防止异常崩溃。
- flatpickr 加载失败时自动降级为原生日期输入。
- Modal 模态框具备键盘焦点循环（Focus Trap）支持。

---

## 🧩 技术栈

| 技术 | 用途 |
|------|------|
| **HTML5** | 页面结构与语义化 |
| **CSS3** | 响应式布局与主题切换 |
| **JavaScript (Vanilla JS)** | 核心逻辑与数据计算 |
| **Flatpickr.js** | 日期选择组件 |
| **Font Awesome** | 图标支持 |

---

## 🧠 核心算法

```
周期价格 = 续费金额(外币) × 汇率
年付价格 = 周期价格 × (12 ÷ 周期月数)
每日价值 = 年付价格 ÷ 365
剩余价值 = 每日价值 × 剩余天数
溢价 = 出价金额 - 剩余价值
```

> 其中：剩余天数 = 到期日期 - 交易日期（结果向下取整）。

---

## ⚙️ 使用方法

### 1️⃣ 克隆项目
```bash
git clone https://github.com/Tomzhao1016/vps_surplus_value_v2.git
```

### 2️⃣ 本地运行（推荐）
```bash
npm install -g serve
serve .
```
确保本地服务器可访问汇率 API。

### 3️⃣ 直接打开
在浏览器中打开 `index.html` 即可（部分 API 功能可能受限）。

---

## 🔑 汇率 API 配置

项目使用 **ExchangeRate-API** 获取实时汇率。  
需自行申请 API Key：  
👉 [https://www.exchangerate-api.com/](https://www.exchangerate-api.com/)

在 `script.js` 顶部修改：

```js
const EXCHANGE_RATE_API_KEY = 'YOUR_API_KEY_HERE';
```

若未配置或使用占位值，将自动回退为手动输入模式。

---

## 📂 项目结构

```
📦 vps_surplus_value_v2
 ┣ 📜 index.html    # 主页面结构与布局
 ┣ 📜 styles.css    # 样式文件（主题、响应式、卡片设计）
 ┗ 📜 script.js     # 核心逻辑（计算、汇率、分享、主题切换）
```

---

## 📘 模块说明

### `index.html`
- 页面结构清晰，分为顶部导航、左侧输入面板和右侧结果面板。  
- 内置说明弹窗 (Help Modal)，帮助用户理解参数含义。

### `styles.css`
- 使用 CSS 变量实现暗 / 亮主题。  
- 响应式网格布局，移动端自适应。  
- 统一圆角、阴影与色彩规范，具有 Apple 风格质感。

### `script.js`
- 包含完整计算逻辑、汇率获取与 UI 交互绑定。  
- 自动生成带参数分享链接，可直接复现计算场景。  
- 提供通知机制与表单输入安全验证。

---

## 🤝 贡献方式

欢迎通过 **Pull Request** 或 **Issue** 参与贡献：

```bash
# 创建新分支
git checkout -b feature/your-feature
# 提交修改
git commit -m "Add new feature"
# 推送
git push origin feature/your-feature
```

---

## 📜 开源许可证

本项目基于 **Reciprocal Public License 1.5 (RPL-1.5)** 协议开源。  
使用、修改或分发本项目时：
- 必须公开源代码；  
- 修改后需沿用相同协议；  
- 商业使用需保留原始署名与协议声明。

📄 [查看许可证详情](https://opensource.org/licenses/RPL-1.5)
