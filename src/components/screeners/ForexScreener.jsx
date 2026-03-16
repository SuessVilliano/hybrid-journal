import React, { useEffect, useRef, memo } from 'react';

function ForexScreener({ darkMode }) {
  const container = useRef();

  useEffect(() => {
    // Remove any previous script to allow re-render on tab switch
    container.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      market: 'forex',
      showToolbar: true,
      defaultColumn: 'overview',
      defaultScreen: 'general',
      isTransparent: true,
      locale: 'en',
      colorTheme: darkMode ? 'dark' : 'light',
      width: '100%',
      height: 600
    });
    container.current.appendChild(script);
  }, [darkMode]);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
      <div className="tradingview-widget-copyright text-xs text-slate-500 mt-1 text-right">
        <a href="https://www.tradingview.com/markets/currencies/" rel="noopener nofollow" target="_blank" className="text-cyan-500 hover:underline">
          Forex Screener
        </a> by TradingView
      </div>
    </div>
  );
}

export default memo(ForexScreener);