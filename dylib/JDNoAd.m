//
// JDNoAd.m — 基于原 JDNoAd.dylib 扩展
// 原逻辑：MSHookMessageEx 把广告/推荐相关 init 置空、setter 空实现
// 扩展：购物车推荐榜单/快点来看看、消息推荐、我的推荐、订单/物流推荐
//

#import <Foundation/Foundation.h>
#import <objc/runtime.h>
#import <UIKit/UIKit.h>

extern void MSHookMessageEx(Class cls, SEL sel, IMP imp, IMP *result);

#pragma mark - Replacement IMPs (同原版)

// init / initWithFrame: → release + nil（与原版一致，需 -fno-objc-arc）
static id JD_initNil(id self, SEL _cmd) {
    (void)_cmd;
    if (self) {
        [self release];
    }
    return nil;
}

static id JD_initWithFrameNil(id self, SEL _cmd, CGRect frame) {
    (void)frame;
    return JD_initNil(self, _cmd);
}

static id JD_initCellNil(id self, SEL _cmd, NSInteger style, id reuseId) {
    (void)style;
    (void)reuseId;
    return JD_initNil(self, _cmd);
}

// setter / 无返回值方法 → 空操作
static void JD_voidNoop(id self, SEL _cmd) { (void)self; (void)_cmd; }
static void JD_voidNoop1(id self, SEL _cmd, id arg) { (void)self; (void)_cmd; (void)arg; }
static void JD_voidNoop3(id self, SEL _cmd, id a, id b, id c) {
    (void)self; (void)_cmd; (void)a; (void)b; (void)c;
}
static void JD_voidNoop5(id self, SEL _cmd, id a, id b, id c, id d, id e) {
    (void)self; (void)_cmd; (void)a; (void)b; (void)c; (void)d; (void)e;
}

// BOOL 返回 NO
static BOOL JD_boolNo(id self, SEL _cmd) {
    (void)self;
    (void)_cmd;
    return NO;
}

static void JD_hook(const char *className, SEL sel, IMP imp) {
    Class cls = objc_getClass(className);
    if (!cls) return;
    MSHookMessageEx(cls, sel, imp, NULL);
}

static void JD_hookMeta(const char *className, SEL sel, IMP imp) {
    Class cls = objc_getClass(className);
    if (!cls) return;
    Class meta = object_getClass(cls);
    if (!meta) return;
    MSHookMessageEx(meta, sel, imp, NULL);
}

#pragma mark - Install

