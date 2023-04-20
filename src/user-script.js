// ==UserScript==
// @name         qingshu-helper
// @namespace    https://github.com/baboon-king/qingshu-helper
// @version      0.1
// @description  qingshu-helper
// @author       BaboonKing
// @match        *://*.qingshuxuetang.com/*
// @icon         https://degree.qingshuxuetang.com/resources/default/images/favicon.ico
// @grant        none
// ==/UserScript==

// -------------------------------------------------------- //

const serverBaseUrl = "https://degree.qingshuxuetang.com/cqust/Student/Course/";

/**
 * 课程学习状态
 * @readonly
 * @enum {number}
 */
const LEARN_STATUS = {
  NO_START: 0,
  DOING: 2,
  DONE: 1,
};

/**
 * 学习的内容 type
 * @readonly
 * @enum {number}
 */
const CONTENT_TYPE = {
  DEGREE_COURSEWARE: 11,
  DEGREE_EBOOK: 12,
  DEGREE_PREPARATION: 13,
  DEGREE_PLAYBACK: 14,
  DEGREE_LIVE: 15,
  DEGREE_LOGIN: 99,
};

/**
 * @readonly
 */
const CONTENT_TYPE_VALUE_LIST = Object.values(CONTENT_TYPE);

// -------------------------------------------------------- //

/**
 * main
 */
(function () {
  "use strict";
  setTimeout(() => {
    main();
  }, 1000);
})();

/**
 * 入口函数
 */
function main() {
  console.debug("qingshu-helper-init");

  if (isHomePage()) {
    console.debug("isHomePage");
    alert("登录成功! 选择想学习的课程开始学习");
  }

  // 接口做了限流，该功能禁用
  if (isCourseListPage() && confirm("是否要获取所有课程的登录分")) {
    alert("接口做了限流，该功能已经禁用，请到具体的课程详情页获取登录分！");
    return;
    getCourseList().then((res) => {
      res.data.forEach((item) => {
        getLoginFraction(item);
      });
    });
  }

  if (isCourseStudyPage()) {
    console.debug("isCourseStudyPage");
    if (confirm("课程助手脚本已经载入,确认执行?")) {
      handleCourseStudyPage();
    }
  }
}

/**
 * useIntervalByFinishFn
 * @param {Function} fn
 * @param {number} timeout
 * @param {Function} finishFn
 */
function useIntervalByFinishFn(fn, timeout = 0, finishFn = () => false) {
  fn();
  const timer = setInterval(() => {
    if (finishFn()) {
      clearInterval(timer);
    } else {
      fn();
    }
  }, timeout);
}

/**
 * useIntervalByMaxExCount
 * @param {Function} fn
 * @param {number} timeout
 * @param {Function} finishedFn
 * @param {number} maxExCount
 */
function useIntervalByMaxExCount(
  fn,
  timeout = 0,
  maxExCount = Number.MAX_SAFE_INTEGER,
  finishedFn = () => {}
) {
  fn();
  // Because an immediate run. So count default value is 1
  let count = 1;
  const timer = setInterval(() => {
    if (count > maxExCount) {
      finishedFn();
      clearInterval(timer);
    } else {
      fn();
      count++;
    }
  }, timeout);
}

/**
 * 20 次的登陆分
 * @param {Course} course
 */
function getLoginFraction(course) {
  const { teachPlanId, courseId, periodId, contentType } = course;

  useIntervalByMaxExCount(
    () => {
      fetch(`${serverBaseUrl}StudentCourseTrack?_t=${Date.now()}`, {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(course),
        method: "POST",
      });
    },
    600,
    20,
    () => {
      alert("登录分获取完成，刷新页面查看！");
    }
  );
}

function getCourseList() {
  return new Promise((resolve, reject) => {
    window.$.post("CourseData", null, function (res) {
      resolve(res);
      console.debug("CourseData-result", res);
    });
  });
}

function isRightfulType(contentType) {
  if (!contentType) {
    return false;
  }
  return CONTENT_TYPE_VALUE_LIST.includes(Number(contentType));
}

function isLoginType(contentType) {
  return Number(contentType) === CONTENT_TYPE.DEGREE_LOGIN;
}

/**
 * handleCourseStudyPage
 */
function handleCourseStudyPage() {
  const searchParams = new URLSearchParams(location.search);
  const courseId = searchParams.get("courseId");
  const teachPlanId = searchParams.get("teachPlanId");
  const periodId = searchParams.get("periodId");

  const contentType = prompt(
    "得分类型:\n\n讲函:11\n电子书:12\n预习PREPARATION:13\n回放PLAYBACK:14\n直播LIVE:15\n登录分LOGIN:99 \n\n默认为讲函:11\n",
    CONTENT_TYPE.DEGREE_COURSEWARE
  );

  if (!isRightfulType(contentType)) {
    alert("不是合法的得分类型,请刷新重试");
    return;
  }

  if (isLoginType(contentType)) {
    getLoginFraction({
      courseId,
      teachPlanId,
      periodId,
    });
    return;
  }

  useIntervalByMaxExCount(() => {
    handleCourse({ courseId, teachPlanId, periodId, contentType });
  }, 1000 * 60 * 60);
}

/**
 *
 * @param {Course} course
 */
function handleCourse(course) {
  const { teachPlanId, courseId, periodId, contentType } = course;
  StudyRecordService.setContext(serverBaseUrl);

  StudyRecordService.resume(
    teachPlanId,
    courseId,
    "",
    contentType,
    periodId
  );
  showLog();
}

function showLog() {
  const runningText = "<div>运行中......</div>";
  const addedValueText = "<div>时长增加了 2 分钟 </div>";
  const clearText = "<div>已清屏</div>";
  const supportEl = document.querySelector(".support-pc");

  supportEl.style.background = "black";
  supportEl.style.top = "60px";
  supportEl.style.height = "100vh";
  supportEl.style.width = "10vw";
  supportEl.style.overflow = "auto";
  supportEl.style.color = "wheat";
  supportEl.style.textAlign = "end";
  supportEl.onclick = null;

  supportEl.innerHTML += runningText;
  setInterval(() => {
    supportEl.innerHTML += runningText;
    supportEl.scrollTop = 9999;
  }, 10 * 1000);

  setInterval(() => {
    supportEl.innerHTML += addedValueText;
    supportEl.scrollTop = 9999;
  }, 2 * 60 * 1000);

  setInterval(() => {
    supportEl.innerHTML = clearText;
    supportEl.scrollTop = 9999;
  }, 60 * 60 * 1000);
}

function isCourseListPage() {
  const courseList_page = "/cqust/Student/Course/CourseList";
  return location.href.includes(courseList_page);
}

function isCourseShowPage() {
  const courseShow_page = "/cqust/Student/Course/CourseShow";
  return location.href.includes(courseShow_page);
}

function isCourseStudyPage() {
  const courseStudy_page = "/cqust/Student/Course/CourseStudy";
  return location.href.includes(courseStudy_page);
}

function isHomePage() {
  const home_page = "/cqust/Student/Home";
  return location.href.includes(home_page);
}

/**
 * Course
 * @typedef {Object} Course
 * @property {number} courseId - 课程 ID
 * @property {LEARN_STATUS} learnStatus - 学习状态
 * @property {CONTENT_TYPE} contentType - 学习内容type
 * @property {number} teachPlanId - 计划ID
 * @property {number} periodId - 时期ID
 * @property {number} cw_nodeId - 章节id
 * @property {string} category - 类别名称
 * @property {boolean} isCurrent - 是否当前学期
 */
