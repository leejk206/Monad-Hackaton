// src/components/TradingViewChart.tsx
import React, { useEffect, useMemo } from "react";

declare global {
  interface Window {
    TradingView?: any;
  }
}

type TradingViewChartProps = {
  symbol: string;         // 예: "BINANCE:BTCUSDT"
  interval?: string;      // 예: "15", "60", "D"
  theme?: "light" | "dark";
  height?: number;
};

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  interval = "60",
  theme = "dark",
  height = 400,
}) => {
  // 이 컴포넌트 인스턴스마다 고유한 id 생성
  const containerId = useMemo(
    () => `tv_${Math.random().toString(36).slice(2)}`,
    []
  );

  useEffect(() => {
    const scriptId = "tradingview-widget-script";

    const createWidget = () => {
      if (!window.TradingView) return;

      // TradingView가 알아서 container_id에 해당하는 div를 찾아서 렌더링함
      new window.TradingView.widget({
        container_id: containerId,
        symbol,
        interval,
        timezone: "Etc/UTC",
        theme,
        style: "1", // 1 = candles
        locale: "kr",
        hide_top_toolbar: false,
        hide_legend: false,
        autosize: true,
        withdateranges: true,
        allow_symbol_change: false,
      });
    };

    // tv.js 스크립트가 없으면 로드
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://s3.tradingview.com/tv.js";
      script.type = "text/javascript";
      script.async = true;
      script.onload = () => {
        createWidget();
      };
      document.head.appendChild(script);
    } else {
      // 이미 로드돼 있으면 바로 위젯 생성
      createWidget();
    }

    return () => {
      // 언마운트 시 특별히 해줄 건 없지만,
      // TradingView가 알아서 내부를 정리하므로 여기서는 아무 것도 안 함
    };
  }, [containerId, symbol, interval, theme]);

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #333",
      }}
    >
      {/* TradingView 위젯이 이 div 안에 렌더링됨 */}
      <div id={containerId} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};
