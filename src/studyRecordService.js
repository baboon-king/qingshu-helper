/* compress see src/tool/uglifyjs/README.md */
window.StudyRecordService = (function () {
  var UPLOAD_STUDY_RECORD_BEGIN_URL = "UploadStudyRecordBegin";
  var UPLOAD_STUDY_RECORD_CONTINUE_URL = "UploadStudyRecordContinue";
  var UPLOAD_TIMER_INTERVAL_TIME = 2 * 60 * 1000;
  var lastUploadTime,
    nextIntervalTime = UPLOAD_TIMER_INTERVAL_TIME;
  var context = {
    serviceBaseUrl: null,
    playPosition: 0,
    recordId: null,
    recordInfo: null,
    uploadTimer: null,
    timeOutConfirm: false,
  };

  var CONTENT_TYPE = {
    DEGREE_COURSEWARE: 11,
    DEGREE_EBOOK: 12,
    DEGREE_PREPARATION: 13,
    DEGREE_LIVE: 15,
    DEGREE_PLAYBACK: 14,
  };

  var UPLOAD_TYPE = {
    BEGIN: 1,
    CONTINUE: 2,
  };

  function setContext(baseUrl) {
    context.serviceBaseUrl = baseUrl;
  }

  function updatePlayPosition(playPosition) {
    context.playPosition = playPosition;
  }

  function uploadStudyRecordBegin(
    classId,
    courseId,
    contentId,
    contentType,
    periodId
  ) {
    context.timeOutConfirm = false;
    var recordInfo = {
      classId: classId,
      courseId: courseId,
      contentId: contentId,
      contentType: contentType,
      periodId: periodId,
      position: Math.floor(context.playPosition),
    };
    context.recordInfo = recordInfo;
    uploadStudyRecord(UPLOAD_TYPE.BEGIN, JSON.stringify(recordInfo));
  }

  function uploadStudyRecordContinue(useBeacon) {
    if (context.recordId == null) {
      context.timeOutConfirm = false;
      context.recordInfo &&
        uploadStudyRecord(
          UPLOAD_TYPE.BEGIN,
          JSON.stringify(context.recordInfo)
        );
      return;
    }
    var fd = new FormData();
    fd.append("recordId", context.recordId);
    fd.append("position", Math.floor(context.playPosition) + "");
    fd.append("timeOutConfirm", context.timeOutConfirm);
    useBeacon && navigator.sendBeacon
      ? uploadByBeacon(UPLOAD_TYPE.CONTINUE, fd)
      : uploadStudyRecord(UPLOAD_TYPE.CONTINUE, fd);
  }

  function uploadByBeacon(uploadType, recordInfo) {
    var url =
      uploadType === UPLOAD_TYPE.BEGIN
        ? UPLOAD_STUDY_RECORD_BEGIN_URL
        : UPLOAD_STUDY_RECORD_CONTINUE_URL;

    navigator.sendBeacon(context.serviceBaseUrl + url, recordInfo);
  }

  function uploadStudyRecord(uploadType, recordInfo) {
    var url =
      uploadType === UPLOAD_TYPE.BEGIN
        ? UPLOAD_STUDY_RECORD_BEGIN_URL
        : UPLOAD_STUDY_RECORD_CONTINUE_URL;
    $.ajax({
      url: context.serviceBaseUrl + url,
      type: "POST",
      contentType:
        uploadType === UPLOAD_TYPE.BEGIN ? "application/json" : false,
      headers: {
        Accept: "application/json",
      },
      processData: uploadType === UPLOAD_TYPE.BEGIN,
      data: recordInfo,
      success: function (result) {
        if (result.hr === 0) {
          lastUploadTime = Date.now();
          if (uploadType === UPLOAD_TYPE.BEGIN && result.data != null) {
            context.recordId = result.data;
          }
          clearTimeout(context.uploadTimer);
          nextIntervalTime = UPLOAD_TIMER_INTERVAL_TIME;
          setUploadTimer();
        } else {
          console.log("upload fail " + result.message);
          context.recordId = null;
          setUploadTimer();
        }
      },
      error: function () {
        context.recordId = null;
        setUploadTimer();
      },
    });
  }

  function cleanBeforeLeave(useBeacon) {
    uploadStudyRecordContinue(useBeacon);
    nextIntervalTime = UPLOAD_TIMER_INTERVAL_TIME;
    lastUploadTime = null;
    clearTimeout(context.uploadTimer);
    context.recordId = null;
    context.recordInfo = null;
  }

  function getLastPlayerTime(teachplanCourseId, nodeId, callback) {
    $.ajax({
      url:
        context.serviceBaseUrl +
        "GetPlayerTime?teachplanCourseId=" +
        teachplanCourseId +
        "&nodeId=" +
        nodeId,
      type: "GET",
      cache: false,
      success: function (lastTime) {
        callback(Math.max(0, lastTime));
      },
      error: function () {
        callback(0);
      },
    });
  }

  function setTimeOutConfirm() {
    context.timeOutConfirm = true;
    lastUploadTime = null;
    nextIntervalTime = UPLOAD_TIMER_INTERVAL_TIME;
  }

  function clearUploadTimer() {
    clearTimeout(context.uploadTimer);
    nextIntervalTime =
      UPLOAD_TIMER_INTERVAL_TIME -
      ((Date.now() - (lastUploadTime || Date.now())) %
        UPLOAD_TIMER_INTERVAL_TIME);
  }

  function setUploadTimer() {
    clearUploadTimer();
    context.uploadTimer = setTimeout(function () {
      uploadStudyRecordContinue();
      nextIntervalTime = UPLOAD_TIMER_INTERVAL_TIME;
      setUploadTimer();
    }, nextIntervalTime);
  }

  function studyEnd(useBeacon) {
    cleanBeforeLeave(useBeacon);
  }

  function uploaded() {
    return context.recordId != null;
  }

  return {
    CONTENT_TYPE: Object.freeze(CONTENT_TYPE),
    setContext: setContext,
    updatePlayPosition: updatePlayPosition,
    getLastPlayerTime: getLastPlayerTime,
    uploadStudyRecordBegin: uploadStudyRecordBegin,
    studyEnd: studyEnd,
    setTimeOutConfirm: setTimeOutConfirm,
    clearUploadTimer: clearUploadTimer,
    setUploadTimer: setUploadTimer,
    uploaded: uploaded,
  };
})();
