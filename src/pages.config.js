import Accounts from './pages/Accounts';
import Analytics from './pages/Analytics';
import Automation from './pages/Automation';
import Backtesting from './pages/Backtesting';
import BrokerConnections from './pages/BrokerConnections';
import DailyPlanning from './pages/DailyPlanning';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Help from './pages/Help';
import Home from './pages/Home';
import Imports from './pages/Imports';
import Journal from './pages/Journal';
import Landing from './pages/Landing';
import LiveTradingSignals from './pages/LiveTradingSignals';
import MarketData from './pages/MarketData';
import MyProfile from './pages/MyProfile';
import PropFirmSettings from './pages/PropFirmSettings';
import PublicDashboard from './pages/PublicDashboard';
import RiskManagement from './pages/RiskManagement';
import SharedAccess from './pages/SharedAccess';
import SocialFeed from './pages/SocialFeed';
import StrategicPlanning from './pages/StrategicPlanning';
import Strategies from './pages/Strategies';
import TradePlans from './pages/TradePlans';
import Trades from './pages/Trades';
import TradingCoach from './pages/TradingCoach';
import TradingSummaries from './pages/TradingSummaries';
import MediaLibrary from './pages/MediaLibrary';
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
    "Help": Help,
    "Home": Home,
    "Imports": Imports,
    "Journal": Journal,
    "Landing": Landing,
    "LiveTradingSignals": LiveTradingSignals,
    "MarketData": MarketData,
    "MyProfile": MyProfile,
    "PropFirmSettings": PropFirmSettings,
    "PublicDashboard": PublicDashboard,
    "RiskManagement": RiskManagement,
    "SharedAccess": SharedAccess,
    "SocialFeed": SocialFeed,
    "StrategicPlanning": StrategicPlanning,
    "Strategies": Strategies,
    "TradePlans": TradePlans,
    "Trades": Trades,
    "TradingCoach": TradingCoach,
    "TradingSummaries": TradingSummaries,
    "MediaLibrary": MediaLibrary,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};