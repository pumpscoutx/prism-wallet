// Background script for Prism Wallet
chrome.runtime.onInstalled.addListener(() => {
  console.log('Prism Wallet installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.windows.create({
    url: chrome.runtime.getURL('index.html'),
    type: 'popup',
    width: 360,
    height: 600
  });
});

// Jupiter API Configuration
const JUPITER_CONFIG = {
  TOKEN_API_ALL: "https://token.jup.ag/all",
  TOKEN_API_V2: "https://token.jup.ag/v2", // Alternative endpoint
  PRICE_API: "https://price.jup.ag/v4/price",
  QUOTE_API_BASE: "https://quote-api.jup.ag/v6"
};

// Enhanced fetch with error handling
async function fetchJson(url, opts = {}) {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Prism-Wallet/1.0.0',
        ...opts.headers
      }
    });
    
    const text = await res.text();
    let data = null;
    try { 
      data = JSON.parse(text); 
    } catch(e) { 
      data = text; 
    }
    
    return { 
      ok: res.ok, 
      status: res.status, 
      body: data, 
      headers: Object.fromEntries(res.headers.entries()) 
    };
  } catch (err) {
    return { 
      ok: false, 
      status: 0, 
      error: err.message || String(err) 
    };
  }
}

// Message handling between content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle existing storage requests
  if (request.type === 'GET_STORAGE') {
    chrome.storage.local.get(request.keys, (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.type === 'SET_STORAGE') {
    chrome.storage.local.set(request.data, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Handle Jupiter API requests
  (async () => {
    try {
      if (request?.type === "GET_TOKENS") {
        console.log('[BG] Fetching token list from Jupiter...');
        const r = await fetchJson(JUPITER_CONFIG.TOKEN_API_ALL);
        console.log('[BG] Token response status:', r.status);
        sendResponse(r);
        return;
      }

      if (request?.type === "GET_PRICE_FOR_MINTS") {
        const mints = request.payload && request.payload.mints ? request.payload.mints.join(",") : "";
        const url = `${JUPITER_CONFIG.PRICE_API}?ids=${encodeURIComponent(mints)}`;
        console.log('[BG] Fetching prices for mints:', mints);
        const r = await fetchJson(url);
        sendResponse(r);
        return;
      }

      if (request?.type === "GET_QUOTE") {
        // payload: { inputMint, outputMint, amountBaseUnits, slippageBps }
        const { inputMint, outputMint, amountBaseUnits, slippageBps = 50 } = request.payload || {};
        if (!inputMint || !outputMint || !amountBaseUnits) {
          sendResponse({ ok: false, status: 400, error: "missing parameters" });
          return;
        }
        
        console.log('[BG] Getting quote:', { inputMint, outputMint, amountBaseUnits, slippageBps });
        
        const url = new URL(`${JUPITER_CONFIG.QUOTE_API_BASE}/quote`);
        url.searchParams.append("inputMint", inputMint);
        url.searchParams.append("outputMint", outputMint);
        url.searchParams.append("amount", String(amountBaseUnits));
        url.searchParams.append("slippageBps", String(slippageBps));
        
        const r = await fetchJson(url.toString());
        sendResponse(r);
        return;
      }

      if (request?.type === "POST_SWAP") {
        // payload: { route, userPublicKey, asLegacyTransaction (optional) }
        const body = request.payload;
        console.log('[BG] Posting swap:', body);
        
        const res = await fetchJson(`${JUPITER_CONFIG.QUOTE_API_BASE}/swap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        sendResponse(res);
        return;
      }

      sendResponse({ ok: false, status: 400, error: "unknown message type" });
    } catch (err) {
      console.error('[BG] Error handling request:', err);
      sendResponse({ ok: false, status: 0, error: err.message || String(err) });
    }
  })();
  
  // indicates we'll call sendResponse asynchronously
  return true;
});