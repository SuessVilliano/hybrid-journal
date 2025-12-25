import Accounts from './pages/Accounts';
import Analytics from './pages/Analytics';
import Automation from './pages/Automation';
import Backtesting from './pages/Backtesting';
import BrokerConnections from './pages/BrokerConnections';
import DailyPlanning from './pages/DailyPlanning';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Home from './pages/Home';
import Imports from './pages/Imports';
import Landing from './pages/Landing';
import MarketData from './pages/MarketData';
import MyProfile from './pages/MyProfile';
import PublicDashboard from './pages/PublicDashboard';
import RiskManagement from './pages/RiskManagement';
import SocialFeed from './pages/SocialFeed';
import Strategies from './pages/Strategies';
import Trades from './pages/Trades';
import TradingCoach from './pages/TradingCoach';
import TradingPlatforms from './pages/TradingPlatforms';
import TradingSummaries from './pages/TradingSummaries';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Accounts": Accounts,
    "Analytics": Analytics,
    "Automation": Automation,
    "Backtesting": Backtesting,
    "BrokerConnections": BrokerConnections,
    "DailyPlanning": DailyPlanning,
    "Dashboard": Dashboard,
    "Goals": Goals,
    "Home": Home,
    "Imports": Imports,
    "Landing": Landing,
    "MarketData": MarketData,
    "MyProfile": MyProfile,
    "PublicDashboard": PublicDashboard,
    "RiskManagement": RiskManagement,
    "SocialFeed": SocialFeed,
    "Strategies": Strategies,
    "Trades": Trades,
    "TradingCoach": TradingCoach,
    "TradingPlatforms": TradingPlatforms,
    "TradingSummaries": TradingSummaries,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};