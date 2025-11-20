import React, { useEffect, useRef } from 'react';

export default function TradingViewWidget({ type = 'chart', symbol = 'OANDA:NAS100USD', height = '500px' }) {
  const containerRef = useRef(null);
  const darkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear existing content
    containerRef.current.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';
    containerRef.current.appendChild(widgetContainer);

    const script = document.createElement('script');
    script.src = getScriptSrc(type);
    script.async = true;
    script.type = 'text/javascript';
    
    script.innerHTML = JSON.stringify(getConfig(type, symbol, darkMode));

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [type, symbol, darkMode]);

  const getScriptSrc = (widgetType) => {
    const scripts = {
      chart: 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js',
      stockHeatmap: 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js',
      cryptoHeatmap: 'https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js',
      forexCross: 'https://s3.tradingview.com/external-embedding/embed-widget-forex-cross-rates.js',
      forexHeatmap: 'https://s3.tradingview.com/external-embedding/embed-widget-forex-heat-map.js',
      news: 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js',
      calendar: 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    };
    return scripts[widgetType] || scripts.chart;
  };

  const getConfig = (widgetType, sym, dark) => {
    const theme = dark ? 'dark' : 'light';
    const bgColor = dark ? '#0F0F0F' : '#ffffff';

    const configs = {
      chart: {
        autosize: true,
        symbol: sym,
        interval: 'D',
        timezone: 'Etc/UTC',
        theme: theme,
        style: '1',
        locale: 'en',
        allow_symbol_change: true,
        calendar: false,
        support_host: 'https://www.tradingview.com',
        backgroundColor: bgColor,
        gridColor: dark ? 'rgba(242, 242, 242, 0.06)' : 'rgba(0, 0, 0, 0.06)',
        hide_side_toolbar: false,
        hide_top_toolbar: false,
        details: true,
        hotlist: true,
        withdateranges: true,
        studies: ['Volume@tv-basicstudies']
      },
      stockHeatmap: {
        exchanges: [],
        dataSource: 'NASDAQ100',
        grouping: 'sector',
        blockSize: 'market_cap_basic',
        blockColor: 'change',
        locale: 'en',
        symbolUrl: '',
        colorTheme: theme,
        hasTopBar: true,
        isDataSetEnabled: true,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: '100%',
        height: '100%'
      },
      cryptoHeatmap: {
        dataSource: 'Crypto',
        blockSize: 'market_cap_calc',
        blockColor: '24h_close_change|5',
        locale: 'en',
        symbolUrl: '',
        colorTheme: theme,
        hasTopBar: true,
        isDataSetEnabled: true,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: '100%',
        height: '100%'
      },
      forexCross: {
        width: '100%',
        height: '100%',
        currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD', 'CNY'],
        isTransparent: dark,
        colorTheme: theme,
        locale: 'en',
        backgroundColor: bgColor
      },
      forexHeatmap: {
        width: '100%',
        height: '100%',
        currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD', 'CNY'],
        isTransparent: dark,
        colorTheme: theme,
        locale: 'en'
      },
      news: {
        feedMode: 'all_symbols',
        displayMode: 'regular',
        colorTheme: theme,
        isTransparent: dark,
        locale: 'en',
        width: '100%',
        height: '100%'
      },
      calendar: {
        colorTheme: theme,
        isTransparent: dark,
        width: '100%',
        height: '100%',
        locale: 'en',
        importanceFilter: '-1,0,1',
        countryFilter: 'ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu'
      }
    };

    return configs[widgetType] || configs.chart;
  };

  return (
    <div 
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height, width: '100%' }}
    />
  );
}