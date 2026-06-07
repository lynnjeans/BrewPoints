# BrewPoints — 项目进度

> 更新日期:2026-06-07
> 权威设计:`BrewPoints_Dev_Plan.md`。本文件只记录"做到哪了",不替代计划本身。
> 计划阶段 0–7 的全部任务均已实现并通过验收。以下为对照清单。

---

## 总览

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 | 项目脚手架与基建 | ✅ 完成 |
| 1 | 数据模型与数据库层 | ✅ 完成 |
| 2 | 认证模块(邮箱密码 / Google OAuth / 角色守卫) | ✅ 完成 |
| 3 | 动态 QR 码模块(R3) | ✅ 完成 |
| 4 | 积分核心逻辑(R1 / R2) | ✅ 完成 |
| 5 | 客户端界面 | ✅ 完成 |
| 6 | 店员端界面 | ✅ 完成 |
| 7 | PWA 化与收尾 | ✅ 完成 |

红线 R1 / R2 / R3 全程守住,后端单测 + E2E 冒烟覆盖三条红线。

---

## 阶段任务清单

### 阶段 0 — 脚手架与基建
- [x] 0.1 初始化 monorepo / 前后端骨架(`/client` + `/server` + 根编排)
- [x] 0.2 PWA manifest 占位(`client/public/manifest.webmanifest`)
- [x] 0.3 环境配置与密钥管理(`server/src/config.ts`,类型安全 env)
- [x] 0.4 落地设计系统 tokens(Tailwind preset 引用 `design/tailwind.config.js`)

### 阶段 1 — 数据模型
- [x] 1.1 定义数据模型(Customer / Staff / Redemption / StampTransaction,Int 自增主键)
- [x] 1.2 余额重算函数 `reconcileBalance`(落实 R2)
- [x] 1.3 种子数据(2 店员 + 3 客户,可重复执行)

### 阶段 2 — 认证
- [x] 2.1 邮箱+密码 注册/登录(bcryptjs cost 12,JWT Bearer 30 天)
- [x] 2.2 Google OAuth 2.0 登录/注册(授权码流 + state CSRF + `prompt=select_account`)
- [x] 2.3 角色与路由守卫(`authenticate` / `requireRole` / `requireManager`)

### 阶段 3 — 动态 QR(R3)
- [x] 3.1 登录时下发 per-customer `qrSeed`
- [x] 3.2 客户端本地 HMAC 签名 + QR 显示组件(离线可用,Web Crypto)
- [x] 3.3 服务端扫码校验接口(验签 + 余额检查,恒定时间比较)

### 阶段 4 — 积分核心(R1 / R2)
- [x] 4.1 加章接口(+1 / +2,店员专用)
- [x] 4.3 店员确认兑换接口(唯一扣章点,原子条件更新)
- [x] 4.4 防重复加章(in-flight 去重)
- [x] 4.5 交易/兑换历史查询接口

### 阶段 5 — 客户端界面
- [x] 5.1 登录/注册页
- [x] 5.2 数字咖啡卡首页
- [x] 5.3 奖励页
- [x] 5.4 历史页
- [x] 5.5 个人资料页

### 阶段 6 — 店员端界面
- [x] 6.1 店员扫码页(含手动输入兜底)
- [x] 6.2 兑换确认交互
- [x] 6.3 错误与边界状态实现

### 阶段 7 — PWA 与收尾
- [x] 7.1 Service Worker 与离线缓存策略(Workbox,app shell 预缓存 + SWR 读 + NetworkOnly 写)
- [x] 7.2 可安装性验证(manifest + maskable 图标)
- [x] 7.3 店长查看页(最小实现:客户、近期交易、兑换记录)
- [x] 7.4 端到端冒烟测试(`server/scripts/e2e-smoke.ts`,18 项检查,含 R1/R2/R3)

---

## 计划外已完成(打磨项)

- [x] 店员/客户登录页**跨入口跳转链接**
- [x] 登录错误文案配色:新增 `bp-alert`(柔和琥珀,非赤陶/非红)token
- [x] Google 按钮加官方四色图标(`GoogleIcon`,作为第三方品牌例外记录在案)
- [x] Google `prompt=select_account` 支持换号登录
- [x] 局域网手机访问(Vite `host:true` + preview 代理)
- [x] **PWA 安装按钮**("Add to home screen",iOS 退化为分享提示)— `client/src/pwa/*` + `InstallButton`
- [x] `client-preview` 一键构建预览脚本(`preview:pwa`)
- [x] 咖啡卡进度环:按产品决策从 koru 螺旋改为**正圆 10 豆环**(偏离 D.4.7,经产品方明确确认)

---

## 待办 / Backlog

| 项 | 说明 | 阻塞 |
|---|---|---|
| **Git 初始化** | 项目目前**零提交**,强烈建议先初始化(`.env` 已 gitignore) | 部署前置 |
| **Web 推送通知** | 需新增 subscriptions 订阅表 = **数据库改动,须先批准**;可替代咖啡卡的 4 秒轮询 | 待批准 schema |
| **部署改造** | Express 托管前端构建 + SPA fallback + 生产脚本 + Dockerfile + DEPLOY.md → DigitalOcean | — |
| **宽屏/桌面布局** | 手机端已 OK;桌面响应式由产品方"再想想",暂缓 | 待决策 |
| **html5-qrcode 代码分割** | 把扫码库从主包拆出(约 630KiB),优化首屏 | — |

---

## 已知注意事项

- **dev 模式不发 Service Worker**(避免与 HMR 缓存冲突);测 PWA 须用 `npm run preview:pwa`(4173)。
- **安装按钮 / `beforeinstallprompt`** 仅在 localhost 或 HTTPS 下触发;手机走局域网 http 不弹框。
- **Windows**:装依赖进子目录 `npm install`(勿用 `npm --prefix` 装,有自引用 bug);勿用 PowerShell `Set-Content -Encoding utf8` 写源码(BOM 会让 tsx 解析失败)。
- **生产前必须替换** `server/.env` 里的开发用 `JWT_SECRET`;`.env` 含真实 Google 凭据,已被 gitignore。
- **数据库已迁移到 MongoDB / Mongoose**(2026-06-07,为满足评分标准的 NoSQL 要求)。本地开发需replica set(单节点即可,见 `server/DB_SETUP.md`),生产用 Atlas;R2 原子扣章在 Mongoose 事务内完成。测试用 `mongodb-memory-server` 内存 replica set,48 个测试全绿。
