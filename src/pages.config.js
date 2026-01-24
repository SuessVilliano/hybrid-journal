import Accounts from './pages/Accounts';
import Achievements from './pages/Achievements';
import AdminMessaging from './pages/AdminMessaging';
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
import Notifications from './pages/Notifications';
import Onboarding from './pages/Onboarding';
import PlatformTour from './pages/PlatformTour';
import Pricing from './pages/Pricing';
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
import __Layout from './Layout.jsx';


export const PAGES = {
    "Accounts": Accounts,
    "Achievements": Achievements,
    "AdminMessaging": AdminMessaging,
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
    "Notifications": Notifications,
    "Onboarding": Onboarding,
    "PlatformTour": PlatformTour,
    "Pricing": Pricing,
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
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};