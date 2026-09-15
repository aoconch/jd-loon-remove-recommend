# JDNoAd.dylib（扩展版）

在原 `JDNoAd.dylib` 的 `MSHookMessageEx` 思路上扩展，直接在 App 内隐藏推荐 UI（不依赖 Loon MitM）。

## 覆盖

| 页面 | Hook 目标 |
|------|-----------|
| 我的 | `MyJdRecommendFloor` / `V2`、常买、大促楼层等（保留原逻辑） |
| 购物车 | `CartRecommendedView` / `SuperView`、`SCShopCartViewController` 的 `showCartRecommended*` |
| 消息 | `Message2024*Recommend*` BarCell / ViewController |
| 订单 | `JDOrderRecommendPopView`、`ShareOrderRecommendProductView` |
| 物流/其它 | `JDSRecommendFloor*`、结算推荐楼层 |

## 产物

- 源码：`dylib/JDNoAd.m`
- 编译产物：`dylib/JDNoAd.dylib`（arm64 + arm64e）
- 桌面已更新：`/Users/o/Desktop/JDNoAd.dylib`
- 重打包 IPA：`/Users/o/Desktop/京东_15.1.30_去推荐.ipa`（替换了 Payload 内 Frameworks/JDNoAd.dylib）

## 编译

```bash
cd dylib
SDK=$(xcrun --sdk iphoneos --show-sdk-path)
xcrun --sdk iphoneos clang -fno-objc-arc -dynamiclib \
  -isysroot "$SDK" -arch arm64 -miphoneos-version-min=14.0 \
  -framework Foundation -framework UIKit -lobjc \
  -Wl,-undefined,dynamic_lookup \
  -install_name @executable_path/Frameworks/JDNoAd.dylib \
  -o JDNoAd.arm64.dylib JDNoAd.m
# arm64e 同理后 lipo
```

运行时需原 IPA 已注入的 `libJailedShim.dylib`（提供 `MSHookMessageEx`）。

## 安装

用你原来的签名/安装方式安装 `京东_15.1.30_去推荐.ipa`，或只替换设备上 App 内的 `Frameworks/JDNoAd.dylib` 后重签。