__attribute__((constructor))
static void JDNoAdInstall(void) {
    // ========== 原 JDNoAd 已有 ==========
    JD_hook("FSSHistoryHeaderView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("JDAdStarViewModel", @selector(setDataArray:), (IMP)JD_voidNoop1);
    JD_hookMeta("JDAdStartView", @selector(isShowingAdStartView), (IMP)JD_boolNo);
    JD_hook("JDMainPageSearchLabel", @selector(setWord:), (IMP)JD_voidNoop1);
    JD_hook("JDNXView", @selector(createFlexCubeView:), (IMP)JD_voidNoop1);
    JD_hook("JDSHVPPortraitVideoModule.BVideoProductView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("JDTFUpgradeToastView", @selector(setUpgradeModel:), (IMP)JD_voidNoop1);
    JD_hook("JDTabBarBadgeItem", @selector(setBadgeValue:), (IMP)JD_voidNoop1);
    JD_hook("MessageHomePageOpenPushTipView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("MyJdChannelFloorView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("MyJdCmsTipsView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("MyJdJDNewsFloor", @selector(setModel:), (IMP)JD_voidNoop1);
    JD_hook("MyJdRecommendFloorV2", @selector(init), (IMP)JD_initNil);
    JD_hook("MyJdSlideChannelFloorView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("NewMyJdBigSaleFloor", @selector(setModel:), (IMP)JD_voidNoop1);
    JD_hook("RecommendTabScrollView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("_TtC12JDMyJdModule17MyJdBuyOftenFloor", @selector(init), (IMP)JD_initNil);

    // ========== 我的：为你推荐 / 潮流好货 ==========
    JD_hook("MyJdRecommendFloor", @selector(init), (IMP)JD_initNil);
    JD_hook("MyJdRecommendFloor", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("MyJdRecommendFloor", @selector(setModel:), (IMP)JD_voidNoop1);
    JD_hook("MyJdRecommendFloorV2", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("MyJdRecommendFloorV2", @selector(setModel:), (IMP)JD_voidNoop1);
    JD_hook("MyJdBigSaleFloor", @selector(setModel:), (IMP)JD_voidNoop1);
    JD_hook("MyJdBigSaleFloor", @selector(init), (IMP)JD_initNil);

    // ========== 购物车：推荐榜单 / 快点来看看 ==========
    JD_hook("CartRecommendedView", @selector(init), (IMP)JD_initNil);
    JD_hook("CartRecommendedView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("CartRecommendedSuperView", @selector(init), (IMP)JD_initNil);
    JD_hook("CartRecommendedSuperView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("CartRecommendPopView", @selector(init), (IMP)JD_initNil);
    JD_hook("CartRecommendPopView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("CartSimilarRecommendView", @selector(init), (IMP)JD_initNil);
    JD_hook("CartSimilarRecommendView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("CartSimilarRecommendContainerView", @selector(init), (IMP)JD_initNil);
    JD_hook("CartSimilarRecommendContainerView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("CartEmptyRecommendInfo", @selector(setModel:), (IMP)JD_voidNoop1);

    // 拦截购物车页拉起推荐容器的方法（类名可能是 SCShopCartViewController）
    JD_hook("SCShopCartViewController", @selector(showCartRecommendedSuperView:vm:params:), (IMP)JD_voidNoop3);
    JD_hook("SCShopCartViewController",
            NSSelectorFromString(@"showCartRecommendedSuperView:layoutType:listVM:gridVM:params:"),
            (IMP)JD_voidNoop5);
    JD_hook("SCShopCartViewController", @selector(showCacheCartRecommendedView), (IMP)JD_voidNoop);
    JD_hook("SCShopCartViewController", @selector(cacheCartRecommendedSuperView:vm:params:), (IMP)JD_voidNoop3);

    // ========== 消息页下方推荐 ==========
    JD_hook("MessageRecommendBarCell", @selector(init), (IMP)JD_initNil);
    JD_hook("MessageRecommendBarCell", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("MessageRecommendBarCell", @selector(initWithStyle:reuseIdentifier:), (IMP)JD_initCellNil);
    JD_hook("Message2024RecommendBarCell", @selector(init), (IMP)JD_initNil);
    JD_hook("Message2024RecommendBarCell", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("Message2024RecommendBarCell", @selector(initWithStyle:reuseIdentifier:), (IMP)JD_initCellNil);
    JD_hook("Message2024NewRecommendBarCell", @selector(init), (IMP)JD_initNil);
    JD_hook("Message2024NewRecommendBarCell", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("Message2024NewRecommendBarCell", @selector(initWithStyle:reuseIdentifier:), (IMP)JD_initCellNil);
    JD_hook("Message2024RecommendViewController", @selector(init), (IMP)JD_initNil);
    JD_hook("Message2024NewRecommendViewController", @selector(init), (IMP)JD_initNil);
    JD_hook("MessageRecommendedBenefitView", @selector(init), (IMP)JD_initNil);
    JD_hook("MessageRecommendedBenefitView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);

    // ========== 订单 / 待收货·待付款推荐 ==========
    JD_hook("JDOrderRecommendPopView", @selector(init), (IMP)JD_initNil);
    JD_hook("JDOrderRecommendPopView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("JDOrderRecommendWareCell", @selector(init), (IMP)JD_initNil);
    JD_hook("JDOrderRecommendWareCell", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("ShareOrderRecommendProductView", @selector(init), (IMP)JD_initNil);
    JD_hook("ShareOrderRecommendProductView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
    JD_hook("ShareOrderRecommendProductItemCell", @selector(init), (IMP)JD_initNil);
    JD_hook("ShareOrderRecommendProductItemCell", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);

    // 结算页推荐楼层
    JD_hook("COCheckMainRecommendMultipleSkuFloor", @selector(setModel:), (IMP)JD_voidNoop1);
    JD_hook("COCheckMainRecommendMultipleTopFloor", @selector(setModel:), (IMP)JD_voidNoop1);
    JD_hook("COCheckoutMainRecommendShipmentFloor", @selector(setModel:), (IMP)JD_voidNoop1);

    // ========== 物流「你可能还喜欢」等 ==========
    JD_hook("JDSRecommendFloor", @selector(init), (IMP)JD_initNil);
    JD_hook("JDSRecommendFloor", @selector(setModel:), (IMP)JD_voidNoop1);
    JD_hook("JDSRecommendFloorView", @selector(init), (IMP)JD_initNil);
    JD_hook("JDSRecommendFloorView", @selector(initWithFrame:), (IMP)JD_initWithFrameNil);
}
