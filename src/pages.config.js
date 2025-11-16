import Dashboard from './pages/Dashboard';
import Trades from './pages/Trades';
import Goals from './pages/Goals';
import Strategies from './pages/Strategies';
import Analytics from './pages/Analytics';
import Backtesting from './pages/Backtesting';
import Imports from './pages/Imports';
import MarketData from './pages/MarketData';
import BrokerConnections from './pages/BrokerConnections';
import Layout from './Layout.jsx';


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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};