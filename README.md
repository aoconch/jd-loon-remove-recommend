# 京东去推荐（Loon 插件）

移除京东 App 以下区域的商品推荐：

- 消息页下方推荐
- 购物车下方「推荐榜单」「快点来看看」
- 我的页下方「为你推荐」「潮流好货」
- 待收货 / 待付款页下方商品推荐
- 物流页下方「你可能还喜欢」

## 安装（Loon）

1. 复制插件地址：

```text
https://raw.githubusercontent.com/aoconch/jd-loon-remove-recommend/main/jd-remove-recommend.plugin
```

2. Loon → 配置 → 插件 → 右上角 `+` → 粘贴上方地址 → 安装  
3. 确认已开启：**脚本**、**MitM**（证书已信任）  
4. 强制结束京东后重新打开；若仍有残留，可清一次京东缓存再试

## 说明

- 主要改写 `api.m.jd.com` 的页面楼层与 `uniformRecommend` 推荐流
- 京东接口会随版本变动；若某页推荐仍在，用 Loon 抓包该页请求，把含推荐数据的 `functionId` 发我即可继续补规则
