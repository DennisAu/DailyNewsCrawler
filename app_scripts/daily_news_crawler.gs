// ***********************************************
// 配置区域 - 请根据你的情况修改这些值
// ***********************************************

// 你的 Google Sheet 的 ID (从URL中获取)
// URL: https://docs.google.com/spreadsheets/d/1ZCOb4UdDCKx9BJ9tcGcF8Z0UC0Y3A2zVhBNxriUgu8s/edit
const SPREADSHEET_ID = '1ZCOb4UdDCKx9BJ9tcGcF8Z0UC0Y3A2zVhBNxriUgu8s';

// 你希望数据写入的工作表名称。如果工作表不存在，脚本可能会出错或无法按预期工作。
// 确保这个工作表已经存在于你的 Google Sheet 中。
const SHEET_NAME = 'daily_news'; // 例如 'Sheet1' 或 '每日新闻'，请确保它在你的表格中已存在

// 新闻API的配置 (重要：你需要替换下面的模拟部分为真实API)
const NEWS_API_KEY = 'YOUR_NEWS_API_KEY'; // TODO: 替换为你的新闻API密钥
const NEWS_API_ENDPOINT = 'https://newsapi.org/v2/top-headlines?country=cn&apiKey='; // TODO: 替换为你的新闻API端点, 这里以newsapi.org中国区头条为例

// 定义你希望在表格中保存的列标题 (可选，如果表头已存在则不需要重复写入)
const HEADERS = ['title', 'contents', 'links', 'last_update', 'source','updated_by'];

// ***********************************************
// 主要功能函数
// ***********************************************

/**
 * 主函数，执行整个新闻抓取和保存流程
 */
function runDailyNewsCrawler() {
  try {
    const newsItems = fetchDailyHotNews();
    if (newsItems && newsItems.length > 0) {
      const formattedNews = formatNewsData(newsItems);
      appendToSheet(formattedNews);
      Logger.log('新闻已成功获取并保存到表格中！');
    } else {
      Logger.log('未能获取到新闻数据。');
    }
  } catch (error) {
    Logger.log('执行过程中发生错误: ' + error.toString());
    Logger.log('错误详情: ' + error.stack);
  }
}

/**
 * 从新闻API获取每日热点新闻
 * TODO: 你需要用真实的API调用替换此函数的模拟实现
 * @return {Array<Object>} 新闻对象数组
 */
function fetchDailyHotNews() {
  // --- 开始：真实API调用部分 (你需要修改这里) ---
  // 这是一个示例，说明如何使用 UrlFetchApp。你需要根据你选择的新闻API文档来调整。
  // 确保 NEWS_API_KEY 和 NEWS_API_ENDPOINT 已正确配置。
  /*
  if (NEWS_API_KEY === 'YOUR_NEWS_API_KEY') {
    Logger.log('请在脚本中配置你的 NEWS_API_KEY 和 NEWS_API_ENDPOINT。');
    // 返回模拟数据以便测试其他部分功能
    return getMockNewsData();
  }

  try {
    const url = NEWS_API_ENDPOINT + NEWS_API_KEY;
    const response = UrlFetchApp.fetch(url, { 'muteHttpExceptions': true }); // muteHttpExceptions可以让你处理错误而不是让脚本停止
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      const jsonResponse = JSON.parse(responseBody);
      // TODO: 根据你的API返回的数据结构来提取新闻条目
      // 例如，如果API返回 { articles: [...] }
      // return jsonResponse.articles;
      Logger.log('API原始返回: ' + responseBody.substring(0, 500)); // 打印部分返回内容以供调试
      // 假设API返回一个包含文章的数组，每篇文章有 title, description, url, publishedAt, source.name
       if (jsonResponse.articles && jsonResponse.articles.length > 0) {
         return jsonResponse.articles;
       } else {
         Logger.log('API返回数据中未找到新闻文章或文章列表为空。');
         return [];
       }
    } else {
      Logger.log('新闻API请求失败。状态码: ' + responseCode + '，响应: ' + responseBody);
      return [];
    }
  } catch (e) {
    Logger.log('调用新闻API时发生错误: ' + e.toString());
    return []; // 返回空数组表示失败
  }
  */
  // --- 结束：真实API调用部分 ---

  // --- 开始：模拟数据部分 (用于测试，当无法访问真实API时) ---
  Logger.log('警告: 正在使用模拟新闻数据！请配置真实的新闻API以获取实时新闻。');
  return getMockNewsData();
  // --- 结束：模拟数据部分 ---
}

/**
 * 提供模拟新闻数据，用于测试
 * @return {Array<Object>} 模拟新闻对象数组
 */
