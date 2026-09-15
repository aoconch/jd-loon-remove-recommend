/**
 * 京东 App 页面底部商品推荐清理
 * 覆盖：消息 / 购物车 / 我的 / 待收货·待付款 / 物流
 *
 * 抓包结论（2026-09）：
 * - 各页底部推荐均走 recommend_jdur + functionId=uniformRecommend[数字]
 *   例：物流 OrderTrailFollow_Slide / source=4；模板内 pageSource 含
 *   FROM_SHOPPINGCAR / FROM_MYJD / FROM_MESSAGE_CENTER_* 等
 * - basicConfig.TNUnionFetch.recommend 控制推荐模块拉取
 * 兼容 Surge / Loon / Quantumult X
 */

const url = $request.url || "";
if (!$response || !$response.body) $done({});

let body = $response.body;
let obj;
try {
  obj = JSON.parse(body);
} catch (e) {
  $done({});
}

const TITLE_RE =
  /为你推荐|潮流好货|推荐榜单|快点来看看|你可能还喜欢|猜你喜欢|好物推荐|热门推荐|精选推荐|相似好物|看了又看|还喜欢|AI推荐/;

const FLOOR_IDS = new Set([
  "recommendfloor",
  "recommendFloor",
  "recommend_floor",
  "recommend",
  "feeds",
  "feedFloor",
  "feed_floor",
  "rankFloor",
  "rankListFloor",
  "ranklist",
  "rank",
  "lookFloor",
  "lookAround",
  "buyOften",
  "fashionGoods",
  "fashionFloor",
  "goodStuffFloor",
  "mayLikeFloor",
  "guessYouLike",
  "uniformRecommend",
  "cartRecommend",
  "cartRank",
  "messageRecommend",
  "msgRecommend",
  "orderRecommend",
  "deliveryRecommend",
  "jdDeliveryBanner",
  "bannerFloor",
  "bpDynamicFloor",
  "plusFloor",
  "bigSaleFloor",
  "newBigSaleFloor",
  "newsFloor",
  "noticeFloor",
  "newAttentionCard",
  "newStyleAttentionCard",
]);

