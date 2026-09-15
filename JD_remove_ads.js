// 京东去广告 / 去推荐
// 对齐可莉规则 functionId，并补充 uniformRecommend（消息/购物车/物流底部推荐流）
// 参考：kelee JD_remove_ads + fmz200 jingdong.js

const url = $request.url;
if (!$response.body) $done({});
let obj = JSON.parse($response.body);

const TITLE_RE = /为你推荐|潮流好货|推荐榜单|快点来看看|你可能还喜欢|猜你喜欢|AI推荐/;

function isRecFloor(f) {
  if (!f || typeof f !== "object") return false;
  const id = String(f.mId || f.mid || f.type || "");
  if (/recommend|jdur|guess|rank|look|fashion|feed/i.test(id)) return true;
  const t = [f.title, f.name, f.floorName, f.floorTitle, f.showTitle].filter(Boolean).join("");
  return TITLE_RE.test(t);
}

function emptyRecommend(o) {
  if (!o || typeof o !== "object") return;
  ["wareInfoList", "wareList", "list", "feeds", "feedList", "rankList", "recommendList", "itemList"].forEach(
    (k) => {
      if (Array.isArray(o[k])) o[k] = [];
    }
  );
  if (o.hasNextPage != null) o.hasNextPage = false;
  if (o.hasMore != null) o.hasMore = false;
}

if (/functionId=uniformRecommend\d*/i.test(url)) {
  // 消息 / 购物车 / 我的 / 物流 等底部推荐商品流
  emptyRecommend(obj);
  if (obj.data) emptyRecommend(obj.data);
  if (obj.result) emptyRecommend(obj.result);
  if (!Array.isArray(obj.wareInfoList)) obj.wareInfoList = [];
  obj.hasNextPage = false;
} else if (url.includes("functionId=deliverLayer") || url.includes("functionId=orderTrackBusiness")) {
  // 物流页面
  if (obj?.bannerInfo) delete obj.bannerInfo;
  if (obj?.floors?.length > 0) {
    obj.floors = obj.floors.filter(
      (i) => !["banner", "jdDeliveryBanner"]?.includes(i?.mId) && !isRecFloor(i)
    );
  }
  emptyRecommend(obj);
} else if (url.includes("functionId=getTabHomeInfo")) {
  // 新品页面
  if (obj?.result?.iconInfo) delete obj.result.iconInfo;
  if (obj?.result?.roofTop) delete obj.result.roofTop;
} else if (url.includes("functionId=myOrderInfo")) {
  // 订单页面（待付款 / 待收货等）
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
  // 我的页面：去掉「为你推荐 / 潮流好货」所在 recommendfloor 等
  const block = [
    "bigSaleFloor",
    "buyOften",
    "newAttentionCard",
    "newBigSaleFloor",
    "newStyleAttentionCard",
    "newsFloor",
    "noticeFloor",
    "recommendfloor",
    "recommendFloor",
    "fashionGoods",
    "goodStuffFloor",
  ];
  const scrub = (floors) => {
    if (!floors?.length) return floors;
    let out = [];
    for (let floor of floors) {
      if (block.includes(floor?.mId) || isRecFloor(floor)) continue;
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
  // 开屏广告
  if (obj?.images?.length > 0) obj.images = [];
  if (obj?.showTimesDaily) obj.showTimesDaily = 0;
} else if (url.includes("functionId=welcomeHome")) {
  // 首页配置
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

$done({ body: JSON.stringify(obj) });