function getMockNewsData() {
  return [
    {
      title: 'AI大模型技术取得新突破',
      description: '研究人员今日宣布在AI大模型领域取得了显著进展，将对多个行业产生深远影响。',
      url: 'https://example.com/news/ai-breakthrough',
      publishedAt: new Date().toISOString(),
      source: { name: '科技前沿报' }
    },
    {
      title: '全球经济复苏势头强劲',
      description: '最新数据显示，全球主要经济体呈现强劲复苏态势，市场信心回暖。',
      url: 'https://example.com/news/global-economy-recovers',
      publishedAt: new Date().toISOString(),
      source: { name: '环球财经' }
    },
    {
      title: '环保组织呼吁关注气候变化',
      description: '某知名环保组织今日发布报告，再次强调应对气候变化的紧迫性。',
      url: 'https://example.com/news/climate-change-action',
      publishedAt: new Date().toISOString(),
      source: { name: '绿色地球网' }
    }
  ];
}


/**
 * 格式化从API获取的新闻数据，以匹配表格的列顺序
 * @param {Array<Object>} newsItems API返回的新闻对象数组
 * @return {Array<Array<String>>} 准备写入表格的二维数组
 */
function formatNewsData(newsItems) {
  const formattedData = [];
  newsItems.forEach(function(item) {
    // 根据你的表格列和API返回的字段调整这里
    const title = item.title || '无标题';
    const summary = item.description || item.content || '无摘要'; // 尝试description，然后content
    const link = item.url || '';
    const publishedDate = item.publishedAt ? new Date(item.publishedAt).toLocaleString() : new Date().toLocaleString();
    const sourceName = (item.source && item.source.name) ? item.source.name : '未知来源';

    formattedData.push([title, summary, link, publishedDate, sourceName]);
  });
  return formattedData;
}

/**
 * 将格式化后的新闻数据追加到指定的Google Sheet中
 * @param {Array<Array<String>>} dataRows 要写入的数据行
 */
function appendToSheet(dataRows) {
  if (!dataRows || dataRows.length === 0) {
    Logger.log('没有数据可以写入表格。');
    return;
  }

  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      Logger.log('工作表 "' + SHEET_NAME + '" 不存在，将尝试创建它。');
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      Logger.log('工作表 "' + SHEET_NAME + '" 已创建。');
       // 如果工作表是新建的，可以考虑写入表头
      if (HEADERS && HEADERS.length > 0) {
        sheet.appendRow(HEADERS);
         Logger.log('已写入表头。');
      }
    }
    
    // 获取工作表的最后一行，在其后追加数据
    const lastRow = sheet.getLastRow();
    // 写入数据
    // (行, 列, 行数, 列数)
    sheet.getRange(lastRow + 1, 1, dataRows.length, dataRows[0].length).setValues(dataRows);
    Logger.log(dataRows.length + ' 条新闻已追加到工作表 "' + SHEET_NAME + '"。');

  } catch (e) {
    Logger.log('写入Google Sheet时发生错误: ' + e.toString());
    Logger.log('错误详情: ' + e.stack);
    // 如果是权限问题，日志中通常会提示
    if (e.message.includes("You do not have permission")) {
      Logger.log("错误提示：请确保脚本有权限编辑目标Google Sheet。检查文件共享设置，并确保运行脚本的账户有编辑权限。");
    }
  }
}

// ***********************************************
// （可选）设置每日自动运行的触发器
// ***********************************************

/**
 * 创建一个每日指定时间运行 runDailyNewsCrawler 函数的触发器。
 * 你需要手动运行一次此函数来设置触发器。
 * 之后，可以到 "当前项目的触发器" (时钟图标) 中查看和管理。
 */
function createDailyTrigger() {
  // 先删除可能已存在的同名触发器，避免重复
  deleteTriggersByName('runDailyNewsCrawler');

  ScriptApp.newTrigger('runDailyNewsCrawler')
      .timeBased()
      .atHour(8) // 设置在每天早上8点运行 (24小时制)
      .nearMinute(0) // 大约在0分左右
      .everyDays(1) // 每天
      .inTimezone(Session.getScriptTimeZone()) // 使用脚本所在时区
      .create();
  Logger.log('每日触发器已创建，将在每天大约早上8点运行 runDailyNewsCrawler。');
}

/**
 * 删除指定函数名称的所有触发器
 * @param {string} functionName 要删除触发器的函数名
 */
function deleteTriggersByName(functionName) {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log('已删除旧的触发器: ' + functionName);
    }
  }
}