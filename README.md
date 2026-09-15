# 京东去推荐

对齐可莉规则，并补上消息/购物车底部推荐拦截。真机排查确认：若京东走 **QUIC/HTTP3**，且 Loon 关闭了 MitM QUIC，Rewrite/脚本会完全不生效。

## Loon 插件

```text
https://cdn.jsdelivr.net/gh/aoconch/jd-loon-remove-recommend@main/jd-remove-recommend.plugin
```

## Surge 模块

```text
https://cdn.jsdelivr.net/gh/aoconch/jd-loon-remove-recommend@main/jd-remove-recommend.sgmodule
```

## 为何「装了也没效果」

真机 Loon 偏好里常见 `kDisableMitmQUICKey=true`。京东 API 若走 QUIC，流量不会被 MitM 解密，规则等于空转。

本插件已加规则：对 `api.m.jd.com` / `jd.com` **拒绝 QUIC/UDP**，强制回落 TCP，再由 Rewrite/脚本处理。

可莉核心：

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

消息、购物车底部推荐多数走 `uniformRecommend`，可莉**不含**，插件另加 `reject-dict`。

## 安装后

1. 删掉旧版插件，用上面 jsDelivr **完整 URL** 重装（不要只装文件名）
2. 确认插件开关为开；MitM 主机名含 `api.m.jd.com`
3. 可选：Loon → 配置 → 开启「MitM QUIC」（与拒 QUIC 二选一即可）
4. **清京东缓存并杀进程**后重开
5. 最近请求里应看到：`api.m.jd.com` 的 QUIC 被 REJECT，以及 `uniformRecommend` reject / `personinfoBusiness` 脚本命中
