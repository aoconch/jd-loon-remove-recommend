# 京东去推荐

对齐可莉规则（你提供的那段），并补上消息/购物车底部推荐拦截。

## Loon 插件

```text
https://cdn.jsdelivr.net/gh/aoconch/jd-loon-remove-recommend@main/jd-remove-recommend.plugin
```

## Surge 模块（与你给的写法同类）

```text
https://cdn.jsdelivr.net/gh/aoconch/jd-loon-remove-recommend@main/jd-remove-recommend.sgmodule
```

你给的可莉规则核心是：

```text
functionId=(deliverLayer|getTabHomeInfo|myOrderInfo|orderTrackBusiness|personinfoBusiness|start|welcomeHome)
→ https://kelee.one/Resource/JavaScript/JD/JD_remove_ads.js
```

| functionId | 作用 |
|---|---|
| `personinfoBusiness` | 我的页（去掉 recommendfloor / 为你推荐） |
| `myOrderInfo` | 待付款/待收货等订单页 |
| `orderTrackBusiness` / `deliverLayer` | 物流页横幅等 |
| `start` | 开屏 |
| `welcomeHome` | 首页配置 |

消息、购物车底部推荐多数走 `uniformRecommend`，可莉这条**不包含**，所以插件里另加了 `reject-dict`。

## 安装后

1. 删掉旧版插件/模块，用上面 jsDelivr 地址重装  
2. 开 MitM，主机名含 `api.m.jd.com`  
3. **清京东缓存并杀进程**  
4. 在最近请求里确认：打开「我的」有 `personinfoBusiness` 脚本命中；滑到底有 `uniformRecommend` 被 reject