function textOf(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function collectText(node, depth = 0) {
  if (depth > 4 || node == null) return "";
  if (typeof node !== "object") return textOf(node);
  const keys = [
    "title",
    "name",
    "floorName",
    "floorTitle",
    "showTitle",
    "text",
    "label",
    "mId",
    "mid",
    "type",
    "tpl",
    "identityId",
    "floorId",
    "pageSource",
    "eventId",
  ];
  let s = "";
  for (const k of keys) {
    if (k in node) s += " " + textOf(node[k]);
  }
  return s;
}

function isRecommendFloor(floor) {
  if (!floor || typeof floor !== "object") return false;
  const id = textOf(floor.mId || floor.mid || floor.type || floor.floorId || floor.identityId);
  if (id && FLOOR_IDS.has(id)) return true;
  if (/recommend|feed|rank|maylike|guess|fashion|lookaround|goodstuff|jdur/i.test(id)) {
    return true;
  }
  return TITLE_RE.test(collectText(floor));
}

function filterFloors(floors) {
  if (!Array.isArray(floors)) return floors;
  return floors.filter((f) => !isRecommendFloor(f));
}

function emptyRecommendPayload(o) {
  if (!o || typeof o !== "object") return o;
  const listKeys = [
    "wareInfoList",
    "wareList",
    "itemList",
    "skuList",
    "list",
    "feeds",
    "feedList",
    "floorList",
    "floors",
    "dataList",
    "content",
    "nodes",
    "cards",
    "rankList",
    "recommendList",
    "tabList",
    "tabs",
  ];
  for (const k of listKeys) {
    if (Array.isArray(o[k])) o[k] = [];
  }
  if (o.hasMore != null) o.hasMore = false;
  if (o.hasNextPage != null) o.hasNextPage = false;
  if (o.isEnd != null) o.isEnd = true;
  if (o.total != null) o.total = 0;
  return o;
}

function killUniformRecommend(root) {
  // 保留业务可解析的空壳，避免页面转圈
  if (!root || typeof root !== "object") {
    return { code: "0", wareInfoList: [], hasNextPage: false };
  }
  emptyRecommendPayload(root);
  if (root.data && typeof root.data === "object") emptyRecommendPayload(root.data);
  if (root.result && typeof root.result === "object") emptyRecommendPayload(root.result);
  if (!("code" in root) && !("wareInfoList" in root) && !root.data && !root.result) {
    root.code = "0";
    root.wareInfoList = [];
    root.hasNextPage = false;
  }
  if (Array.isArray(root.wareInfoList) === false && root.wareInfoList == null && !root.data && !root.result) {
    root.wareInfoList = [];
  }
  return root;
}

function stripPersonPage(root) {
  if (!root || typeof root !== "object") return;
  if (Array.isArray(root.floors)) root.floors = filterFloors(root.floors);
  if (root.others && Array.isArray(root.others.floors)) {
    root.others.floors = filterFloors(root.others.floors);
  }
  const all = [].concat(root.floors || [], (root.others && root.others.floors) || []);
  const base = all.find((f) => f && f.mId === "basefloorinfo");
  if (base && base.data) {
    delete base.data.commonPopup;
    delete base.data.commonPopup_dynamic;
    delete base.data.floatLayer;
    if (Array.isArray(base.data.commonTips)) base.data.commonTips = [];
    if (Array.isArray(base.data.commonWindows)) base.data.commonWindows = [];
  }
  for (const floor of all) {
    if (floor?.mId === "userinfo" && floor.data?.newPlusBlackCard) {
      delete floor.data.newPlusBlackCard;
    }
    if (floor?.mId === "orderIdFloor" && floor.data?.commentRemindInfo?.infos) {
      floor.data.commentRemindInfo.infos = [];
    }
  }
}

function stripOrderPage(root) {
  if (!root || typeof root !== "object") return;
  if (Array.isArray(root.floors)) {
    root.floors = root.floors.filter((floor) => {
      if (isRecommendFloor(floor)) return false;
      if (["bannerFloor", "bpDynamicFloor", "plusFloor"].includes(floor?.mId)) return false;
      return true;
    });
  }
}

function stripLogistics(root) {
  if (!root || typeof root !== "object") return;
  if (root.bannerInfo) delete root.bannerInfo;
  if (Array.isArray(root.floors)) {
    root.floors = root.floors.filter(
      (i) => !["banner", "jdDeliveryBanner"].includes(i?.mId) && !isRecommendFloor(i)
    );
  }
  emptyRecommendPayload(root);
  if (root.data) emptyRecommendPayload(root.data);
  if (root.result) emptyRecommendPayload(root.result);
}

function stripCart(root) {
  if (!root || typeof root !== "object") return;
  const targets = [root, root.data, root.result, root.cartData, root.cartInfo].filter(Boolean);
  for (const t of targets) {
    if (Array.isArray(t.floors)) t.floors = filterFloors(t.floors);
    if (Array.isArray(t.floorList)) t.floorList = filterFloors(t.floorList);
    emptyRecommendPayload(t);
    if (t.recommendInfo) t.recommendInfo = {};
    if (t.rankInfo) t.rankInfo = {};
    if (t.lookInfo) t.lookInfo = {};
    if (t.promotion && Array.isArray(t.promotion.floors)) {
      t.promotion.floors = filterFloors(t.promotion.floors);
    }
  }
}

function stripMessage(root) {
  if (!root || typeof root !== "object") return;
  const targets = [root, root.data, root.result].filter(Boolean);
  for (const t of targets) {
    if (Array.isArray(t.floors)) t.floors = filterFloors(t.floors);
    if (Array.isArray(t.floorList)) t.floorList = filterFloors(t.floorList);
    emptyRecommendPayload(t);
    if (t.recommendArea) t.recommendArea = null;
    if (t.bottomRecommend) t.bottomRecommend = null;
  }
}

function deepStripByTitle(node, depth = 0) {
  if (depth > 8 || !node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      const item = node[i];
      if (item && typeof item === "object" && isRecommendFloor(item)) {
        node.splice(i, 1);
      } else {
        deepStripByTitle(item, depth + 1);
      }
    }
    return;
  }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v) && /floor|feed|recommend|rank|ware|sku|item|card|list|tab/i.test(k)) {
      node[k] = v.filter((x) => !(x && typeof x === "object" && isRecommendFloor(x)));
      deepStripByTitle(node[k], depth + 1);
    } else if (v && typeof v === "object") {
      deepStripByTitle(v, depth + 1);
    }
  }
}

