// 京东去广告 / 去推荐
// 覆盖：消息 / 购物车 / 我的 / 订单 / 物流 / 首页
// 对齐可莉 functionId，并递归按标题/mId 清理楼层

const url = $request.url;
if (!$response.body) $done({});
let obj;
try {
  obj = JSON.parse($response.body);
} catch (e) {
  $done({});
}

const TITLE_RE =
  /为你推荐|潮流好货|推荐榜单|快点来看看|你可能还喜欢|猜你喜欢|AI推荐|好物推荐|热门推荐|精选推荐|看了又看|相似好物/;

const BLOCK_MID = new Set([
  "recommendfloor",
  "recommendFloor",
  "recommend_floor",
  "recommend",
  "feeds",
  "feedFloor",
  "rankFloor",
  "rankListFloor",
  "ranklist",
  "lookFloor",
  "lookAround",
  "buyOften",
  "fashionGoods",
  "goodStuffFloor",
  "mayLikeFloor",
  "guessYouLike",
  "bigSaleFloor",
  "newAttentionCard",
  "newBigSaleFloor",
  "newStyleAttentionCard",
  "newsFloor",
  "noticeFloor",
  "bannerFloor",
  "bpDynamicFloor",
  "plusFloor",
  "banner",
  "jdDeliveryBanner",
]);

function floorText(f) {
  if (!f || typeof f !== "object") return "";
  return [f.title, f.name, f.floorName, f.floorTitle, f.showTitle, f.tabName, f.subTitle]
    .filter(Boolean)
    .join("|");
}

function isRecFloor(f) {
  if (!f || typeof f !== "object") return false;
  const id = String(f.mId || f.mid || f.type || f.floorId || f.templateId || "");
  if (BLOCK_MID.has(id) || /recommend|jdur|guess|rank|look|fashion|feed|maylike|goodstuff/i.test(id))
    return true;
  return TITLE_RE.test(floorText(f));
}

function emptyRecommend(o) {
  if (!o || typeof o !== "object") return;
  [
    "wareInfoList",
    "wareList",
    "list",
    "feeds",
    "feedList",
    "rankList",
    "recommendList",
    "itemList",
    "skuList",
    "productList",
    "dataList",
  ].forEach((k) => {
    if (Array.isArray(o[k])) o[k] = [];
  });
  if (o.hasNextPage != null) o.hasNextPage = false;
  if (o.hasMore != null) o.hasMore = false;
}

function scrubFloors(floors) {
  if (!Array.isArray(floors)) return floors;
  return floors.filter((f) => !isRecFloor(f));
}

function deepScrub(node, depth) {
  if (!node || typeof node !== "object" || depth > 8) return;
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      const item = node[i];
      if (isRecFloor(item)) node.splice(i, 1);
      else deepScrub(item, depth + 1);
    }
    return;
  }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if ((k === "floors" || k === "floorList" || k === "webViewFloorList") && Array.isArray(v)) {
      node[k] = scrubFloors(v);
      deepScrub(node[k], depth + 1);
      continue;
    }
    if (typeof v === "string" && TITLE_RE.test(v) && (k === "title" || k === "floorTitle" || k === "showTitle" || k === "name")) {
      // 标题命中：尽量清空同级列表
      emptyRecommend(node);
    }
    deepScrub(v, depth + 1);
  }
}

if (/functionId=uniformRecommend\d*/i.test(url)) {
  emptyRecommend(obj);
  if (obj.data) emptyRecommend(obj.data);
  if (obj.result) emptyRecommend(obj.result);
  if (!Array.isArray(obj.wareInfoList)) obj.wareInfoList = [];
  obj.hasNextPage = false;
} else if (url.includes("functionId=deliverLayer") || url.includes("functionId=orderTrackBusiness")) {
  if (obj?.bannerInfo) delete obj.bannerInfo;
  if (obj?.floors?.length > 0) {
    obj.floors = obj.floors.filter((i) => !["banner", "jdDeliveryBanner"]?.includes(i?.mId) && !isRecFloor(i));
  }
  emptyRecommend(obj);
} else if (url.includes("functionId=getTabHomeInfo")) {
  if (obj?.result?.iconInfo) delete obj.result.iconInfo;
  if (obj?.result?.roofTop) delete obj.result.roofTop;
} else if (url.includes("functionId=myOrderInfo")) {
  if (obj?.floors?.length > 0) {
    let newFloors = [];
    for (let floor of obj.floors) {
      if (["bannerFloor", "bpDynamicFloor", "plusFloor"]?.includes(floor?.mId) || isRecFloor(floor)) {
        continue;
      }
      if (floor?.mId === "virtualServiceCenter") {
        if (floor?.data?.virtualServiceCenters?.length > 0) {
          let newItems = [];
          for (let item of floor.data.virtualServiceCenters) {
            if (item?.serviceList?.length > 0) {
              item.serviceList = item.serviceList.filter((card) => card?.serviceTitle !== "精选特惠");
            }
            newItems.push(item);
          }
          floor.data.virtualServiceCenters = newItems;
        }
      }
      if (floor?.mId === "customerServiceFloor") {
        if (floor?.data?.moreText) {
          delete floor.data.moreIcon;
          delete floor.data.moreIcon_dark;
          floor.data.moreText = " ";
        }
      }
      newFloors.push(floor);
    }
    obj.floors = newFloors;
  }
} else if (url.includes("functionId=personinfoBusiness")) {
  const scrub = (floors) => {
    if (!floors?.length) return floors;
    let out = [];
    for (let floor of floors) {
      if (BLOCK_MID.has(floor?.mId) || isRecFloor(floor)) continue;
      if (floor?.mId === "basefloorinfo" && floor.data) {
        delete floor.data.commonPopup;
        delete floor.data.commonPopup_dynamic;
        delete floor.data.floatLayer;
        if (Array.isArray(floor.data.commonTips)) floor.data.commonTips = [];
        if (Array.isArray(floor.data.commonWindows)) floor.data.commonWindows = [];
      } else if (floor?.mId === "orderIdFloor") {
        if (floor?.data?.commentRemindInfo?.infos?.length > 0) {
          floor.data.commentRemindInfo.infos = [];
        }
      } else if (floor?.mId === "userinfo") {
        if (floor?.data?.newPlusBlackCard) delete floor.data.newPlusBlackCard;
      }
      out.push(floor);
    }
    return out;
  };
  if (obj?.floors) obj.floors = scrub(obj.floors);
  if (obj?.others?.floors) obj.others.floors = scrub(obj.others.floors);
} else if (url.includes("functionId=start")) {
  if (obj?.images?.length > 0) obj.images = [];
  if (obj?.showTimesDaily) obj.showTimesDaily = 0;
} else if (url.includes("functionId=welcomeHome")) {
  if (obj?.floorList?.length > 0) {
    const delItems = [
      "bottomXview",
      "float",
      "photoCeiling",
      "recommend",
      "ruleFloat",
      "searchIcon",
      "topRotate",
      "tabBarAtmosphere",
    ];
    obj.floorList = obj.floorList.filter((i) => !delItems.includes(i?.type) && !isRecFloor(i));
  }
  if (obj?.webViewFloorList?.length > 0) obj.webViewFloorList = [];
}

// 购物车 / 其它页面：按标题与 mId 递归清楼层（推荐榜单、快点来看看等）
deepScrub(obj, 0);
if (/cart|Cart|shopCart|synCart/i.test(url)) {
  emptyRecommend(obj);
  if (obj.data) emptyRecommend(obj.data);
  if (obj.result) emptyRecommend(obj.result);
}

$done({ body: JSON.stringify(obj) });
