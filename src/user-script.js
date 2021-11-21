// ==UserScript==
// @name         qingshu-helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  qingshu-helper
// @author       BaboonKing
// @match        *://*.qingshuxuetang.com/*
// @icon         https://degree.qingshuxuetang.com/resources/default/images/favicon.ico
// @grant        none
// ==/UserScript==

/**
 * main
 */
(function () {
  "use strict";
  console.debug("qingshu-helper-init");
  if (isCourseListPage()) {
    console.debug("isCourseListPage");

    setTimeout(() => {
      getCourseList().then((res) => handleCourseListPage(res.data));
    }, delay);
  }

  if (isCourseShowPage()) {
    console.debug("isCourseShowPage");

    setTimeout(() => {
      handleCourseShowPage();
    }, delay);
  }
})();

const CourseShowBaseURL = "/cqust/Student/Course/CourseShow";

const devMode = true;
/**
 * 仅运行当前学期的 / 否则运行所有未完成的
 */
const onlyRunCurrent = true;
/**
 * 运行中的延时数值
 * 根据 网络/电脑性能 适当调大 至 3000
 */
const delay = 2000;

/**
 * Enum for tri-state values.
 * @readonly
 * @enum {number}
 */
const LEARN_STATUS = {
  NO_START: 0,
  DOING: 2,
  DONE: 1,
};

function getCourseList() {
  return new Promise((resolve, reject) => {
    console.debug("qingshu-helper-run");
    window.$.post("CourseData", null, function (res) {
      resolve(res);
      console.debug("CourseData-result", res);
    });
  });
}

/**
 * handleCourseListPage
 * @param {Course[]} courseList
 */
function handleCourseListPage(courseList = []) {
  console.debug("courseList", courseList);

  if (onlyRunCurrent) {
    const currentTermCourseList = courseList.filter((item) => item.isCurrent);
    openCourses(currentTermCourseList);
  } else {
    const noDoneCourseList = courseList.filter(
      (item) => item.learnStatus == LEARN_STATUS.DONE
    );
    openCourses(currentTermCourseList);
    console.debug("noDoneCourseList", noDoneCourseList);
  }
}

/**
 * handleVideo
 */
function handleVideo(video) {
  console.debug("handleVideo");
  // 设置静音并播放
  video.muted = true;
  // 设置倍速播放 支持以下速率: [2, 1.5, 1.2, 0.5] ；默认开启 如有问题请手动注释下面这行代码；或者邮箱反馈我
  video.playbackRate = 1;
  video.play();

  video.addEventListener("ended", function () {
    video.play();
  });

  getVideoProgress(video);
}
/**
 * handleCourseShowPage
 */
function handleCourseShowPage() {
  console.debug("handleCourseShowPage");
  const video = document.querySelector("video");
  if (video) {
    handleVideo(video);
  }
}

/**
 *
 * @param {Course[]} CourseList
 */
function openCourses(CourseList) {
  CourseList.forEach((item, index) => {
    const url = getCourseShowURL(item);
    setTimeout(() => {
      open(url);
    }, index * delay);
  });
}

function isCourseListPage() {
  const courseList_page = "/cqust/Student/Course/CourseList";
  return location.href.includes(courseList_page);
}
function isCourseShowPage() {
  const courseShow_page = "/cqust/Student/Course/CourseShow";
  return location.href.includes(courseShow_page);
}

/**
 * 创建一个 courseShow 页面的 URL
 * @param {Course} course
 */
function getCourseShowURL(course) {
  const { teachPlanId, category = "kcjs", courseId, periodId } = course;
  const cw_nodeId = `kcjs_4_2_1`;
  const params = [];
  params.push(`teachPlanId=${teachPlanId}`);
  params.push(`periodId=${periodId}`);
  params.push(`courseId=${courseId}`);
  // params.push(`cw_nodeId=${cw_nodeId}`);
  params.push(`category=${category}`);
  const courseShowURL = `${CourseShowBaseURL}?${params.join("&")}`;
  console.debug("courseShowURL: \n", courseShowURL);
  return courseShowURL;
}

// 检测当前播放的进度
function getVideoProgress(video) {
  setInterval(() => {
    const currentTime = video.currentTime.toFixed(1);
    console.debug("当前进度:", currentTime);
  }, delay);
}

/**
 * Course
 * @typedef {Object} Course
 * @property {number} courseId - 课程 ID
 * @property {LEARN_STATUS} learnStatus - 学习状态
 * @property {number} teachPlanId - 计划ID
 * @property {number} periodId - 时期ID
 * @property {number} cw_nodeId - 章节id
 * @property {string} category - 类别名称
 * @property {boolean} isCurrent - 是否当前学期
 */
