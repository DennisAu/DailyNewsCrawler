// app_scripts/grok_news_to_sheets.gs

// ***********************************************
// Configuration Area - Please review these values
// ***********************************************

// Sheet name configurations
const CHINA_SHEET_NAME = 'china_news'; // Sheet for China news
const GLOBAL_SHEET_NAME = 'global_news'; // Sheet for Global news
const TECH_SHEET_NAME = 'tech_news'; // Sheet for Global Tech news

// Grok API Configuration
// IMPORTANT: Set your GROK_API_KEY in Google Apps Script's Script Properties.
// Go to File > Project properties > Script properties. Add a property named GROK_API_KEY.
const GROK_API_ENDPOINT = 'https://api.x.ai/v1/chat/completions'; // Grok API endpoint for chat completions
const GROK_MODEL = 'grok-3-latest';

// Define the column headers for your Google Sheet
const HEADERS = ['title', 'contents', 'title_cn', 'contents_cn', 'links', 'last_update', 'source', 'region', 'updated_by'];

// ***********************************************
// Main Functionality
// ***********************************************

/**
 * Main function to execute the entire news fetching and saving process.
 * This function can be triggered manually or by a time-based trigger.
 */
function runGrokNewsCollector() {
  const grokApiKey = PropertiesService.getScriptProperties().getProperty('GROK_API_KEY');
  if (!grokApiKey || grokApiKey === 'your_grok_api_key_here' || grokApiKey.trim() === '') {
    Logger.log('ERROR: GROK_API_KEY is not configured in Script Properties. Please set it up.');
    SpreadsheetApp.getUi().alert('GROK API Key Missing', 'Please configure your GROK_API_KEY in File > Project properties > Script properties.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  

  try {
    Logger.log('Starting daily news collection using Grok API...');

    // Fetch and save China news
    Logger.log('Fetching China news...');
    const chinaNewsQuery = '中国过去24小时内的重要新闻和热点事件'; // 更具体的中文查询
    const chinaNewsRaw = fetchNewsFromGrok(grokApiKey, chinaNewsQuery, 'China');
    if (chinaNewsRaw && chinaNewsRaw.length > 0) {
      const formattedChinaNews = formatNewsDataFromGrok(chinaNewsRaw, 'China');
      saveToSheet(formattedChinaNews, CHINA_SHEET_NAME);
      Logger.log(`Successfully fetched and saved ${formattedChinaNews.length} news items for China.`);
    } else {
      Logger.log('No news items returned for China or an error occurred.');
    }

    // Fetch and save Global news
    Logger.log('Fetching Global news...');
    const globalNewsQuery = '全球过去24小时内的重要新闻和热点事件'; // 统一查询风格
    const globalNewsRaw = fetchNewsFromGrok(grokApiKey, globalNewsQuery, 'Global');
    if (globalNewsRaw && globalNewsRaw.length > 0) {
      const formattedGlobalNews = formatNewsDataFromGrok(globalNewsRaw, 'Global');
      saveToSheet(formattedGlobalNews, GLOBAL_SHEET_NAME);
      Logger.log(`Successfully fetched and saved ${formattedGlobalNews.length} news items for Global.`);
    } else {
      Logger.log('No news items returned for Global or an error occurred.');
    }

    // Fetch and save Global Tech news
    Logger.log('Fetching Global Tech news...');
    const techNewsQuery = '全球过去24小时内重要的科技新闻和行业动态'; // 更具体的科技新闻查询
    const techNewsRaw = fetchNewsFromGrok(grokApiKey, techNewsQuery, 'Global Tech');
    if (techNewsRaw && techNewsRaw.length > 0) {
      const formattedTechNews = formatNewsDataFromGrok(techNewsRaw, 'Global Tech');
      saveToSheet(formattedTechNews, TECH_SHEET_NAME);
      Logger.log(`Successfully fetched and saved ${formattedTechNews.length} news items for Global Tech.`);
    } else {
      Logger.log('No news items returned for Global Tech or an error occurred.');
    }
    Logger.log('News collection and saving process completed!');
  } catch (error) {
    Logger.log('An error occurred during the execution: ' + error.toString());
    Logger.log('Error stack: ' + error.stack);
    // Optionally, send an email notification on error
    // MailApp.sendEmail('your-email@example.com', 'Grok News Collector Error', 'Error: ' + error.toString() + '\nStack: ' + error.stack);
  }
}

/**
 * Fetches news from the Grok API using live search.
 * @param {string} apiKey The Grok API key.
 * @param {string} query The search query for Grok (e.g., "Top news in China").
 * @param {string} regionName The name of the region for logging/identification (e.g., "China", "Global").
 * @return {Array<Object>} An array of news item objects parsed from Grok's JSON response, or an empty array on failure.
 */
function fetchNewsFromGrok(apiKey, query, regionName) {
  // 获取今天和昨天的日期并格式化为 YYYY-MM-DD
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const formatDateToISO = (date) => {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // 月份从0开始，需要+1
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  };

  const todayISO = formatDateToISO(today);
  const yesterdayISO = formatDateToISO(yesterday);

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 3000; // 3 seconds delay between retries

  const jsonPrompt = `Please provide a comprehensive digest of ${query} from reputable and authoritative news organizations. Aim for at least 6-12 diverse news items if available within the specified timeframe.
  For general global news or global technology news, prioritize internationally recognized news agencies, established media outlets, and reputable tech publications (e.g., Reuters, Associated Press, BBC News, CNN, The New York Times, The Wall Street Journal, The Guardian, Le Monde, Der Spiegel, TechCrunch, Wired, The Verge, Ars Technica).
  For China news, prioritize official news agencies and major state-affiliated media (e.g., Xinhua News Agency, People's Daily, CCTV, China Daily, Global Times, CGTN).
  Return the response strictly as a JSON object with a single key named "news_items".
  The "news_items" array should contain multiple distinct news articles.
  The value of "news_items" must be an array of news articles.
  Each news article object in the array must have the following string fields: "title", "contents", and "source".
  It must also have a field named "links" which is an array of URL strings.
  Ensure the "contents" field provides a detailed summary or the main points of the news.
  If a news article is in English, provide both the original title and contents, and their Chinese translations. The translated title should be in a field named "title_cn" and the translated contents in a field named "contents_cn". If the news article is already in Chinese, then omit "title_cn" and "contents_cn".
  If providing translations, ensure they are accurate and natural-sounding.
  Do not include any explanations, introductory text, or any characters outside of the JSON object itself.
  The "title" should be concise and informative (in the original language).
  The "links" array should contain relevant URLs for the news item. It can be an empty array if no specific links are found.
  The "source" should be the name of the news publication or source.`;

  const payload = {
    messages: [{ role: 'user', content: jsonPrompt }],
    model: GROK_MODEL, 
    search_parameters: {
      mode: "on", // "on" 强制启用实时搜索
      from_date: yesterdayISO, // 设置搜索的起始日期为昨天
      to_date: todayISO, // 设置搜索的结束日期为今天
      // sources 参数定义了模型可以从中检索信息的来源类型。
      // 如果未提供，则默认为 "web" 和 "x"。
      // "news" 类型专注于新闻出版物。
      // "country" 参数可以用于 "web" 和 "news" 类型，以倾向于特定地区的结果。
      sources: regionName === 'China' ? [
        { "type": "news", "country": "CN" }, // Prioritize news sources from China for 'China' region
        { "type": "web", "country": "CN" },  // Prioritize web content from China
        { "type": "x" }                      // Still allow information from X
        // Example for specific Chinese RSS feeds if you have them:
        // { "type": "rss", "links": ["http://www.xinhuanet.com/rss/world.xml", "http://www.people.com.cn/rss/world.xml"] }
      ] : [
        { "type": "news" }, // Search global news sources
        { "type": "web" },  // Search global web content.
        // For global news, we might want to explicitly exclude country to get a broader scope, or let Grok decide.
        { "type": "x" }     // Allow information from X for 'Global' and 'Global Tech' regions
        // Example for specific global RSS feeds if you have them:
        // { "type": "rss", "links": ["http://feeds.reuters.com/reuters/topNews", "https://feeds.bbci.co.uk/news/world/rss.xml"] }
      ],
      // 如果您想排除特定网站，可以这样做：
      // sources: [{ "type": "news", "excluded_websites": ["example.com", "another.com"] }]
      // You can also set a limit on how many data sources will be considered in the query
      "max_search_results": regionName === 'China' ? 30 : 25, // 尝试增加中国新闻搜索时考虑的数据源数量

      // To further refine news sources, you might consider using 'excluded_websites'
      // if you consistently get results from non-authoritative sites.
      // For example, if you want to avoid blogs or forums when looking for news:
      // sources: regionName === 'China' ? [
      //   { "type": "news", "country": "CN", "excluded_websites": ["blog.example.cn", "forum.example.cn"] },
      //   ...
      // ] : [...]
    },
    response_format: {
      type: "json_object" // Request structured JSON output
    },
    temperature: 0.2,
    max_tokens: 4000, // Adjusted max_tokens to a more reasonable value for news summaries
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true, // Allows us to handle HTTP errors gracefully
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      Logger.log(`Fetching ${regionName} news with query: "${query}" (Attempt ${attempt}/${MAX_RETRIES})`);
      const response = UrlFetchApp.fetch(GROK_API_ENDPOINT, options);
      const responseCode = response.getResponseCode();
      const responseBody = response.getContentText();

      if (responseCode === 200) {
        const jsonResponse = JSON.parse(responseBody);
        Logger.log(`Grok API Raw JSON Response for ${regionName}: ${JSON.stringify(jsonResponse)}`);
        if (jsonResponse.choices && jsonResponse.choices.length > 0 && jsonResponse.choices[0].message && jsonResponse.choices[0].message.content) {
          try {
            const structuredNews = JSON.parse(jsonResponse.choices[0].message.content);
            if (structuredNews && structuredNews.news_items && Array.isArray(structuredNews.news_items)) {
              Logger.log(`Successfully parsed ${structuredNews.news_items.length} news items for ${regionName}.`);
              return structuredNews.news_items; // Return the array of news objects
            } else {
              Logger.log(`Warning: Grok returned JSON, but "news_items" array is missing or not an array for ${regionName}. Content: ${jsonResponse.choices[0].message.content}`);
              return [];
            }
          } catch (parseError) {
            Logger.log(`Error parsing JSON content from Grok for ${regionName}: ${parseError}. Content: ${jsonResponse.choices[0].message.content}`);
            return [];
          }
        } else {
          Logger.log(`Warning: Grok API response for ${regionName} did not contain expected news content. Response: ${responseBody}`);
          return []; // No need to retry if response format is unexpected
        }
      } else if (responseCode === 504 && attempt < MAX_RETRIES) {
        Logger.log(`Error fetching ${regionName} news from Grok API. Status: ${responseCode} (Gateway Timeout). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        Utilities.sleep(RETRY_DELAY_MS);
        // Continue to the next attempt
      } else {
        Logger.log(`Error fetching ${regionName} news from Grok API. Status: ${responseCode}. Response: ${responseBody}`);
        return []; // Return empty on other errors or if max retries reached for 504
      }
    } catch (e) {
      Logger.log(`Exception while fetching ${regionName} news from Grok API (Attempt ${attempt}/${MAX_RETRIES}): ${e.toString()}`);
      if (attempt < MAX_RETRIES) {
        Logger.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        Utilities.sleep(RETRY_DELAY_MS);
      } else {
        Logger.log(`Stack trace: ${e.stack}`);
        return []; // Return empty on final failed attempt after exception
      }
    }
  }
  // Fallback, should ideally be reached only if all retries fail
  Logger.log(`Failed to fetch ${regionName} news after ${MAX_RETRIES} attempts.`);
  return [];
}

/**
 * Formats raw news strings from Grok into a 2D array for Google Sheets.
 * This function now takes structured news objects from Grok.
 * @param {Array<Object>} parsedNewsItems An array of news item objects from Grok.
 * @param {string} region The region of the news (e.g., "China", "Global").
 * @return {Array<Array<String>>} A 2D array of formatted news data.
 */
function formatNewsDataFromGrok(parsedNewsItems, region) {
  const formattedData = [];
  const now = new Date().toLocaleString(); // For 'last_update'

  if (!parsedNewsItems || parsedNewsItems.length === 0) {
    Logger.log(`No parsed news items to format for region: ${region}`);
    return formattedData;
  }

  // 简单的中文检测函数 (检查是否包含中文字符)
  const isChinese = (text) => {
    if (typeof text !== 'string') return false;
    return /[\u4e00-\u9fa5]/.test(text);
  };

  parsedNewsItems.forEach(item => {
    let title = item.title || 'N/A'; // Original title
    let contents = item.contents || 'No content provided.'; // Original contents
    let title_cn = item.title_cn || ''; // Chinese title, defaults to empty if not present
    let contents_cn = item.contents_cn || ''; // Chinese contents, defaults to empty if not present
    let linksString = '';

    // 如果 title_cn 为空，但 title 是中文，则将 title 赋值给 title_cn
    if (!title_cn && isChinese(title)) {
      title_cn = title;
    }

    // 如果 contents_cn 为空，但 contents 是中文，则将 contents 赋值给 contents_cn
    if (!contents_cn && isChinese(contents)) {
      contents_cn = contents;
    }

    if (item.links && Array.isArray(item.links)) {
      linksString = item.links.join(', ');
    } else if (item.links && typeof item.links === 'string') { // Handle if Grok mistakenly returns a string
      linksString = item.links;
    }
    const source = item.source || 'Grok Live Search';

    // Ensure all expected fields for HEADERS are present
    if (typeof title !== 'string' || typeof contents !== 'string' || typeof title_cn !== 'string' || typeof contents_cn !== 'string' || typeof linksString !== 'string' || typeof source !== 'string') {
      Logger.log(`Warning: News item for region ${region} has unexpected data types: ${JSON.stringify(item)}`);
      // Skip this item or provide defaults for all fields if critical data is missing/malformed
      // For now, we'll proceed with defaults set above.
    }

    if (title === 'N/A' && contents === 'No content provided.') {
      Logger.log(`Skipping potentially empty/malformed news item for region ${region}: ${JSON.stringify(item)}`);
      return; // Skip this iteration if item is essentially empty
    }

    // HEADERS = ['title', 'contents', 'title_cn', 'contents_cn', 'links', 'last_update', 'source', 'region', 'updated_by'];
    formattedData.push([
      title,
      contents,
      title_cn,
      contents_cn,
      linksString,
      now,
      source,
      region,
      'Grok API' // updated_by
    ]);
  });
  return formattedData;
}

/**
 * Saves formatted news data to the specified Google Sheet.
 * Clears existing content (except header) before writing new data.
 * @param {Array<Array<String>>} dataRows The 2D array of news data to write.
 * @param {string} sheetName The name of the target sheet.
 */
function saveToSheet(dataRows, sheetName) {
  if (!dataRows || dataRows.length === 0) {
    Logger.log(`No data to write to sheet "${sheetName}".`);
    return;
  }

  try {
    // Your Google Sheet ID (from the URL)
    // URL: https://docs.google.com/spreadsheets/d/1ZCOb4UdDCKx9BJ9tcGcF8Z0UC0Y3A2zVhBNxriUgu8s/edit
    const spreadsheet_id = PropertiesService.getScriptProperties().getProperty('GOOGLE_SPREADSHEET_ID');
    if (!spreadsheet_id || spreadsheet_id.trim() === '') {
        Logger.log('ERROR: GOOGLE_SPREADSHEET_ID is not configured or is empty in Script Properties. Please set it up.');
        SpreadsheetApp.getUi().alert('GOOGLE_SPREADSHEET_ID Missing', 'Please configure your GOOGLE_SPREADSHEET_ID in File > Project properties > Script properties.', SpreadsheetApp.getUi().ButtonSet.OK);
        return;
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheet_id);
    let sheet = spreadsheet.getSheetByName(sheetName);

    const linksColumnIndex = HEADERS.indexOf('links'); // 0-based index
    if (linksColumnIndex === -1) {
      Logger.log(`Error: 'links' column not found in HEADERS. Cannot perform duplicate check. Appending all data.`);
      // Fallback to appending all data if 'links' column is missing, or handle error differently
      if (dataRows.length > 0) {
        if (!sheet) {
          sheet = spreadsheet.insertSheet(sheetName);
          sheet.appendRow(HEADERS);
        }
        sheet.getRange(sheet.getLastRow() + 1, 1, dataRows.length, dataRows[0].length).setValues(dataRows);
        Logger.log(`${dataRows.length} news items (no duplicate check) appended to sheet "${sheetName}".`);
      }
      return;
    }

    const existingLinksSet = new Set();

    if (!sheet) {
      Logger.log(`Sheet "${sheetName}" not found. Creating it.`);
      sheet = spreadsheet.insertSheet(sheetName);
      // Add headers to the new sheet
      sheet.appendRow(HEADERS);
      Logger.log(`Sheet "${sheetName}" created and headers added.`);
    } else { // Sheet already exists
      // Read existing links from the sheet to check for duplicates
      const lastRowInSheet = sheet.getLastRow();
      if (lastRowInSheet > 1) { // More than just header row
        const range = sheet.getRange(2, linksColumnIndex + 1, lastRowInSheet - 1, 1); // +1 for 1-based column index
        const existingLinksValues = range.getValues();
        existingLinksValues.forEach(rowLinksArray => {
          const linksInCell = rowLinksArray[0];
          if (linksInCell && typeof linksInCell === 'string') {
            linksInCell.split(',').forEach(link => {
              const trimmedLink = link.trim();
              if (trimmedLink) {
                existingLinksSet.add(trimmedLink);
              }
            });
          }
        });
      }
      Logger.log(`Appending data to existing sheet "${sheetName}".`);
    }

    const uniqueRowsToAppend = [];
    dataRows.forEach(newRow => {
      const newLinksString = newRow[linksColumnIndex]; // Use 0-based index for array
      let isDuplicate = false;
      if (newLinksString && typeof newLinksString === 'string' && newLinksString.trim() !== '') {
        const newIndividualLinks = newLinksString.split(',').map(l => l.trim()).filter(l => l);
        if (newIndividualLinks.length > 0) {
          for (const link of newIndividualLinks) {
            if (existingLinksSet.has(link)) {
              isDuplicate = true;
              break; // Found a duplicate link, no need to check further for this row
            }
          }
        }
      }
      // If isDuplicate is still false (meaning no matching link found, or the new item has no links), add it.
      if (!isDuplicate) {
        uniqueRowsToAppend.push(newRow);
      } else {
        Logger.log(`Skipping duplicate news item (link already exists) for sheet "${sheetName}": Title: ${newRow[HEADERS.indexOf('title')]}`);
      }
    });

    if (uniqueRowsToAppend.length > 0) {
      // Append new unique data
      sheet.getRange(sheet.getLastRow() + 1, 1, uniqueRowsToAppend.length, uniqueRowsToAppend[0].length).setValues(uniqueRowsToAppend);
      Logger.log(`${uniqueRowsToAppend.length} new unique news items successfully appended to sheet "${sheetName}".`);
    } else {
      Logger.log(`No new unique news items to append to sheet "${sheetName}".`);
    }

  } catch (e) {
    Logger.log(`Error writing to Google Sheet "${sheetName}": ${e.toString()}`);
    Logger.log(`Error stack: ${e.stack}`);
    if (e.message.includes("You do not have permission")) {
      Logger.log("PERMISSION ERROR: Ensure the script has permission to edit the Google Sheet. Check sharing settings and that the account running the script has edit access.");
    }
  }
}

// ***********************************************
// (Optional) Trigger Setup Functions
// ***********************************************

/**
 * Creates triggers to run the `runGrokNewsCollector` function at specified times.
 * This setup will run the collector daily at 7 AM, 3 PM (15:00), and 11 PM (23:00).
 * Run this function once manually to set up the trigger.
 */
function setupNewsCollectorTriggers() {
  // Delete any existing triggers for this function to avoid duplicates
  deleteTriggersByName('runGrokNewsCollector');

  const triggerHours = [7, 15, 23]; // 7:00, 15:00 (3 PM), 23:00 (11 PM)

  triggerHours.forEach(hour => {
    ScriptApp.newTrigger('runGrokNewsCollector')
      .timeBased()
      .atHour(hour)
      .nearMinute(0) // Around the 0th minute of the hour
      .everyDays(1) // Run daily
      .inTimezone(Session.getScriptTimeZone()) // Use the script's timezone
      .create();
    Logger.log(`Trigger created for runGrokNewsCollector to run daily around ${hour}:00.`);
  });

  Logger.log(`Successfully set up ${triggerHours.length} daily triggers for runGrokNewsCollector at 7 AM, 3 PM, and 11 PM.`);
  try {
    SpreadsheetApp.getUi().alert(
      'Triggers Created',
      'Triggers have been set up to run the news collector daily at 7 AM, 3 PM, and 11 PM.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    Logger.log('Could not display UI alert, but triggers were successfully set up. Error: ' + e.toString());
    // This can happen if the script is run in a context without UI access (e.g., sometimes when run directly from the script editor).
    // The primary function (trigger creation) was successful as per previous logs.
  }
}

/**
 * Deletes all triggers associated with a specific function name.
 * @param {string} functionName The name of the function whose triggers should be deleted.
 */
function deleteTriggersByName(functionName) {
  const triggers = ScriptApp.getProjectTriggers();
  let deletedCount = 0;
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(triggers[i]);
      deletedCount++;
      Logger.log(`Deleted existing trigger for function: ${functionName}`);
    }
  }
  if (deletedCount > 0) {
    Logger.log(`Deleted ${deletedCount} trigger(s) for ${functionName}.`);
  } else {
    Logger.log(`No existing triggers found for ${functionName}.`);
  }
}

/**
 * Utility function to add a custom menu to the Google Sheet UI.
 * This makes it easier to run the main function and set up triggers.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Grok News Collector')
    .addItem('Run Now', 'runGrokNewsCollector')
    .addSeparator()
    .addItem('Setup Triggers (7AM, 3PM, 11PM)', 'setupNewsCollectorTriggers')
    .addItem('Delete All Collector Triggers', 'deleteAllCollectorTriggers')
    .addToUi();
}

/**
 * Helper function to delete all triggers for runGrokNewsCollector.
 */
function deleteAllCollectorTriggers() {
    deleteTriggersByName('runGrokNewsCollector');
    SpreadsheetApp.getUi().alert('Triggers Deleted', 'All scheduled triggers for the Grok News Collector have been removed.', SpreadsheetApp.getUi().ButtonSet.OK);
}