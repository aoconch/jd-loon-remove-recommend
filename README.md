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

抓包确认各页底部推荐共用一套能力：

- 模板：`storage.jd.com/.../recommend_jdur_*`（插件直接拦截）
- 数据：`functionId=uniformRecommend` / `uniformRecommend9|47|52|71…`（脚本清空商品列表）
- 开关：`basicConfig` → `TNUnionFetch.recommend.enable=0`
- 物流页请求示例：`eventId=OrderTrailFollow_Slide`，`source=4`
- 模板内 pageSource：`FROM_SHOPPINGCAR` / `FROM_MYJD` / `FROM_MESSAGE_CENTER_*` 等

安装后请：**更新插件 → 清京东缓存或重装 → 杀进程再开**。若仍有残留，把该页 MitM 下带 `functionId` 的请求发我即可继续补。