function patchBasicConfig(root) {
  const data = root.data || root;
  if (!data || typeof data !== "object") return;
  // 关闭推荐模块网络拉取（消息/购物车/我的/物流底部共用 recommend_jdur）
  if (data.TNUnionFetch?.recommend) {
    data.TNUnionFetch.recommend.enable = 0;
  }
  // 从 serviceUnit 白名单里拿掉推荐 functionId，降低旁路调用
  const scrubList = (arr) => {
    if (!Array.isArray(arr)) return arr;
    return arr.filter((x) => !/^uniformRecommend\d*$/i.test(String(x)));
  };
  const walk = (node, depth = 0) => {
    if (depth > 6 || !node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (/serviceUnitFunctionIds/i.test(k) && Array.isArray(v)) {
        node[k] = scrubList(v);
      } else if (v && typeof v === "object") {
        walk(v, depth + 1);
      }
    }
  };
  walk(data);
}

// —— 按 functionId / URL 分流 ——
if (/functionId=uniformRecommend\d*/i.test(url) || /\/uniformRecommend\d*/i.test(url)) {
  obj = killUniformRecommend(obj);
} else if (/functionId=basicConfig/i.test(url)) {
  patchBasicConfig(obj);
} else if (/functionId=personinfoBusiness/i.test(url)) {
  stripPersonPage(obj);
  deepStripByTitle(obj);
} else if (/functionId=myOrderInfo/i.test(url)) {
  stripOrderPage(obj);
  deepStripByTitle(obj);
} else if (/functionId=(orderTrackBusiness|deliverLayer)/i.test(url)) {
  stripLogistics(obj);
  deepStripByTitle(obj);
} else if (
  /functionId=(carts|cartChange|cartRefresh|newCartPage|synchronizedCarts|gwCart|cartB|getCarts|cart)\b/i.test(
    url
  )
) {
  stripCart(obj);
  deepStripByTitle(obj);
} else if (
  /functionId=(msgCenter|messageCenter|getMsgCenter|messageBox|msgbox|messageHome|getMessageHome)/i.test(
    url
  )
) {
  stripMessage(obj);
  deepStripByTitle(obj);
} else if (/functionId=welcomeHome/i.test(url)) {
  if (Array.isArray(obj.floorList)) {
    const del = new Set([
      "bottomXview",
      "float",
      "photoCeiling",
      "recommend",
      "ruleFloat",
      "searchIcon",
      "topRotate",
      "tabBarAtmosphere",
    ]);
    obj.floorList = obj.floorList.filter((i) => !del.has(i?.type) && !isRecommendFloor(i));
  }
  if (Array.isArray(obj.webViewFloorList)) obj.webViewFloorList = [];
} else if (/functionId=start\b/i.test(url)) {
  if (Array.isArray(obj.images)) obj.images = [];
  if (obj.showTimesDaily != null) obj.showTimesDaily = 0;
} else {
  if (obj.floors || obj.floorList || obj.others?.floors || obj.data?.floors) {
    stripPersonPage(obj);
    stripCart(obj);
    stripMessage(obj);
    deepStripByTitle(obj);
  } else if (
    obj.wareInfoList ||
    obj.feeds ||
    obj.data?.wareInfoList ||
    obj.result?.wareInfoList
  ) {
    emptyRecommendPayload(obj);
    if (obj.data) emptyRecommendPayload(obj.data);
    if (obj.result) emptyRecommendPayload(obj.result);
  }
}

$done({ body: JSON.stringify(obj) });
