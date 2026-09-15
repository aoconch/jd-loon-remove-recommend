# 京东去推荐（Loon）

移除消息 / 购物车 / 我的 / 待收货·待付款 / 物流页下方商品推荐。

## 安装

```text
https://cdn.jsdelivr.net/gh/aoconch/jd-loon-remove-recommend@main/jd-remove-recommend.plugin
```

备用（GitHub raw，国内可能失败）：

```text
https://raw.githubusercontent.com/aoconch/jd-loon-remove-recommend/main/jd-remove-recommend.plugin
```

## 必做（否则会「完全没效果」）

1. Loon → 插件 → 删除旧版「京东去推荐」→ 用上面 **jsDelivr** 地址重新添加  
2. 确认插件已开启；配置里已开 **脚本**、**MitM**，证书已信任  
3. MitM 主机名需包含：`api.m.jd.com`、`storage.jd.com`  
4. **清除京东 App 缓存**（或删掉重装）→ 从多任务划掉京东 → 再打开  
5. Loon → 工具 → 查看来往请求：打开购物车/消息时，应能看到对 `uniformRecommend` 的 `reject-dict`

## 原理

| 手段 | 作用 |
|------|------|
| `reject-dict` 拦截 `uniformRecommend*` | 各页底部推荐商品流（不依赖脚本下载） |
| 拦截 `recommend_jdur` 模板 | 推荐 UI 模板 |
| 脚本改 `basicConfig` / 楼层接口 | 关掉 `TNUnionFetch.recommend`，并清理我的/订单等楼层 |

仓库：https://github.com/aoconch/jd-loon-remove-recommend
