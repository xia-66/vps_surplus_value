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

### 方式一：部署到 Vercel（推荐）

#### 1️⃣ 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Tomzhao1016/vps_surplus_value_v2)

#### 2️⃣ 配置环境变量

部署后，在 Vercel 项目设置中添加环境变量：

- **变量名**：`EXCHANGE_RATE_API_KEY`
- **变量值**：你的 ExchangeRate-API Key（[点击获取](https://www.exchangerate-api.com/)）

路径：**Project Settings → Environment Variables**

#### 3️⃣ 重新部署

添加环境变量后，在 **Deployments** 页面点击重新部署（Redeploy）使配置生效。

---

### 方式二：本地开发

#### 1️⃣ 克隆项目
```bash
git clone https://github.com/Tomzhao1016/vps_surplus_value_v2.git
cd vps_surplus_value_v2
```

#### 2️⃣ 配置环境变量
```bash
# 复制示例配置文件
cp env.example .env

# 编辑 .env 文件，填入你的 API Key
EXCHANGE_RATE_API_KEY=your_actual_api_key_here
```

#### 3️⃣ 本地运行
```bash
# 安装 Vercel CLI（首次）
npm install -g vercel

# 使用 Vercel Dev 运行（支持 Serverless Functions）
vercel dev
```

或使用静态服务器（汇率功能需手动配置）：
```bash
npm install -g serve
serve .
```

#### 4️⃣ 直接打开
在浏览器中打开 `index.html`（部分 API 功能可能受限）。

---

## 🔑 汇率 API 配置

项目使用 **ExchangeRate-API** 获取实时汇率。

### 获取 API Key

1. 访问 [ExchangeRate-API 官网](https://www.exchangerate-api.com/)
2. 注册并获取免费 API Key（每月 1500 次调用）
3. 将 API Key 配置为环境变量（见上方部署说明）

### 配置说明

- **Vercel 部署**：在项目环境变量中添加 `EXCHANGE_RATE_API_KEY`
- **本地开发**：在 `.env` 文件中配置（参考 `env.example`）
- **降级模式**：若未配置 API Key，将自动回退为手动输入汇率模式

---

## 📂 项目结构

```
📦 vps_surplus_value_v2
 ┣ 📂 api/
 ┃ ┗ 📜 exchange-rate.js  # Vercel Serverless Function（汇率 API 代理）
 ┣ 📜 index.html          # 主页面结构与布局
 ┣ 📜 styles.css          # 样式文件（主题、响应式、卡片设计）
 ┣ 📜 script.js           # 核心逻辑（计算、汇率、分享、主题切换）
 ┣ 📜 vercel.json         # Vercel 部署配置
 ┣ 📜 env.example         # 环境变量示例
 ┗ 📜 .gitignore          # Git 忽略配置
```

---

## 📘 模块说明

### `api/exchange-rate.js`
- **Vercel Serverless Function**，用于安全地代理汇率 API 请求。
- 在服务器端调用 ExchangeRate-API，避免前端暴露 API Key。
- 支持 CORS，返回标准化的 JSON 响应。
- 包含错误处理与参数验证。

### `index.html`
- 页面结构清晰，分为顶部导航、左侧输入面板和右侧结果面板。  
- 内置说明弹窗 (Help Modal)，帮助用户理解参数含义。

### `styles.css`
- 使用 CSS 变量实现暗 / 亮主题。  
- 响应式网格布局，移动端自适应。  
- 统一圆角、阴影与色彩规范，具有 Apple 风格质感。

### `script.js`
- 包含完整计算逻辑、汇率获取与 UI 交互绑定。  
- 支持通过 Vercel API 路由或直接调用获取汇率（可配置）。
- 自动生成带参数分享链接，可直接复现计算场景。  
- 提供通知机制与表单输入安全验证。

### `vercel.json`
- Vercel 平台部署配置文件。
- 配置 Serverless Functions 路由与安全响应头。

---

## 📜 开源许可证

本项目基于 **Reciprocal Public License 1.5 (RPL-1.5)** 协议开源。  
使用、修改或分发本项目时：
- 必须公开源代码；  
- 修改后需沿用相同协议；  
- 商业使用需保留原始署名与协议声明。

📄 [查看许可证详情](https://opensource.org/licenses/RPL-1.5)
