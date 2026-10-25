chrome.action.onClicked.addListener(async function () {
    await showCookie();
});

function notify(msg) {
    var manifest = chrome.runtime.getManifest();
    chrome.notifications.create({
        type: 'basic',
        iconUrl: manifest.icons['48'],
        title: manifest.name,
        message: msg
    });
}

async function showCookie() {
    let result = await getIdFromCookie();
    if (!result || !result.cookieString) {
        notify("获取Cookie失败，请确认当前页面是京东页面且已登录。");
        return;
    }
    try {
        // MV3 service worker 无 document，无法直接操作剪贴板；
        // 改为向当前活动页面注入脚本，在页面上下文中执行复制。
        await chrome.scripting.executeScript({
            target: { tabId: result.tabId },
            func: (text) => {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                ta.setSelectionRange(0, ta.value.length);
                document.execCommand('copy');
                document.body.removeChild(ta);
            },
            args: [result.cookieString]
        });
        notify("Cookies 已经成功复制到剪切板。");
    } catch (e) {
        console.error("copy failed", e);
        notify("复制失败，请查看扩展错误信息。");
    }
}

async function getIdFromCookie() {
    let tab = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs || tabs.length === 0) { resolve(null); return; }
            resolve(tabs[0]);
        })
    });
    if (!tab || !tab.url) { return false; }
    var arr = tab.url.split("/");
    var domain = arr[0] + '//' + arr[2];
    console.log("domain", domain);
    let stringCookie = "";
    let ok = await new Promise((resolve) => {
        chrome.cookies.getAll({ url: domain }, function (cookies) {
            if (chrome.runtime.lastError) { resolve(false); return; }
            for (var i = 0; i < cookies.length; i++) {
                if (cookies[i].name.length > 0 && cookies[i].value.length > 0) {
                    stringCookie = stringCookie + cookies[i].name + "=" + cookies[i].value + "; ";
                }
            }
            resolve(true);
        });
    });
    if (!ok) { return false; }
    return { tabId: tab.id, cookieString: stringCookie };
}
