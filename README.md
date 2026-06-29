# 太樾 & 绿雪芽项目经营管理看板

这是一个 V1 经营驾驶舱 Web 系统，服务两个项目：

- 太樾项目，对应主体：璞樾
- 绿雪芽项目，对应主体：佰茶

V1 已包含登录、角色权限基础、Excel/HTML 上传、parser 解析、PostgreSQL 入库、两个项目总览、项目详情、专题页面、基础预警、审计表结构和 Docker 部署配置。

## 技术栈

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- Recharts
- Docker / docker-compose
- SheetJS xlsx parser

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 准备环境变量

```bash
cp .env.example .env
```

3. 启动 PostgreSQL

```bash
docker compose up -d db
```

4. 初始化数据库

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

5. 启动开发服务器

```bash
npm run dev
```

打开 `http://localhost:3000`。

默认管理员：

- 邮箱：`admin@example.com`
- 密码：`admin123456`

## 导入样本文件

样本文件位于：

```text
sample-files/
```

导入全部样本：

```bash
npm run import:samples
```

也可以在网页 `/uploads` 上传 Excel 或 HTML 文件。上传后系统会：

- 保存源文件
- 自动识别项目和 parser 类型
- 检测 `#REF!`、`#DIV/0!` 等公式错误
- 解析财报、管报、销售日报、推广日报、库存、采购台账
- 写入业务表
- 生成基础预警

## Docker 部署

```bash
docker compose up --build
```

应用地址：

```text
http://localhost:3000
```

生产部署前请修改：

- `AUTH_SECRET`
- 数据库密码
- 域名和反向代理配置

## 权限说明

角色：

- `super_admin`
- `owner`
- `finance`
- `operation`
- `investor`
- `readonly`

投资人权限只能查看汇总数据，系统权限层会限制支付明细、银行账号、客户地址、客户电话、原始订单明细和底层交易流水。

## Parser 覆盖范围

财报 parser：

- 资产负债表
- 利润表
- 现金流量表
- 科余表
- 六大往来
- 支付明细

管报 parser：

- GMV、GSV、退款率
- 销售出库、销售成本、进销差
- 投放费用、平台扣点、促销推广费、人员费用
- 项目利润、利润率

销售日报 parser：

- 日期、渠道、店铺、商品/SKU
- 支付金额、实际销售、GMV目标、达成率、支付件数、买家数、访客、浏览、转化率、客单价

推广日报 parser：

- 日期、渠道、花费、展现、点击、成交金额、ROI、CPC、点击率、转化率、加购成本
- 公式错误会标记为数据质量问题

库存/商品日报 parser：

- 库存数量、库存金额、近7/30天销量、周转天数、低库存、在途、残次品、现货率相关字段

采购台账 parser：

- 采购OA、SAP编码、物料名称、采购单价、采购数量、实际入库、采购额、余量、分销发货、耗材采购

## 测试

```bash
npm run test
```

测试覆盖：

- parser 单元测试
- 样本文件解析测试
- 预警规则测试
- 权限测试

## V1 边界

暂不包含：

- 飞书机器人
- 自动邮件
- ERP 接口
- 复杂 BI 自定义报表设计器
- 多因素登录

这些能力可以在 V2 继续扩展。
