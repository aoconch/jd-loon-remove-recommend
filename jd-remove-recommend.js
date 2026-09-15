/**
 * 京东去推荐 - 响应体处理
 * 兼容 Surge / Loon / Quantumult X
 */
const url = $request.url || "";
const reqBody = typeof $request.body === "string" ? $request.body : "";

function findFunctionId() {
  let m = url.match(/functionId=([^&]+)/i);
  if (m) return decodeURIComponent(m[1]);
  m = reqBody.match(/functionId=([^&]+)/i);
  if (m) return decodeURIComponent(m[1]);
  // 京东偶发把整段 form 再 base64 一层
  try {
    const raw = reqBody.replace(/\s/g, "");
    if (raw.length > 32 && /^[A-Za-z0-9+/=]+$/.test(raw.slice(0, 80))) {
      const decoded = typeof Buffer !== "undefined"
        ? Buffer.from(raw, "base64").toString("utf8")
        : (typeof $base64 !== "undefined" ? $base64.decode(raw) : null);
      // Loon/QX: 用手动 atob 风格
    }
  } catch (e) {}
  try {
    const s = reqBody;
    if (s.indexOf("YX") === 0 || s.indexOf("dX") === 0) {
      const bin = (function (b64) {
        // Loon 提供 $base64；否则跳过
        if (typeof $base64 !== "undefined" && $base64.decode) {
          const d = $base64.decode(b64);
          return typeof d === "string" ? d : "";
        }
        return "";
      })(s);
      if (bin) {
        let t = bin;
        try {
          t = decodeURIComponent(bin.replace(/\+/g, " "));
        } catch (e) {}
        m = t.match(/functionId=([^&]+)/i);
        if (m) return decodeURIComponent(m[1]);
      }
    }
  } catch (e) {}
  return "";
}

const fid = findFunctionId();

if (!$response || $response.body == null || $response.body === "") {
  // 对推荐接口即使无 body 也回空壳
  if (/^uniformRecommend\d*$/i.test(fid)) {
    $done({
      body: JSON.stringify({ code: "0", wareInfoList: [], hasNextPage: false, list: [], feeds: [] }),
    });
  }
  $done({});
}

let obj;
try {
  obj = JSON.parse($response.body);
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
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function isRecommendFloor(floor) {
  if (!floor || typeof floor !== "object") return false;
  const id = textOf(floor.mId || floor.mid || floor.type || floor.floorId || floor.identityId);
  if (id && FLOOR_IDS.has(id)) return true;
  if (/recommend|feed|rank|maylike|guess|fashion|lookaround|goodstuff|jdur/i.test(id)) return true;
  const blob = ["title", "name", "floorName", "floorTitle", "showTitle", "text", "label"]
    .map((k) => textOf(floor[k]))
    .join(" ");
  return TITLE_RE.test(blob + " " + id);
}

function filterFloors(arr) {
  return Array.isArray(arr) ? arr.filter((f) => !isRecommendFloor(f)) : arr;
}

function emptyLists(o) {
  if (!o || typeof o !== "object") return;
  [
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
  ].forEach((k) => {
    if (Array.isArray(o[k])) o[k] = [];
  });
  if (o.hasMore != null) o.hasMore = false;
  if (o.hasNextPage != null) o.hasNextPage = false;
  if (o.isEnd != null) o.isEnd = true;
  if (o.total != null) o.total = 0;
}

function killRecommend(root) {
  emptyLists(root);
  if (root.data) emptyLists(root.data);
  if (root.result) emptyLists(root.result);
  if (!root.code && !root.data && !root.result) {
    root.code = "0";
  }
  if (!Array.isArray(root.wareInfoList)) root.wareInfoList = [];
  root.hasNextPage = false;
}

function deepStrip(node, depth) {
  if (depth > 8 || !node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      if (node[i] && typeof node[i] === "object" && isRecommendFloor(node[i])) node.splice(i, 1);
      else deepStrip(node[i], depth + 1);
    }
    return;
  }
  Object.keys(node).forEach((k) => {
    const v = node[k];
    if (Array.isArray(v) && /floor|feed|recommend|rank|ware|sku|item|card|list|tab/i.test(k)) {
      node[k] = v.filter((x) => !(x && typeof x === "object" && isRecommendFloor(x)));
      deepStrip(node[k], depth + 1);
    } else if (v && typeof v === "object") deepStrip(v, depth + 1);
  });
}

