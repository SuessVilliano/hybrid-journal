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
import LiveTradingSignals from './pages/LiveTradingSignals';
import MarketData from './pages/MarketData';
import MyProfile from './pages/MyProfile';
import PropFirmSettings from './pages/PropFirmSettings';
import PublicDashboard from './pages/PublicDashboard';
import RiskManagement from './pages/RiskManagement';
import SocialFeed from './pages/SocialFeed';
import Strategies from './pages/Strategies';
import Trades from './pages/Trades';
import TradingCoach from './pages/TradingCoach';
import TradingSummaries from './pages/TradingSummaries';
import StrategicPlanning from './pages/StrategicPlanning';
import Journal from './pages/Journal';
import TradePlans from './pages/TradePlans';
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
    "LiveTradingSignals": LiveTradingSignals,
    "MarketData": MarketData,
    "MyProfile": MyProfile,
    "PropFirmSettings": PropFirmSettings,
    "PublicDashboard": PublicDashboard,
    "RiskManagement": RiskManagement,
    "SocialFeed": SocialFeed,
    "Strategies": Strategies,
    "Trades": Trades,
    "TradingCoach": TradingCoach,
    "TradingSummaries": TradingSummaries,
    "StrategicPlanning": StrategicPlanning,
    "Journal": Journal,
    "TradePlans": TradePlans,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};