const moment = require("moment");

const handleGetFilterDates = (key) => {
    let val = {
      startDate: new Date(),
      endDate: new Date(),
    };
    switch (key) {
      case "now":
        val.startDate = moment().subtract(1, "hour");
        val.endDate = moment();
        return val;
      case "today":
        val.startDate = moment().subtract(48, "hour");
        val.endDate = moment();
        return val;
      case "week":
        val.startDate = moment().startOf("week");
        // val.startDate = moment().subtract(1, "week").startOf("week");
        val.endDate = moment().endOf("week");
        return val;
      case "month":
        val.startDate = moment().startOf("month");
        val.endDate = moment().endOf("month");
        return val;
      case "allTime":
        val.startDate = moment().subtract(5, "year");
        val.endDate = moment();
        return val;
      default:
        val.startDate = moment().subtract(36, "hour");
        val.endDate = moment();
        return val;
    }
  }

  exports.handleGetFilterDates = handleGetFilterDates