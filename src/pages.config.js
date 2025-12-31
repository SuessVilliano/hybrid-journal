import Accounts from './pages/Accounts';
import Analytics from './pages/Analytics';
import Automation from './pages/Automation';
import Backtesting from './pages/Backtesting';
import BrokerConnections from './pages/BrokerConnections';
import Calculators from './pages/Calculators';
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
import MediaLibrary from './pages/MediaLibrary';
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
import Achievements from './pages/Achievements';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Accounts": Accounts,
    "Analytics": Analytics,
    "Automation": Automation,
    "Backtesting": Backtesting,
    "BrokerConnections": BrokerConnections,
    "Calculators": Calculators,
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
    "MediaLibrary": MediaLibrary,
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
    "Achievements": Achievements,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};