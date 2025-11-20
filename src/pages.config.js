import Dashboard from './pages/Dashboard';
import Trades from './pages/Trades';
import Goals from './pages/Goals';
import Strategies from './pages/Strategies';
import Analytics from './pages/Analytics';
import Backtesting from './pages/Backtesting';
import Imports from './pages/Imports';
import MarketData from './pages/MarketData';
import BrokerConnections from './pages/BrokerConnections';
import Automation from './pages/Automation';
import TradingCoach from './pages/TradingCoach';
import RiskManagement from './pages/RiskManagement';
import TradingSummaries from './pages/TradingSummaries';
import PublicDashboard from './pages/PublicDashboard';
import Accounts from './pages/Accounts';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Trades": Trades,
    "Goals": Goals,
    "Strategies": Strategies,
    "Analytics": Analytics,
    "Backtesting": Backtesting,
    "Imports": Imports,
    "MarketData": MarketData,
    "BrokerConnections": BrokerConnections,
    "Automation": Automation,
    "TradingCoach": TradingCoach,
    "RiskManagement": RiskManagement,
    "TradingSummaries": TradingSummaries,
    "PublicDashboard": PublicDashboard,
    "Accounts": Accounts,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};