function patchBasicConfig(root) {
  const data = root.data || root;
  if (!data || typeof data !== "object") return;
  if (data.TNUnionFetch && data.TNUnionFetch.recommend) data.TNUnionFetch.recommend.enable = 0;
  const walk = (n, d) => {
    if (d > 6 || !n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach((x) => walk(x, d + 1));
    Object.keys(n).forEach((k) => {
      if (/serviceUnitFunctionIds/i.test(k) && Array.isArray(n[k])) {
        n[k] = n[k].filter((x) => !/^uniformRecommend\d*$/i.test(String(x)));
      } else walk(n[k], d + 1);
    });
  };
  walk(data, 0);
}

function stripPerson(root) {
  if (Array.isArray(root.floors)) root.floors = filterFloors(root.floors);
  if (root.others && Array.isArray(root.others.floors)) root.others.floors = filterFloors(root.others.floors);
  deepStrip(root, 0);
}

function stripOrder(root) {
  if (Array.isArray(root.floors)) {
    root.floors = root.floors.filter(
      (f) => !isRecommendFloor(f) && !["bannerFloor", "bpDynamicFloor", "plusFloor"].includes(f && f.mId)
    );
  }
  deepStrip(root, 0);
}

function stripLogistics(root) {
  if (root.bannerInfo) delete root.bannerInfo;
  if (Array.isArray(root.floors)) {
    root.floors = root.floors.filter(
      (i) => !["banner", "jdDeliveryBanner"].includes(i && i.mId) && !isRecommendFloor(i)
    );
  }
  emptyLists(root);
  deepStrip(root, 0);
}

function stripCart(root) {
  [root, root.data, root.result, root.cartData, root.cartInfo].filter(Boolean).forEach((t) => {
    if (Array.isArray(t.floors)) t.floors = filterFloors(t.floors);
    if (Array.isArray(t.floorList)) t.floorList = filterFloors(t.floorList);
    emptyLists(t);
    if (t.recommendInfo) t.recommendInfo = {};
    if (t.rankInfo) t.rankInfo = {};
    if (t.lookInfo) t.lookInfo = {};
  });
  deepStrip(root, 0);
}

function stripMessage(root) {
  [root, root.data, root.result].filter(Boolean).forEach((t) => {
    if (Array.isArray(t.floors)) t.floors = filterFloors(t.floors);
    if (Array.isArray(t.floorList)) t.floorList = filterFloors(t.floorList);
    emptyLists(t);
    if (t.recommendArea) t.recommendArea = null;
    if (t.bottomRecommend) t.bottomRecommend = null;
  });
  deepStrip(root, 0);
}

// 分流
if (/^uniformRecommend\d*$/i.test(fid) || /functionId=uniformRecommend\d*/i.test(url)) {
  killRecommend(obj);
} else if (/^basicConfig$/i.test(fid) || /functionId=basicConfig/i.test(url)) {
  patchBasicConfig(obj);
} else if (/personinfoBusiness/i.test(fid) || /personinfoBusiness/i.test(url)) {
  stripPerson(obj);
} else if (/myOrderInfo/i.test(fid) || /myOrderInfo/i.test(url)) {
  stripOrder(obj);
} else if (/orderTrackBusiness|deliverLayer/i.test(fid) || /orderTrackBusiness|deliverLayer/i.test(url)) {
  stripLogistics(obj);
} else if (
  /^(carts|cartChange|cartRefresh|newCartPage|synchronizedCarts|gwCart|cartB|getCarts|cart)$/i.test(fid) ||
  /functionId=(carts|cartChange|cartRefresh|newCartPage|synchronizedCarts|gwCart|cartB|getCarts|cart)(&|$)/i.test(
    url
  )
) {
  stripCart(obj);
} else if (
  /msgCenter|messageCenter|getMsgCenter|messageBox|msgbox|messageHome|getMessageHome/i.test(fid) ||
  /msgCenter|messageCenter|getMsgCenter|messageBox|messageHome/i.test(url)
) {
  stripMessage(obj);
} else if (/welcomeHome/i.test(fid) || /welcomeHome/i.test(url)) {
  if (Array.isArray(obj.floorList)) {
    const del = {
      bottomXview: 1,
      float: 1,
      photoCeiling: 1,
      recommend: 1,
      ruleFloat: 1,
      searchIcon: 1,
      topRotate: 1,
      tabBarAtmosphere: 1,
    };
    obj.floorList = obj.floorList.filter((i) => !del[i && i.type] && !isRecommendFloor(i));
  }
  if (Array.isArray(obj.webViewFloorList)) obj.webViewFloorList = [];
} else if (/^start$/i.test(fid) || /functionId=start(&|$)/i.test(url)) {
  if (Array.isArray(obj.images)) obj.images = [];
  if (obj.showTimesDaily != null) obj.showTimesDaily = 0;
} else if (
  // 仅当能确认是推荐流（含 pageSource / eventId）时才清空，避免误伤其它业务
  (obj.wareInfoList || (obj.data && obj.data.wareInfoList)) &&
  (/FROM_(SHOPPINGCAR|MYJD|MESSAGE_CENTER|ORDER)|OrderTrail|GuessYouLike|jdur|recommend/i.test(
    JSON.stringify(obj).slice(0, 2000)
  ) ||
    /recommend|OrderTrail|GuessYouLike|SHOPPINGCAR|MYJD|MESSAGE/i.test(reqBody.slice(0, 2000)))
) {
  killRecommend(obj);
}

$done({ body: JSON.stringify(obj) });
